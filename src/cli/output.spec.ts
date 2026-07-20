import { test, describe } from 'node:test';
import assert from 'node:assert';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  let tempDir: string;

  test.beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bdd-cli-test-'));
  });

  test.afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('prints warnings for missing GIVEN phases to stderr', async () => {
    const mdPath = path.join(tempDir, 'missing-given.md');
    const cachePath = path.join(tempDir, 'fake-cache.json');

    await fs.writeFile(
      mdPath,
      `# Feature: Missing GIVEN\n## Scenario: Only WHEN and THEN\n### WHEN\n\`\`\`bdd\n* do something\n\`\`\`\n### THEN\n\`\`\`bdd\n* expect something\n\`\`\`\n`
    );

    // Mock cache to prevent real LLM calls during integration tests
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        'do something|{"feature":"Feature: Missing GIVEN","scenario":"Scenario: Only WHEN and THEN","phase":"WHEN"}':
          {
            matchedFunction: 'interact_with_text',
            extractedArguments: ['something']
          },
        'expect something|{"feature":"Feature: Missing GIVEN","scenario":"Scenario: Only WHEN and THEN","phase":"THEN"}':
          {
            matchedFunction: 'verify_text_state',
            extractedArguments: ['something', 'visible']
          }
      })
    );

    const { stdout, stderr } = await execAsync(
      `node --import tsx transpile.ts --cache-path ${cachePath} ${mdPath}`,
      {
        env: {
          ...process.env,
          TRANSPILER_QUIET: 'false',
          GEMINI_API_KEY: 'dummy_key_for_test'
        }
      }
    ).catch((e) => e);

    assert.match(
      stderr || stdout,
      /⚠️ Scenario "Scenario: Only WHEN and THEN": Missing an opening GIVEN/
    );
  });
});
