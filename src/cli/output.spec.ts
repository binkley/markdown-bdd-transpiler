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
    await fs.writeFile(
      mdPath,
      `# Feature: Missing GIVEN\n## Scenario: Only WHEN and THEN\n### WHEN\n\`\`\`bdd\n* do something\n\`\`\`\n### THEN\n\`\`\`bdd\n* expect something\n\`\`\`\n`
    );

    const { stdout, stderr } = await execAsync(
      `node --import tsx transpile.ts --ignore-cache ${mdPath}`,
      { env: { ...process.env, TRANSPILER_QUIET: 'false' } }
    ).catch((e) => e);

    assert.match(
      stderr || stdout,
      /⚠️ Scenario "Scenario: Only WHEN and THEN": Missing an opening GIVEN/
    );
  });
});
