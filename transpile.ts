#!/usr/bin/env node
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
  setupFile?: string;
  gemini: {
    maxRetries: number;
    initialDelayMs: number;
    backoffFactor: number;
  };
}

interface ExecutionState {
  config: TranspilerConfig;
  verbose: boolean;
  quiet: boolean;
  targetFiles: string[];
}

async function loadConfig(): Promise<ExecutionState> {
  const argv = mri(process.argv.slice(2), {
    alias: {
      c: 'config',
      h: 'help',
      v: 'verbose',
      q: 'quiet',
      V: 'version',
      'test-dir': 'testDir',
      'out-dir': 'outDir',
      'manifest-path': 'manifestPath',
      'cache-path': 'cachePath',
      'framework-import': 'frameworkImport',
      'setup-injection': 'setupInjection',
      'setup-file': 'setupFile',
      'gemini-max-retries': 'gemini.maxRetries',
      'gemini-initial-delay-ms': 'gemini.initialDelayMs',
      'gemini-backoff-factor': 'gemini.backoffFactor'
    },
    default: { config: 'bdd.config.json' }
  });

  if (argv.version) {
    const pkgContent = await fs.readFile(
      path.resolve(process.cwd(), 'package.json'),
      'utf-8'
    );
    const pkg = JSON.parse(pkgContent);
    console.log(pkg.version);
    process.exit(0);
  }

  if (argv.help) {
    console.log(`
Usage: markdown-bdd [options] [files...]

An AI-augmented BDD testing framework that transpiles Markdown user journeys into Playwright tests.

Options:
  -c, --config <path>               Path to the configuration file (default: bdd.config.json)
  --test-dir <path>                 Directory containing your Markdown feature files
  --out-dir <path>                  Directory to output the generated .test.ts files
  --manifest-path <path>            Path to the JSON manifest defining available UI steps
  --cache-path <path>               File to deterministically cache AI resolutions
  --framework-import <path>         Module path injected into generated tests for standard steps
  --setup-file <path>               TypeScript/JavaScript file injected into every generated test
  --setup-injection <code>          Raw string of code injected into every generated test
  --gemini-max-retries <number>     Maximum API retries on failure (default: 3)
  --gemini-initial-delay-ms <ms>    Base delay before the first retry (default: 1000)
  --gemini-backoff-factor <number>  Exponential multiplier for each retry (default: 2.0)
  
  -V, --version                     Print the transpiler version and exit
  -v, --verbose                     Enable detailed diagnostic logging
  -q, --quiet                       Suppress all non-error output (including structural warnings)
  -h, --help                        Print this help menu
`);
    process.exit(0);
  }

  const defaultConfig: TranspilerConfig = {
    testDir: 'tests',
    outDir: '.generated',
    manifestPath: 'manifest.json',
    cachePath: 'bdd-cache.json',
    frameworkImport: '../framework/standard-ui-steps.js',
    gemini: {
      maxRetries: 3,
      initialDelayMs: 1000,
      backoffFactor: 2.0
    }
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

  const finalConfig: TranspilerConfig = {
    testDir: argv.testDir ?? fileConfig.testDir ?? defaultConfig.testDir,
    outDir: argv.outDir ?? fileConfig.outDir ?? defaultConfig.outDir,
    manifestPath:
      argv.manifestPath ??
      fileConfig.manifestPath ??
      defaultConfig.manifestPath,
    cachePath:
      argv.cachePath ?? fileConfig.cachePath ?? defaultConfig.cachePath,
    frameworkImport:
      argv.frameworkImport ??
      fileConfig.frameworkImport ??
      defaultConfig.frameworkImport,
    setupInjection: argv.setupInjection ?? fileConfig.setupInjection,
    setupFile: argv.setupFile ?? fileConfig.setupFile,
    gemini: {
      maxRetries:
        argv['gemini.maxRetries'] ??
        fileConfig.gemini?.maxRetries ??
        defaultConfig.gemini.maxRetries,
      initialDelayMs:
        argv['gemini.initialDelayMs'] ??
        fileConfig.gemini?.initialDelayMs ??
        defaultConfig.gemini.initialDelayMs,
      backoffFactor:
        argv['gemini.backoffFactor'] ??
        fileConfig.gemini?.backoffFactor ??
        defaultConfig.gemini.backoffFactor
    }
  };

  return {
    config: finalConfig,
    verbose: !!argv.verbose,
    quiet: !!argv.quiet,
    targetFiles: argv._
  };
}

async function main() {
  const state = await loadConfig();
  const config = state.config;

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
    if (state.verbose)
      console.log('ℹ️  No existing cache found. Starting fresh.');
  }

  let mdFiles: string[] = [];
  const isTargetedRun = state.targetFiles.length > 0;

  if (isTargetedRun) {
    // Process only the specific files provided by the user
    for (const target of state.targetFiles) {
      if (target.endsWith('.md')) {
        mdFiles.push(target);
      } else {
        if (!state.quiet)
          console.warn(`⚠️ Skipping non-markdown file: ${target}`);
      }
    }
  } else {
    // Bulk process the entire test directory
    try {
      const files = await fs.readdir(testDir);
      // Map to absolute paths relative to testDir so the loops below work consistently
      mdFiles = files
        .filter((f) => f.endsWith('.md'))
        .map((f) => path.join(testDir, f));
    } catch {
      if (!state.quiet)
        console.log(`No "${config.testDir}" directory found.`);
      return;
    }

    // Ensure a clean slate for generated tests during a bulk run
    await fs.rm(outDir, { recursive: true, force: true });
  }

  // Ensure the outDir exists (whether bulk or targeted run)
  await fs.mkdir(outDir, { recursive: true });

  let cacheHits = 0;
  let apiCalls = 0;
  let cacheUpdated = false;
  const startTime = performance.now();
  const isVerbose = process.env.TRANSPILER_VERBOSE === 'true';

  for (const mdFile of mdFiles) {
    // Determine the actual path to read the file from
    const filePath = path.resolve(process.cwd(), mdFile);
    // Determine the base name (e.g., 'login-journey.md') to use for the output file
    const baseName = path.basename(mdFile);

    if (isVerbose) {
      console.log(
        `📄 Transpiling ${mdFile} -> ${config.outDir}/${baseName}.test.ts`
      );
    }
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

    // Tracks if we have seen a ### GIVEN/WHEN/THEN header but haven't seen a BDD block yet
    let pendingContext: string | null = null;
    let pendingScenarioName: string | null = null;

    const checkPendingContext = () => {
      if (pendingContext) {
        if (!state.quiet) {
          console.warn(
            `⚠️ [WARNING] Scenario "${pendingScenarioName}": ` +
              `Found "### ${pendingContext}" header without a corresponding \`\`\`bdd code fence.`
          );
        }
        pendingContext = null;
      }
    };

    // Function to recursively traverse the AST to find context and bdd code blocks
    async function traverseTokens(tokensList: TokensList | Token[]) {
      for (const token of tokensList) {
        if (token.type === 'heading') {
          checkPendingContext(); // Check before starting a new context or scenario
          const depth = token.depth;
          const text = token.text.trim();

          if (depth === 1) {
            openFeature(text);
          } else if (depth === 2) {
            openScenario(text);
          } else if (depth === 3) {
            currentContext = text;
            pendingContext = text;
            pendingScenarioName = currentScenario?.name || 'Unknown Scenario';
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
        } else if (token.type === 'list' && pendingContext) {
          // Check if this list contains a bdd code fence before warning
          let hasBdd = false;
          const searchTokens = (list: any[]) => {
            for (const t of list) {
              if (t.type === 'code' && t.lang === 'bdd') hasBdd = true;
              if (t.tokens) searchTokens(t.tokens);
              if (t.items) searchTokens(t.items);
            }
          };
          searchTokens(token.items);

          if (!hasBdd && !state.quiet) {
            console.warn(
              `⚠️ [WARNING] Scenario "${currentScenario?.name}": ` +
                `Found a bulleted list under "### ${pendingContext}" without a \`\`\`bdd code fence. ` +
                `Actionable steps must be wrapped in a code fence to be executed.`
            );
          }
          pendingContext = null; // Prevent duplicate warnings for the same header
        }

        if (token.type === 'code' && token.lang === 'bdd') {
          pendingContext = null; // We found the BDD block, clear the pending state
          // We found a BDD block! Process its content as steps.
          const stepLines = token.text.split('\n');
          for (const line of stepLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              const stepText = trimmed.slice(2).trim();

              if (
                !state.quiet &&
                (/\{\{[^}]*$/.test(stepText) || /\{\{[^}]*\s/.test(stepText))
              ) {
                console.warn(
                  `⚠️ [WARNING] Scenario "${currentScenario?.name}": ` +
                    `Possible malformed variable in step "${stepText}". ` +
                    `Ensure it is enclosed in double braces, e.g., {{VARIABLE_NAME}}`
                );
              }

              const cacheKey = `${stepText}`;

              let resolution = cache[cacheKey];
              if (!resolution) {
                if (state.verbose)
                  console.log(`\n☁️  Cache miss: "${stepText}"`);
                const callStart = performance.now();

                let response;
                let attempt = 0;
                const { maxRetries, initialDelayMs, backoffFactor } =
                  config.gemini;

                try {
                  while (attempt <= maxRetries) {
                    try {
                      response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-lite',
                        contents: stepText,
                        config: {
                          systemInstruction: `You are an AI compiler for BDD tests.\nMap the user's step to a function in this manifest: ${manifestStr}\nUse context: ${currentContext}\nNever evaluate or replace {{VARIABLES}}. Always extract them exactly as written in the text.`,
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
                            required: [
                              'matchedFunction',
                              'extractedArguments'
                            ]
                          }
                        }
                      });
                      apiCalls++;
                      break; // Success, exit retry loop
                    } catch (e: any) {
                      if (attempt === maxRetries) {
                        throw e; // Exhausted retries
                      }

                      const delay =
                        initialDelayMs * Math.pow(backoffFactor, attempt);
                      // Add up to 20% jitter to prevent thundering herd
                      const jitter = delay * 0.2 * Math.random();
                      const waitTime = Math.round(delay + jitter);

                      if (!state.quiet) {
                        console.warn(
                          `    ⚠️  API Error (${e.message}). Retrying in ${waitTime}ms...`
                        );
                      }
                      await new Promise((resolve) =>
                        setTimeout(resolve, waitTime)
                      );
                      attempt++;
                    }
                  }
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
                if (state.verbose)
                  console.log(`⚡ API returned in ${callDuration}s`);

                if (!response || !response.text) {
                  console.error(
                    `❌ [API ERROR] Received empty response from Gemini.`
                  );
                  process.exit(1);
                }
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
                `    await test.step(${JSON.stringify(stepText)}, async () => {\n` +
                  `      await steps.${resolution.matchedFunction}(page${argsCall});\n` +
                  `    });`
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
    checkPendingContext(); // Catch any pending context at the end of the file

    let specCode = `import { test } from '@playwright/test';\n`;
    specCode += `import * as steps from '${config.frameworkImport}';\n\n`;

    if (config.setupInjection) {
      specCode += `// --- INJECTED BDD SETUP ---\n`;
      specCode += `${config.setupInjection}\n`;
      specCode += `// --------------------------\n\n`;
    }

    if (config.setupFile) {
      try {
        const setupContent = await fs.readFile(
          path.resolve(process.cwd(), config.setupFile),
          'utf-8'
        );
        specCode += `// --- INJECTED BDD SETUP (${config.setupFile}) ---\n`;
        specCode += `${setupContent}\n`;
        specCode += `// --------------------------\n\n`;
      } catch (e: any) {
        console.error(
          `⚠️ [WARNING] Failed to read setupFile "${config.setupFile}":`,
          e.message
        );
      }
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
          specCode += `${step}\n`;
        }
        specCode += `  });\n\n`;
      }
      specCode += `});\n\n`;
    }

    const outPath = path.join(outDir, `${baseName}.test.ts`);
    await fs.writeFile(outPath, specCode);
  }

  if (cacheUpdated) {
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
  }

  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
  if (!state.quiet) {
    console.log(
      `\n✅ Transpilation Complete: ${cacheHits + apiCalls} steps processed (${cacheHits} cached, ${apiCalls} generated via AI) in ${totalDuration}s.`
    );
  }
}

main().catch(console.error);
