import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runInitCommand } from './init.js';

describe('CLI Init Command', () => {
  let tempDir: string;
  let originalCwd: () => string;
  let originalExit: NodeJS.Process['exit'];

  beforeEach(async () => {
    originalCwd = process.cwd;
    originalExit = process.exit;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bdd-init-test-'));
    process.cwd = () => tempDir;

    // Prevent actual exiting during tests
    process.exit = (() => {}) as any;

    // We can't easily mock execSync on the child_process module directly in node:test
    // without running into "Cannot redefine property" if it's already bound.
    // However, we are running init with autoYes=true, which completely bypasses the prompts
    // and doesn't actually call execSync to install Playwright!
    // Wait, it DOES call execSync if installPlaywright is empty or 'y'.
    // And in headless mode, it automatically does it.
    // Let's actually override the global child_process using a dirty hack or just let it fail gracefully.
    // Looking at init.ts, it wraps the execSync in a try/catch.
    // So if it fails because we are in a weird env, it just logs an error and continues.
    // Let's remove the mock entirely to avoid the strict property error.
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    process.exit = originalExit;
    await fs.rm(tempDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  test('aborts if config file already exists', async () => {
    await fs.writeFile(path.join(tempDir, 'bdd.config.json'), '{}');
    await assert.rejects(
      runInitCommand({
        autoYes: true,
        providerFlag: 'gemini',
        modelFlag: 'gemini-1.5'
      }),
      /Early exit/
    );
  });

  test('throws on missing headless flags', async () => {
    await assert.rejects(
      runInitCommand({ autoYes: true, providerFlag: 'gemini' }),
      /Incomplete automation flags provided/
    );
  });
});
