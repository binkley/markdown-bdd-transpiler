<a href="./LICENSE.md">
<img
src="https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/cc-zero.svg"
alt="Creative Commons Public Domain Dedication"
align="right" width="10%" height="auto"/>
</a>

# AI-Augmented Markdown BDD Transpiler for Testing

[![CI Pipeline](https://github.com/binkley/markdown-bdd-transpiler/actions/workflows/ci.yml/badge.svg)](https://github.com/binkley/markdown-bdd-transpiler/actions/workflows/ci.yml)

A modern, Behavior-Driven Development (BDD) testing framework that allows non-technical stakeholders to author End-to-End (E2E) user journeys using native Markdown.

Traditional BDD frameworks (like Cucumber) often suffer from "step-definition bloat," requiring extensive engineering work to map rigid phrases to code via Regex. This project solves that by utilizing the **Google Gen AI SDK (`gemini-2.5-flash`)** as a semantic translation layer at compile-time. It maps human language variations to a standardized UI action manifest natively executed by **Playwright** and **Vitest**.

## 🌟 Key Features

- **Zero-Config Authoring:** Test specs are written in pure Markdown (`.md`). No IDE plugins or custom language servers are required. Syntax highlighting and formatting work out-of-the-box in GitHub and all major editors.
- **Semantic AI Translation:** Users can write naturally (e.g., "click the button", "smash the button", "tap"). The transpiler uses Gemini to map intent to deterministic UI actions.
- **No Step-Definition Bloat:** Actions are mapped to a finite "Standard Library" of Playwright's A11y (accessibility-first) locators. If the UI is accessible, it can be tested without writing new JavaScript.
- **Deterministic Caching:** Compiled steps are saved to `bdd-cache.json`. Subsequent runs execute instantly without hitting the AI API, ensuring stable, offline, and fast CI/CD pipeline runs.
- **Fully Dockerized:** Includes a clean Docker Compose environment to spin up the target application and execute tests in complete isolation.

---

## 🏗️ Architecture

1.  **Authoring (`t/*.md`)**: Stakeholders define features and scenarios.
2.  **Manifest (`manifest.json`)**: A JSON schema defining available accessible actions (e.g., `navigate_to`, `enter_into_field`).
3.  **Transpiler (`transpile.ts`)**: Crawls markdown, checks the cache, and calls the Gemini API to map unregistered human language steps to the manifest constraints.
4.  **Standard Library (`framework/standard-ui-steps.ts`)**: The physical Playwright implementation of the manifest.
5.  **Execution (`.generated/*.test.ts`)**: The transpiler outputs standard, execution-ready Vitest spec files.

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

To run the application and the test suite in a clean, isolated environment, simply run:

```bash
./run.sh
```

This script will:

1. Build the lightweight Express frontend container.
2. Build the Playwright test-runner container.
3. Automatically orchestrate network connections between them.
4. Execute the test suite and output the results.
5. Gracefully tear down the containers upon completion.

---

## ✅ CI/CD & Local Validation

This repository is configured to ensure code quality through rigorous static analysis and automated E2E testing using GitHub Actions.

### Husky Pre-Push Hook

To prevent broken code from being pushed to the remote repository, this project utilizes a **Husky `pre-push` hook**.

Whenever you run `git push`, the hook automatically executes the `./validate.sh` script. This script performs the following checks in sequence:

1. **Formatting:** `npx prettier --check .`
2. **Linting:** `npm run lint`
3. **Type-Checking:** `npm run type-check`
4. **E2E Tests:** Executes `./run.sh` inside Docker.

If any of these steps fail, the push is aborted.

_Tip: If formatting fails, simply run `npm run format` to auto-fix the issues before pushing again._

---

## ✍️ Writing Tests

Add new test scenarios to the `t/` directory using standard Markdown formatting:

```markdown
# Feature: User Authentication

## Scenario: User logs in successfully

### GIVEN

- The user navigates to "/login"

### WHEN

- The user enters "frontend_wizard" into the "Username" field
- Click the "Sign In" button

### THEN

- The user should see the heading "Welcome Back, Wizard!"
```

## 🛠️ Development Commands

- `npm run type-check`: Validates TypeScript structural integrity.
- `npm run lint`: Runs ESLint for code quality.
- `npm run format`: Runs Prettier to standardize codebase formatting.
- `npm run pretest`: Manually triggers the transpilation step without running Vitest.
