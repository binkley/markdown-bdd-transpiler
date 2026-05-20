# Feature: Dynamic Data Injection

This file demonstrates how authors can use the `{{VARIABLE_NAME}}` syntax to
securely inject environment variables into their tests at runtime.

_Note: In the Docker Compose environment, `TEST_DYNAMIC_USER` and
`TEST_DYNAMIC_PATH` are provided explicitly to Vitest to ensure this test
passes._

## Scenario: Navigating and typing dynamic data

### GIVEN

```bdd
- The user navigates to "{{TEST_DYNAMIC_PATH}}"
```

_Note:_ You don't have to quote the variable, it just has to have the double
curly braces. We quote here just as an example.

### WHEN

```bdd
- The user enters "{{TEST_DYNAMIC_USER}}" into the "Username" field
- Click the "Sign In" button
```

### THEN

```bdd
- The user should see the heading "Welcome Back, Wizard!"
```

---

## Scenario: Literal Braces (Escape Hatch)

If an author wants to literally type the characters `{{...}}` without the
transpiler attempting to look up an environment variable, they can escape the
first bracket with a backslash: `\{{...}}`.

### GIVEN

```bdd
- The user navigates to "/login"
```

### WHEN

```bdd
- The user enters "\{{literal_string}}" into the "Username" field
- Click the "Sign In" button
```

### THEN

```bdd
- The user should see the heading "Welcome Back, Wizard!"
```
