import fs from 'fs/promises';
import path from 'path';
import { parseArgs } from 'util';
import { runInitCommand } from './init.js';
import { transpilerConfigSchema } from './schema.js';
import type {
  ExecutionState,
  TranspilerConfig,
  InitOptions
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { TranspilerError } from '../utils/errors.js';

export async function loadConfig(): Promise<ExecutionState> {
  const args = process.argv.slice(2);
  const options = {
    config: { type: 'string', short: 'c', default: 'bdd.config.json' },
    help: { type: 'boolean', short: 'h', default: false },
    model: { type: 'string' },
    provider: { type: 'string' },
    quiet: { type: 'boolean', short: 'q', default: false },
    strict: { type: 'boolean', default: false },
    verbose: { type: 'boolean', short: 'v', default: false },
    version: { type: 'boolean', short: 'V', default: false },
    yes: { type: 'boolean', short: 'y', default: false },
    'cache-path': { type: 'string' },
    'clear-cache': { type: 'boolean', default: false },
    'framework-import': { type: 'string' },
    'ignore-cache': { type: 'boolean', default: false },
    'llm-backoff-factor': { type: 'string' },
    'llm-concurrency': { type: 'string' },
    'llm-initial-delay-ms': { type: 'string' },
    'llm-max-retries': { type: 'string' },
    'llm-model': { type: 'string' },
    'llm-provider': { type: 'string' },
    'manifest-path': { type: 'string' },
    'max-warnings': { type: 'string' },
    'out-dir': { type: 'string' },
    'setup-file': { type: 'string' },
    'setup-injection': { type: 'string' },
    'test-dir': { type: 'string' },
    'update-cache': { type: 'boolean', default: false }
  } as const;

  const { values: argv, positionals } = parseArgs({
    args,
    options,
    strict: false,
    allowPositionals: true
  });

  if (argv.quiet && argv.verbose) {
    logger.error(
      '❌ [ERROR] Cannot use --quiet and --verbose simultaneously.'
    );
    process.exit(2);
  }

  if (positionals[0] === 'init') {
    if (argv.help) {
      console.log(`
Usage: markdown-bdd init [options]

Scaffolds a new project by generating 'bdd.config.json' and installing required dependencies.
When run without options, it launches an interactive prompt.

CI Automation Options:
  To bypass all interactive prompts in a headless environment (like CI/CD), 
  you must provide ALL of the following flags:
  
  -y, --yes                 Automatically install @playwright/test and browser binaries
  --provider <name>         Automatically configure the specified AI provider 
                            (Supported: 'anthropic', 'gemini', 'openai')
  --model <name>            Specify the exact LLM model to use (e.g., 'gpt-4o')

Example (Automated setup for Gemini):
  npx markdown-bdd init -y --provider gemini --model gemini-2.5-flash-lite

Options:
  -h, --help                Print this help menu
`);
      process.exit(0);
    }

    const initOptions: InitOptions = {
      autoYes: !!argv.yes,
      providerFlag:
        (argv.provider as string) || (argv['llm-provider'] as string),
      modelFlag: (argv.model as string) || (argv['llm-model'] as string)
    };
    await runInitCommand(initOptions);
    process.exit(0);
  }

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
  --clear-cache                     Instantly deletes the cache file and exits without transpiling
  --ignore-cache                    Forces the AI to re-evaluate all steps without saving to cache
  --update-cache                    Forces the AI to re-evaluate all steps and saves the results to cache
  --framework-import <path>         Module path injected into generated tests for standard steps
  --setup-file <path>               TypeScript/JavaScript file injected into every generated test
  --setup-injection <code>          Raw string of code injected into every generated test
  --strict                          Fail the build if any warnings are detected (equivalent to maxWarnings: 0)
  --max-warnings <number>           Maximum number of warnings allowed before failing the build
  --llm-provider <string>           AI provider (e.g., anthropic, gemini, openai)
  --llm-model <string>              Specific AI model (e.g., gemini-2.5-flash-lite)
  --llm-concurrency <number>        Max parallel AI requests (default: 5)
  --llm-max-retries <number>        Maximum API retries on failure (default: 3)
  --llm-initial-delay-ms <ms>       Base delay before the first retry (default: 1000)
  --llm-backoff-factor <number>     Exponential multiplier for each retry (default: 2.0)
  
  -V, --version                     Print the transpiler version and exit
  -v, --verbose                     Enable detailed diagnostic logging
  -q, --quiet                       Suppress all non-error output (including structural warnings)
  -h, --help                        Print this help menu

Arguments:
  files                             Specific Markdown file(s) to process. If omitted, all files in the test directory will be bulk-processed.
`);
    process.exit(0);
  }

  let fileConfig: any = {};
  const configPath = (argv.config as string) || 'bdd.config.json';
  try {
    const configContent = await fs.readFile(
      path.resolve(process.cwd(), configPath),
      'utf-8'
    );
    fileConfig = JSON.parse(configContent);
    logger.info(`\n⚙️  Loaded configuration from ${configPath}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      logger.warn(
        `⚠️ Failed to parse config file ${configPath}: ${error.message}`
      );
    }
  }

  // Merge CLI overrides over file config
  const mergedConfig: Record<string, any> = { ...fileConfig };

  if (argv.testDir) mergedConfig.testDir = argv.testDir;
  if (argv.outDir) mergedConfig.outDir = argv.outDir;
  if (argv.manifestPath) mergedConfig.manifestPath = argv.manifestPath;
  if (argv.cachePath) mergedConfig.cachePath = argv.cachePath;
  if (argv.frameworkImport)
    mergedConfig.frameworkImport = argv.frameworkImport;
  if (argv.setupInjection) mergedConfig.setupInjection = argv.setupInjection;
  if (argv.setupFile) mergedConfig.setupFile = argv.setupFile;
  if (argv.strict) mergedConfig.strict = argv.strict;
  if (argv['max-warnings'])
    mergedConfig.maxWarnings = Number(argv['max-warnings']);

  // Handle nested LLM merges safely
  if (!mergedConfig.llm) mergedConfig.llm = {};
  if (argv['llm-provider']) mergedConfig.llm.provider = argv['llm-provider'];
  if (argv['llm-model']) mergedConfig.llm.model = argv['llm-model'];
  if (argv['llm-concurrency'])
    mergedConfig.llm.concurrency = Number(argv['llm-concurrency']);
  if (argv['llm-max-retries'])
    mergedConfig.llm.maxRetries = Number(argv['llm-max-retries']);
  if (argv['llm-initial-delay-ms'])
    mergedConfig.llm.initialDelayMs = Number(argv['llm-initial-delay-ms']);
  if (argv['llm-backoff-factor'])
    mergedConfig.llm.backoffFactor = Number(argv['llm-backoff-factor']);

  // Validate the merged result against the Zod schema
  const parseResult = transpilerConfigSchema.safeParse(mergedConfig);

  if (!parseResult.success) {
    let errorMsg = `Configuration validation failed in ${configPath}.\n`;
    for (const issue of parseResult.error.issues) {
      const pathStr =
        issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      errorMsg += `   - ${pathStr}${issue.message}\n`;
    }
    throw new TranspilerError(errorMsg);
  }

  return {
    config: parseResult.data as TranspilerConfig,
    clearCache:
      !!argv['clear-cache'] || process.env.TRANSPILER_CLEAR_CACHE === 'true',
    ignoreCache:
      !!argv['ignore-cache'] ||
      process.env.TRANSPILER_IGNORE_CACHE === 'true',
    updateCache:
      !!argv['update-cache'] ||
      process.env.TRANSPILER_UPDATE_CACHE === 'true',
    targetFiles: positionals
  };
}
