# Feature: Context Ambiguity Handling

This file demonstrates how the transpiler utilizes the full Abstract Syntax
Tree (AST) context (Feature, Scenario, surrounding steps, and designer notes)
to resolve highly ambiguous step descriptions.

## Scenario: Navigating based on Feature Context

Under the old system, the step "Go home" might be mapped to clicking a "Home"
button (`interact_with`) because it lacked context. Because the Feature is
explicitly about navigation, the AI knows to map this to `navigate_to`.

### GIVEN

```bdd
- The user navigates to "/login"
```

### WHEN

```bdd
- Go home
```

### THEN

```bdd
- The user should see the heading "Welcome to the Platform!"
```

---

## Scenario: Utilizing Designer Notes

Under the old system, "Turn it off" is incredibly ambiguous. Is it a checkbox?
A switch? A button? By injecting the preceding Markdown paragraph as a
"Designer Note", the AI understands what element is being referenced.

### GIVEN

```bdd
- The user navigates to "/settings"
```

### WHEN

_Designer Note: The notification control is implemented as a standard web
checkbox._

```bdd
- Turn it off
```

### THEN

```bdd
- Verify the "Save Changes" button is enabled
```

---

## Scenario: Resolving pronouns via Step Sequence (Lookbehind)

Under the old system, "Click it" would fail because the AI didn't know what
"it" referred to. By providing the previous step in the prompt, the AI can
infer that "it" refers to the "Submit" button mentioned immediately prior.

### GIVEN

```bdd
- The user navigates to "/checkout"
```

### WHEN

```bdd
- The user looks at the "Submit" button
- Click it
```

### THEN

```bdd
- The user should see the heading "Order Confirmed"
```
