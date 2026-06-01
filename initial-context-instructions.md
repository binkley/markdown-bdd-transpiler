# Architecture Decision Record (ADR) & Bootstrapping Specification

**Title:** AI-Augmented Markdown BDD Compiler for Frontend E2E Testing

**Status: Approved**

**Context:** We need a Behavior-Driven Development (BDD) testing framework
that allows non-technical stakeholders (Product Managers, QA, Analysts) to
author E2E user journeys natively. Traditional BDD frameworks suffer from
"step-definition bloat," requiring extensive engineering work to map phrases
to code. We require a unified toolchain within the JavaScript/TypeScript
ecosystem to test frontend user paths using Vitest and Playwright without
generating language polyglot overhead.

---

## Part 1: Architectural Decisions

### ADR 1: Source Specification Format (DSL)

- **Decision:** We use standard Markdown files (`.md`). Features are defined
  by `#`, Scenarios by `##`, and BDD structural blocks by `### GIVEN`, `###
WHEN`, and `### THEN` subheaders. Individual steps are structured as standard
  Markdown unordered list items (`*` or `-`).

- **Reasoning:**
  - Avoids paragraph text merging out-of-the-box in GitHub, IDEs, and Markdown
    previewers.
  - Employs native editor syntax highlighting with zero local workspace
    configuration.
  - Drastically reduces user typos by eliminating the need to repeat `AND` or
    keyword prefixes on every line.

### ADR 2: Unified Toolchain & Target Runtime

- **Decision:** The transpiler, standard library, and runtime will be written
  strictly in TypeScript/JavaScript, targeting **Vitest** and **Playwright**.

- **Reasoning:** Eliminates polyglot maintenance overhead (e.g., maintaining a
  separate Bash script alongside a Node.js web app). It enables the frontend
  team to maintain their own testing infrastructure with tools they already
  understand.

### ADR 3: Generic Keyword-Driven UI Engine

- **Decision:** Step definitions are written as a finite, generic "Standard
  Library" of web actions mapped directly to Playwright’s semantic,
  accessibility-based (A11y) locators (e.g., `page.getByRole()`,
  `page.getByLabel()`).

- **Reasoning:** Eliminates step-definition code bloat. Instead of writing
  feature-specific JavaScript strings, the system maps actions to accessible
  UI markers. If the frontend elements are accessible, the standard library can
  automate them without writing new JS code.

### ADR 4: AI-Driven Compile-Time Semantic Translation

- **Decision:** We use the modern Google Gen AI SDK (`@google/genai`) with
  `gemini-2.5-flash` at compile time to act as a semantic translation layer.
  The model parses human text variations and maps them to the structured JSON
  schema of the standard library.

- **Reasoning:** Resolves linguistic rigidity. Users can use phrasing
  variations (e.g., "click", "tap", "press") naturally. The AI normalizes them
  into deterministic JavaScript function arguments before execution, preventing
  runtime test failure due to phrasing discrepancies.

### ADR 5: Deterministic Local Semantic Caching

- **Decision:** A static `bdd-cache.json` file is maintained in the repository
  root. If a Markdown line matches an existing key in the cache, the compiled
  JavaScript code is fetched locally.

- **Reasoning:** Avoids duplicate API calls, eliminates external network
  dependencies during routine CI/CD pipeline runs, ensures near-instant
  execution for previously verified tests, and manages infrastructure
  optimization constraints.

---

## Part 2: Project Bootstrapping Instructions

> **Instructions for Gemini CLI:** Act as a staff software engineer.
> Initialize a clean, modular TypeScript project executing the architecture
> detailed above. Generate the following files inside a fresh, empty
> repository path.

1. **File Structure Setup**

Create a repository with this layout:

```Plaintext
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── manifest.json
├── bdd-cache.json
├── transpile.ts
├── framework/
│   └── standard-ui-steps.ts
└── t/
    └── login-journey.md
```

2. **File Contents Blueprint**

### `package.json`

```JSON
{
  "name": "ai-markdown-bdd-framework",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "pretest": "tsx transpile.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@google/genai": "^0.1.1",
    "playwright": "^1.49.0",
    "vitest": "^3.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
  "scripts": {
    "postinstall": "playwright install chromium",
    "pretest": "tsx transpile.ts",
    "test": "vitest run"
  }
}
```

### `tsconfig.json`

```JSON
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### `vitest.config.ts`

```TypeScript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['.generated/**/*.test.ts'],
    testTimeout: 30000
  }
});
```

### `manifest.json`

```JSON
{
  "available_steps": [
    {
      "function_name": "navigate_to",
      "description": "Navigates the browser page to a relative URL path.",
      "parameters": ["url_string"]
    },
    {
      "function_name": "enter_into_field",
      "description": "Fills out a form input or text field using its associated label.",
      "parameters": ["text_to_type", "field_label"]
    },
    {
      "function_name": "click_button",
      "description": "Clicks an accessible button or element with a button role matching the specified text identifier.",
      "parameters": ["button_text"]
    },
    {
      "function_name": "verify_heading",
      "description": "Asserts that a heading element containing the specified text is visible on screen.",
      "parameters": ["heading_text"]
    }
  ]
}
```

### `bdd-cache.json`

```JSON
{}
```

### `framework/standard-ui-steps.ts`

```TypeScript
import { expect } from 'vitest';
import type { Page } from 'playwright';

export async function navigate_to(page: Page, url_string: string) {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseUrl}${url_string}`);
}

export async function enter_into_field(page: Page, text_to_type: string, field_label: string) {
  await page.getByLabel(field_label, { exact: true }).fill(text_to_type);
}

export async function click_button(page: Page, button_text: string) {
  await page.getByRole('button', { name: button_text, exact: true }).click();
}

export async function verify_heading(page: Page, heading_text: string) {
  await expect(page.getByRole('heading', { name: heading_text })).toBeVisible();
}
```

### `t/login-journey.md`

```Markdown
# Feature: User Authentication Journey

## Scenario: User logs in successfully

### GIVEN
* The user navigates to "/login"

### WHEN
* The user enters "frontend_wizard" into the "Username" field
* Smash the "Sign In" button

### THEN
* The user should see the heading "Welcome Back, Wizard!"
```

### `transpile.ts`

Write a stateful compilation script using the `@google/genai` library.

- It must crawl `t/*.md`.
- Parse lines line-by-line using a state tracking loop for `describe`, `test`,
  and sticky subheader contexts (`given`, `when`, `then`).
- Subheader contexts are strictly used to look up matching behaviors inside
  the `manifest.json` step functions, rather than functions named literal
  `given()`, `then()`, or `when()`.
- Check the local `bdd-cache.json` first before processing unknown steps.

- If a line is a cache miss, utilize `gemini-2.5-flash` passing the
  `manifest.json` file inside `systemInstruction`, enforcing a strict
  structured schema constraint matching:

```TypeScript
{
  type: Type.OBJECT,
  properties: {
    matchedFunction: { type: Type.STRING },
    extractedArguments: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["matchedFunction", "extractedArguments"]
}
```

- Output clean, execution-ready TypeScript test specs inside a `.generated/`
  output folder, dynamically passing a Playwright browser page instance
  context natively inside a standard Vitest block wrapper. Ensure it appends
  newly generated mappings securely back into `bdd-cache.json` at execution
  wrap-up.
