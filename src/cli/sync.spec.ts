import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runSyncCommand } from './sync.js';
import { logger } from '../utils/logger.js';

describe('CLI Sync Command', () => {
  let tempDir: string;
  let loggedErrors: string[] = [];
  let loggedInfos: string[] = [];
  let loggedWarns: string[] = [];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bdd-sync-test-'));
    mock.method(process, 'cwd', () => tempDir);
    mock.method(process, 'exit', () => {});

    loggedErrors = [];
    loggedInfos = [];
    loggedWarns = [];

    // Mock logger
    logger.error = (msg: string) => {
      loggedErrors.push(msg);
    };
    logger.info = (msg: string) => {
      loggedInfos.push(msg);
    };
    logger.warn = (msg: string) => {
      loggedWarns.push(msg);
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  test('aborts if manifest cannot be read', async () => {
    const config = { manifestPath: 'missing.json' } as any;
    await assert.rejects(
      runSyncCommand(config),
      /Could not read manifest at/
    );
  });

  test('aborts if frameworkImport is missing', async () => {
    const config = { manifestPath: 'manifest.json' } as any;
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');

    await runSyncCommand(config);
    assert.match(loggedErrors[0], /You must define a `frameworkImport`/);
  });

  test('skips sync if frameworkImport is the standard library', async () => {
    const config = {
      manifestPath: 'manifest.json',
      frameworkImport: '@binkley/markdown-bdd-transpiler'
    } as any;
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');

    await runSyncCommand(config);
    assert.match(
      loggedInfos[0],
      /Framework import is the standard library. Nothing to sync./
    );
  });

  test('aborts if source file is not found', async () => {
    const config = {
      manifestPath: 'manifest.json',
      outDir: '.generated',
      frameworkImport: './custom.ts'
    } as any;
    await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');
    await fs.mkdir(path.join(tempDir, '.generated'));

    await assert.rejects(
      runSyncCommand(config),
      /Could not find source file for/
    );
  });

  test('syncs standard functions and arrow functions from TS file', async () => {
    const config = {
      manifestPath: 'manifest.json',
      outDir: '.generated',
      frameworkImport: './custom.ts'
    } as any;

    // Existing manifest
    await fs.writeFile(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({
        available_steps: [{ function_name: 'existing_step' }]
      })
    );

    await fs.mkdir(path.join(tempDir, '.generated'));

    const tsCode = `
      /**
       * This is a custom step.
       */
      export function my_custom_step(page: any, arg1: string) {}

      // Should be ignored
      function not_exported() {}

      // Should be ignored
      export function existing_step() {}

      /**
       * This is an arrow function.
       */
      export const my_arrow_step = (page: any, arg2: number) => {}
    `;
    await fs.writeFile(path.join(tempDir, '.generated', 'custom.ts'), tsCode);

    await runSyncCommand(config);

    const updatedManifest = JSON.parse(
      await fs.readFile(path.join(tempDir, 'manifest.json'), 'utf-8')
    );
    assert.equal(updatedManifest.available_steps.length, 3);

    const customStep = updatedManifest.available_steps.find(
      (s: any) => s.function_name === 'my_custom_step'
    );
    assert.ok(customStep);
    assert.equal(customStep.description, 'This is a custom step.');
    assert.deepEqual(customStep.parameters, ['arg1']);

    const arrowStep = updatedManifest.available_steps.find(
      (s: any) => s.function_name === 'my_arrow_step'
    );
    assert.ok(arrowStep);
    assert.equal(arrowStep.description, 'This is an arrow function.');
    assert.deepEqual(arrowStep.parameters, ['arg2']);
  });

  test('prints warnings for deprecated steps', async () => {
    const config = {
      manifestPath: 'manifest.json',
      outDir: '.generated',
      frameworkImport: './custom.ts'
    } as any;

    await fs.writeFile(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify({
        available_steps: [{ function_name: 'verify_text_hidden' }]
      })
    );

    await fs.mkdir(path.join(tempDir, '.generated'));
    await fs.writeFile(path.join(tempDir, '.generated', 'custom.ts'), '');

    await runSyncCommand(config);

    assert.ok(
      loggedWarns.some((w) =>
        w.includes(
          "Custom capability 'verify_text_hidden' is now handled natively"
        )
      )
    );
  });
});
