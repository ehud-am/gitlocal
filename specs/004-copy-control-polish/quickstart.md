# Quickstart: Copy Control Polish

## Goal

Verify that copy controls feel consistent and appear only where the refined specification allows.

## Prerequisites

- Install dependencies with `npm install`
- Install UI dependencies with `npm --prefix ui install`

## Validation Flow

1. Start the app in the normal local development workflow for GitLocal.
2. Open a markdown file that contains paragraphs, headings, lists, inline code, and at least two fenced code blocks.
3. Confirm that only the fenced code blocks show the copy icon.
4. Trigger the first markdown copy icon and verify the clipboard contains only that code block's text.
5. Trigger the second markdown copy icon and verify the clipboard contains only the second code block's text.
6. Confirm that paragraphs, headings, lists, tables, and inline code do not show copy icons.
7. Switch the same file or another file into raw view.
8. Confirm that the raw-file content area shows the icon-based full-copy action.
9. Trigger the raw-file copy action and verify the clipboard contains the entire visible raw file content.

## Automated Checks

- Run `npm test` to validate server and UI coverage gates.
- Run `npm run lint` to confirm the TypeScript workspace still type-checks cleanly.

## Expected Outcome

- Markdown copy controls are visible only on code blocks.
- Raw-file copy remains available with the same icon language.
- Clipboard contents match the exact target selected by the user.
