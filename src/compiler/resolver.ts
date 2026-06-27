import type { LimitFunction } from 'p-limit';
import { APICallError } from 'ai';
import type { Feature, LLMProvider, LLMConfig } from '../types/index.js';
import type { CacheManager } from './cache.js';
import { logger } from '../utils/logger.js';
import { EmptyResolutionError, TranspilerError } from '../utils/errors.js';

export async function resolveFeatures(
  features: Feature[],
  manifestStr: string,
  llmProvider: LLMProvider,
  llmConfig: LLMConfig,
  cache: CacheManager,
  limit: LimitFunction,
  options: { sourceFile: string; dumpPrompts?: boolean; outDir?: string }
): Promise<{
  apiCalls: number;
  promptsDump: { stepText: string; prompt: string }[];
}> {
  let apiCalls = 0;
  const promptsDump: { stepText: string; prompt: string }[] = [];
  for (const feature of features) {
    for (const scenario of feature.scenarios) {
      // We will map over the steps and process them concurrently
      const stepPromises = scenario.steps.map(async (stepPayload) => {
        // We stored this as JSON in the parser
        const payload = JSON.parse(stepPayload);
        const { stepText, sourceLine, richContextStr, prevStep, nextStep } =
          payload;

        const cacheKey = `${stepText}|${richContextStr}`;
        let resolution = cache.get(cacheKey);

        const contextObj = JSON.parse(richContextStr);
        const systemInstruction = [
          `You are an AI compiler for BDD tests. Map the user's step to a function in the provided manifest.`,
          `Never evaluate or replace {{VARIABLES}}. Always extract them exactly as written in the text.`,
          `CRITICAL RULE: If you see a literal string that begins with a backslash followed by braces, e.g., \\{{something}}, you MUST include the backslash in the extracted argument. DO NOT drop the backslash. Output "\\\\{{something}}" exactly.`,
          `CRITICAL RULE: Never wrap extracted arguments in extra quotes. If the text says navigate to "/settings" or "{{FOO}}", the extracted argument should be /settings or {{FOO}}, NOT "/settings" or "{{FOO}}".`,
          `CRITICAL RULE: You MUST map exactly ALL required parameters for the matched function as defined in the manifest. For example, 'fill_input' explicitly requires exactly THREE parameters: ["aria_role", "accessible_name", "value_to_type"]. For the step 'The user enters "{{VAR}}" into the "Username" field', the arguments array MUST be EXACTLY ["textbox", "Username", "{{VAR}}"]. If you drop "Username", the transpiler will crash.`,
          `\n--- MANIFEST ---`,
          manifestStr,
          `\n--- CONTEXT ---`,
          `Feature: ${contextObj.feature}`,
          `Scenario: ${contextObj.scenario}`,
          `Phase: ${contextObj.phase}`,
          contextObj.designerNotes
            ? `Designer Notes: ${contextObj.designerNotes}`
            : '',
          `\n--- STEP SEQUENCE ---`,
          prevStep ? `Previous Step: "${prevStep}"` : '',
          `CURRENT STEP: "${stepText}"`,
          nextStep ? `Next Step: "${nextStep}"` : ''
        ]
          .filter(Boolean)
          .join('\n');

        if (options.dumpPrompts) {
          promptsDump.push({ stepText, prompt: systemInstruction });
        }

        if (!resolution) {
          logger.debug(`\n☁️  Cache miss: "${stepText}"`);

          resolution = await limit(async () => {
            const callStart = performance.now();
            let attempt = 0;
            let currentResolution;

            try {
              while (attempt <= llmConfig.maxRetries) {
                try {
                  currentResolution = await llmProvider.generateResolution(
                    systemInstruction,
                    stepText,
                    llmConfig
                  );

                  apiCalls++;
                  break;
                } catch (e: any) {
                  if (attempt === llmConfig.maxRetries) {
                    throw e; // We've exhausted retries, throw the raw error out of the loop
                  }

                  const delay =
                    llmConfig.initialDelayMs *
                    Math.pow(llmConfig.backoffFactor, attempt);
                  const jitter = delay * 0.2 * Math.random();
                  const waitTime = Math.round(delay + jitter);

                  logger.warn(
                    `    ⏳  API Retrying in ${Math.round(waitTime / 1000)}s... (${e.message})`
                  );
                  await new Promise((resolve) =>
                    setTimeout(resolve, waitTime)
                  );
                  attempt++;
                }
              }
            } catch (e: any) {
              // The retry loop threw. Let's inspect it to see if it's an APICallError
              if (APICallError.isInstance(e)) {
                if (e.statusCode === 429) {
                  throw new TranspilerError(
                    `Rate Limit Exceeded (429) after ${llmConfig.maxRetries} retries: "${stepText}".`,
                    { cause: e }
                  );
                } else if (e.statusCode === 503) {
                  throw new TranspilerError(
                    `The LLM Provider returned 503 (High Demand) while compiling: "${stepText}".`,
                    { cause: e }
                  );
                }
              }

              // If it's something else (or a 400 bad request), just rethrow it so main() catches it
              throw e;
            }

            const callDuration = (
              (performance.now() - callStart) /
              1000
            ).toFixed(2);
            logger.debug(`⚡ API returned in ${callDuration}s`);

            if (!currentResolution) {
              throw new EmptyResolutionError(stepText);
            }

            return currentResolution;
          });

          cache.set(cacheKey, {
            matchedFunction: resolution.matchedFunction,
            extractedArguments: resolution.extractedArguments,
            sourceFile: options.sourceFile
          });
        }

        const argsStr = (resolution.extractedArguments || [])
          .map((a: string) => JSON.stringify(a))
          .join(', ');
        const argsCall = argsStr ? `, ${argsStr}` : '';

        const stepLabel = `${stepText} (${options.sourceFile}:${sourceLine})`;

        return (
          `    await test.step(${JSON.stringify(stepLabel)}, async () => {\n` +
          `      await steps.${resolution.matchedFunction}(page${argsCall});\n` +
          `    });`
        );
      });

      // Wait for all steps in this scenario to resolve concurrently (respecting the limit)
      // and preserve their original sequence order.
      scenario.steps = await Promise.all(stepPromises);
    }
  }

  return { apiCalls, promptsDump };
}
