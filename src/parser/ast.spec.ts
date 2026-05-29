import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from './ast.js';

test('parseMarkdown correctly extracts Features and Scenarios', () => {
  const markdown = `
# Login Feature
## Scenario: Successful Login
### GIVEN
\`\`\`bdd
* Navigate to "/login"
\`\`\`
`;
  const result = parseMarkdown(markdown, 'test.md');

  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].name, 'Login Feature');
  assert.equal(result.features[0].scenarios.length, 1);
  assert.equal(
    result.features[0].scenarios[0].name,
    'Scenario: Successful Login'
  );

  const steps = result.features[0].scenarios[0].steps;
  assert.equal(steps.length, 1);

  const payload = JSON.parse(steps[0]);
  assert.equal(payload.stepText, 'Navigate to "/login"');
  assert.equal(payload.sourceLine, 6);
});

test('parseMarkdown tracks phases correctly', () => {
  const markdown = `
# Feature
## Scenario
### GIVEN
\`\`\`bdd
* step 1
\`\`\`
### WHEN
\`\`\`bdd
* step 2
\`\`\`
### THEN
\`\`\`bdd
* step 3
\`\`\`
`;
  const result = parseMarkdown(markdown, 'test.md');
  assert.deepEqual(result.features[0].scenarios[0].phases, [
    'GIVEN',
    'WHEN',
    'THEN'
  ]);
});

test('parseMarkdown emits warning for missing bdd fence', () => {
  const markdown = `
# Feature
## Scenario
### GIVEN
* Not in a fence
`;
  const result = parseMarkdown(markdown, 'test.md');
  assert.equal(result.warnings.length, 1);
  assert.match(
    result.warnings[0],
    /Found a bulleted list under "### GIVEN" without a ```bdd code fence/
  );
});

test('parseMarkdown ignores non-actionable lines in fences', () => {
  const markdown = `
# Feature
## Scenario
### GIVEN
\`\`\`bdd
Not a step
* valid step
Another non-step
- another valid step
\`\`\`
`;
  const result = parseMarkdown(markdown, 'test.md');
  const steps = result.features[0].scenarios[0].steps;
  assert.equal(steps.length, 2);

  const p1 = JSON.parse(steps[0]);
  const p2 = JSON.parse(steps[1]);
  assert.equal(p1.stepText, 'valid step');
  assert.equal(p2.stepText, 'another valid step');
});

test('parseMarkdown flags malformed variables as errors', () => {
  const markdown = `
# Feature
## Scenario
### GIVEN
\`\`\`bdd
* valid {{VAR}} step
* unclosed {{VAR step
* invalid {{VAR-HYPHEN}} step
\`\`\`
`;
  const result = parseMarkdown(markdown, 'test.md');
  assert.equal(result.errors.length, 2);
  assert.match(
    result.errors[0],
    /Unclosed variable braces in step "unclosed \{\{VAR step"/
  );
  assert.match(
    result.errors[1],
    /Invalid environment variable syntax in step "invalid \{\{VAR-HYPHEN\}\} step"/
  );
});

test('parseMarkdown flags an error if a Scenario appears before a Feature', () => {
  const markdown = `
## Scenario: Missing Feature
### GIVEN
\`\`\`bdd
* Navigate to "/login"
\`\`\`
`;
  const result = parseMarkdown(markdown, 'test.md');

  assert.equal(result.features.length, 0);
  assert.equal(result.errors.length, 2);
  assert.match(
    result.errors[0],
    /Cannot define a Scenario \("Scenario: Missing Feature"\) before defining a Feature/
  );
  assert.match(result.errors[1], /Found actionable BDD step/);
});

test('parseMarkdown flags an error if a bdd block appears before a Scenario', () => {
  const markdown = `
# Feature: Missing Scenario
\`\`\`bdd
* Navigate to "/login"
\`\`\`
`;
  const result = parseMarkdown(markdown, 'test.md');

  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].scenarios.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(
    result.errors[0],
    /Found actionable BDD step \("Navigate to "\/login""\) before defining a Scenario/
  );
});
