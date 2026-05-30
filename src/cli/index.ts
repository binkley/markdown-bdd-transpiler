import { parseArgs } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from './config.js';
import { getLLMProvider } from '../llm/factory.js';
import { CacheManager } from '../compiler/cache.js';
import { parseMarkdown } from '../parser/ast.js';
import { resolveFeatures } from '../compiler/resolver.js';
import pLimit from 'p-limit';
import { emitPlaywright } from '../compiler/playwright.js';
import { logger, LogLevel } from '../utils/logger.js';

export async function main() {
  const state = await loadConfig();

  const { values: argv } = parseArgs({
    args: process.argv.slice(2),
    options: {
      verbose: { type: 'boolean', short: 'v' },
      quiet: { type: 'boolean', short: 'q' }
    },
    strict: false
  });

  const isVerbose =
    !!argv.verbose || process.env.TRANSPILER_VERBOSE === 'true';
  const isQuiet = !!argv.quiet || process.env.TRANSPILER_QUIET === 'true';

  if (isQuiet) logger.setLevel(LogLevel.ERROR);
  else if (isVerbose) logger.setLevel(LogLevel.DEBUG);
  else logger.setLevel(LogLevel.INFO);

  const config = state.config;
  const llmProvider = getLLMProvider(config.llm);

  const manifestPath = path.resolve(process.cwd(), config.manifestPath);
  const cachePath = path.resolve(process.cwd(), config.cachePath);
  const outDir = path.resolve(process.cwd(), config.outDir);
  const testDir = path.resolve(process.cwd(), config.testDir);

  let manifestStr = '';
  try {
    manifestStr = await fs.readFile(manifestPath, 'utf-8');
  } catch {
    logger.error(`❌ [ERROR] Failed to read manifest at ${manifestPath}`);
    process.exit(1);
  }

  const cache = new CacheManager(
    cachePath,
    state.ignoreCache,
    state.updateCache
  );

  if (state.clearCache) {
    await cache.clear();
    logger.info('ℹ️  Exiting because --clear-cache was provided.');
    process.exit(0);
  }

  await cache.load();

  let mdFiles: string[] = [];
  const isTargetedRun = state.targetFiles.length > 0;

  if (isTargetedRun) {
    for (const target of state.targetFiles) {
      if (target.endsWith('.md')) {
        mdFiles.push(target);
      } else {
        logger.warn(`⚠️ Skipping non-markdown file: ${target}`);
      }
    }
  } else {
    try {
      const files = await fs.readdir(testDir);
      mdFiles = files
        .filter((f) => f.endsWith('.md'))
        .map((f) => path.join(testDir, f));
    } catch {
      logger.info(`No "${config.testDir}" directory found.`);
      return;
    }
  }

  // Unconditionally clear the output directory to prevent Playwright from running stale tests
  // Instead of deleting the directory itself (which fails if it's a Docker volume mount point),
  // we ensure it exists and then delete all its contents.
  await fs.mkdir(outDir, { recursive: true });
  const files = await fs.readdir(outDir);
  await Promise.all(
    files.map((file) =>
      fs.rm(`${outDir}/${file}`, { recursive: true, force: true })
    )
  );

  const startTime = performance.now();

  // Let's also load setupFile if needed
  let setupContent = '';
  if (config.setupFile) {
    try {
      setupContent = await fs.readFile(
        path.resolve(process.cwd(), config.setupFile),
        'utf-8'
      );
    } catch (e: any) {
      logger.error(
        `⚠️ [WARNING] Failed to read setupFile "${config.setupFile}":`,
        e.message
      );
    }
  }

  // Create the global concurrency limiter
  const limit = pLimit(config.llm.concurrency || 5);

  const filePromises = mdFiles.map(async (mdFile) => {
    const filePath = path.resolve(process.cwd(), mdFile);
    const baseName = path.basename(mdFile);

    logger.debug(
      `\n📄 Transpiling ${mdFile} -> ${config.outDir}/${baseName}.test.ts`
    );

    const content = await fs.readFile(filePath, 'utf-8');
    const relativeFilePath = path.relative(process.cwd(), filePath);

    // 1. Parse
    const {
      features,
      warnings: parseWarnings,
      errors: parseErrors
    } = parseMarkdown(content, relativeFilePath);

    for (const w of parseWarnings) {
      if (w.includes('❌')) {
        logger.error(w);
      } else {
        logger.warn(w);
      }
    }

    if (parseErrors.length > 0) {
      for (const e of parseErrors) {
        logger.error(e);
      }
      throw new Error(
        `Transpilation failed for ${mdFile} due to parsing errors.`
      );
    }

    const { apiCalls } = await resolveFeatures(
      features,
      manifestStr,
      llmProvider,
      config.llm,
      cache,
      limit,
      { sourceFile: relativeFilePath }
    );

    // 3. Emit Playwright code
    const { specCode, warnings: emitWarnings } = emitPlaywright(
      features,
      config,
      setupContent
    );

    for (const w of emitWarnings) {
      if (w.includes('❌')) {
        logger.error(w);
      } else {
        logger.warn(w);
      }
    }

    // Only write output if there are valid scenarios
    if (features.some((f) => f.scenarios.some((s) => s.steps.length > 0))) {
      const outPath = path.join(outDir, `${baseName}.test.ts`);
      await fs.writeFile(outPath, specCode);
    }

    return { apiCalls, warnings: parseWarnings.length + emitWarnings.length };
  });

  // Execute all files concurrently
  const fileResults = await Promise.all(filePromises);
  const totalApiCalls = fileResults.reduce(
    (sum, res) => sum + res.apiCalls,
    0
  );
  const totalWarnings = fileResults.reduce(
    (sum, res) => sum + res.warnings,
    0
  );

  await cache.save();

  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
  logger.info(
    `\n✅ Transpilation Complete: ${cache.cacheHits + totalApiCalls} steps processed (${cache.cacheHits} cached, ${totalApiCalls} generated via AI) in ${totalDuration}s.`
  );

  const effectiveMaxWarnings = config.strict ? 0 : config.maxWarnings;

  if (
    effectiveMaxWarnings !== undefined &&
    totalWarnings > effectiveMaxWarnings
  ) {
    logger.error(
      `\n❌ Build failed: Found ${totalWarnings} warnings (max allowed: ${effectiveMaxWarnings}).`
    );
    process.exit(1);
  }
}
