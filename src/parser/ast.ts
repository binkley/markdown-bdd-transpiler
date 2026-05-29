import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { Node, Parent } from 'unist';
import type { Code, Heading, List, ListItem, Blockquote } from 'mdast';
import type { Feature, Scenario, RawStep } from '../types/index.js';

export interface ParseResult {
  features: Feature[];
  warnings: string[];
  errors: string[];
}

function getText(node: Node): string {
  if (node.type === 'text' || node.type === 'inlineCode') {
    return (node as any).value;
  }
  if ('children' in node && Array.isArray((node as Parent).children)) {
    return (node as Parent).children.map(getText).join('');
  }
  return '';
}

export function parseMarkdown(
  content: string,
  relativeFilePath: string
): ParseResult {
  const features: Feature[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  let currentFeature = null as Feature | null;
  let currentScenario = null as Scenario | null;
  let currentContext = '';
  let pendingContext: string | null = null;
  let pendingScenarioName: string | null = null;
  let pendingContextLine: number | null = null;

  const openFeature = (name: string, line?: number) => {
    currentFeature = { name, scenarios: [], line };
    features.push(currentFeature);
    currentScenario = null;
  };

  const openScenario = (name: string, line?: number) => {
    if (!currentFeature) {
      logError(
        line,
        `Cannot define a Scenario ("${name}") before defining a Feature. Please add a "# Feature" heading first.`
      );
      return;
    }
    currentScenario = { name, steps: [], phases: [], line };
    currentFeature.scenarios.push(currentScenario);
  };

  const logEvent = (line: number | string | undefined, message: string) => {
    const fileRef = line ? `${relativeFilePath}:${line}` : relativeFilePath;
    warnings.push(`⚠️ ${fileRef} - warning: ${message}`);
  };

  const logError = (line: number | string | undefined, message: string) => {
    const fileRef = line ? `${relativeFilePath}:${line}` : relativeFilePath;
    errors.push(`❌ ${fileRef} - error: ${message}`);
  };

  const checkPendingContext = () => {
    if (pendingContext) {
      logEvent(
        pendingContextLine || undefined,
        `Scenario "${pendingScenarioName}": Found "### ${pendingContext}" header without a corresponding \`\`\`bdd code fence.`
      );
      pendingContext = null;
      pendingContextLine = null;
    }
  };

  const ast = remark().parse(content);

  type RelevantNode = Heading | List | Code | ListItem | Blockquote;
  const flatNodes: RelevantNode[] = [];

  visit(ast, (node: Node) => {
    if (
      node.type === 'heading' ||
      node.type === 'list' ||
      node.type === 'code'
    ) {
      flatNodes.push(node as RelevantNode);
    }
  });

  for (const node of flatNodes) {
    if (node.type === 'heading') {
      checkPendingContext();
      const depth = (node as Heading).depth;
      const text = getText(node).trim();
      const line = node.position?.start?.line;

      if (depth === 1) {
        openFeature(text, line);
      } else if (depth === 2) {
        openScenario(text, line);
      } else if (depth === 3) {
        currentContext = text;
        pendingContext = text;
        pendingContextLine = line || null;
        pendingScenarioName = currentScenario?.name || 'Unknown Scenario';
        if (currentScenario) {
          const upper = text.toUpperCase();
          if (upper.includes('GIVEN')) currentScenario.phases.push('GIVEN');
          else if (upper.includes('WHEN'))
            currentScenario.phases.push('WHEN');
          else if (upper.includes('THEN'))
            currentScenario.phases.push('THEN');
        }
      }
    } else if (node.type === 'list' && pendingContext) {
      let hasBdd = false;
      visit(node, 'code', (codeNode: any) => {
        if (codeNode.lang === 'bdd') hasBdd = true;
      });

      if (!hasBdd) {
        logEvent(
          node.position?.start?.line,
          `Scenario "${currentScenario?.name}": Found a bulleted list under "### ${pendingContext}" without a \`\`\`bdd code fence. Actionable steps must be wrapped in a code fence to be executed.`
        );
      }
      pendingContext = null;
      pendingContextLine = null;
    }

    if (node.type === 'code' && (node as Code).lang === 'bdd') {
      pendingContext = null;
      pendingContextLine = null;

      let designerNotes = '';
      const parent = ast as Parent;
      if (parent && parent.children) {
        const nodeIndex = parent.children.indexOf(node as Node);
        if (nodeIndex > 0) {
          const prevSibling = parent.children[nodeIndex - 1];
          if (prevSibling.type === 'paragraph') {
            designerNotes = getText(prevSibling).trim();
          }
        }
      }

      const stepLines = (node as Code).value.split('\n');
      const validSteps: RawStep[] = [];
      for (let i = 0; i < stepLines.length; i++) {
        const trimmed = stepLines[i].trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const sourceLine = node.position?.start?.line
            ? node.position.start.line + 1 + i
            : 'unknown';
          validSteps.push({
            text: trimmed.slice(2).trim(),
            lineIndex: i,
            sourceLine
          });
        }
      }

      for (let i = 0; i < validSteps.length; i++) {
        const step = validSteps[i];

        // Strip escaped variables so they don't trigger errors
        const unescapedText = step.text.replace(/\\\{\{.*\}\}/g, '');

        if (/\{\{[^}]*$/.test(unescapedText)) {
          logError(
            step.sourceLine,
            `Scenario "${currentScenario?.name}": Unclosed variable braces in step "${step.text}". Ensure it is enclosed in double braces, e.g., {{VARIABLE_NAME}}`
          );
        } else {
          const variableMatches = unescapedText.matchAll(/\{\{([^}]*)\}\}/g);
          for (const match of variableMatches) {
            const innerText = match[1];
            if (!/^\s*[A-Za-z0-9_]+\s*$/.test(innerText)) {
              logError(
                step.sourceLine,
                `Scenario "${currentScenario?.name}": Invalid environment variable syntax in step "${step.text}". Variables must only contain letters, numbers, and underscores.`
              );
            }
          }
        }

        if (!currentScenario) {
          logError(
            step.sourceLine,
            `Found actionable BDD step ("${step.text}") before defining a Scenario. Please add a "## Scenario" heading first.`
          );
          continue; // Skip processing this step since there's no scenario to attach it to
        }

        const richContextStr = JSON.stringify({
          feature: currentFeature?.name || 'Unknown Feature',
          scenario: currentScenario.name,
          phase: currentContext,
          designerNotes: designerNotes || undefined
        });

        currentScenario.steps.push(
          JSON.stringify({
            stepText: step.text,
            sourceLine: step.sourceLine,
            richContextStr,
            prevStep: i > 0 ? validSteps[i - 1].text : '',
            nextStep: i < validSteps.length - 1 ? validSteps[i + 1].text : ''
          })
        );
      }
    }
  }

  checkPendingContext();

  return { features, warnings, errors };
}
