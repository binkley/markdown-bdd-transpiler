import type { Feature } from '../types/index.js';

export function emitPlaywright(
  features: Feature[],
  config: { frameworkImport: string; setupInjection?: string },
  setupContent?: string
): { specCode: string; warnings: string[] } {
  let specCode = `import { test } from '@playwright/test';\n`;
  specCode += `import * as steps from '${config.frameworkImport}';\n\n`;
  const warnings: string[] = [];

  const mergedSetup = [config.setupInjection, setupContent]
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
      for (const step of scenario.steps) {
        specCode += `${step}\n`;
      }
      specCode += `  });\n\n`;
    }
    specCode += `});\n\n`;
  }

  return { specCode, warnings };
}
