Based on the experience of porting the Languagebot E2E suite, the transpiler
is highly effective at reducing step-definition bloat, but it could be
improved to handle the realities of modern web applications more elegantly.

Here are four high-impact architectural recommendations for future versions:

## Auto-Generated Manifests via AST Parsing

Currently, consumers must maintain `manifest.json` and keep it synchronized
with their `custom-ui-steps.ts` signatures. The transpiler should use the
TypeScript Compiler API to automatically parse exported functions and their
JSDoc comments to build the capability schema dynamically at runtime. This
would eliminate the JSON file entirely and prevent drift.

## Native "Transient State" Handling

Real user journeys are plagued by non-deterministic UI (e.g., cookie banners,
first-time user tooltips, or our own `check_disclaimer` modal). Playwright's
strict mode fails if you attempt to click an element that doesn't exist. The
core framework should introduce a `dismiss_if_present` standard step that
wraps interactions in a safe try/catch with a short timeout, allowing the BDD
to declare conditional actions natively without custom code.

## Index and Cardinality Assertions

The standard UI steps excel at targeting unique elements via ARIA roles or
exact text, but they fall short on lists or repeating components. I had to
write custom logic (`verify_ai_message`) to target an element by its index
(.nth(1)). Expanding the standard library to include
`click_nth_element(aria_role, index)` and `verify_element_count(aria_role,
expected_count)` would cover a massive percentage of remaining edge cases.

## Expanded Network & State Fixtures for GIVEN Blocks

Currently, GIVEN blocks are mostly restricted to UI navigation. E2E tests
often require establishing a specific state before the journey begins. While
you have `block_network_route`, adding standard steps for
`mock_network_route(url_pattern, json_fixture)`, `set_local_storage(key,
value)`, or `set_cookie(...)` would allow the AI to construct complex starting
states without forcing the consumer to inject raw Playwright fixture code via
the `--banner-file`.
