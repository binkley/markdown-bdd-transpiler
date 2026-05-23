import { generateObject } from 'ai';
import { z } from 'zod';
import type { LLMProvider, AIResolution, LLMConfig } from '../types/index.js';

// Common Zod schema used by Vercel AI
const resolutionSchema = z.object({
  matchedFunction: z.string(),
  extractedArguments: z.array(z.string())
});

export class VercelAIProvider implements LLMProvider {
  constructor(
    private modelFactory: any,
    private defaultModelName: string
  ) {}

  async generateResolution(
    systemInstruction: string,
    stepText: string,
    config: LLMConfig
  ): Promise<AIResolution> {
    const escapedContents = stepText.replace(/\\/g, '\\\\');

    const { object } = await generateObject({
      model: this.modelFactory(config.model || this.defaultModelName),
      system: systemInstruction,
      prompt: escapedContents,
      schema: resolutionSchema
    });

    return object;
  }
}
