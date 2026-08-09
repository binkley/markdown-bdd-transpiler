import { parseArgs } from 'util';
import { loadConfig } from './config.js';
import { logger, LogLevel } from '../utils/logger.js';
import { TranspilerError, EarlyExitError } from '../utils/errors.js';
import { Transpiler } from '../compiler/transpiler.js';

export async function main() {
  try {
    const state = await loadConfig();

    const { values: argv } = parseArgs({
      args: process.argv.slice(2),
      options: {
        verbose: { type: 'boolean', short: 'v' },
        quiet: { type: 'boolean', short: 'q' }
      },
      strict: false
    });

    const isVerbose =
      !!argv.verbose || process.env.TRANSPILER_VERBOSE === 'true';
    const isQuiet = !!argv.quiet || process.env.TRANSPILER_QUIET === 'true';

    if (isQuiet) logger.setLevel(LogLevel.ERROR);
    else if (isVerbose) logger.setLevel(LogLevel.DEBUG);
    else logger.setLevel(LogLevel.INFO);

    const transpiler = new Transpiler(state);
    const { warnings } = await transpiler.run();

    const effectiveMaxWarnings = state.config.strict
      ? 0
      : state.config.maxWarnings;

    if (
      effectiveMaxWarnings !== undefined &&
      warnings > effectiveMaxWarnings
    ) {
      logger.error(
        `\n❌ Build failed: Found ${warnings} warnings (max allowed: ${effectiveMaxWarnings}).`
      );
      process.exit(1);
    }
  } catch (error: any) {
    if (error instanceof EarlyExitError) {
      process.exit(error.exitCode);
    }
    if (error instanceof TranspilerError) {
      logger.error(`\n❌ [ERROR] ${error.message}`);
      process.exit(1);
    }
    // For unexpected generic errors, print the full stack trace for debugging
    logger.error(`\n❌ [FATAL ERROR] An unexpected error occurred:`);
    console.error(error);
    process.exit(1);
  }
}
