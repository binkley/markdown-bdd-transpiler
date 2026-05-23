import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import type { InitOptions } from '../types/index.js';

export async function runInitCommand(options: InitOptions) {
  console.log('🚀 Initializing AI-Augmented Markdown BDD Transpiler...');

  const isHeadless =
    options.autoYes || !!options.providerFlag || !!options.modelFlag;

  // Strict Validation: All or Nothing for CI
  if (
    isHeadless &&
    (!options.autoYes || !options.providerFlag || !options.modelFlag)
  ) {
    console.error(`❌ [ERROR] Incomplete automation flags provided.`);
    console.error(
      `   To run in headless CI mode, you must provide ALL of the following: '--yes', '--provider <name>', and '--model <name>'.`
    );
    console.error(
      `   Example: npx markdown-bdd init -y --provider openai --model gpt-4o`
    );
    process.exit(1);
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
      console.log(
        '\nThis framework requires Playwright to execute the generated tests.'
      );
      installPlaywright = await question(
        'Would you like to install @playwright/test now? (Y/n): '
      );
      installPlaywright = installPlaywright.trim().toLowerCase();
    } else {
      console.log('\n🤖 CI Mode: Automatically installing Playwright...');
    }

    if (
      installPlaywright === '' ||
      installPlaywright === 'y' ||
      installPlaywright === 'yes'
    ) {
      console.log(`\n📦 Installing @playwright/test...`);
      try {
        execSync(`npm install --save-dev @playwright/test`, {
          stdio: 'inherit'
        });
        console.log(`✅ Successfully installed Playwright.`);

        console.log(`\n📦 Installing Playwright browsers...`);
        execSync(`npx playwright install`, {
          stdio: 'inherit'
        });
        console.log(`✅ Successfully installed Playwright browsers.`);
      } catch {
        console.error(
          `❌ Failed to install Playwright. Please run 'npm install --save-dev @playwright/test' manually.`
        );
      }
    }

    let providerChoice = '';
    let provider = '';
    let model = '';
    let installPkg = '';

    if (isHeadless && options.providerFlag) {
      console.log(
        `\n🤖 CI Mode: Automatically configuring provider "${options.providerFlag}"...`
      );
      const normalized = options.providerFlag.toLowerCase();
      if (normalized === 'anthropic') providerChoice = '1';
      else if (normalized === 'gemini') providerChoice = '2';
      else if (normalized === 'openai') providerChoice = '3';
      else {
        console.error(
          `❌ [ERROR] Unsupported LLM provider: "${options.providerFlag}". Supported providers: "anthropic", "gemini", "openai"`
        );
        process.exit(1);
      }
    } else {
      console.log('\n🗳️  Which AI provider would you like to use?');
      console.log('1) Anthropic (Requires ANTHROPIC_API_KEY)');
      console.log('2) Google Gemini (Requires GOOGLE_API_KEY)');
      console.log('3) OpenAI (Requires OPENAI_API_KEY)');

      while (true) {
        providerChoice = await question('Select [1-3]: ');
        providerChoice = providerChoice.trim();
        if (['1', '2', '3'].includes(providerChoice)) {
          break;
        }
        console.log('❌ Invalid selection. Please enter 1, 2, or 3.');
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
        maxRetries: 3,
        initialDelayMs: 1000,
        backoffFactor: 2.0
      }
    };

    const configPath = path.resolve(process.cwd(), 'bdd.config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Created configuration file at: ${configPath}`);

    if (installPkg) {
      console.log(
        `\n📦 Installing necessary peer dependency: ${installPkg}...`
      );
      try {
        execSync(`npm install --save-dev ${installPkg}`, {
          stdio: 'inherit'
        });
        console.log(`✅ Successfully installed ${installPkg}`);
      } catch {
        console.error(
          `❌ Failed to install ${installPkg}. Please run it manually.`
        );
      }
    }

    console.log('\n🎉 Initialization complete!');
    console.log(
      `Don't forget to export your API key (e.g., export ${provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'}="your-key") before running tests.`
    );
  } finally {
    rl.close();
  }
}
