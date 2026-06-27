import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadConfig } from './config.js';

describe('CLI Config Loader', () => {
  let originalArgv: string[];
  let originalExit: NodeJS.Process['exit'];
  let tempDir: string;
  let originalCwd: () => string;

  beforeEach(async () => {
    originalArgv = process.argv;
    originalExit = process.exit;
    originalCwd = process.cwd;

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bdd-config-test-'));
    process.cwd = () => tempDir;

    // Prevent actual exiting during tests
    process.exit = (() => {}) as any;
  });

  afterEach(async () => {
    process.argv = originalArgv;
    process.exit = originalExit;
    process.cwd = originalCwd;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('loads defaults when no config file exists', async () => {
    process.argv = [
      'node',
      'index.js',
      '--llm-provider',
      'gemini',
      '--llm-model',
      'test'
    ];
    const state = await loadConfig();

    assert.equal(state.config.testDir, 'tests');
    assert.equal(state.config.outDir, '.generated');
    assert.equal(state.config.manifestPath, 'manifest.json');
    assert.equal(state.config.cachePath, 'bdd-cache.json');
  });

  test('merges config file over defaults', async () => {
    process.argv = [
      'node',
      'index.js',
      '--llm-provider',
      'gemini',
      '--llm-model',
      'test'
    ];
    await fs.writeFile(
      path.join(tempDir, 'bdd.config.json'),
      JSON.stringify({ testDir: 'custom-tests', outDir: 'custom-out' })
    );

    const state = await loadConfig();
    assert.equal(state.config.testDir, 'custom-tests');
    assert.equal(state.config.outDir, 'custom-out');
  });

  test('merges CLI args over config file', async () => {
    process.argv = [
      'node',
      'index.js',
      '--test-dir',
      'cli-tests',
      '--llm-provider',
      'gemini',
      '--llm-model',
      'test'
    ];
    await fs.writeFile(
      path.join(tempDir, 'bdd.config.json'),
      JSON.stringify({ testDir: 'file-tests' })
    );

    const state = await loadConfig();
    assert.equal(state.config.testDir, 'cli-tests');
  });

  test('parses llm config overrides from CLI', async () => {
    process.argv = [
      'node',
      'index.js',
      '--llm-provider',
      'anthropic',
      '--llm-model',
      'claude-3-opus-20240229'
    ];
    const state = await loadConfig();

    assert.equal(state.config.llm.provider, 'anthropic');
    assert.equal(state.config.llm.model, 'claude-3-opus-20240229');
  });

  test('captures target positional files', async () => {
    process.argv = [
      'node',
      'index.js',
      'test1.md',
      'test2.md',
      '--llm-provider',
      'gemini',
      '--llm-model',
      'test'
    ];
    const state = await loadConfig();

    assert.deepEqual(state.targetFiles, ['test1.md', 'test2.md']);
  });

  test('exits if both --quiet and --verbose are passed', async () => {
    process.argv = ['node', 'index.js', '--quiet', '--verbose'];
    await assert.rejects(loadConfig(), /Early exit/);
  });

  test('exits early on init --help', async () => {
    process.argv = ['node', 'index.js', 'init', '--help'];
    await assert.rejects(loadConfig(), /Early exit/);
  });

  test('exits early on --version', async () => {
    process.argv = ['node', 'index.js', '--version'];

    // We need a dummy package.json in the temp dir so it doesn't crash reading it
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ version: '1.2.3' })
    );

    await assert.rejects(loadConfig(), /Early exit/);
  });

  test('exits early on --help', async () => {
    process.argv = ['node', 'index.js', '--help'];
    await assert.rejects(loadConfig(), /Early exit/);
  });

  test('exits early on sync --help', async () => {
    process.argv = ['node', 'index.js', 'sync', '--help'];

    // We have to provide a dummy config so the schema validation doesn't fail before it hits the sync block
    await fs.writeFile(
      path.join(tempDir, 'bdd.config.json'),
      JSON.stringify({
        testDir: 'tests',
        llm: { provider: 'openai', model: 'gpt-4o' }
      })
    );

    await assert.rejects(loadConfig(), /Early exit/);
  });

  test('throws TranspilerError on invalid config', async () => {
    process.argv = ['node', 'index.js'];
    await fs.writeFile(
      path.join(tempDir, 'bdd.config.json'),
      JSON.stringify({ testDir: 123 }) // invalid type
    );

    await assert.rejects(loadConfig, /Configuration validation failed/);
  });
});
