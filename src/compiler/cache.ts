import fs from 'fs/promises';

export class CacheManager {
  private cache: Record<string, any> = {};
  public cacheHits = 0;
  public cacheUpdated = false;

  constructor(
    private cachePath: string,
    private isVerbose: boolean
  ) {}

  async load() {
    try {
      const cacheStr = await fs.readFile(this.cachePath, 'utf-8');
      this.cache = JSON.parse(cacheStr);
    } catch {
      if (this.isVerbose) {
        console.log('ℹ️  No existing cache found. Starting fresh.');
      }
    }
  }

  get(key: string) {
    const val = this.cache[key];
    if (val) this.cacheHits++;
    return val;
  }

  set(key: string, value: any) {
    this.cache[key] = value;
    this.cacheUpdated = true;
  }

  async save() {
    if (this.cacheUpdated) {
      await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
    }
  }
}
