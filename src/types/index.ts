export interface LLMConfig {
  provider: string;
  model: string;
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
}

export interface TranspilerConfig {
  testDir: string;
  outDir: string;
  manifestPath: string;
  cachePath: string;
  frameworkImport: string;
  setupInjection?: string;
  setupFile?: string;
  llm: LLMConfig;
}

export interface ExecutionState {
  config: TranspilerConfig;
  verbose: boolean;
  quiet: boolean;
  targetFiles: string[];
}

export interface AIResolution {
  matchedFunction: string;
  extractedArguments: string[];
}

export interface LLMProvider {
  generateResolution(
    systemInstruction: string,
    stepText: string,
    config: LLMConfig
  ): Promise<AIResolution>;
}

export interface InitOptions {
  autoYes: boolean;
  providerFlag?: string;
  modelFlag?: string;
}

export type Scenario = {
  name: string;
  steps: string[];
  phases: string[];
  line?: number;
};

export type Feature = {
  name: string;
  scenarios: Scenario[];
  line?: number;
};

export interface RawStep {
  text: string;
  lineIndex: number;
  sourceLine: number | string;
}
