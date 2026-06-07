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

## Undo and Redo Commands

- Open an editable file and choose Edit from the file actions menu.
- Type three distinct edits into the editor.
- Press Command-Z or choose Edit > Undo. Confirm the most recent edit is removed and no unrelated field changes.
- Press Command-Shift-Z or choose Edit > Redo. Confirm the undone edit is restored.
- Focus a non-editor field and invoke Undo or Redo. Confirm the file editor content is not changed.

## Select All Command

- Open a file, folder README, rendered Markdown preview, raw text preview, or editable draft in the content panel.
- Click or focus the content panel and press Command-A or choose Edit > Select All.
- Confirm only the currently viewed content panel content is selected, not the app header, sidebar, footer, file tree, or toolbar controls.
- Focus the in-file Find field, a dialog field, or the editor textarea and press Command-A.
- Confirm the focused field keeps native select-all behavior and the content panel is not selected instead.

## Markdown Print and Share Commands

- Open a Markdown file in rendered preview.
- Choose View > Print Rendered Markdown. Confirm the print preview shows rendered Markdown content rather than app chrome or raw Markdown source.
- Choose View > Share Markdown. Confirm the local share flow opens when available, or GitLocal reports a local fallback such as copied rendered text.
- Edit a Markdown file without saving, return to the rendered/share flow if available, and confirm GitLocal clearly indicates whether visible edits or saved content will be used.
