import fs from 'fs/promises';
import path from 'path';
import mri from 'mri';
import { runInitCommand } from './init.js';
import type {
  ExecutionState,
  TranspilerConfig,
  InitOptions
} from '../types/index.js';

export async function loadConfig(): Promise<ExecutionState> {
  const args = process.argv.slice(2);
  const argv = mri(args, {
    alias: {
      c: 'config',
      h: 'help',
      v: 'verbose',
      q: 'quiet',
      V: 'version',
      y: 'yes',
      'test-dir': 'testDir',
      'out-dir': 'outDir',
      'manifest-path': 'manifestPath',
      'cache-path': 'cachePath',
      'framework-import': 'frameworkImport',
      'setup-injection': 'setupInjection',
      'setup-file': 'setupFile',
      'llm-provider': 'llm.provider',
      'llm-model': 'llm.model',
      'llm-concurrency': 'llm.concurrency',
      'llm-max-retries': 'llm.maxRetries',
      'llm-initial-delay-ms': 'llm.initialDelayMs',
      'llm-backoff-factor': 'llm.backoffFactor'
    },
    default: { config: 'bdd.config.json' }
  });

  if (args[0] === 'init') {
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
        argv.provider || argv['llm-provider'] || argv['llm.provider'],
      modelFlag: argv.model || argv['llm-model'] || argv['llm.model']
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
  --framework-import <path>         Module path injected into generated tests for standard steps
  --setup-file <path>               TypeScript/JavaScript file injected into every generated test
  --setup-injection <code>          Raw string of code injected into every generated test
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

  const defaultConfig: Partial<TranspilerConfig> = {
    testDir: 'tests',
    outDir: '.generated',
    manifestPath: 'manifest.json',
    cachePath: 'bdd-cache.json',
    frameworkImport: '@binkley/markdown-bdd-transpiler/framework'
  };

  let fileConfig: any = {};
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

  if (!fileConfig.llm) {
    console.error(
      `❌ [ERROR] Missing required 'llm' configuration block in ${argv.config}.`
    );
    console.error(
      `Please explicitly define your LLM provider and model. Example:\n{\n  "llm": {\n    "provider": "gemini",\n    "model": "gemini-2.5-flash-lite",\n    "maxRetries": 3,\n    "initialDelayMs": 1000,\n    "backoffFactor": 2.0\n  }\n}`
    );
    process.exit(1);
  }

  const finalConfig: TranspilerConfig = {
    testDir: argv.testDir ?? fileConfig.testDir ?? defaultConfig.testDir!,
    outDir: argv.outDir ?? fileConfig.outDir ?? defaultConfig.outDir!,
    manifestPath:
      argv.manifestPath ??
      fileConfig.manifestPath ??
      defaultConfig.manifestPath!,
    cachePath:
      argv.cachePath ?? fileConfig.cachePath ?? defaultConfig.cachePath!,
    frameworkImport:
      argv.frameworkImport ??
      fileConfig.frameworkImport ??
      defaultConfig.frameworkImport!,
    setupInjection: argv.setupInjection ?? fileConfig.setupInjection,
    setupFile: argv.setupFile ?? fileConfig.setupFile,
    llm: {
      provider: argv['llm.provider'] ?? fileConfig.llm.provider,
      model: argv['llm.model'] ?? fileConfig.llm.model,
      concurrency: argv['llm.concurrency'] ?? fileConfig.llm.concurrency ?? 5,
      maxRetries: argv['llm.maxRetries'] ?? fileConfig.llm.maxRetries ?? 3,
      initialDelayMs:
        argv['llm.initialDelayMs'] ?? fileConfig.llm.initialDelayMs ?? 1000,
      backoffFactor:
        argv['llm.backoffFactor'] ?? fileConfig.llm.backoffFactor ?? 2.0
    }
  };

  return {
    config: finalConfig,
    verbose: !!argv.verbose,
    quiet: !!argv.quiet,
    targetFiles: argv._
  };
}
