import { z } from 'zod';

const llmConfigSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'anthropic'], {
    message: "Provider must be 'gemini', 'openai', or 'anthropic'."
  }),
  model: z
    .string()
    .min(1, "LLM model is required (e.g., 'gemini-2.5-flash-lite')."),
  concurrency: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe('Max parallel network requests to the LLM'),
  maxRetries: z
    .number()
    .int()
    .nonnegative()
    .default(3)
    .describe('Maximum API retries on failure'),
  initialDelayMs: z
    .number()
    .int()
    .positive()
    .default(1000)
    .describe('Base delay before the first retry'),
  backoffFactor: z
    .number()
    .positive()
    .default(2.0)
    .describe('Exponential multiplier for each retry')
});

export const transpilerConfigSchema = z
  .object({
    testDir: z
      .string()
      .default('tests')
      .describe('Directory containing your Markdown feature files'),
    outDir: z
      .string()
      .default('.generated')
      .describe('Directory to output the generated .test.ts files'),
    manifestPath: z
      .string()
      .default('manifest.json')
      .describe('Path to the JSON manifest defining available UI steps'),
    cachePath: z
      .string()
      .default('bdd-cache.json')
      .describe('File to deterministically cache AI resolutions'),
    frameworkImport: z
      .string()
      .default('@binkley/markdown-bdd-transpiler/framework')
      .describe(
        'Module path injected into generated tests for standard steps'
      ),
    setupInjection: z
      .string()
      .optional()
      .describe('Raw string of code injected into every generated test'),
    setupFile: z
      .string()
      .optional()
      .describe(
        'TypeScript/JavaScript file injected into every generated test'
      ),
    strict: z
      .boolean()
      .default(false)
      .describe(
        'Fail the build if any warnings are detected (equivalent to maxWarnings: 0)'
      ),
    maxWarnings: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        'Maximum number of warnings allowed before failing the build'
      ),
    llm: llmConfigSchema
  })
  .strict(); // strict() prevents users from adding random misspelled keys

export type ValidatedTranspilerConfig = z.infer<
  typeof transpilerConfigSchema
>;
