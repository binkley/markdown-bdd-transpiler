export interface LLMConfig {
  provider: string;
  model: string;
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
  concurrency?: number;
}

export interface TranspilerConfig {
  testDir: string;
  outDir: string;
  manifestPath: string;
  cachePath: string;
  frameworkImport: string;
  banner?: string;
  bannerFile?: string;
  strict: boolean;
  maxWarnings?: number;
  llm: LLMConfig;
}

export interface ExecutionState {
  config: TranspilerConfig;
  clearCache: boolean;
  ignoreCache: boolean;
  updateCache: boolean;
  targetFiles: string[];
}

export interface AIResolution {
  matchedFunction: string;
  extractedArguments: string[];
  sourceFile?: string;
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
