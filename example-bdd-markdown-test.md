Welcome! This file is a hands-on tutorial and template for authoring
Behavior-Driven Development (BDD) user journeys. We use the AI-Augmented
Markdown BDD Transpiler, which means you can write your tests in plain
English, and the AI will handle the rest.

Let's walk through how to build a test, step by step!

# Feature: Example BDD Markdown Test

Every BDD markdown test file needs to start with a top-level `# Feature`
heading. Think of this as the umbrella for your tests. The feature title will
show up in your test run output and helps organize your test scenarios into a
concrete, related theme.

## Scenario: The standard GIVEN, WHEN, THEN workflow

Underneath your Feature, you'll write one or more Scenarios. A Scenario is a
single, specific test case.

To keep our tests reliable and easy to read, every scenario must follow a
strict sequence:

1. Establish the initial state (`GIVEN`)
2. Perform some actions (`WHEN`)
3. Verify the outcome (`THEN`)

If you miss these key elements, the transpiler will gently warn you.

### GIVEN

We start with `GIVEN` to set up our test.

Notice the `bdd` code fence below? This special block signals to the
transpiler that the bullet points inside should be converted into actual,
runnable test code. Any text you write _outside_ of these fences is just for
humans to read (or to give the AI context!).

```bdd
- The user navigates to "/demo-app"
```

### WHEN

Next up is `WHEN`. This is where the user takes action. You can use natural,
everyday language here. The AI is smart enough to map your plain English
instructions to standard UI actions!

```bdd
- The user enters "test_user" into the "Username" field
- Smash the "Sign In" button
```

### THEN

Finally, we use `THEN` to check that the app did what we expected.

```bdd
- The user should see the heading "Welcome Back!"
```

---

## Scenario: Dynamic Data Injection

Great! Now, what if you need to test logging in, but you don't want to type
your secret password directly into the markdown file?

You can securely inject environment variables at runtime using the
`{{VARIABLE_NAME}}` syntax. The framework will swap these out when the test
runs, keeping your secrets safe.

### GIVEN

```bdd
- The user navigates to "/login"
```

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

## Scenario: Escaping Literal Braces

Sometimes you actually _need_ to type literal curly braces into a text
field—for example, if you are testing a templating engine like Handlebars or
React.

To stop the transpiler from thinking it's an environment variable, simply
escape the very first bracket with a backslash, like this: `\{{...}}`.

### GIVEN

```bdd
- The user navigates to "/code-editor"
```

### WHEN

```bdd
- The user enters "\{{literal_template_string}}" into the "Code Input" field
- Click the "Save" button
```

### THEN

```bdd
- Verify the "Success" alert is visible
```

---

## Scenario: Using Designer Notes for Technical Workarounds

In a perfect world, every UI element has a clean accessibility (ARIA) role. In
reality, sometimes you'll encounter a legacy button or a tricky element that
the AI struggles to find.

When that happens, you can provide a "Designer Note". This is just a standard
markdown paragraph placed immediately before your `bdd` block. The AI will
read your note and use it as a hint to find the element.

_Note: Using a Designer Note will intentionally trigger a build warning in
your console. This is a good thing! It acts as a reminder that you have some
technical debt to clean up later, either by fixing the UI's accessibility or
by writing a custom UI step._

### GIVEN

```bdd
- The user navigates to "/legacy-dashboard"
```

### WHEN

_QA Note:_ The element lacks an ARIA role. Please target it by its exact
visible text: "Submit".

```bdd
- Click the "Submit" icon
```

### THEN

```bdd
- Verify the "Success" alert is visible
```
