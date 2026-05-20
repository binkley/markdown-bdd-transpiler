<a href="./LICENSE.md">
<img
src="https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/cc-zero.svg"
alt="Creative Commons Public Domain Dedication"
align="right" width="10%" height="auto"/>
</a>

# AI-Augmented Markdown BDD Transpiler for Testing

[![CI Pipeline](https://github.com/binkley/markdown-bdd-transpiler/actions/workflows/ci.yml/badge.svg)](https://github.com/binkley/markdown-bdd-transpiler/actions/workflows/ci.yml)

A modern, Behavior-Driven Development (BDD) testing framework that allows
non-technical stakeholders to author End-to-End (E2E) user journeys using
native Markdown.

Traditional BDD frameworks (like Cucumber) often suffer from "step-definition
bloat," requiring extensive engineering work to map rigid phrases to code via
Regex. This project solves that by utilizing the **Google Gen AI SDK
(`gemini-2.5-flash`)** as a semantic translation layer at compile-time. It
maps human language variations to a standardized UI action manifest natively
executed by **Playwright** and **Vitest**.

## 🌟 Key Features

- **Zero-Config Authoring:** Test specs are written in pure Markdown (`.md`).
  No IDE plugins, custom language servers, or complex setup is required for
  authors. Syntax highlighting and formatting work out-of-the-box in GitHub
  and all major editors.
- **Semantic AI Translation:** Users can write naturally (e.g., "click the
  button", "smash the button", "tap"). The transpiler uses Gemini to map
  intent to deterministic UI actions.
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
- **Production-Grade Transpiler:** Structured compilation logging, API
  performance profiling, and an enforced "clean state" architecture that
  automatically deletes stale generated tests.

---

## 🏗️ Architecture

1.  **Authoring (`tests/*.md`)**: Stakeholders define features and scenarios.
2.  **Manifest (`manifest.json`)**: A JSON schema defining a highly generic
    set of Playwright A11y actions (e.g., `interact_with_element`,
    `verify_element_state`).
3.  **Transpiler (`transpile.ts`)**: Crawls markdown, checks the cache, and
    calls the Gemini API to map unregistered human language steps to the
    manifest constraints.
4.  **Standard Library (`framework/standard-ui-steps.ts`)**: The physical
    Playwright implementation of the manifest.
5.  **Execution (`.generated/*.test.ts`)**: The transpiler outputs standard,
    execution-ready Playwrite spec files.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v22+ recommended)
- **Docker** and **Docker Compose**
- A Google Gemini API Key.

### 1. Environment Setup

Export your Gemini API key in your terminal session:

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

### 3. Docker Execution (Recommended)

To run the application and the test suite in a clean, isolated environment,
simply run:

```bash
./run.sh
```

Use `./run.sh --help` for help.<br/>
Use `./run.sh --verbose` for verbose logging:

```Plaintext
📄 Transpiling tests/login-journey.md -> .generated/login-journey.md.test.ts
📄 Transpiling tests/settings-journey.md -> .generated/settings-journey.md.test.ts
```

This script will:

1. Build the lightweight Express frontend container.
2. Build the Playwright test-runner container.
3. Automatically orchestrate network connections between them.
4. Execute the test suite and output the results.
5. Gracefully tear down the containers upon completion.

---

## ✅ CI/CD & Local Validation

This repository is configured to ensure code quality through rigorous static
analysis and automated E2E testing using GitHub Actions.

### Husky Pre-Push Hook

To prevent broken code from being pushed to the remote repository, this
project utilizes a **Husky `pre-push` hook**.

Whenever you run `git push`, the hook automatically executes the
`./validate.sh` script. This script performs the following checks in sequence:

1. **Formatting:** `npx prettier --check .`
2. **Linting:** `npm run lint`
3. **Type-Checking:** `npm run type-check`
4. **E2E Tests:** Executes `./run.sh` inside Docker.

If any of these steps fail, the push is aborted.

_Tip: If formatting fails, simply run `npm run format` to auto-fix the issues
before pushing again._

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

## ⚙️ Configuration (`bdd.config.json`)

While the framework is designed to work out-of-the-box, it is fully
configurable to match your project's architecture. You can define a
`bdd.config.json` file in your project root:

```json
{
  "testDir": "tests",
  "outDir": ".generated",
  "manifestPath": "manifest.json",
  "cachePath": "bdd-cache.json",
  "frameworkImport": "../framework/standard-ui-steps.js",
  "setupInjection": "test.use({ extraHTTPHeaders: { 'x-mock-user': 'admin' } });"
}
```

### Configuration Options:

- **`testDir`**: The directory containing your Markdown (`.md`) feature files.
  (Default: `tests`)
- **`outDir`**: The directory where the transpiler will output the generated
  Playwright `.test.ts` files. (Default: `.generated`)
- **`manifestPath`**: The path to your JSON manifest defining the available UI
  steps. (Default: `manifest.json`)
- **`cachePath`**: The file where AI resolutions are deterministically cached
  to speed up future runs. (Default: `bdd-cache.json`)
- **`frameworkImport`**: The module path injected into the generated tests to
  import the standard Playwright UI functions.
- **`setupInjection`**: (Optional) A string of TypeScript code injected at the
  top of every generated test file. This is highly useful for injecting global
  Playwright `test.use({})` blocks to mock headers, cookies, or authentication
  state in E2E environments.

_Note: All configuration options can also be overridden via CLI flags (e.g.,
`npx markdown-bdd-transpiler --testDir e2e/features`)._

---

## 🛠️ Development Commands

- `npm run type-check`: Validates TypeScript structural integrity.
- `npm run lint`: Runs ESLint for code quality.
- `npm run format`: Runs Prettier to standardize codebase formatting.
- `npm run pretest`: Manually triggers the transpilation step without running
  Vitest.

---

## 📝 TODO / Future Improvements

#### Resilient API Retries

Implement an exponential backoff/retry loop inside `transpile.ts` to
gracefully handle temporary `503 Service Unavailable` capacity spikes when
using the highly demanded `gemini-2.5-flash-lite` model.

#### NPM Package Publishing

Convert the project from a localized workspace into a standalone, publishable
NPM package so other repositories can consume it natively without copying
files. The proposed architectural plan for this migration is:

1.  **Metadata & Exports:** Update `package.json` to define a `bin` executable
    (e.g., `markdown-bdd`) and configure `exports` to expose the standard UI
    library publicly.
2.  **Compilation Step:** Update `tsconfig.json` to emit compiled code
    (`outDir: "./dist"`) rather than relying on `tsx` for runtime execution.
3.  **Dynamic Pathing:** Refactor `transpile.ts` to utilize `process.cwd()`
    for dynamic directory resolution (so it correctly targets the consuming
    project's `tests/` and `.generated/` folders) and update the generated
    Playwright specs to import the UI steps from the published package name
    rather than a relative local path.
4.  **Publishing Hygiene:** Implement an `.npmignore` file to exclude the demo
    application, local caches, and Docker configurations from the final
    published artifact.
