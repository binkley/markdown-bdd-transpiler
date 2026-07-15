# Feature: Lists and Modals

As a user navigating complex UIs
I want to be able to interact with repeating list items and dismiss transient modals
So that my tests do not flake out.

## Scenario: Navigating a list and dismissing a popup

The user dismisses the transient modal, verifies the list count, and deletes an item.

### GIVEN

The user is on the lists and modals page.

_Designer Note: The lists and modals page is located at `/lists-and-modals`._

```bdd
* The user visits the lists and modals page
* The user dismisses the "Dismiss" button if it appears
```

### WHEN

The user verifies there are exactly 3 items and clicks the second one.

```bdd
* The user verifies there are exactly 3 "Item" buttons
* The user clicks the 2nd button named "Item"
```

### THEN

The system confirms the item was clicked and the count decreases.

```bdd
* The user sees the exact text "Clicked item 2" is visible
* The user verifies there are exactly 2 "Item" buttons
```
