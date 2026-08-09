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
  let originalEnv: string | undefined;

  beforeEach(async () => {
    originalCwd = process.cwd;
    originalExit = process.exit;
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bdd-init-test-'));
    process.cwd = () => tempDir;

    // Prevent actual exiting during tests
    process.exit = (() => {}) as any;
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    process.exit = originalExit;
    process.env.NODE_ENV = originalEnv;
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

  test('successfully generates bdd.config.json with correct defaults and temperature', async () => {
    // We must mock multiselect/text if autoYes is false, but since we pass autoYes=true,
    // we bypass the interactive prompts in the CLI.
    await runInitCommand({
      autoYes: true,
      providerFlag: 'gemini',
      modelFlag: 'gemini-2.5-flash-lite'
    });

    const configContent = await fs.readFile(
      path.join(tempDir, 'bdd.config.json'),
      'utf8'
    );
    const config = JSON.parse(configContent);

    assert.equal(config.testDir, 'tests');
    assert.equal(config.llm.provider, 'gemini');
    assert.equal(config.llm.model, 'gemini-2.5-flash-lite');
    assert.equal(config.llm.temperature, 0.0);
  });
});
