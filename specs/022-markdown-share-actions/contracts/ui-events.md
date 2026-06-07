# UI Event Contract: Markdown Share Actions

## Visible Refresh

**Trigger**

- User selects the top-right Refresh button.
- Native wrapper dispatches an equivalent refresh command.

**Event**

```ts
type NativeAppCommand =
  | 'find'
  | 'refresh'
  | 'undo'
  | 'redo'
  | 'select-all-panel'
  | 'share-markdown'
  | 'print-markdown'
```

**Expected Result**

- App invalidates current info, tree, file, readme, branch, git context, and sync queries.
- Duplicate refresh requests during loading are ignored or collapsed.
- User remains in the same folder/file context when it still exists.

## Markdown Action Availability

**Inputs**

- `selectedPathType === 'file'`
- Loaded file content has `type === 'markdown'`
- Current mode is rendered preview or a supported Markdown edit/preview state.

**Actions**

```ts
type MarkdownShareAction =
  | 'print'
  | 'save-pdf'
  | 'email'
  | 'slack'
  | 'system-share'
  | 'copy-rendered'
  | 'download-artifact'
```

**Expected Result**

- Markdown actions are primary only for Markdown files.
- Non-Markdown files do not show the Markdown-specific primary action cluster.
- If current visible content has unsaved edits, action flow includes those edits or discloses that saved content will be used.

## Print Rendered Markdown

**Trigger**

- User selects Print from Markdown actions.
- Native wrapper may dispatch `print-markdown`.

**Expected Result**

- Print output contains rendered Markdown content and document title context.
- App chrome, sidebars, action controls, and editor controls are excluded.
- User returns to the same file context after dismissing print.

## Save as PDF

**Trigger**

- User selects Save as PDF from Markdown actions.

**Expected Result**

- User gets a direct PDF save flow where supported.
- If direct save is unavailable, user is routed to print/save-to-PDF with clear labeling.
- Output preserves rendered Markdown structure.

## Email, Slack, and Other Share Options

**Trigger**

- User selects Email, Slack, or Other Share Options.

**Expected Result**

- App uses local browser/system share capabilities where available.
- Email prepares useful subject from document context.
- Slack appears only when available through local system/browser share capabilities.
- Unavailable destinations offer fallback to Save as PDF, copy rendered content, or download artifact.

## Editor Undo/Redo

**Triggers**

- Undo: Command-Z on macOS, Control-Z on Windows/Linux, or equivalent menu/native command.
- Redo: Command-Shift-Z on macOS, Control-Y on Windows/Linux, or equivalent menu/native command.

**Expected Result**

- Command affects only the focused editor.
- Undo restores the previous content state.
- Redo reapplies the next undone content state.
- Commands outside the editor do not mutate unrelated app state.

## Content Panel Select All

**Triggers**

- Command-A on macOS when the content panel is the active context.
- Control-A or equivalent platform select-all command when the content panel is the active context.
- Native wrapper may dispatch `select-all-panel` from the Edit menu.

**Expected Result**

- App selects or collects all user-facing content in the currently viewed content panel.
- Selection excludes app header, sidebar, footer, file tree, search panel, dialogs, action buttons, and unrelated controls.
- Rendered Markdown selection uses rendered text/content, not the full raw application page.
- Editable drafts preserve textarea-native select-all when the textarea itself is focused.
- Search fields, dialog fields, file/folder name fields, and other controls with local selection behavior keep their native select-all handling.
- Empty, binary, or image-only panels do not select global app chrome.

## Startup Folder

**Trigger**

- App launches without an explicit folder.
- User opens or switches to a folder successfully.

**Expected Result**

- Launch resolves folder in this order: explicit folder, last used folder, platform Documents folder, home folder.
- Successful folder open updates the last used folder preference.
- Unavailable remembered folder falls back without blocking startup.
