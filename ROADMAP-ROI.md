# Project Roadmap: Cost vs. Benefit Analysis

This document outlines the current `TODO` items for the AI-Augmented Markdown BDD Transpiler, ranked by their Return on Investment (ROI).

- **Benefit (1-5):** Value provided to end-users (authors) or maintainers.
- **Cost (1-5):** Engineering effort, complexity, or ongoing maintenance burden.

| Rank  | Feature                                             | Benefit | Cost | Ratio (B/C) | Reasoning & Strategy                                                                                                                                                                                                            |
| :---- | :-------------------------------------------------- | :------ | :--- | :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | **Grow Playwright Library Support**                 | 5       | 1    | **5.0**     | **Highest Priority.** Expanding ARIA roles and adding rich assertions requires very little engineering. The benefit is massive: it instantly unblocks users trying to test complex apps.                                        |
| **2** | **Cache Management** (`--clear-cache`)              | 4       | 1    | **4.0**     | **Quick Win.** Implementing CLI flags to clear or bypass the cache is trivial. The benefit is high because it removes a significant source of developer friction when tweaking the manifest.                                    |
| **3** | **Prompt Debugging & Dry Runs**                     | 4       | 2    | **2.0**     | **Critical for Observability.** Writing the resolved prompt to a file is a fast file-system operation. The benefit is huge for debugging _why_ the AI hallucinates.                                                             |
| **4** | **Automated Changelogs (Release Orchestration)**    | 3       | 2    | **1.5**     | **Maintainer QoL.** Setting up `release-please` requires a one-time investment in GitHub Actions configuration, eliminating the chore of writing release notes manually.                                                        |
| **5** | **Advanced LLM Telemetry (Interactive Confidence)** | 5       | 4    | **1.25**    | **High Value, High Effort.** Using confidence scores to prompt users ("Did you mean X?") drastically elevates the tool from a transpiler to an "AI Testing Assistant." Requires significant refactoring for structured outputs. |
| **6** | **Expand Test Coverage to CLI Orchestration**       | 3       | 3    | **1.0**     | **Important, but Invisible.** Refactoring `init.ts` and `config.ts` into a Functional Core to enable unit testing ensures stability, but offers zero immediate feature-value to end-users.                                      |
| **7** | **Supply Chain Security (Socket.dev)**              | 2       | 2    | **1.0**     | **Low Urgency.** Since this is a dev-dependency tool, the immediate threat of a supply-chain attack is slightly lower. Not worth battling third-party auth loops until their UX improves.                                       |
| **8** | **Pluggable Test Framework Emitters**               | 4       | 5    | **0.8**     | **Lowest ROI.** Abstracting `emitPlaywright` so the tool can generate Cypress or WebdriverIO code would massively expand the TAM, but the engineering cost is astronomical (rebuilding the entire execution layer).             |

## Summary Recommendation

Immediate efforts should be dedicated entirely to **Rank 1, 2, and 3**. They are low-hanging fruit that significantly enhance the capabilities, usability, and debuggability of the transpiler with very little engineering risk. Rank 5 (Advanced Telemetry) is the "killer feature" for version `1.0.0`, but the project requires a solid foundation with the easier tasks first.

---

## 🤖 Context Handoff for Gemini

**To the AI Agent starting a new session:**

1. **Context:** You are working on `@binkley/markdown-bdd-transpiler`, a Node.js CLI tool that uses GenAI (Vercel AI SDK) to compile human-readable Markdown test cases into executable Playwright tests.
2. **Current State:** The project has extremely strict CI requirements. Unit tests (`node:test`) must maintain `>98%` line coverage and `>97%` function coverage. All commits are validated via Husky pre-push hooks covering `prettier`, `eslint`, `tsc`, and a Dockerized Playwright E2E suite (`scripts/test-e2e.sh`).
3. **Recent Work:** We just resolved critical CodeQL security alerts (Polynomial ReDoS in environment variable injection and GitHub Actions workflow permissions). The codebase is completely green and formatted.
4. **Immediate Goal:** The user wants to start tackling the roadmap outlined in this file, beginning with the highest ROI items (Rank 1: Growing the Playwright Library, or Rank 2: CLI Cache Management).
5. **Action:** Please review this file, acknowledge the strict coverage constraints, and ask the user which of the top 3 priorities they would like to implement first.
