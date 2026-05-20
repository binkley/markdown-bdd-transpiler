import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { marked, type Token, type TokensList } from 'marked';
import mri from 'mri';

const ai = new GoogleGenAI({});

interface TranspilerConfig {
  testDir: string;
  outDir: string;
  manifestPath: string;
  cachePath: string;
  frameworkImport: string;
  setupInjection?: string;
}

async function loadConfig(): Promise<TranspilerConfig> {
  const argv = mri(process.argv.slice(2), {
    alias: { c: 'config' },
    default: { config: 'bdd.config.json' }
  });

  const defaultConfig: TranspilerConfig = {
    testDir: 'tests',
    outDir: '.generated',
    manifestPath: 'manifest.json',
    cachePath: 'bdd-cache.json',
    frameworkImport: '../framework/standard-ui-steps.js'
  };

  let fileConfig: Partial<TranspilerConfig> = {};
  try {
    const configContent = await fs.readFile(
      path.resolve(process.cwd(), argv.config),
      'utf-8'
    );
    fileConfig = JSON.parse(configContent);
    console.log(`\n⚙️  Loaded configuration from ${argv.config}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(
        `⚠️ Failed to parse config file ${argv.config}:`,
        error.message
      );
    }
  }

  return {
    testDir: argv.testDir || fileConfig.testDir || defaultConfig.testDir,
    outDir: argv.outDir || fileConfig.outDir || defaultConfig.outDir,
    manifestPath:
      argv.manifestPath ||
      fileConfig.manifestPath ||
      defaultConfig.manifestPath,
    cachePath:
      argv.cachePath || fileConfig.cachePath || defaultConfig.cachePath,
    frameworkImport:
      argv.frameworkImport ||
      fileConfig.frameworkImport ||
      defaultConfig.frameworkImport,
    setupInjection: argv.setupInjection || fileConfig.setupInjection
  };
}

async function main() {
  const config = await loadConfig();

  const manifestPath = path.resolve(process.cwd(), config.manifestPath);
  const cachePath = path.resolve(process.cwd(), config.cachePath);
  const outDir = path.resolve(process.cwd(), config.outDir);
  const testDir = path.resolve(process.cwd(), config.testDir);

  let manifestStr = '';
  try {
    manifestStr = await fs.readFile(manifestPath, 'utf-8');
  } catch {
    console.error(`❌ [ERROR] Failed to read manifest at ${manifestPath}`);
    process.exit(1);
  }

  let cache: Record<string, any> = {};
  try {
    const cacheStr = await fs.readFile(cachePath, 'utf-8');
    cache = JSON.parse(cacheStr);
  } catch {
    // Missing or invalid cache
  }

  let files: string[];
  try {
    files = await fs.readdir(testDir);
  } catch {
    console.log(`No "${config.testDir}" directory found.`);
    return;
  }
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  // Ensure a clean slate for generated tests
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  let cacheHits = 0;
  let apiCalls = 0;
  let cacheUpdated = false;
  const startTime = performance.now();
  const isVerbose = process.env.TRANSPILER_VERBOSE === 'true';

  for (const mdFile of mdFiles) {
    if (isVerbose) {
      console.log(
        `📄 Transpiling ${config.testDir}/${mdFile} -> ${config.outDir}/${mdFile}.test.ts`
      );
    }

    const filePath = path.join(testDir, mdFile);
    const content = await fs.readFile(filePath, 'utf-8');

    let currentContext = '';

    type Scenario = { name: string; steps: string[]; phases: string[] };
    type Feature = { name: string; scenarios: Scenario[] };
    const features: Feature[] = [];

    let currentFeature: Feature | null = null;
    let currentScenario: Scenario | null = null;

    const openFeature = (name: string) => {
      currentFeature = { name, scenarios: [] };
      features.push(currentFeature);
      currentScenario = null;
    };

    const openScenario = (name: string) => {
      if (!currentFeature) {
        openFeature('BDD Feature');
      }
      currentScenario = { name, steps: [], phases: [] };
      currentFeature!.scenarios.push(currentScenario);
    };

    const tokens = marked.lexer(content);

    // Function to recursively traverse the AST to find context and bdd code blocks
    async function traverseTokens(tokensList: TokensList | Token[]) {
      for (const token of tokensList) {
        if (token.type === 'heading') {
          const depth = token.depth;
          const text = token.text.trim();

          if (depth === 1) {
            openFeature(text);
          } else if (depth === 2) {
            openScenario(text);
          } else if (depth === 3) {
            currentContext = text;
            if (currentScenario) {
              const upper = text.toUpperCase();
              if (upper.includes('GIVEN'))
                currentScenario.phases.push('GIVEN');
              else if (upper.includes('WHEN'))
                currentScenario.phases.push('WHEN');
              else if (upper.includes('THEN'))
                currentScenario.phases.push('THEN');
            }
          }
        } else if (token.type === 'code' && token.lang === 'bdd') {
          // We found a BDD block! Process its content as steps.
          const stepLines = token.text.split('\n');
          for (const line of stepLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              const stepText = trimmed.slice(2).trim();
              const cacheKey = `${stepText}`;

              let resolution = cache[cacheKey];
              if (!resolution) {
                console.log(`\n☁️  Cache miss: "${stepText}"`);
                const callStart = performance.now();

                let response;
                try {
                  response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-lite',
                    contents: stepText,
                    config: {
                      systemInstruction: `You are an AI compiler for BDD tests.\nMap the user's step to a function in this manifest: ${manifestStr}\nUse context: ${currentContext}`,
                      responseMimeType: 'application/json',
                      responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          matchedFunction: { type: Type.STRING },
                          extractedArguments: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          }
                        },
                        required: ['matchedFunction', 'extractedArguments']
                      }
                    }
                  });
                  apiCalls++;
                } catch (e: any) {
                  if (e.status === 503) {
                    console.error(
                      `❌ [API ERROR] Gemini returned 503 (High Demand) while compiling: "${stepText}".`
                    );
                    console.error(
                      `   Please wait a few moments and try running the command again.`
                    );
                  } else {
                    console.error(
                      `❌ [API ERROR] Unexpected failure connecting to Gemini:`,
                      e.message
                    );
                  }
                  process.exit(1);
                }

                const callDuration = (
                  (performance.now() - callStart) /
                  1000
                ).toFixed(2);
                console.log(`⚡ API returned in ${callDuration}s`);

                const resultStr = response.text;
                try {
                  resolution = JSON.parse(resultStr || '{}');
                  cache[cacheKey] = resolution;
                  cacheUpdated = true;
                } catch {
                  console.error(
                    `⚠️ [PARSE ERROR] AI returned invalid JSON schema:`,
                    resultStr
                  );
                  process.exit(1);
                }
              } else {
                cacheHits++;
              }

              const argsStr = (resolution.extractedArguments || [])
                .map((a: string) => JSON.stringify(a))
                .join(', ');
              const argsCall = argsStr ? `, ${argsStr}` : '';

              if (!currentScenario) {
                openScenario('BDD Scenario');
              }
              currentScenario!.steps.push(
                `await steps.${resolution.matchedFunction}(page${argsCall});`
              );
            }
          }
        }

        // Recursively search lists and blockquotes for code fences
        if ('tokens' in token && token.tokens) {
          await traverseTokens(token.tokens);
        } else if (token.type === 'list') {
          await traverseTokens(token.items);
        }
      }
    }

    await traverseTokens(tokens);

    let specCode = `import { test } from '@playwright/test';\n`;
    specCode += `import * as steps from '${config.frameworkImport}';\n\n`;

    if (config.setupInjection) {
      specCode += `// --- INJECTED BDD SETUP ---\n`;
      specCode += `${config.setupInjection}\n`;
      specCode += `// --------------------------\n\n`;
    }

    for (const feature of features) {
      // Filter out scenarios with 0 steps (like documentation headers)
      const validScenarios = feature.scenarios.filter(
        (s) => s.steps.length > 0
      );
      if (validScenarios.length === 0) continue; // Skip empty features entirely

      specCode += `test.describe(${JSON.stringify(feature.name)}, () => {\n`;
      for (const scenario of validScenarios) {
        if (scenario.phases[0] !== 'GIVEN') {
          console.error(
            `⚠️ [WARNING] Scenario "${scenario.name}": Missing an opening GIVEN.`
          );
        }
        if (
          scenario.phases.includes('GIVEN') &&
          (!scenario.phases.includes('WHEN') ||
            !scenario.phases.includes('THEN'))
        ) {
          console.error(
            `⚠️ [WARNING] Scenario "${scenario.name}": GIVEN has no complete WHEN/THEN pair.`
          );
        }
        for (let i = 0; i < scenario.phases.length; i++) {
          if (scenario.phases[i] === 'WHEN') {
            if (!scenario.phases.slice(i + 1).includes('THEN')) {
              console.error(
                `⚠️ [WARNING] Scenario "${scenario.name}": WHEN is not paired with a subsequent THEN.`
              );
              break;
            }
          }
        }

        specCode += `  test(${JSON.stringify(scenario.name)}, async ({ page }) => {\n`;
        for (const step of scenario.steps) {
          specCode += `    ${step}\n`;
        }
        specCode += `  });\n\n`;
      }
      specCode += `});\n\n`;
    }

    const outPath = path.join(outDir, `${mdFile}.test.ts`);
    await fs.writeFile(outPath, specCode);
  }

  if (cacheUpdated) {
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
  }

  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(
    `\n✅ Transpilation Complete: ${cacheHits + apiCalls} steps processed (${cacheHits} cached, ${apiCalls} generated via AI) in ${totalDuration}s.`
  );
}

main().catch(console.error);
