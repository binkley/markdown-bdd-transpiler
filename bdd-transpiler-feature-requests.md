# Feature Requests: @binkley/markdown-bdd-transpiler (v0.5.6+)

Based on our experience migrating the DOERR-E Leadership Skills application to use the `@binkley/markdown-bdd-transpiler`, we have identified several areas where the framework could be enhanced. These improvements would significantly reduce the need for project-specific custom steps and make the framework safer for complex UIs.

## 1. Robust Standard Steps for Validation & Locators

The current reliance on fuzzy text matching (`getByText(/text/i)`) is brittle in larger applications and frequently triggers Playwright strict-mode violations when multiple similar text strings exist on screen. We recommend introducing standard steps that map directly to Playwright's best practices.

- **Exact Text Matching:**
  - _Proposed Step:_ `- Verify the exact text "Value" is visible`
  - _Playwright Mapping:_ `page.getByText('Value', { exact: true })`
  - _Benefit:_ Solves strict-mode collisions where fuzzy matching catches unintended substrings.

- **Role-Based Verification:**
  - _Proposed Step:_ `- Verify the "button" named "Submit" is visible`
  - _Playwright Mapping:_ `page.getByRole('button', { name: 'Submit' })`
  - _Benefit:_ Aligns with Playwright's accessibility-first locator recommendations. While the transpiler supports interacting with roles, it lacks standard steps for verifying them.

- **Test ID Verification:**
  - _Proposed Step:_ `- Verify the element with test-id "error-message" is visible`
  - _Playwright Mapping:_ `page.getByTestId('error-message')`
  - _Benefit:_ Provides a resilient way to target elements that lack clear text or semantic roles.

## 2. Enhanced DOM Interaction Steps

To minimize the boilerplate required in `custom-steps.ts`, the framework should natively support common DOM interaction patterns.

- **ID-Based Interactions:**
  - _Proposed Steps:_
    - `- Click the element with id "submit-btn"`
    - `- Fill the input with id "username" with "test"`
    - `- Check the checkbox with id "disclaimer"`
  - _Playwright Mapping:_ `page.locator('#id').click()`, etc.
  - _Benefit:_ Deprecates common custom steps needed for direct DOM targeting.

- **CSS Class State Verification:**
  - _Proposed Step:_ `- Verify the element with id "modal" has class "hidden"` (or lacks class "hidden")
  - _Playwright Mapping:_ `expect(page.locator('#modal')).toHaveClass(/hidden/)`
  - _Benefit:_ Modern CSS frameworks (like Tailwind) rely heavily on utility classes to toggle visibility (e.g., hiding a modal instead of removing it from the DOM). Native support for class assertions is critical for UI validation.

## 3. Framework Configuration & Developer Experience (DX)

- **Global Text Match Configuration:**
  - Introduce a configuration property in `bdd.config.json` (e.g., `"textMatchMode": "exact"`) to override the default fuzzy matching behavior globally. This provides a safety net for large projects.
- **Formalized Setup/Teardown API:**
  - Currently, setup code (like mock headers or `test.use` configurations) is injected via the `banner` configuration. A more structured API or configuration block for handling `beforeEach` or global test contexts would be cleaner.
- **Improved Error Interception:**
  - When a transpiler-generated step triggers a Playwright strict-mode violation, the framework should catch it and output a helpful diagnostic hint (e.g., suggesting the use of `{ exact: true }`, a role locator, or a data-testid) rather than just bubbling up the raw Playwright stack trace.
