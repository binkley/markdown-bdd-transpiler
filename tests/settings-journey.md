# Feature: User Settings Management

## Scenario: Toggling notifications enables the save button

### GIVEN

```bdd
- The user navigates to "/settings"
```

### THEN

```bdd
- Verify the "Save Changes" button is disabled
```

### WHEN

```bdd
- Check the "Enable Notifications" checkbox
```

### THEN

```bdd
- Verify the "Save Changes" button is enabled
```
