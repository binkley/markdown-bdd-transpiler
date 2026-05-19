# Feature: User Settings Management

## Scenario: Toggling notifications enables the save button

### GIVEN

- The user navigates to "/settings"

### THEN

- Verify the "Save Changes" button is disabled

### WHEN

- Check the "Enable Notifications" checkbox

### THEN

- Verify the "Save Changes" button is enabled
