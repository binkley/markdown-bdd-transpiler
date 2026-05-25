import { test, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { CacheManager } from './cache.js';

const testCachePath = path.join(process.cwd(), '.test-cache.json');

const originalLog = console.log;
const originalError = console.error;

before(() => {
  console.log = () => {};
  console.error = () => {};
});

after(() => {
  console.log = originalLog;
  console.error = originalError;
});

async function cleanup() {
  await fs.rm(testCachePath, { force: true });
}

test('loads and saves cache properly', async (t) => {
  t.after(cleanup);
  const cache = new CacheManager(testCachePath, false);
  cache.set('foo', 'bar');
  assert.strictEqual(cache.get('foo'), 'bar');
  assert.strictEqual(cache.cacheHits, 1);

  await cache.save();

  const loadedCache = new CacheManager(testCachePath, false);
  await loadedCache.load();
  assert.strictEqual(loadedCache.get('foo'), 'bar');
});

test('handles missing cache file on load', async (t) => {
  t.after(cleanup);
  const cache = new CacheManager(testCachePath, true);
  await cache.load();
  assert.strictEqual(cache.get('nonexistent'), undefined);
});

test('clear() deletes the cache file', async (t) => {
  t.after(cleanup);
  await fs.writeFile(testCachePath, JSON.stringify({ old: 'data' }));
  const cache = new CacheManager(testCachePath, true);
  await cache.clear();

  let fileExists = true;
  try {
    await fs.access(testCachePath);
  } catch {
    fileExists = false;
  }
  assert.strictEqual(fileExists, false);
});

test('clear() gracefully handles missing file', async (t) => {
  t.after(cleanup);
  const cache = new CacheManager(testCachePath, false);
  await cache.clear();
  assert.ok(true);
});

test('ignoreCache prevents loading, getting, setting, and saving', async (t) => {
  t.after(cleanup);
  await fs.writeFile(testCachePath, JSON.stringify({ hidden: 'data' }));

  const cache = new CacheManager(testCachePath, true, true);
  await cache.load();

  assert.strictEqual(cache.get('hidden'), undefined);

  cache.set('new', 'value');
  assert.strictEqual(cache.get('new'), undefined);
  assert.strictEqual(cache.cacheUpdated, false);

  await cache.save();
  const diskContent = await fs.readFile(testCachePath, 'utf-8');
  assert.strictEqual(diskContent, '{"hidden":"data"}');
});

test('updateCache forces cache miss but allows saving new data', async (t) => {
  t.after(cleanup);
  await fs.writeFile(
    testCachePath,
    JSON.stringify({ existing: 'old_value', untouched: 'data' })
  );

  // ignoreCache = false, updateCache = true
  const cache = new CacheManager(testCachePath, false, false, true);
  await cache.load();

  // Should force a miss for existing data
  assert.strictEqual(cache.get('existing'), undefined);
  assert.strictEqual(cache.get('untouched'), undefined);
  assert.strictEqual(cache.cacheHits, 0);

  // Should allow setting new data
  cache.set('existing', 'new_value');
  assert.strictEqual(cache.cacheUpdated, true);

  // Should save the merged result back to disk
  await cache.save();
  const diskContent = await fs.readFile(testCachePath, 'utf-8');
  const diskJson = JSON.parse(diskContent);

  // It should preserve untouched data from the load, but overwrite the updated key
  assert.strictEqual(diskJson.untouched, 'data');
  assert.strictEqual(diskJson.existing, 'new_value');
});
test('clear() catches and logs errors', async (t) => {
  t.after(cleanup);
  // Attempting to remove the current working directory without recursive: true
  // will throw an EISDIR or EPERM error, hitting the catch block in CacheManager.clear()
  const cache = new CacheManager(process.cwd(), true);
  await cache.clear();
  assert.ok(true);
});
