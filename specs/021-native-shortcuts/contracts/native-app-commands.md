# Contract: Native App Commands

This contract defines user-visible behavior for macOS native app commands. It is not a network API contract.

## Commands

| Command | Shortcut | Menu Required | Eligible Target | Expected Result |
|---------|----------|---------------|-----------------|-----------------|
| Copy | Command-C | Yes | Selected preview text or editable text | Selected text is placed on the clipboard |
| Cut | Command-X | Yes | Selected editable text | Selected text is removed and placed on the clipboard |
| Paste | Command-V | Yes | Focused editable text field | Clipboard text is inserted at the cursor or selection |
| Find | Command-F | Yes | Visible preview panel | Preview-scoped find opens or focuses |
| Refresh | Command-R | Yes | Current app view | Current repository view reloads from local state |

## Behavioral Rules

- Commands must be available from the app menu and expected keyboard shortcut where a shortcut is standard.
- Commands must respect the focused context. A modal, dialog, or editable control with a specific command behavior takes precedence over generic preview handling.
- Find must search only the visible preview panel and must not match sidebar, toolbar, navigation, menu, or dialog text.
- Refresh must not restart the native app or require the user to reselect the repository when the current context remains valid.
- Unsupported command invocations must fail quietly or remain disabled; they must not corrupt text, change unrelated app state, or crash the app.

## Acceptance Fixtures

Use these cases during implementation testing:

- Preview contains text `native-command-preview-only`; sidebar also contains text that should not match the Find query.
- Editable field contains `cut me`; Cut removes the selected text and Paste restores it.
- Clipboard contains `paste me`; Paste inserts it into a focused editable field.
- Repository file changes on disk while visible; Refresh displays the changed content within the expected time.
- Current file is removed on disk; Refresh exits the stale preview without crashing.
