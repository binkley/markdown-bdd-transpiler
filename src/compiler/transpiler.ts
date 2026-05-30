import fs from 'fs/promises';
import path from 'path';
import { getLLMProvider } from '../llm/factory.js';
import { CacheManager } from './cache.js';
import { parseMarkdown } from '../parser/ast.js';
import { resolveFeatures } from './resolver.js';
import pLimit from 'p-limit';
import { emitPlaywright } from './playwright.js';
import { logger } from '../utils/logger.js';
import { TranspilerError } from '../utils/errors.js';
import type { ExecutionState } from '../types/index.js';

export class Transpiler {
  constructor(private state: ExecutionState) {}

  async run(): Promise<{
    apiCalls: number;
    warnings: number;
    duration: string;
  }> {
    const config = this.state.config;
    const llmProvider = getLLMProvider(config.llm);

    const manifestPath = path.resolve(process.cwd(), config.manifestPath);
    const cachePath = path.resolve(process.cwd(), config.cachePath);
    const outDir = path.resolve(process.cwd(), config.outDir);
    const testDir = path.resolve(process.cwd(), config.testDir);

    let manifestStr = '';
    try {
      manifestStr = await fs.readFile(manifestPath, 'utf-8');
    } catch {
      throw new TranspilerError(`Failed to read manifest at ${manifestPath}`);
    }

    const cache = new CacheManager(
      cachePath,
      this.state.ignoreCache,
      this.state.updateCache
    );

    if (this.state.clearCache) {
      await cache.clear();
      logger.info('ℹ️  Exiting because --clear-cache was provided.');
      return { apiCalls: 0, warnings: 0, duration: '0.00' };
    }

    await cache.load();

    let mdFiles: string[] = [];
    const isTargetedRun = this.state.targetFiles.length > 0;

    if (isTargetedRun) {
      for (const target of this.state.targetFiles) {
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
        return { apiCalls: 0, warnings: 0, duration: '0.00' };
      }
    }

    await fs.mkdir(outDir, { recursive: true });
    const files = await fs.readdir(outDir);
    await Promise.all(
      files.map((file) =>
        fs.rm(`${outDir}/${file}`, { recursive: true, force: true })
      )
    );

    const startTime = performance.now();

    let setupContent = '';
    if (config.bannerFile) {
      try {
        setupContent = await fs.readFile(
          path.resolve(process.cwd(), config.bannerFile),
          'utf-8'
        );
      } catch (e: any) {
        logger.error(
          `⚠️ [WARNING] Failed to read bannerFile "${config.bannerFile}":`,
          e.message
        );
      }
    }

    const limit = pLimit(config.llm.concurrency || 5);

    const filePromises = mdFiles.map(async (mdFile) => {
      const filePath = path.resolve(process.cwd(), mdFile);
      const baseName = path.basename(mdFile);

      logger.debug(
        `\n📄 Transpiling ${mdFile} -> ${config.outDir}/${baseName}.test.ts`
      );

      const content = await fs.readFile(filePath, 'utf-8');
      const relativeFilePath = path.relative(process.cwd(), filePath);

      const {
        features,
        warnings: parseWarnings,
        errors: parseErrors
      } = parseMarkdown(content, relativeFilePath);

      for (const w of parseWarnings) {
        if (w.includes('❌')) logger.error(w);
        else logger.warn(w);
      }

      if (parseErrors.length > 0) {
        for (const e of parseErrors) logger.error(e);
        throw new TranspilerError(
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

      const { specCode, warnings: emitWarnings } = emitPlaywright(
        features,
        config,
        setupContent
      );

      for (const w of emitWarnings) {
        if (w.includes('❌')) logger.error(w);
        else logger.warn(w);
      }

      if (features.some((f) => f.scenarios.some((s) => s.steps.length > 0))) {
        const outPath = path.join(outDir, `${baseName}.test.ts`);
        await fs.writeFile(outPath, specCode);
      }

      return {
        apiCalls,
        warnings: parseWarnings.length + emitWarnings.length
      };
    });

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

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);

    // Only log the success banner if we didn't just clear the cache
    if (!this.state.clearCache) {
      logger.info(
        `\n✅ Transpilation Complete: ${cache.cacheHits + totalApiCalls} steps processed (${cache.cacheHits} cached, ${totalApiCalls} generated via AI) in ${duration}s.`
      );
    }

    return { apiCalls: totalApiCalls, warnings: totalWarnings, duration };
  }
}
