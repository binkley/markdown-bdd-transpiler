import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});

async function main() {
  const manifestPath = path.resolve('manifest.json');
  const cachePath = path.resolve('bdd-cache.json');
  const outDir = path.resolve('.generated');

  const manifestStr = await fs.readFile(manifestPath, 'utf-8');

  let cache: Record<string, any> = {};
  try {
    const cacheStr = await fs.readFile(cachePath, 'utf-8');
    cache = JSON.parse(cacheStr);
  } catch {
    // Missing or invalid cache
  }

  let files: string[];
  try {
    files = await fs.readdir('t');
  } catch {
    console.log('No "t" directory found.');
    return;
  }
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  await fs.mkdir(outDir, { recursive: true });

  let cacheUpdated = false;

  for (const mdFile of mdFiles) {
    const filePath = path.join('t', mdFile);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let currentContext = '';

    let specCode = `import { test, describe, beforeAll, afterAll } from 'vitest';\n`;
    specCode += `import { chromium, Browser, Page } from 'playwright';\n`;
    specCode += `import * as steps from '../framework/standard-ui-steps.js';\n\n`;

    let insideFeature = false;
    let insideScenario = false;

    const closeScenario = () => {
      if (insideScenario) {
        specCode += `  });\n\n`;
        insideScenario = false;
      }
    };
    const closeFeature = () => {
      closeScenario();
      if (insideFeature) {
        specCode += `});\n\n`;
        insideFeature = false;
      }
    };

    const openFeature = (name: string) => {
      closeFeature();
      specCode += `describe(${JSON.stringify(name)}, () => {\n`;
      specCode += `  let browser: Browser;\n`;
      specCode += `  let page: Page;\n\n`;
      specCode += `  beforeAll(async () => {\n`;
      specCode += `    browser = await chromium.launch();\n`;
      specCode += `    page = await browser.newPage();\n`;
      specCode += `  });\n\n`;
      specCode += `  afterAll(async () => {\n`;
      specCode += `    await browser.close();\n`;
      specCode += `  });\n\n`;
      insideFeature = true;
    };

    const openScenario = (name: string) => {
      closeScenario();
      if (!insideFeature) {
        openFeature('BDD Feature');
      }
      specCode += `  test(${JSON.stringify(name)}, async () => {\n`;
      insideScenario = true;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('# ')) {
        openFeature(trimmed.slice(2).trim());
      } else if (trimmed.startsWith('## ')) {
        openScenario(trimmed.slice(3).trim());
      } else if (trimmed.startsWith('### ')) {
        currentContext = trimmed.slice(4).trim();
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const stepText = trimmed.slice(2).trim();
        const cacheKey = `${stepText}`;

        let resolution = cache[cacheKey];
        if (!resolution) {
          console.log(`Cache miss for "${stepText}". Calling Gemini...`);
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: stepText,
            config: {
              systemInstruction: `You are an AI compiler for BDD tests.\nMap the user's step to a function in this manifest: ${manifestStr}\nUse context: ${currentContext}`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  matchedFunction: { type: Type.STRING },
                  extractedArguments: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['matchedFunction', 'extractedArguments']
              }
            }
          });

          const resultStr = response.text;
          try {
            resolution = JSON.parse(resultStr || '{}');
            cache[cacheKey] = resolution;
            cacheUpdated = true;
          } catch {
            console.error('Failed to parse gemini response:', resultStr);
            process.exit(1);
          }
        }

        const argsStr = (resolution.extractedArguments || [])
          .map((a: string) => JSON.stringify(a))
          .join(', ');
        const argsCall = argsStr ? `, ${argsStr}` : '';
        specCode += `    await steps.${resolution.matchedFunction}(page${argsCall});\n`;
      }
    }

    closeFeature();

    const outPath = path.join(outDir, `${mdFile}.test.ts`);
    await fs.writeFile(outPath, specCode);
  }

  if (cacheUpdated) {
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
    console.log('Cache updated.');
  } else {
    console.log('Transpilation complete (cached).');
  }
}

main().catch(console.error);
