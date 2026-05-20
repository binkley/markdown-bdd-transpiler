# Feature: BDD Structural Validation Warnings

This file is a deliberate demonstration of structural violations in
Behavior-Driven Development (BDD) conventions.

When the transpiler parses this file, it will successfully generate executable
test code, but it will also emit **warnings to STDERR** indicating that the
scenarios do not follow the standard `GIVEN -> WHEN -> THEN` sequence.

_Note: These tests are intentionally minimal and interact with basic UI
elements to ensure they compile without failing due to missing elements._

## Scenario: Missing an Opening GIVEN

A scenario should always begin by establishing the initial state. This
scenario jumps straight into action.

### WHEN

```bdd
- The user navigates to "/login"
```

### THEN

```bdd
- Verify the "Sign In" button is visible
```

---

## Scenario: GIVEN has no complete WHEN/THEN pair

This scenario establishes an initial state but fails to perform an action or
verify an outcome. It is an incomplete thought.

### GIVEN

```bdd
- The user navigates to "/login"
```

### WHEN

```bdd
- The user enters "frontend_wizard" into the "Username" field
```

---

## Scenario: WHEN is not paired with a subsequent THEN

It is valid to have multiple `WHEN` and `THEN` blocks in a single scenario,
but every `WHEN` action must eventually be verified by a `THEN` block. This
scenario ends abruptly after an action.

### GIVEN

```bdd
- The user navigates to "/login"
```

### THEN

```bdd
- Verify the "Sign In" button is visible
```

### WHEN

```bdd
- Click the "Sign In" button
```
