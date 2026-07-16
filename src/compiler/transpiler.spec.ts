import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Transpiler } from './transpiler.js';
import { logger } from '../utils/logger.js';
import type { ExecutionState } from '../types/index.js';

describe('Transpiler Orchestration', () => {
  let tempDir: string;
  let loggedErrors: string[] = [];
  let loggedWarns: string[] = [];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'bdd-transpiler-test-')
    );
    mock.method(process, 'cwd', () => tempDir);

    loggedErrors = [];
    loggedWarns = [];
    logger.error = (msg: string) => {
      loggedErrors.push(msg);
    };
    logger.warn = (msg: string) => {
      loggedWarns.push(msg);
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  function createBaseState(): ExecutionState {
    return {
      clearCache: false,
      ignoreCache: false,
      updateCache: false,
      targetFiles: [],
      config: {
        testDir: 'tests',
        outDir: '.generated',
        manifestPath: 'manifest.json',
        cachePath: 'bdd-cache.json',
        frameworkImport: '@binkley/bdd',
        strict: false,
        llm: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          concurrency: 1,
          maxRetries: 0,
          initialDelayMs: 0,
          backoffFactor: 0
        }
      }
    };
  }

  test('throws if manifest cannot be read', async () => {
    const state = createBaseState();
    const transpiler = new Transpiler(state);

    await assert.rejects(transpiler.run(), /Failed to read manifest at/);
  });

  test('logs warnings for deprecated custom steps in manifest', async () => {
    const state = createBaseState();
    await fs.writeFile(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({
        available_steps: [{ function_name: 'verify_text_hidden' }]
      })
    );
    await fs.mkdir(path.join(tempDir, 'tests'), { recursive: true });
    const transpiler = new Transpiler(state);

    await transpiler.run();
    assert.match(
      loggedWarns[0],
      /Warning: Custom capability 'verify_text_hidden' is now handled natively/
    );
  });

  test('exits early if clearCache is true', async () => {
    const state = createBaseState();
    state.clearCache = true;
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');
    await fs.writeFile(path.join(tempDir, 'bdd-cache.json'), '{}');

    const transpiler = new Transpiler(state);
    const result = await transpiler.run();

    assert.equal(result.apiCalls, 0);
    // Cache file should be deleted
    await assert.rejects(fs.stat(path.join(tempDir, 'bdd-cache.json')));
  });

  test('returns early if testDir does not exist and no target files', async () => {
    const state = createBaseState();
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');

    const transpiler = new Transpiler(state);
    const result = await transpiler.run();

    assert.equal(result.apiCalls, 0);
  });

  test('warns and skips non-markdown target files', async () => {
    const state = createBaseState();
    state.targetFiles = ['tests/image.png'];
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');

    const transpiler = new Transpiler(state);
    // We expect it to create outDir but process no files
    await transpiler.run();

    assert.match(
      loggedWarns[0],
      /Skipping non-markdown file: tests\/image\.png/
    );
  });

  test('throws if markdown parsing produces errors', async () => {
    const state = createBaseState();
    state.targetFiles = ['bad.md'];
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');
    await fs.writeFile(
      path.join(tempDir, 'bad.md'),
      `
# Feature: Bad
\`\`\`bdd
* step before scenario
\`\`\`
    `
    );

    const transpiler = new Transpiler(state);
    await assert.rejects(
      transpiler.run(),
      /Transpilation failed for bad.md due to parsing errors/
    );
  });

  test('logs error if banner file cannot be read', async () => {
    const state = createBaseState();
    state.config.bannerFile = 'missing-banner.js';
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');
    await fs.mkdir(path.join(tempDir, 'tests'));

    const transpiler = new Transpiler(state);
    await transpiler.run();

    assert.match(loggedErrors[0], /Failed to read bannerFile/);
  });

  test('dumps prompts if configured', async () => {
    const state = createBaseState();
    state.targetFiles = ['test.md'];
    state.config.dumpPrompts = true;
    state.config.llm.provider = 'openai';
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');
    await fs.writeFile(
      path.join(tempDir, 'test.md'),
      `
# Feature: Test
## Scenario: Test
### GIVEN
\`\`\`bdd
* step 1
\`\`\`
    `
    );

    // Inject a cache hit so we don't call the network
    const mockCache = {
      'step 1|{"feature":"Feature: Test","scenario":"Scenario: Test","phase":"GIVEN"}':
        {
          matchedFunction: 'navigate_to',
          extractedArguments: ['/']
        }
    };
    await fs.writeFile(
      path.join(tempDir, 'bdd-cache.json'),
      JSON.stringify(mockCache)
    );

    const transpiler = new Transpiler(state);
    await transpiler.run();

    const dumpPath = path.join(tempDir, '.generated', 'test.md.prompts.md');
    const dumpContent = await fs.readFile(dumpPath, 'utf8');
    assert.match(dumpContent, /# Prompts for test\.md/);
    assert.match(dumpContent, /## Step: step 1/);
  });
});
