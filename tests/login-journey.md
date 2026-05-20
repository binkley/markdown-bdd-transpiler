# Feature: User Authentication Journey

This is a **Feature**. It's a top-level way to organize test scenarios (cases)
around a common theme usually exercising the same parts of the frontend.

## Scenario: User logs in successfully

This is a **Scenario**. It's a specific test case against the UI.

### GIVEN

This is a **GIVEN**. It's preparation setup in your UI before you get to the
things you want to test. Typically it represents navigation, text entry, and
"action" elements (buttons, toggles, droplists, so on) of the UI.

A **GIVEN** is _Immutable_: it represents what is constant about the UI during
the **Scenario**.

1. Setup #1
   ```bdd
   - The user navigates to "/login"
   ```

This generates code such as:

```TypeScript
await steps.navigate_to(page, "/login");
```

Following the **GIVEN** are one or more _pairs_ of **WHEN** and **THEN**. A
**Scenario** can run multiple steps and stop to check on outcomes as it goes
along.

### WHEN

This is a **WHEN**. It's specific changes to **GIVEN** that you want to check
the outcome of.

2. Change #1
   ```bdd
   - The user enters "frontend_wizard" into the "Username" field
   - Smash the "Sign In" button
   ```

This generates code such as:

```TypeScript
await steps.fill_input(page, "textbox", "Username", "frontend_wizard");
await steps.interact_with(page, "button", "Sign In");
```

Note the step to "smash the button". You can use natural language to describe
what actions to take, and these are interpreted into standard meanings.

### THEN

This is a **WHEN**. It's what you are looking for in the UI to verify expected
behavior after the changes from **WHEN**.

3. Outcome #1
   ```bdd
   - The user should see the heading "Welcome Back, Wizard!"
   ```

This generates code such as:

```TypeScript
await steps.verify_element_state(page, "heading", "Welcome Back, Wizard!", "visible");
```

## Sample BDD markdown

This is an example of documenting the BDD markdown itself:

````Markdown
# Feature: Example
## Scenario: Use Case #1
### GIVEN
```bdd
- Set up the immutables
```
### WHEN
```bdd
- Change the state or system
```
### THEN
```bdd
- Observe an outcome
```
## Scenario: Use Case #2
```
````