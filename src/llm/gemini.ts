import { GoogleGenAI, Type } from '@google/genai';
import type { LLMProvider, AIResolution, LLMConfig } from '../types/index.js';
import { MissingApiKeyError } from '../utils/errors.js';

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      throw new MissingApiKeyError('Gemini', [
        'GOOGLE_API_KEY',
        'GEMINI_API_KEY'
      ]);
    }
    this.ai = new GoogleGenAI({});
  }

  async generateResolution(
    systemInstruction: string,
    stepText: string,
    config: LLMConfig
  ): Promise<AIResolution> {
    const escapedContents = stepText.replace(/\\/g, '\\\\');
    const response = await this.ai.models.generateContent({
      model: config.model,
      contents: escapedContents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedFunction: { type: Type.STRING },
            extractedArguments: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['matchedFunction', 'extractedArguments']
        }
      }
    });

    if (!response || !response.text) {
      throw new Error('Received empty response from Gemini');
    }
    return JSON.parse(response.text);
  }
}
