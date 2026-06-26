import type { Feature } from '../types/index.js';

export function emitPlaywright(
  features: Feature[],
  config: { frameworkImport: string; banner?: string },
  setupContent?: string
): { specCode: string; warnings: string[] } {
  let specCode = `import { test } from '@playwright/test';\n`;
  specCode += `import * as steps from '${config.frameworkImport}';\n\n`;
  const warnings: string[] = [];

  const mergedSetup = [config.banner, setupContent]
    .filter(Boolean)
    .join('\n');

  if (mergedSetup) {
    specCode += `// --- INJECTED BDD SETUP ---\n`;
    specCode += `${mergedSetup}\n`;
    specCode += `// --------------------------\n\n`;
  }

  for (const feature of features) {
    const validScenarios = feature.scenarios.filter(
      (s) => s.steps.length > 0
    );
    if (validScenarios.length === 0) continue;

    specCode += `test.describe(${JSON.stringify(feature.name)}, () => {\n`;

    if (feature.backgroundCode && feature.backgroundCode.length > 0) {
      specCode += `  // --- FEATURE SETUP ---\n`;
      for (const block of feature.backgroundCode) {
        const indentedBlock = block
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n');
        specCode += `${indentedBlock}\n`;
      }
      specCode += `  // ---------------------\n\n`;
    }

    for (const scenario of validScenarios) {
      if (scenario.phases[0] !== 'GIVEN') {
        warnings.push(
          `⚠️ Scenario "${scenario.name}": Missing an opening GIVEN.`
        );
      }
      if (
        scenario.phases.includes('GIVEN') &&
        (!scenario.phases.includes('WHEN') ||
          !scenario.phases.includes('THEN'))
      ) {
        warnings.push(
          `⚠️ Scenario "${scenario.name}": GIVEN has no complete WHEN/THEN pair.`
        );
      }
      for (let i = 0; i < scenario.phases.length; i++) {
        if (scenario.phases[i] === 'WHEN') {
          if (!scenario.phases.slice(i + 1).includes('THEN')) {
            warnings.push(
              `⚠️ Scenario "${scenario.name}": WHEN is not paired with a subsequent THEN.`
            );
            break;
          }
        }
      }

      specCode += `  test(${JSON.stringify(scenario.name)}, async ({ page }) => {\n`;
      specCode += `    try {\n`;
      for (const step of scenario.steps) {
        specCode += `      ${step}\n`;
      }
      specCode += `    } catch (error: any) {\n`;
      specCode += `      if (error.message?.includes('strict mode violation')) {\n`;
      specCode += `        error.message = '[BDD Strict Mode Error] Playwright found multiple elements matching your step. Try using an Exact Text, Role, or Test-ID step instead.\\n\\nOriginal Error:\\n' + error.message;\n`;
      specCode += `      }\n`;
      specCode += `      throw error;\n`;
      specCode += `    }\n`;
      specCode += `  });\n\n`;
    }
    specCode += `});\n\n`;
  }

  return { specCode, warnings };
}
