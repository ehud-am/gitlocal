# Quickstart: Markdown Share Actions

## Prerequisites

- Node.js 22+
- npm dependencies installed at repository root and `ui/`
- For native wrapper validation, Xcode command line tooling on macOS

## Run Locally

```sh
npm run dev:server
```

Open the printed local URL if the browser does not open automatically.

## Core Manual Checks

1. Open a repository with a Markdown file containing headings, lists, tables, links, and code blocks.
2. Confirm a top-right Refresh button is visible and reloads repository/file state after an external file change.
3. Open the Markdown file in rendered preview.
4. Use Markdown actions to:
   - Print rendered content.
   - Save rendered content as PDF or route through print/save-to-PDF when direct save is unavailable.
   - Start an email share flow.
   - Start Slack or Other Share Options when locally available.
   - Use a fallback when a destination is unavailable.
5. Edit a file and verify undo/redo:
   - macOS: Command-Z and Command-Shift-Z.
   - Windows/Linux: Control-Z and Control-Y where applicable.
6. Verify select-all scope:
   - With the content panel active, press Command-A on macOS or the platform select-all equivalent.
   - Confirm only the currently viewed panel content is selected or collected.
   - Confirm app chrome, sidebar, header, footer, dialogs, and unrelated controls are not selected.
   - Focus search, dialog fields, and the editor textarea and confirm their native select-all behavior still applies locally.
7. Relaunch without an explicit folder:
   - First launch should start from Documents when available.
   - After opening another folder, relaunch should reopen that last used folder.
   - If the remembered folder is removed, relaunch should fall back to Documents or home.

## Automated Verification Targets

```sh
npm test
npm run lint
npm run build
```

Feature tests should cover:

- Markdown action visibility for Markdown versus non-Markdown files.
- Rendered print/PDF output excluding app chrome.
- Share destination fallbacks.
- Refresh button query invalidation and context preservation.
- Editor undo/redo history boundaries.
- Content-panel select-all scope and native input preservation.
- Startup folder precedence and platform fallback behavior.

## Native Wrapper Validation

When macOS wrapper behavior is touched:

```sh
xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal build
```

Also update native manual validation notes for:

- Refresh command parity with the visible Refresh button.
- Native select-all command bridge behavior for the content panel.
- Native print/share command bridge behavior.
- No explicit-folder startup using remembered folder and Documents fallback.
