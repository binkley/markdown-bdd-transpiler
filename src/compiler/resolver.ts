import type { Feature, LLMProvider, LLMConfig } from '../types/index.js';
import type { CacheManager } from './cache.js';

export async function resolveFeatures(
  features: Feature[],
  manifestStr: string,
  llmProvider: LLMProvider,
  llmConfig: LLMConfig,
  cache: CacheManager,
  options: { verbose: boolean; quiet: boolean; baseName: string }
): Promise<{ apiCalls: number }> {
  let apiCalls = 0;

  for (const feature of features) {
    for (const scenario of feature.scenarios) {
      const resolvedSteps: string[] = [];

      for (const stepPayload of scenario.steps) {
        // We stored this as JSON in the parser
        const payload = JSON.parse(stepPayload);
        const { stepText, sourceLine, richContextStr, prevStep, nextStep } =
          payload;

        const cacheKey = `${stepText}|${richContextStr}`;
        let resolution = cache.get(cacheKey);

        if (!resolution) {
          if (options.verbose) console.log(`\n☁️  Cache miss: "${stepText}"`);
          const callStart = performance.now();
          let attempt = 0;

          try {
            while (attempt <= llmConfig.maxRetries) {
              try {
                const contextObj = JSON.parse(richContextStr);
                const systemInstruction = [
                  `You are an AI compiler for BDD tests. Map the user's step to a function in the provided manifest.`,
                  `Never evaluate or replace {{VARIABLES}}. Always extract them exactly as written in the text.`,
                  `CRITICAL RULE: If you see a literal string that begins with a backslash followed by braces, e.g., \\{{something}}, you MUST include the backslash in the extracted argument. DO NOT drop the backslash. Output "\\\\{{something}}" exactly.`,
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

                resolution = await llmProvider.generateResolution(
                  systemInstruction,
                  stepText,
                  llmConfig
                );

                apiCalls++;
                break;
              } catch (e: any) {
                if (attempt === llmConfig.maxRetries) {
                  throw e;
                }

                const delay =
                  llmConfig.initialDelayMs *
                  Math.pow(llmConfig.backoffFactor, attempt);
                const jitter = delay * 0.2 * Math.random();
                const waitTime = Math.round(delay + jitter);

                if (!options.quiet) {
                  console.warn(
                    `    ⚠️  API Error (${e.message}). Retrying in ${waitTime}ms...`
                  );
                }
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                attempt++;
              }
            }
          } catch (e: any) {
            if (e.status === 503) {
              console.error(
                `❌ [API ERROR] The LLM Provider returned 503 (High Demand) while compiling: "${stepText}".`
              );
              console.error(
                `   Please wait a few moments and try running the command again.`
              );
            } else {
              console.error(
                `❌ [API ERROR] Unexpected failure connecting to LLM Provider:`,
                e.message
              );
            }
            process.exit(1);
          }

          const callDuration = (
            (performance.now() - callStart) /
            1000
          ).toFixed(2);
          if (options.verbose)
            console.log(`⚡ API returned in ${callDuration}s`);

          if (!resolution) {
            console.error(
              `❌ [API ERROR] Received empty resolution from LLM Provider.`
            );
            process.exit(1);
          }

          cache.set(cacheKey, resolution);
        }

        const argsStr = (resolution.extractedArguments || [])
          .map((a: string) => JSON.stringify(a))
          .join(', ');
        const argsCall = argsStr ? `, ${argsStr}` : '';

        const stepLabel = `${stepText} (${options.baseName}:${sourceLine})`;

        resolvedSteps.push(
          `    await test.step(${JSON.stringify(stepLabel)}, async () => {\n` +
            `      await steps.${resolution.matchedFunction}(page${argsCall});\n` +
            `    });`
        );
      }

      // Replace the JSON payloads with actual emitted Playwright steps
      scenario.steps = resolvedSteps;
    }
  }

  return { apiCalls };
}
