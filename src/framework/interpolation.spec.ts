import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { interpolate } from '../../framework/interpolation.js';

describe('Interpolation Regex Validation', () => {
  // Setup a mock environment variable for our tests
  const originalEnv = process.env;

  before(() => {
    process.env = {
      ...originalEnv,
      VALID_VAR: 'injected_value',
      VAR_123: 'numbers_work'
    };
  });

  after(() => {
    process.env = originalEnv;
  });

  describe('Success Paths (Allowed Inputs)', () => {
    it('matches standard environment variable names', () => {
      assert.equal(
        interpolate('start {{VALID_VAR}} end'),
        'start injected_value end'
      );
      assert.equal(interpolate('{{VALID_VAR}}'), 'injected_value');
    });

    it('matches variables with numbers', () => {
      assert.equal(
        interpolate('value is {{VAR_123}}'),
        'value is numbers_work'
      );
    });

    it('handles leading and trailing whitespace safely (new feature)', () => {
      assert.equal(interpolate('{{ VALID_VAR }}'), 'injected_value');
      assert.equal(interpolate('{{    VALID_VAR}}'), 'injected_value');
      assert.equal(interpolate('{{VALID_VAR    }}'), 'injected_value');
      assert.equal(interpolate('{{\tVALID_VAR\t}}'), 'injected_value'); // Tabs
    });

    it('respects the escape hatch', () => {
      assert.equal(interpolate('\\{{VALID_VAR}}'), '{{VALID_VAR}}');
      assert.equal(
        interpolate('some \\{{VALID_VAR}} string'),
        'some {{VALID_VAR}} string'
      );
    });
  });

  describe('Rejection Paths (Disallowed / Dangerous Inputs)', () => {
    it('ignores variables with hyphens or special characters (leaves them unchanged)', () => {
      // Since it doesn't match the regex, it shouldn't try to interpolate or throw an error.
      // It should just treat it as a literal string.
      assert.equal(interpolate('{{INVALID-VAR}}'), '{{INVALID-VAR}}');
      assert.equal(interpolate('{{VAR.WITH.DOTS}}'), '{{VAR.WITH.DOTS}}');
      assert.equal(interpolate('{{VAR!@#}}'), '{{VAR!@#}}');
    });

    it('ignores ReDoS attack strings gracefully', () => {
      // The old regex would catastrophic backtrack here.
      // The new regex immediately fails the match on the inner string and treats it as a literal.
      const redosString =
        '{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{';
      const result = interpolate(redosString);
      assert.equal(result, redosString); // Should return exactly what was passed in, immediately.
    });

    it('ignores malicious shell injection attempts inside braces', () => {
      assert.equal(interpolate('{{$(rm -rf /)}}'), '{{$(rm -rf /)}}');
      assert.equal(interpolate('{{; ls -la}}'), '{{; ls -la}}');
    });
  });

  describe('Error Paths', () => {
    it('throws an error if a valid variable name is missing from the environment', () => {
      assert.throws(() => {
        interpolate('{{MISSING_ENV_VAR}}');
      }, /\[BDD Data Injection Error\]/);
    });
  });
});
