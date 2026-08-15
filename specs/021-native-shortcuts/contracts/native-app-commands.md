# Contract: Native App Commands

This contract defines user-visible behavior for macOS native app commands. It is not a network API contract.

## Commands

| Command | Shortcut | Menu Required | Eligible Target | Expected Result |
|---------|----------|---------------|-----------------|-----------------|
| Copy | Command-C | Yes | Selected preview text or editable text | Selected text is placed on the clipboard |
| Cut | Command-X | Yes | Selected editable text | Selected text is removed and placed on the clipboard |
| Paste | Command-V | Yes | Focused editable text field | Clipboard text is inserted at the cursor or selection |
| Find | Command-F | Yes | Visible preview panel | Preview-scoped find opens or focuses |
| Refresh | Command-R (native) / Control-Option-R (browser) | Yes | Current app view | Current repository view reloads from local state; same shortcut works in both distributions in the browser, since Command-R/Control-R is reserved by every browser for page reload |
| Toggle Terminal | Control-\` (both distributions, identical) | Yes (native only; already implemented in the browser) | Any | Terminal panel opens if hidden/closed, hides if visible. Not Command-T: browsers reserve Command-T/Control-T for opening a new tab, so it cannot be intercepted there. |
| Hide Dotfiles | Command-Shift-. (native only) | Yes (native); single toolbar control (browser) | Sidebar file tree and content panel folder/git views | Toggles a single shared setting; both views update together. Matches macOS Finder's own convention for the same action. |
| Tracked/All/Local | None (native menu submenu; single toolbar control in browser) | Yes | Sidebar file tree and content panel folder/git views | Selecting a value filters both views identically to the removed inline dropdown. |

## Behavioral Rules

- Commands must be available from the app menu and expected keyboard shortcut where a shortcut is standard.
- Commands must respect the focused context. A modal, dialog, or editable control with a specific command behavior takes precedence over generic preview handling.
- Find must search only the visible preview panel and must not match sidebar, toolbar, navigation, menu, or dialog text.
- Refresh must not restart the native app or require the user to reselect the repository when the current context remains valid.
- Unsupported command invocations must fail quietly or remain disabled; they must not corrupt text, change unrelated app state, or crash the app.
- No shortcut may be assigned that a major browser or macOS itself reserves and won't deliver to page JavaScript (e.g. Command-T/Control-T for new tab, Command-R/Control-R for reload, Command-\` for window cycling) — added in 034-patch-bugfixes after discovering Command-T could not be wired for the terminal toggle.

## Acceptance Fixtures

Use these cases during implementation testing:

- Preview contains text `native-command-preview-only`; sidebar also contains text that should not match the Find query.
- Editable field contains `cut me`; Cut removes the selected text and Paste restores it.
- Clipboard contains `paste me`; Paste inserts it into a focused editable field.
- Repository file changes on disk while visible; Refresh displays the changed content within the expected time.
- Current file is removed on disk; Refresh exits the stale preview without crashing.
