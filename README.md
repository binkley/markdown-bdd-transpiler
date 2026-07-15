# AI-Augmented Markdown BDD Transpiler for Testing

<a href="./LICENSE.md">
<img
src="https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/cc-zero.svg"
alt="Creative Commons Public Domain Dedication"
align="right" width="10%" height="auto"/>
</a>

[![ci](https://img.shields.io/github/actions/workflow/status/binkley/markdown-bdd-transpiler/ci.yml?branch=main&label=ci)](https://github.com/binkley/markdown-bdd-transpiler/actions/workflows/ci.yml)
[![issues](https://img.shields.io/github/issues/binkley/markdown-bdd-transpiler?label=issues)](https://github.com/binkley/markdown-bdd-transpiler/issues)
[![pull requests](https://img.shields.io/github/issues-pr/binkley/markdown-bdd-transpiler?label=pull%20requests)](https://github.com/binkley/markdown-bdd-transpiler/pulls)
[![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](./CHANGELOG.md)
[![node version](https://img.shields.io/node/v/@binkley/markdown-bdd-transpiler.svg)](https://nodejs.org)
[![npm version](https://img.shields.io/npm/v/@binkley/markdown-bdd-transpiler.svg)](https://www.npmjs.com/package/@binkley/markdown-bdd-transpiler)

A modern, Behavior-Driven Development (BDD) testing framework that allows
non-technical stakeholders to author End-to-End (E2E) user journeys using
native Markdown.

Traditional BDD frameworks (like Cucumber) often suffer from "step-definition
bloat," requiring extensive engineering work to map rigid phrases to code via
Regex.' This project solves that by asking an AI to work out the correct test
code from the Markdown as a semantic translation layer at compile-time. It
maps human language variations to a standardized UI action manifest natively
executed by **Playwright** and **Vitest**.

## 🌟 Key Features

- **Zero-Config Authoring:** Test specs are written in pure Markdown (`.md`).
  No IDE plugins, custom language servers, or complex setup is required for
  authors. Syntax highlighting and formatting work out-of-the-box in GitHub
  and all major editors.
- **Semantic AI Translation:** Users can write naturally (e.g., "click the
  button", "smash the button", "tap"). The transpiler uses the provider LLM to
  map intent to deterministic UI actions.
- **No Step-Definition Bloat:** Generic functions for the AI to intelligently
  infer implicit ARIA roles from human text (e.g., classifying a step as
  targeting a "link" or a "checkbox").
- **Deterministic Caching:** Compiled steps are saved to `bdd-cache.json`.
  Subsequent runs execute instantly without hitting the AI API, ensuring
  stable, offline, and fast CI/CD pipeline runs.
- **Fully Dockerized:** Includes a clean Docker Compose environment to spin up
  the target application and execute tests in complete network isolation
  (preventing local `EADDRINUSE` port conflicts).
- **Visual Debugging:** Automatically captures full-page Playwright
  screenshots whenever a test step fails, saving them locally to
  `test-results/`. The GitHub Actions CI pipeline is configured to securely
  upload these artifacts for easy debugging.
- **Precision Traceability:** Every test execution and compilation warning
  points directly to the exact file and line number in your Markdown source,
  eliminating the need to debug generated code.
- **Production-Grade Transpiler:** Structured compilation logging, concurrent
  API request orchestration (`p-limit`), high-demand automated retries, and an
  enforced "clean state" architecture that automatically deletes stale
  generated tests.

---

## 🚀 Getting Started (1-Minute Setup)

The transpiler includes an interactive initialization script to automatically
scaffold your configuration and install the correct peer dependencies.

You can examine the package in
[NPM](https://www.npmjs.com/package/@binkley/markdown-bdd-transpiler).

### 1. Install the Transpiler

```bash
npm install --save-dev @binkley/markdown-bdd-transpiler
```

### 2. Run the Initialization Wizard

```bash
npx markdown-bdd init
```

This interactive script will:

- Ask if you want to install Playwright (`@playwright/test`) and automatically
  download the required browser binaries.
- Prompt you to select your preferred AI Provider (Anthropic, Google Gemini,
  or OpenAI).
- Generate a clean `bdd.config.json` tailored to your choice.
- Genrate a customizable `manifest.json` into your project root.
- Generate an example markdown BDD test file
  (`tests/example-bdd-markdown-test.md`) (it will fail on purpose as a test)
- Auto-install the necessary Vercel AI SDK provider adapter (e.g.,
  `@ai-sdk/openai`).

_Tip: To change provider or model, you can edit `bdd.config.json` or you can
rerun `npx markdown-bdd init`._

### 3. CI/CD Automation (Headless Setup)

If you are automating the setup in a CI/CD pipeline, you can bypass the
interactive prompts by providing the `-y`, `--provider`, and `--model` flags:

```bash
npx markdown-bdd init -y --provider openai --model gpt-4o-mini
```

---

## 🏗️ Architecture

1.  **Authoring (`tests/*.md`)**: Stakeholders define features and scenarios.
2.  **Manifest (`manifest.json`)**: A JSON schema defining a highly generic
    set of Playwright A11y actions (e.g., `interact_with_element`,
    `verify_element_state`).
3.  **Transpiler (`transpile.ts`)**: Crawls markdown using the `remark` AST
    parser to track strict file locations, checks the cache, and calls the
    LLM provider API to map unregistered human language steps to the manifest
    constraints.
4.  **Standard Library (`framework/standard-ui-steps.ts`)**: The physical
    Playwright implementation of the manifest. The core library supports:
    - **Navigation & Interaction**: `navigate_to`, `fill_input`, `interact_with` (clicks, checks), `interact_with_text`.
    - **State Verification**: `verify_element_state`, `verify_text_state`.
    - **Advanced Interactions**: `interact_with_nth_element` (1-based or ordinal targeting for lists), `verify_element_count` (asserting list cardinality), and `dismiss_if_present` (safe, transient state handling for modals/cookie banners).
5.  **Execution (`.generated/*.test.ts`)**: The transpiler outputs standard,
    execution-ready Playwrite spec files.

---

## 📦 Installation & Usage in Your Project

To use the AI-Augmented Markdown BDD Transpiler in your own testing
repository:

### 1. Install via NPM

Install the package as a development dependency:

```bash
npm install --save-dev @binkley/markdown-bdd-transpiler
```

_Note: This package requires `@playwright/test` as a peer dependency. If you
have not already set up Playwright in your repository, you will also need to
install it and its browser binaries:_

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Configure and Run

Create a `bdd.config.json` in your project root (see the
[Configuration](#-configuration-bddconfigjson) section below for options).

Then, use the included CLI to transpile your `.md` files into executable tests
before running your test runner:

```bash
npx markdown-bdd
```

To see a full list of available command-line overrides and positional file
targeting options, use the help flag:

```bash
npx markdown-bdd --help
```

_Tip: We recommend adding `"pretest": "markdown-bdd"` to your `package.json`
scripts._

---

## 🚀 Local Development (Contributing)

### Prerequisites

- **Node.js** (v22+ recommended)
- **Docker** and **Docker Compose**
- An LLM provider API.

### 1. Environment Setup

Export your LLM provider API key in your terminal session. An example for
Google Gemini:

```bash
export GOOGLE_API_KEY="your_api_key_here"
```

### 2. Local Execution (Native)

If you prefer to run the project directly on your machine without Docker:

```bash
# Install dependencies (including Playwright browsers)
npm install

# Start the dummy frontend application in the background
npm run demo &

# Transpile the markdown tests and run them via Vitest
npm test
```

You can see a full list of NPM scripts with help:

```bash
npm run help
# Or npm run ?
```

### 3. Docker Execution (Recommended)

To run the application and the test suite in a clean, isolated environment,
simply run:

```bash
./scripts/test-e2e.sh
```

Use `./scripts/test-e2e.sh --help` for help.

#### Strict Mode (`--strict`)

By default, the transpiler emits formatting and logic warnings (e.g., missing
a `THEN` block) without failing the build. To enforce rigid BDD hygiene in
CI/CD environments, you can fail the pipeline immediately if any warnings are
detected:

```bash
./scripts/test-e2e.sh --strict
```

As you author markdown BDD tests, you can set a higher threshold using
`--max-warnings=N` instead, progressively lowering the number over time. Both
settings can also be configured permanently in `bdd.config.json`.

#### Prompt Debugging (`--dump-prompts`)

If the LLM is consistently misinterpreting an ambiguous UI step or ignoring your Designer Notes, you can use the `--dump-prompts` flag. This saves the exact, finalized text prompts sent to the LLM into the `.generated/` folder, allowing you to debug how your markdown and variables are being compiled before they hit the API:

```bash
npx markdown-bdd --dump-prompts
```

#### Diagnostic Logging (`--verbose`)

If you need deeper insight into the compilation process, use the `--verbose`
flag:

```bash
./scripts/test-e2e.sh --verbose
# Or ./scripts/validate.sh --verbose
```

This outputs detailed runtime diagnostics, allowing you to track exactly which
files are being processed, monitor AI cache misses, and profile the latency of
the LLM provider API:

```text
📄 Transpiling tests/login-journey.md -> .generated/login-journey.md.test.ts
☁️  Cache miss: "Click the "Sign In" button"
⚡ API returned in 1.42s
📄 Transpiling tests/settings-journey.md -> .generated/settings-journey.md.test.ts
```

This script will:

1. Build the lightweight Express frontend container.
2. Build the Playwright test-runner container.
3. Automatically orchestrate network connections between them.
4. Execute the test suite and output the results.
5. Gracefully tear down the containers upon completion.

---

## 🔎 Precision Traceability

The transpiler is designed to make debugging Markdown-driven tests as
intuitive as writing them:

- **Clickable Terminal Warnings:** Structural issues (like missing `GIVEN`
  statements or unclosed code fences) are logged using modern TS ecosystem
  standards (e.g., `⚠️ tests/login-journey.md:10 - warning: ...`). In VS Code
  and most modern terminal emulators, these paths are natively clickable,
  taking you directly to the exact line in your Markdown file.
- **Playwright Integration:** Generated Playwright actions are wrapped in
  native `test.step()` blocks. When a test fails, Playwright's HTML report, UI
  Mode, and terminal logs point exactly to the human-readable Markdown step
  that caused the error, including the source file and line number (e.g.,
  `(login-journey.md:23)`).

---

## ✅ CI/CD & Local Validation

This repository is configured to ensure code quality through rigorous static
analysis and automated E2E testing using GitHub Actions.

### Husky Git Hooks

To prevent broken code from being pushed to the remote repository, this
project utilizes **Husky hooks**.

- **Pre-Commit (`npm run validate:commit`)**: Runs fast local checks including
  formatting (`prettier`), linting (`eslint`, `shellcheck`), type-checking
  (`tsc`), and unit tests (`node:test`).
- **Pre-Push (`npm run validate:push`)**: Runs the strict pipeline which
  includes all pre-commit checks, plus a dependency security audit (`npm
audit`), and executes the full Playwright E2E suite inside Docker
  (`test-e2e.sh`).

If any of these steps fail, the git action is aborted.

_Tip: If formatting fails during a commit, run `npm run format` to auto-fix
the issues before attempting to commit again._

---

## ✍️ Writing Tests

Add new test scenarios to the `tests/` directory using standard Markdown
formatting. This framework is designed to be written by non-technical
stakeholders in natural language.

### The Anatomy of a Scenario

Every scenario should follow the standard Behavior-Driven Development (BDD)
structure to ensure tests are deterministic and readable. Actionable testing
steps **must** be wrapped in a `bdd` code fence and formatted as bullet points
(`-`).

1. **`GIVEN` (The Setup):** Establishes the initial, immutable state of the
   application before the test begins. This usually involves navigating to a
   page or setting up prerequisites.
2. **`WHEN` (The Action):** Describes the specific interactions the user takes
   (e.g., clicking, typing, checking boxes). You can use natural language here
   (e.g., "Smash the button").
3. **`THEN` (The Verification):** Describes the expected outcome or what the
   user should see as a result of the `WHEN` actions.

**Example:**

````markdown
# Feature: User Authentication

## Scenario: User logs in successfully

### GIVEN

```bdd
- The user navigates to "/login"
```

### WHEN

```bdd
- The user enters "frontend_wizard" into the "Username" field
- Click the "Sign In" button
```

### THEN

```bdd
- The user should see the heading "Welcome Back, Wizard!"
```

---

## Scenario: User sees error with invalid credentials

### GIVEN

```bdd
- The user navigates to "/login"
```

### WHEN

```bdd
- The user enters "bad_wizard" into the "Username" field
- Click the "Sign In" button
```

### THEN

```bdd
- Verify the "Error Message" alert is visible
```
````

### 🔄 Dynamic Data Injection

To keep secrets and environment-specific data out of your markdown files, you
can use the `{{VARIABLE_NAME}}` syntax. During test execution, the framework
will dynamically replace the placeholder with the matching environment
variable (e.g., from `process.env` or your `.env` file).

**Example:**

```bdd
- The user enters "{{TEST_USER_PASSWORD}}" into the "Password" field
```

or (both work):

```bdd
- The user enters {{TEST_USER_PASSWORD}} into the "Password" field
```

_If the environment variable is missing when the test runs, the test will
immediately fail with a descriptive error to prevent silent UI failures._

#### Escaping (Literal Braces)

If you need the test to literally type curly braces (e.g., when testing a
templating engine) without the framework attempting to look up a variable,
escape the first brace with a backslash: `\{{...}}`.

**Example:**

```bdd
- The user enters "\{{literal_string}}" into the "Code Editor"
```

### ⚠️ Structural Validation Warnings

To help keep your test suites clean and logical, the transpiler checks the
sequence of your headings. If it detects a broken pattern, it will print a
warning to the console during the build:

- **Missing an opening GIVEN:** A scenario jumped straight into a `WHEN`
  action without first defining the starting state of the application.
- **GIVEN has no complete WHEN/THEN pair:** The scenario set up the
  application but never performed an action or checked an outcome.
- **WHEN is not paired with a subsequent THEN:** The scenario performed an
  action but never verified that the action did what it was supposed to do.

_Note: You can safely interleave as much standard markdown documentation
(paragraphs, images, tables) as you want between the `bdd` code fences. The
parser will ignore everything outside the fences._

---

## 🧭 Guided Tour (Living Documentation)

Because this framework transpiles Markdown into executable code, our own internal test suite serves as "living documentation." These files prove the features work while simultaneously explaining how to use them.

We recommend new authors read the test files in this order to understand the framework's capabilities:

1. **The Basics:** [`tests/login-journey.md`](./tests/login-journey.md)
   Learn the fundamental anatomy of a BDD Scenario (GIVEN, WHEN, THEN) and see how natural language maps to Playwright actions.
2. **Handling Secrets:** [`tests/dynamic-injection-journey.md`](./tests/dynamic-injection-journey.md)
   Learn how to inject environment variables securely (e.g., passwords or dynamic URLs) and how to escape the transpiler if you need to type literal curly braces.
3. **The AI Engine:** [`tests/context-ambiguity-journey.md`](./tests/context-ambiguity-journey.md)
   Learn how the AI resolves vague instructions (like "Click it") by looking at previous steps, and how to use Designer Notes to guide the AI when the UI lacks proper accessibility roles.
4. **Quality Assurance:** [`tests/validation-warnings-journey.md`](./tests/validation-warnings-journey.md)
   See how the transpiler acts as a linter, actively enforcing rigorous testing structures and warning your team if scenarios become sloppy or lack assertions.

---

## 🧠 Cache Management

The transpiler ships with dedicated NPM scripts and built-in CLI flags to
manage `bdd-cache.json` and improve the developer experience:

- `npm run cache:clear` Instantly wipes the cache file to an empty state
  without invoking the AI or transpiling.
- `npm run cache:refresh` Wipes the cache entirely and immediately transpiles
  all files, forcing the AI to rebuild the cache from scratch.
- `npm run cache:update -- <files...>` Reads the current cache, forces the AI
  to re-evaluate the targeted files, and explicitly overwrites their cache
  entries while preserving untouched steps. This is perfect for surgical cache
  repairs (e.g., `npm run cache:update -- tests/login.md`).
- `npm run cache:ignore -- <files...>` Temporarily bypasses the cache, forcing
  the AI to re-evaluate steps without saving them back to disk. This is a
  "dry-run" mode useful when testing a new LLM model without polluting your
  stable cache file.

**Advanced Orchestration:**

If you want to manage the cache and run the Playwright test suite in a single
command, you can pass the underlying transpiler flags (`--ignore-cache`,
`--update-cache`) directly to the E2E script using the `-t` or
`--transpiler` flags:

```bash
# Update the cache for login.md and immediately run its tests in Docker
./scripts/test-e2e.sh -t update-cache tests/login.md
```

To perform a full cache refresh alongside Docker execution, chain the
commands:

```bash
npm run cache:clear && ./scripts/test-e2e.sh
```

## ⚙️ Configuration (`bdd.config.json`)

While the `init` script provides a great out-of-the-box setup, the framework
is fully configurable to match your project's architecture.

```json
{
  "testDir": "tests",
  "manifestPath": "manifest.json",
  "cachePath": "bdd-cache.json",
  "outDir": ".generated",
  "banner": "test.use({ extraHTTPHeaders: { 'x-mock-user': 'admin' } });",
  "bannerFile": "tests/setup.ts",
  "strict": false,
  "maxWarnings": 5,
  "llm": {
    "provider": "gemini",
    "model": "gemini-2.5-flash-lite",
    "maxRetries": 3,
    "initialDelayMs": 1000,
    "backoffFactor": 2.0
  }
}
```

### Configuration Options:

- **`testDir`**: The directory containing your Markdown (`.md`) feature files.
  (Default: `tests`)
- **`manifestPath`**: The path to your JSON manifest defining the available UI
  steps. (Default: `manifest.json`)
- **`cachePath`**: The file where AI resolutions are deterministically cached
  to speed up future runs. (Default: `bdd-cache.json`)
- **`outDir`**: The directory where the transpiler will output the generated
  Playwright `.test.ts` files. (Default: `.generated`)
- **`banner`**: (Optional) A raw string of code injected at the top of
  every generated test file. (For complex setups, use `bannerFile` instead to
  avoid stringifying multiline code in JSON).
- **`bannerFile`**: (Optional) Path to a TypeScript/JavaScript file (e.g.,
  `tests/setup.ts`). The contents of this file are injected directly into
  every generated test file. This is the recommended way to inject global
  Playwright `test.use({})` blocks to mock headers, cookies, or authentication
  state.
- **`frameworkImport`**: (Optional) The module path injected into the
  generated tests. (Defaults to `@binkley/markdown-bdd-transpiler/framework`.
  Only override this if you are building custom Playwright UI
  implementations).
- **`llm`**: Configures the third-party AI provider behavior.
  - **`provider`**: The vendor to use (`gemini`, `openai`, or `anthropic`).
  - **`model`**: The specific LLM version to use (e.g., `gpt-4o-mini`).
  - **`concurrency`**: Max parallel network requests to the LLM. (Default:
    `5`)
  - **`maxRetries`**: Maximum number of times to retry a failed API call
    before crashing. (Default: `3`)
  - **`initialDelayMs`**: Base delay before the first retry. (Default: `1000`)
  - **`backoffFactor`**: Exponential multiplier for each subsequent retry.
    Jitter is automatically applied. (Default: `2.0`)

_Note: All configuration options can also be overridden via CLI flags (e.g.,
`npx markdown-bdd-transpiler --llm-provider openai`)._

### Extensibility: Custom UI Steps

The core framework enforces strict A11y and Playwright best practices (e.g.,
failing to click if an element is covered by an invisible modal overlay).
Rather than polluting your BDD Markdown with technical terms (e.g.,
"forcefully click") or waiting for the core framework to implement edge cases,
your project can easily extend the AI capabilities by defining custom steps.

For example, to cleanly handle a blocking overlay without altering the natural
language of your BDD:

**1. Define it in your `manifest.json`:**

```json
{
  "available_steps": [
    {
      "function_name": "dismiss_overlay",
      "description": "Closes a blocking modal or overlay, such as the 'End Session' warning.",
      "parameters": ["overlay_name"]
    }
  ]
}
```

**2. Implement the workaround in your own code:**

```typescript
// project-root/framework/custom-ui-steps.ts
import type { Page } from '@playwright/test';

export async function dismiss_overlay(page: Page, overlay_name: string) {
  // Encapsulate the 'force' hack tailored to your specific UI problem
  await page
    .getByRole('button', { name: overlay_name })
    .click({ force: true });
}
```

**3. Point the config to your implementation:**

```json
// bdd.config.json
{
  "manifestPath": "manifest.json",
  "frameworkImport": "./framework/custom-ui-steps.ts"
}
```

Now, when a non-technical author writes `The user dismisses the "End Session"
warning`, the AI will map it to your custom function, keeping the BDD clean
and the Playwright hack abstracted.
**4. Sync your manifest automatically:**

Instead of manually editing `manifest.json` every time you add a new custom step in your TypeScript file, you can use the `sync` command. This will parse your custom framework file and automatically append new exported functions to your manifest:

```bash
npx markdown-bdd sync
```

#### Temporary Workarounds (Designer Notes)

Sometimes, you need a test to pass _today_ before you have time to write
custom support code, or when dealing with a legacy UI element that lacks
proper ARIA roles. The framework supports **Designer Notes**—a standard
Markdown paragraph placed immediately before a `bdd` code fence. The
transpiler sends this note directly to the AI to help it disambiguate the
following steps.

If an element cannot be found by its ARIA role, you can use a Designer Note to
guide the AI to use the core framework's `interact_with_text` step:

````markdown
_QA Note: The "Submit Icon" lacks an ARIA role, but contains the visible text
"Submit"._

```bdd
- The user clicks the Submit Icon
```
````

**⚠️ The "Technical Debt" Warning**

Because Designer Notes can leak technical implementation details (or raw
locators) into your behavioral specifications, the transpiler considers them a
"leaky abstraction." **Whenever the transpiler encounters a Designer Note, it
will emit a build warning.**

This is an intentional design choice to track technical debt. It allows the
scenario to execute and pass in the short term, while signaling to your
engineering team that technical work (like adding an ARIA role to the app, or
writing a custom UI step) is required long-term to keep the test suite pure.

---

## 🛠️ Development Commands

- `npm run format`: Runs Prettier to standardize codebase formatting.
- `npm run lint`: Runs ESLint for TS and Shellcheck for bash files.
- `npm run type-check`: Validates TypeScript structural integrity without
  emitting files.
- `npm run test:unit`: Runs the native `node:test` suite with code coverage.
- `npm run test:e2e`: Boots Docker and runs the full Playwright integration
  suite.
- `npm run cache:update`: Surgically re-transpile specific files.
- `npm run profile`: Benchmark the execution time of any arbitrary NPM
  command.
- `npm run profile:e2e`: Benchmark the Dockerized E2E test pipeline.

---

## 📦 Releasing and Publishing

This project uses **NPM Trusted Publishing (OIDC)** via GitHub Actions. There
are no hardcoded NPM tokens required to publish to the registry.

To publish a new version of the transpiler, use the included release script.
This script will automatically run the tests, bump the version in
`package.json`, create the git tag, and push to origin:

```bash
npm run release -- patch # Or minor, major
```

The GitHub Action will automatically trigger upon seeing the new tag, build
the project, run all static analysis, and securely publish the new version to
`@binkley/markdown-bdd-transpiler` on NPM using provenance.

---

## 📝 TODO / Future Improvements

#### Advanced LLM Telemetry & Interactive Feedback Loop

To transition the transpiler from a "dumb translator" to an active testing
assistant, we can operationalize the metadata returned by modern LLMs:

1. **Interactive Confidence-Gating:** Parse the LLM's confidence scores. For
   high confidence, transpile automatically. For medium confidence, enter an
   interactive CLI mode to prompt the author ("Did you mean X? [Y/n]"). For
   low confidence, hard-fail with an actionable reason.
2. **Automated Test Flakiness Prediction:** Ask the LLM to return a
   `flakiness_risk` metric. The transpiler can proactively wrap high-risk
   actions in a `test.step` with longer timeouts or explicit `.waitFor()`
   conditions.
3. **Smart Fallbacks (Dynamic Routing):** If a fast/cheap model (like Gemini
   Flash) fails with a "length" finish reason or low confidence, automatically
   route that specific step to a larger, reasoning-focused model (e.g., Gemini
   3.x Pro).
4. **Semantic Cache Expansion:** Request the LLM to return
   `semantic_equivalents` for successful mappings (e.g., "tap the link",
   "select the link"). Proactively populate `bdd-cache.json` with these to
   drastically reduce API dependency over time.
5. **Manifest Gap Analysis:** Aggregate when the LLM successfully understands
   a step but reports a `missing_capability` against the provided
   `manifest.json`. Print an end-of-run report to guide maintainers on which
   Playwright ARIA actions to implement next (e.g., "Authors attempted
   drag-and-drop 14 times").

#### Community Manifest Ecosystem (Plugin Architecture)

Because consuming projects can now eject their `manifest.json` and define
custom UI steps, the core framework no longer needs to natively support every
obscure ARIA role or complex interaction. Future iterations should focus on:

1. **Manifest Modules:** Allowing `bdd.config.json` to accept an array of
   manifest paths or NPM packages (e.g., `"manifests":
["@binkley/bdd-salesforce-plugin"]`), enabling the community to share
   pre-built step libraries for common SaaS platforms.
2. **Rich Assertions:** Expanding the core library for `THEN` verification
   steps to handle list lengths, exact text counts, and complex visibility
   states beyond simple element presence.
3. **Compound/Parametrized Selectors:** Support finding elements _within_
   other elements (e.g., "Click the 'Delete' button in the 'User Summary'
   row").

#### Interactive Manifest Upgrades

Because `npx markdown-bdd init` ejects a static copy of the default
`manifest.json` into the consumer's project, they miss out on new steps added
in future framework releases. We should build an interactive `npx markdown-bdd
upgrade` command that parses the consumer's local manifest, diffs it against
the latest default manifest, and interactively merges in new capabilities.
