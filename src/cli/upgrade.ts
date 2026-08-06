import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { TranspilerError } from '../utils/errors.js';
import { multiselect } from '../utils/prompts.js';
import type { TranspilerConfig, UpgradeOptions } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runUpgradeCommand(
  config: TranspilerConfig,
  options: UpgradeOptions
) {
  const cwd = process.cwd();
  const localManifestPath = path.resolve(cwd, config.manifestPath);

  let localManifest: any;
  try {
    const manifestStr = await fs.readFile(localManifestPath, 'utf-8');
    localManifest = JSON.parse(manifestStr);
  } catch {
    throw new TranspilerError(
      `Could not read local manifest at ${localManifestPath}`
    );
  }

  if (!localManifest.available_steps) {
    localManifest.available_steps = [];
  }

  // Load the upstream default manifest shipped with the package
  const packageRoot = path.resolve(__dirname, '..', '..');

  // Try to find it in the package root (handles dev vs dist differences)
  const pkgManifestPaths = [
    path.resolve(packageRoot, 'manifest.json'),
    path.resolve(packageRoot, '..', 'manifest.json'),
    path.resolve(packageRoot, '..', '..', 'manifest.json')
  ];

  let upstreamManifestStr: string | undefined;
  for (const p of pkgManifestPaths) {
    try {
      upstreamManifestStr = await fs.readFile(p, 'utf-8');
      break;
    } catch {
      // Ignore and try next
    }
  }

  if (!upstreamManifestStr) {
    throw new TranspilerError(
      `Could not locate the upstream default manifest.json bundled with the package.`
    );
  }

  const upstreamManifest = JSON.parse(upstreamManifestStr);
  const upstreamSteps: any[] = upstreamManifest.available_steps || [];

  // Diffing logic
  const localStepNames = new Set(
    localManifest.available_steps.map((s: any) => s.function_name)
  );

  const newUpstreamSteps = upstreamSteps.filter(
    (s: any) => !localStepNames.has(s.function_name)
  );

  if (newUpstreamSteps.length === 0) {
    logger.info(
      '\n✅ Your local manifest is already up to date with the core framework!'
    );
    return;
  }

  let selectedSteps = newUpstreamSteps;

  if (options.autoYes) {
    logger.info(
      `\n🤖 CI Mode (--yes): Automatically merging ${newUpstreamSteps.length} new capabilities...`
    );
  } else {
    // If not autoYes, check if we are in a non-interactive shell
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      throw new TranspilerError(
        `Interactive prompt blocked because the current environment is not a TTY terminal.\n   To run this command automatically in CI/CD or via an AI agent, use the '--yes' flag.\n   Example: npx markdown-bdd upgrade --yes`
      );
    }

    logger.info('\n🚀 New capabilities found in the core framework!');
    logger.info(
      '   These steps exist in the latest package but are missing from your local manifest.\n'
    );

    const promptOptions = newUpstreamSteps.map((step) => ({
      label: `${step.function_name} \x1b[90m- ${step.description}\x1b[0m`,
      value: step,
      checked: true // Default to merging all new steps
    }));

    selectedSteps = await multiselect(
      'Select the steps you want to safely merge into your local manifest.json:',
      promptOptions
    );
  }

  if (selectedSteps.length === 0) {
    logger.info('\nℹ️  Upgrade cancelled. No steps were added.');
    return;
  }

  localManifest.available_steps.push(...selectedSteps);

  await fs.writeFile(
    localManifestPath,
    JSON.stringify(localManifest, null, 2)
  );

  logger.info(
    `\n✅ Successfully merged ${selectedSteps.length} step(s) into ${config.manifestPath}`
  );
}
