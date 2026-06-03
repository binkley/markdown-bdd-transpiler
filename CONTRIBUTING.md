# Contributing to Markdown BDD Transpiler

First off, thank you for considering contributing to the project! It's people
like you that make open source such a great community.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of
Conduct. (Note: A formal `CODE_OF_CONDUCT.md` file will be added soon. In the
meantime, please treat everyone with respect and professionalism.)

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for the Markdown BDD
Transpiler. Following these guidelines helps maintainers and the community
understand your report, reproduce the behavior, and find related reports.

- **Use the issue search:** Check if the issue has already been reported.
- **Check if the issue has been fixed:** Try to reproduce it using the latest
  `main` branch.
- **Provide a clear and descriptive title** for the issue to identify the
  problem.
- **Describe the exact steps which reproduce the problem** in as many details
  as possible.
- **Provide specific examples** to demonstrate the steps. Include snippets of
  your markdown file, your generated Playwright tests, or screenshots.
- **Describe the behavior you observed after following the steps** and point
  out what exactly is the problem with that behavior.
- **Explain which behavior you expected to see instead and why.**
- **Include details about your configuration and environment:**
  - Node version
  - Operating System
  - AI Provider/Model being used

### Suggesting Enhancements

Enhancement suggestions are highly welcome! Before creating enhancement
suggestions, please check the existing issues as you might find out that you
don't need to create one. When you are creating an enhancement suggestion,
please include as many details as possible.

- **Use a clear and descriptive title** for the issue to identify the
  suggestion.
- **Provide a step-by-step description of the suggested enhancement.**
- **Provide specific examples to demonstrate the steps.**
- **Describe the current behavior and explain which behavior you expected to
  see instead** and why.
- **Explain why this enhancement would be useful** to most users.

### Pull Requests

Please follow these steps to have your contribution considered by the maintainers:

1. Follow all instructions in [Local Development
   Setup](#local-development-setup).
2. Ensure that all tests pass (`npm run test`) and the codebase is formatted
   and linted properly.
3. Include tests for any new features or bug fixes.
4. Update the `README.md` with details of changes, if applicable.
5. After submitting your Pull Request, verify that all GitHub Actions CI
   checks are passing.

## Local Development Setup

To set up your local development environment:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/binkley/markdown-bdd-transpiler.git
   cd markdown-bdd-transpiler
   ```

2. **Ensure you are using the correct Node version:**
   The project uses Node v24 (as defined in `.nvmrc`).

   ```bash
   nvm use
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Build the transpiler:**
   Compile the TypeScript source code into the `dist/` directory.
   ```bash
   npm run build
   ```

## Development Commands

This project uses various `npm` scripts to manage the workflow. Here are the
most common ones you'll need:

- `npm run build` - Compiles the TypeScript codebase.
- `npm run transpile` - Executes the compiled transpiler binary on your
  markdown files.
- `npm run format` - Formats all files using Prettier.
- `npm run lint` - Runs both ESLint (JS/TS) and Shellcheck (Bash).
- `npm run type-check` - Verifies TypeScript type safety without emitting
  files.
- `npm run test` - Runs both fast unit tests (`test:unit`) and the full E2E
  Playwright suite (`test:e2e`).

_(Tip: You can run `npm run help` or `npm run ?` at any time to see a
categorized list of all available commands)._

### Running Tests

We have two tiers of tests. We highly recommend running both locally before
opening a pull request.

1.  **Unit Tests (Fast):**
    Native Node.js tests targeting the core transpiler logic.

```bash
npm run test:unit
```

2.  **End-to-End Tests (Playwright):**
    This suite boots up a demo application via Docker and runs generated
    Playwright tests against it.

```bash
npm run test:e2e
```

Thank you for contributing!
