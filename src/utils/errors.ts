export class TranspilerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TranspilerError';
  }
}

export class MissingDependencyError extends TranspilerError {
  constructor(provider: string, pkgName: string, options?: ErrorOptions) {
    super(
      `You configured "${provider}" as your LLM provider, but the required adapter is not installed.\n   Please run: npm install --save-dev ${pkgName}`,
      options
    );
    this.name = 'MissingDependencyError';
  }
}

export class MissingApiKeyError extends TranspilerError {
  constructor(provider: string, envVars: string[], options?: ErrorOptions) {
    super(
      `Missing required environment variable(s) for ${provider}: ${envVars.join(' or ')}.\n   To use this provider, you must export your API key before running the transpiler.`,
      options
    );
    this.name = 'MissingApiKeyError';
  }
}

export class EmptyResolutionError extends TranspilerError {
  constructor(stepText: string, options?: ErrorOptions) {
    super(
      `Received empty resolution from LLM Provider while compiling: "${stepText}".`,
      options
    );
    this.name = 'EmptyResolutionError';
  }
}
