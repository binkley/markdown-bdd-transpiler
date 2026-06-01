import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';
import type { InitOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { TranspilerError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runInitCommand(options: InitOptions) {
  logger.info('🚀 Initializing AI-Augmented Markdown BDD Transpiler...');

  const cwd = process.cwd();

  // Try to find the manifest path from an existing config, or default to manifest.json
  let targetManifestPath = 'manifest.json';
  const configPath = path.resolve(cwd, 'bdd.config.json');

  if (existsSync(configPath)) {
    try {
      const existingConfig = JSON.parse(
        await fs.readFile(configPath, 'utf-8')
      );
      if (existingConfig.manifestPath) {
        targetManifestPath = existingConfig.manifestPath;
      }
    } catch {
      // Ignore parse errors here, we'll bail out anyway due to the file existing
    }
  }

  const resolvedManifestPath = path.resolve(cwd, targetManifestPath);

  // Early Bail Idempotency Check
  const hasConfig = existsSync(configPath);
  const hasManifest = existsSync(resolvedManifestPath);

  if (hasConfig || hasManifest) {
    logger.warn(
      '\n⚠️  Initialization aborted to protect your existing files.'
    );
    logger.info('\nFound existing configuration files:');
    if (hasConfig) logger.info(`- ${configPath}`);
    if (hasManifest) logger.info(`- ${resolvedManifestPath}`);

    logger.info(
      '\nIf you are trying to upgrade or reconfigure the transpiler:'
    );
    logger.info(
      '1. Review the latest default configurations in the documentation.'
    );
    logger.info('2. Manually update your existing files.');
    logger.info(
      '3. Or, if you want to start fresh, delete these files and run init again.'
    );

    // Exit cleanly without throwing a stack trace
    process.exit(0);
  }

  const isHeadless =
    options.autoYes || !!options.providerFlag || !!options.modelFlag;

  // Strict Validation: All or Nothing for CI
  if (
    isHeadless &&
    (!options.autoYes || !options.providerFlag || !options.modelFlag)
  ) {
    throw new TranspilerError(
      `Incomplete automation flags provided.\n   To run in headless CI mode, you must provide ALL of the following: '--yes', '--provider <name>', and '--model <name>'.\n   Example: npx markdown-bdd init -y --provider openai --model gpt-4o`
    );
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  try {
    let installPlaywright = 'y';

    if (!isHeadless) {
      logger.info(
        '\nThis framework requires Playwright to execute the generated tests.'
      );
      installPlaywright = await question(
        'Would you like to install @playwright/test now? (Y/n): '
      );
      installPlaywright = installPlaywright.trim().toLowerCase();
    } else {
      logger.info('\n🤖 CI Mode: Automatically installing Playwright...');
    }

    if (
      installPlaywright === '' ||
      installPlaywright === 'y' ||
      installPlaywright === 'yes'
    ) {
      logger.info(`\n📦 Installing @playwright/test...`);
      try {
        execSync(`npm install --save-dev @playwright/test`, {
          stdio: 'inherit'
        });
        logger.info(`✅ Successfully installed Playwright.`);

        logger.info(`\n📦 Installing Playwright browsers...`);
        execSync(`npx playwright install`, {
          stdio: 'inherit'
        });
        logger.info(`✅ Successfully installed Playwright browsers.`);
      } catch {
        logger.error(
          `❌ Failed to install Playwright. Please run 'npm install --save-dev @playwright/test' manually.`
        );
      }
    }

    let providerChoice = '';
    let provider = '';
    let model = '';
    let installPkg = '';

    if (isHeadless && options.providerFlag) {
      logger.info(
        `\n🤖 CI Mode: Automatically configuring provider "${options.providerFlag}"...`
      );
      const normalized = options.providerFlag.toLowerCase();
      if (normalized === 'anthropic') providerChoice = '1';
      else if (normalized === 'gemini') providerChoice = '2';
      else if (normalized === 'openai') providerChoice = '3';
      else {
        throw new TranspilerError(
          `Unsupported LLM provider: "${options.providerFlag}". Supported providers: "anthropic", "gemini", "openai"`
        );
      }
    } else {
      logger.info('\n🗳️  Which AI provider would you like to use?');
      logger.info('1) Anthropic (Requires ANTHROPIC_API_KEY)');
      logger.info('2) Google Gemini (Requires GOOGLE_API_KEY)');
      logger.info('3) OpenAI (Requires OPENAI_API_KEY)');

      while (true) {
        providerChoice = await question('Select [1-3]: ');
        providerChoice = providerChoice.trim();
        if (['1', '2', '3'].includes(providerChoice)) {
          break;
        }
        logger.info('❌ Invalid selection. Please enter 1, 2, or 3.');
      }
    }

    if (providerChoice === '1') {
      provider = 'anthropic';
      model = 'claude-3-5-sonnet-latest';
      installPkg = '@ai-sdk/anthropic';
    } else if (providerChoice === '2') {
      provider = 'gemini';
      model = 'gemini-2.5-flash-lite';
      installPkg = '@ai-sdk/google';
    } else if (providerChoice === '3') {
      provider = 'openai';
      model = 'gpt-4o-mini';
      installPkg = '@ai-sdk/openai';
    }

    if (isHeadless && options.modelFlag) {
      model = options.modelFlag;
    }

    const config = {
      testDir: 'tests',
      outDir: '.generated',
      manifestPath: 'manifest.json',
      cachePath: 'bdd-cache.json',
      llm: {
        provider,
        model,
        concurrency: 5,
        maxRetries: 3,
        initialDelayMs: 1000,
        backoffFactor: 2.0
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    logger.info(`\n✅ Created configuration file at: ${configPath}`);

    // Eject the manifest
    // Calculate path to the source manifest.json.
    // In dev: src/cli/init.ts -> ../../manifest.json
    // In dist: dist/src/cli/init.js -> ../../../manifest.json
    let sourceManifestPath = path.resolve(
      __dirname,
      '..',
      '..',
      'manifest.json'
    );
    if (!existsSync(sourceManifestPath)) {
      sourceManifestPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'manifest.json'
      );
    }
    try {
      await fs.copyFile(sourceManifestPath, resolvedManifestPath);
      logger.info(`✅ Ejected default manifest to: ${resolvedManifestPath}`);
      logger.info(
        `   (Edit this file to add custom UI steps for your project)`
      );
    } catch (err) {
      logger.warn(
        `⚠️ Failed to copy default manifest.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (installPkg) {
      logger.info(
        `\n📦 Installing necessary peer dependency: ${installPkg}...`
      );
      try {
        execSync(`npm install --save-dev ${installPkg}`, {
          stdio: 'inherit'
        });
        logger.info(`✅ Successfully installed ${installPkg}`);
      } catch {
        logger.error(
          `❌ Failed to install ${installPkg}. Please run it manually.`
        );
      }
    }

    logger.info('\n🎉 Initialization complete!');
    logger.info(
      `Don't forget to export your API key (e.g., export ${provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'}="your-key") before running tests.`
    );
  } finally {
    rl.close();
  }
}
