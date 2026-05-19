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

- The user navigates to "/login"

Following the **GIVEN** are one or more _pairs_ of **WHEN** and **THEN**. A
**Scenario** can run multiple steps and stop to check on outcomes as it goes
along.

### WHEN

This is a **WHEN**. It's specific changes to **GIVEN** that you want to check
the outcome of.

- The user enters "frontend_wizard" into the "Username" field
- Smash the "Sign In" button

Note the step to "smash the button". You can use natural language to describe
what actions to take, and these are interpreted into standard meanings.

### THEN

This is a **WHEN**. It's what you are looking for in the UI to verify expected
behavior after the changes from **WHEN**.

- The user should see the heading "Welcome Back, Wizard!"
