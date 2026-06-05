import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import { getLLMProvider } from './factory.js';
import { TranspilerError, MissingApiKeyError } from '../utils/errors.js';
import type { LLMConfig } from '../types/index.js';

describe('LLM Factory', () => {
  const originalGoogle = process.env.GOOGLE_API_KEY;
  const originalGemini = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalGoogle) process.env.GOOGLE_API_KEY = originalGoogle;
    else delete process.env.GOOGLE_API_KEY;

    if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
    else delete process.env.GEMINI_API_KEY;
  });

  test('throws TranspilerError for unsupported provider', () => {
    const config: LLMConfig = {
      provider: 'not-a-real-provider',
      model: 'test',
      concurrency: 1,
      maxRetries: 1,
      initialDelayMs: 1,
      backoffFactor: 1
    };
    assert.throws(
      () => getLLMProvider(config),
      (err) =>
        err instanceof TranspilerError &&
        err.message.includes(
          'Unsupported LLM provider: "not-a-real-provider"'
        )
    );
  });

  test('instantiates OpenAI provider', () => {
    const config: LLMConfig = {
      provider: 'openai',
      model: 'test',
      concurrency: 1,
      maxRetries: 1,
      initialDelayMs: 1,
      backoffFactor: 1
    };
    const provider = getLLMProvider(config);
    assert.ok(provider);
  });

  test('instantiates Anthropic provider', () => {
    const config: LLMConfig = {
      provider: 'anthropic',
      model: 'test',
      concurrency: 1,
      maxRetries: 1,
      initialDelayMs: 1,
      backoffFactor: 1
    };
    const provider = getLLMProvider(config);
    assert.ok(provider);
  });

  test('instantiates Gemini provider', () => {
    const config: LLMConfig = {
      provider: 'gemini',
      model: 'test',
      concurrency: 1,
      maxRetries: 1,
      initialDelayMs: 1,
      backoffFactor: 1
    };
    process.env.GEMINI_API_KEY = 'test';
    const provider = getLLMProvider(config);
    assert.ok(provider);
  });

  test('throws MissingApiKeyError for gemini if no API key is present', () => {
    const config: LLMConfig = {
      provider: 'gemini',
      model: 'test',
      concurrency: 1,
      maxRetries: 1,
      initialDelayMs: 1,
      backoffFactor: 1
    };
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;

    assert.throws(() => getLLMProvider(config), MissingApiKeyError);
  });
});
