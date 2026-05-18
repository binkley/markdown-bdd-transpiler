# Feature: User Authentication Journey

## Scenario: User logs in successfully

### GIVEN

- The user navigates to "/login"

### WHEN

- The user enters "frontend_wizard" into the "Username" field
- Smash the "Sign In" button

### THEN

- The user should see the heading "Welcome Back, Wizard!"
