export function interpolate(value: string): string {
  // Replaces {{VAR_NAME}} with process.env.VAR_NAME, allowing \{{VAR_NAME}} as an escape hatch.
  return value.replace(
    /(\\?)\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g,
    (match, escapeChar, varName) => {
      if (escapeChar) {
        // If escaped, return the literal string without the backslash
        return match.slice(1);
      }

      const envValue = process.env[varName];
      if (envValue === undefined) {
        throw new Error(
          `\n❌ [BDD Data Injection Error]: The test step tried to use '{{${varName}}}', ` +
            `but no environment variable named '${varName}' was found.\n` +
            `Please ensure it is defined in your environment or .env file.\n`
        );
      }
      return envValue;
    }
  );
}
