import type { LimitFunction } from 'p-limit';
import type { Feature, LLMProvider, LLMConfig } from '../types/index.js';
import type { CacheManager } from './cache.js';

export async function resolveFeatures(
  features: Feature[],
  manifestStr: string,
  llmProvider: LLMProvider,
  llmConfig: LLMConfig,
  cache: CacheManager,
  limit: LimitFunction,
  options: { verbose: boolean; quiet: boolean; sourceFile: string }
): Promise<{ apiCalls: number }> {
  let apiCalls = 0;
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

        if (!resolution) {
          if (options.verbose) console.log(`\n☁️  Cache miss: "${stepText}"`);

          resolution = await limit(async () => {
            const callStart = performance.now();
            let attempt = 0;
            let currentResolution;

            try {
              while (attempt <= llmConfig.maxRetries) {
                try {
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

                  currentResolution = await llmProvider.generateResolution(
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
                  await new Promise((resolve) =>
                    setTimeout(resolve, waitTime)
                  );
                  attempt++;
                }
              }
            } catch (e: any) {
              if (e.status === 429) {
                console.error(
                  `❌ [API ERROR] Rate Limit Exceeded after ${llmConfig.maxRetries} retries: "${stepText}".`
                );
                process.exit(1);
              } else if (e.status === 503) {
                console.error(
                  `❌ [API ERROR] The LLM Provider returned 503 (High Demand) while compiling: "${stepText}".`
                );
                process.exit(1);
              } else {
                console.error(
                  `❌ [API ERROR] Unexpected failure connecting to LLM Provider:`,
                  e.message
                );
                process.exit(1);
              }
            }

            const callDuration = (
              (performance.now() - callStart) /
              1000
            ).toFixed(2);
            if (options.verbose)
              console.log(`⚡ API returned in ${callDuration}s`);

            if (!currentResolution) {
              console.error(
                `❌ [API ERROR] Received empty resolution from LLM Provider.`
              );
              process.exit(1);
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

  return { apiCalls };
}
