# Synthesis: v0.6.0 Feedback and Agentic Developer Experience (ADX)

This document synthesizes the developer feedback from the v0.6.0 release of `@binkley/markdown-bdd-transpiler` and outlines technical recommendations for improving both the human Developer Experience (DX) and the emerging Agentic Developer Experience (ADX).

## 1. Core DX Improvements (Based on Feedback)

The developer feedback identified several key areas where the current transpiler lifecycle causes friction. The following fixes should be prioritized for a `v0.6.1` or `v0.7.0` release:

### 1.1 Fail Fast on Module Validation

**Issue:** If a user introduces a syntax error in their custom step definitions (e.g., `custom-ui-steps.ts`), the transpiler does not catch it. It assumes the steps are simply missing, bypasses local resolution, and silently invokes the AI for every step. The error is only revealed when Playwright boots up.
**Recommendation:** Implement a pre-compilation validation step in `transpiler.ts`. Before iterating through the markdown files, the transpiler should attempt a lightweight parse or dynamic import of the `frameworkImport` file. If a `SyntaxError` or `ImportError` is detected, the process must halt immediately with a fatal error, preventing unnecessary and expensive LLM API calls.

### 1.2 Smarter Cache Invalidation

**Issue:** The `CacheManager` (`src/compiler/cache.ts`) currently keys entirely off the step text and rich context. It does not account for changes in the underlying step definitions or manifest. Renaming a function in TypeScript requires a manual `rm bdd-cache.json` command.
**Recommendation:** Enhance the cache key strategy. The transpiler should incorporate a hash of the `manifest.json` (or the `frameworkImport` file's modified time) into the cache validation logic. If the local definitions change, the cache should automatically invalidate.

### 1.3 Transparent Engine Logging

**Issue:** When cache misses occur (whether due to a new feature or a syntax error), the transpiler silently hands the workload to the AI. For large test suites, this results in a terminal "hang" that can last up to a minute.
**Recommendation:** Add explicit console messaging before initiating batch AI requests. For example:
`ℹ️ Resolving [N] uncached steps via AI engine (this may take a moment)...`
This sets proper expectations for the developer regarding execution time.

### 1.4 Enhanced Strict Mode Hints

**Issue:** Playwright's strict mode errors are correctly caught, but the hints provided are generic.
**Recommendation:** Update the strict mode interceptor in `src/compiler/playwright.ts` to provide exact, copy-pasteable Markdown syntax that leverages the transpiler's preferred locators.
_Current:_ `"Try using an Exact Text, Role, or Test-ID step instead."`
_Proposed:_ `"Consider using the standard step: '... with testid "your-id"' to ensure unique selection."`

---

## 2. Optimizing for Agentic Developer Experience (ADX)

A critical observation from the feedback is that another AI agent misunderstood the library's architecture, referring to the AI LLM resolution as a "fallback" rather than the core compilation engine.

When building tools today, they must be consumable by both humans and the AI assistants those humans employ.

### 2.1 Correcting Architectural Misconceptions

LLMs infer architecture from code structure, variable names, and documentation. The presence of a cache and explicit TypeScript definitions led the observing AI to assume a traditional static-matching model was primary.
**Recommendation:**

- **Documentation:** Explicitly declare the architecture in `README.md` and `GEMINI.md`. Emphasize: _"Unlike Cucumber, there is no regex matching. The LLM is the primary compilation engine. The local cache is an optimization, not the source of truth."_
- **Semantic Naming:** Review internal variables in `src/compiler/resolver.ts`. Consider renaming functions like `resolveFeatures` to `synthesizeStepsWithAI` to make their primary mechanism unambiguous to AI code readers.

### 2.2 Introducing Structured Machine Output (`--json`)

Human-optimized terminal output (emojis, spinners, conversational errors) is difficult for other AI agents and CI systems to parse deterministically.
**Recommendation:** Implement an `--output=json` (or `--json`) flag. When provided, the CLI should suppress all conversational logging and emit a single, structured JSON object containing execution telemetry, diagnostics, warnings, and errors.

**Example JSON Payload:**

```json
{
  "status": "success",
  "diagnostics": {
    "duration_ms": 52400,
    "total_steps": 200,
    "cache": {
      "hits": 8,
      "misses": 192
    },
    "ai_engine": {
      "api_calls": 192,
      "retries": 2,
      "provider": "openai",
      "model": "gpt-4o"
    }
  },
  "warnings": [
    {
      "code": "STRICT_MODE_RISK",
      "file": "tests/login-journey.md",
      "line": 45,
      "message": "Locator ambiguity risk detected.",
      "suggestion": "Migrate to `interact_with_testid`."
    }
  ],
  "errors": []
}
```

**Benefits of `--json` for ADX:**

1.  **Zero Hallucination:** Agents can read deterministic telemetry (e.g., `"cache.misses": 192`) instead of guessing why a command took a long time.
2.  **Automated Remediation:** With structured warnings containing file paths and line numbers, AI agents can automatically write scripts to refactor the Markdown files based on transpiler suggestions.
3.  **Fatal Error Clarity:** Syntax errors in custom files can be bubbled up with exact stack traces, preventing agents from getting stuck diagnosing silent hangs.
