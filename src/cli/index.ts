import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from './config.js';
import { getLLMProvider } from '../llm/factory.js';
import { CacheManager } from '../compiler/cache.js';
import { parseMarkdown } from '../parser/ast.js';
import { resolveFeatures } from '../compiler/resolver.js';
import { emitPlaywright } from '../compiler/playwright.js';

export async function main() {
  const state = await loadConfig();
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
    console.error(`❌ [ERROR] Failed to read manifest at ${manifestPath}`);
    process.exit(1);
  }

  const cache = new CacheManager(cachePath, state.verbose);
  await cache.load();

  let mdFiles: string[] = [];
  const isTargetedRun = state.targetFiles.length > 0;

  if (isTargetedRun) {
    for (const target of state.targetFiles) {
      if (target.endsWith('.md')) {
        mdFiles.push(target);
      } else {
        if (!state.quiet)
          console.warn(`⚠️ Skipping non-markdown file: ${target}`);
      }
    }
  } else {
    try {
      const files = await fs.readdir(testDir);
      mdFiles = files
        .filter((f) => f.endsWith('.md'))
        .map((f) => path.join(testDir, f));
    } catch {
      if (!state.quiet)
        console.log(`No "${config.testDir}" directory found.`);
      return;
    }

    await fs.rm(outDir, { recursive: true, force: true });
  }

  await fs.mkdir(outDir, { recursive: true });

  const startTime = performance.now();
  const isVerbose =
    process.env.TRANSPILER_VERBOSE === 'true' || state.verbose;

  let totalApiCalls = 0;

  // Let's also load setupFile if needed
  let setupContent = '';
  if (config.setupFile) {
    try {
      setupContent = await fs.readFile(
        path.resolve(process.cwd(), config.setupFile),
        'utf-8'
      );
    } catch (e: any) {
      console.error(
        `⚠️ [WARNING] Failed to read setupFile "${config.setupFile}":`,
        e.message
      );
    }
  }

  for (const mdFile of mdFiles) {
    const filePath = path.resolve(process.cwd(), mdFile);
    const baseName = path.basename(mdFile);

    if (isVerbose) {
      console.log(
        `\n📄 Transpiling ${mdFile} -> ${config.outDir}/${baseName}.test.ts`
      );
    }
    const content = await fs.readFile(filePath, 'utf-8');
    const relativeFilePath = path.relative(process.cwd(), filePath);

    // 1. Parse
    const { features, warnings: parseWarnings } = parseMarkdown(
      content,
      relativeFilePath
    );

    for (const w of parseWarnings) {
      if (!state.quiet || w.includes('❌')) {
        console.warn(w);
      }
    }

    const { apiCalls } = await resolveFeatures(
      features,
      manifestStr,
      llmProvider,
      config.llm,
      cache,
      { verbose: isVerbose, quiet: state.quiet, baseName }
    );
    totalApiCalls += apiCalls;

    // 3. Emit Playwright code
    const { specCode, warnings: emitWarnings } = emitPlaywright(
      features,
      config,
      setupContent
    );

    for (const w of emitWarnings) {
      if (!state.quiet || w.includes('❌')) {
        console.warn(w);
      }
    }

    // Only write output if there are valid scenarios
    if (features.some((f) => f.scenarios.some((s) => s.steps.length > 0))) {
      const outPath = path.join(outDir, `${baseName}.test.ts`);
      await fs.writeFile(outPath, specCode);
    }
  }

  await cache.save();

  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
  if (!state.quiet) {
    console.log(
      `\n✅ Transpilation Complete: ${cache.cacheHits + totalApiCalls} steps processed (${cache.cacheHits} cached, ${totalApiCalls} generated via AI) in ${totalDuration}s.`
    );
  }
}
