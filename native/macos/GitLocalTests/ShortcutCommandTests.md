# Native Shortcut Command Test Plan

These checks verify native macOS menu and keyboard command behavior for the WebKit wrapper.

## Edit Commands

- Launch `GitLocal.app` and open a repository file in the preview panel.
- Select visible preview text and press Command-C. Confirm the selected text is available on the clipboard.
- Open an editable text field, select text, and press Command-X. Confirm the selected text is removed and available on the clipboard.
- With the same editable field focused, press Command-V. Confirm clipboard text is inserted at the cursor or selection.
- Invoke Copy, Cut, and Paste from the Edit menu and confirm the same behavior as the keyboard shortcuts.
- Invoke Copy, Cut, and Paste with no eligible target. Confirm the app does not crash, corrupt content, or change unrelated state.

## Find Command

- Open a file whose preview contains `native-command-preview-only`.
- Ensure navigation or toolbar text contains a different known string.
- Press Command-F or choose Edit > Find. Confirm the in-file Find panel opens and focus moves to its query field.
- Search for `native-command-preview-only`. Confirm matches are reported in the preview panel.
- Search for text that appears only in navigation or toolbar chrome. Confirm no preview match is reported.
- Close Find and confirm the selected repository and file are unchanged.

## Refresh Command

- Open a file in the native app and modify that file on disk outside GitLocal.
- Press Command-R or choose View > Refresh. Confirm the visible content updates without restarting the app.
- Delete the visible file on disk outside GitLocal.
- Press Command-R or choose View > Refresh. Confirm GitLocal exits the stale preview and shows a coherent available state.
- Press Refresh repeatedly while loading. Confirm the app settles on one current state.
