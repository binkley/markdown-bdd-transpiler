import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  TranspilerError,
  MissingDependencyError,
  MissingApiKeyError,
  EmptyResolutionError
} from './errors.js';

describe('Errors', () => {
  test('TranspilerError sets message and name', () => {
    const error = new TranspilerError('test error');
    assert.strictEqual(error.message, 'test error');
    assert.strictEqual(error.name, 'TranspilerError');
  });

  test('TranspilerError chains original cause', () => {
    const originalError = new Error('Original Failure');
    const error = new TranspilerError('test error', { cause: originalError });
    assert.strictEqual(error.cause, originalError);
  });

  test('MissingDependencyError formats message correctly and chains cause', () => {
    const originalError = { code: 'MODULE_NOT_FOUND' };
    const error = new MissingDependencyError('openai', '@ai-sdk/openai', {
      cause: originalError
    });
    assert.match(
      error.message,
      /You configured "openai" as your LLM provider/
    );
    assert.match(error.message, /npm install --save-dev @ai-sdk\/openai/);
    assert.strictEqual(error.name, 'MissingDependencyError');
    assert.strictEqual(error.cause, originalError);
  });

  test('MissingApiKeyError formats message correctly and chains cause', () => {
    const originalError = new Error('env missing');
    const error = new MissingApiKeyError(
      'Gemini',
      ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
      { cause: originalError }
    );
    assert.match(
      error.message,
      /Missing required environment variable\(s\) for Gemini: GOOGLE_API_KEY or GEMINI_API_KEY/
    );
    assert.strictEqual(error.name, 'MissingApiKeyError');
    assert.strictEqual(error.cause, originalError);
  });

  test('EmptyResolutionError formats message correctly and chains cause', () => {
    const originalError = new Error('Empty payload');
    const error = new EmptyResolutionError('Click the button', {
      cause: originalError
    });
    assert.match(
      error.message,
      /Received empty resolution from LLM Provider while compiling: "Click the button"/
    );
    assert.strictEqual(error.name, 'EmptyResolutionError');
    assert.strictEqual(error.cause, originalError);
  });
});
