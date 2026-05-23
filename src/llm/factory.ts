import { createRequire } from 'module';
import type { LLMConfig, LLMProvider } from '../types/index.js';
import { GeminiProvider } from './gemini.js';
import { VercelAIProvider } from './vercel.js';

const require = createRequire(import.meta.url);

export function getLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.provider.toLowerCase()) {
    case 'gemini':
      return new GeminiProvider();
    case 'openai':
      try {
        const { openai } = require('@ai-sdk/openai');
        return new VercelAIProvider(openai, 'gpt-4o-mini');
      } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
          console.error(
            `❌ [ERROR] You configured "openai" as your LLM provider, but the required adapter is not installed.`
          );
          console.error(
            `   Please run: npm install --save-dev @ai-sdk/openai`
          );
          process.exit(1);
        }
        throw e;
      }
    case 'anthropic':
      try {
        const { anthropic } = require('@ai-sdk/anthropic');
        return new VercelAIProvider(anthropic, 'claude-3-5-sonnet-latest');
      } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
          console.error(
            `❌ [ERROR] You configured "anthropic" as your LLM provider, but the required adapter is not installed.`
          );
          console.error(
            `   Please run: npm install --save-dev @ai-sdk/anthropic`
          );
          process.exit(1);
        }
        throw e;
      }
    default:
      console.error(
        `❌ [ERROR] Unsupported LLM provider: "${config.provider}". Supported providers: "gemini", "openai", "anthropic"`
      );
      process.exit(1);
  }
}
