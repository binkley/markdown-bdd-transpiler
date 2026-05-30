import test from 'node:test';
import assert from 'node:assert/strict';
import { emitPlaywright } from './playwright.js';

test('emitPlaywright generates basic test structure', () => {
  const features = [
    {
      name: 'Login',
      scenarios: [
        {
          name: 'Success',
          phases: ['GIVEN', 'WHEN', 'THEN'],
          steps: [
            '    await test.step("my step", async () => { /* ... */ });'
          ]
        }
      ]
    }
  ];

  const { specCode, warnings } = emitPlaywright(features, {
    frameworkImport: '@binkley/bdd'
  });

  assert.equal(warnings.length, 0);
  assert.match(specCode, /import \{ test \} from '@playwright\/test';/);
  assert.match(specCode, /import \* as steps from '@binkley\/bdd';/);
  assert.match(specCode, /test\.describe\("Login"/);
  assert.match(specCode, /test\("Success"/);
  assert.match(specCode, /await test\.step\("my step"/);
});

test('emitPlaywright skips empty scenarios', () => {
  const features = [
    {
      name: 'Empty Feature',
      scenarios: [
        {
          name: 'Empty',
          phases: ['GIVEN'],
          steps: []
        }
      ]
    }
  ];

  const { specCode, warnings } = emitPlaywright(features, {
    frameworkImport: '@binkley/bdd'
  });

  assert.equal(warnings.length, 0);
  assert.doesNotMatch(specCode, /test\.describe\("Empty Feature"/);
});

test('emitPlaywright warns on missing phase pairs', () => {
  const features = [
    {
      name: 'Bad Phases',
      scenarios: [
        {
          name: 'No GIVEN',
          phases: ['WHEN', 'THEN'],
          steps: ['// step']
        },
        {
          name: 'No THEN',
          phases: ['GIVEN', 'WHEN'],
          steps: ['// step']
        }
      ]
    }
  ];

  const { warnings } = emitPlaywright(features, {
    frameworkImport: '@binkley/bdd'
  });

  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /Scenario "No GIVEN": Missing an opening GIVEN/);
  assert.match(
    warnings[1],
    /Scenario "No THEN": GIVEN has no complete WHEN\/THEN pair/
  );
});

test('emitPlaywright injects setup strings correctly', () => {
  const features = [
    {
      name: 'Login',
      scenarios: [
        {
          name: 'Success',
          phases: ['GIVEN', 'WHEN', 'THEN'],
          steps: ['// step']
        }
      ]
    }
  ];

  const { specCode } = emitPlaywright(
    features,
    {
      frameworkImport: '@binkley/bdd',
      setupInjection: 'console.log("injected config");'
    },
    'console.log("injected file");'
  );

  assert.match(
    specCode,
    /\/\/ --- INJECTED BDD SETUP ---\nconsole\.log\("injected config"\);\nconsole\.log\("injected file"\);\n\/\/ --------------------------/
  );
});
