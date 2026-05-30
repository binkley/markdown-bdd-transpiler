import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

export class CacheManager {
  private cache: Record<string, any> = {};
  public cacheHits = 0;
  public cacheUpdated = false;

  constructor(
    private cachePath: string,
    private ignoreCache: boolean = false,
    private updateCache: boolean = false
  ) {}

  async clear() {
    try {
      await fs.rm(this.cachePath, { force: true });
      logger.debug(`ℹ️  Cleared cache at ${this.cachePath}`);
    } catch (e: any) {
      logger.warn(`⚠️ Failed to clear cache: ${e.message}`);
    }
  }

  async load() {
    if (this.ignoreCache) {
      logger.debug('ℹ️  Ignoring cache file as requested (--ignore-cache).');
      return;
    }

    try {
      const cacheStr = await fs.readFile(this.cachePath, 'utf-8');
      this.cache = JSON.parse(cacheStr);
    } catch {
      logger.debug('ℹ️  No existing cache found. Starting fresh.');
    }
  }

  get(key: string) {
    if (this.ignoreCache || this.updateCache) return undefined;
    const val = this.cache[key];
    if (val) this.cacheHits++;
    return val;
  }

  set(key: string, value: any) {
    if (this.ignoreCache) return;
    this.cache[key] = value;
    this.cacheUpdated = true;
  }

  async save() {
    if (this.ignoreCache || !this.cacheUpdated) return;
    await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
  }
}
