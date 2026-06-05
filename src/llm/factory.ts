import { createRequire } from 'module';
import type { LLMConfig, LLMProvider } from '../types/index.js';
import { VercelAIProvider } from './vercel.js';
import {
  MissingDependencyError,
  TranspilerError,
  MissingApiKeyError
} from '../utils/errors.js';

const require = createRequire(import.meta.url);

export function getLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider.toLowerCase()) {
    case 'gemini':
      try {
        const { createGoogleGenerativeAI } = require('@ai-sdk/google');
        const apiKey =
          process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new MissingApiKeyError('Gemini', [
            'GOOGLE_API_KEY',
            'GEMINI_API_KEY'
          ]);
        }
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
        const google = createGoogleGenerativeAI({ apiKey });
        return new VercelAIProvider(google, 'gemini-2.5-flash-lite');
      } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new MissingDependencyError('gemini', '@ai-sdk/google', {
            cause: e
          });
        }
        throw e;
      }
    case 'openai':
      try {
        const { openai } = require('@ai-sdk/openai');
        return new VercelAIProvider(openai, 'gpt-4o-mini');
      } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new MissingDependencyError('openai', '@ai-sdk/openai', {
            cause: e
          });
        }
        throw e;
      }
    case 'anthropic':
      try {
        const { anthropic } = require('@ai-sdk/anthropic');
        return new VercelAIProvider(anthropic, 'claude-3-5-sonnet-latest');
      } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new MissingDependencyError('anthropic', '@ai-sdk/anthropic', {
            cause: e
          });
        }
        throw e;
      }
    default:
      throw new TranspilerError(
        `Unsupported LLM provider: "${config.provider}". Supported providers: "gemini", "openai", "anthropic"`
      );
  }
}
