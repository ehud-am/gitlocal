# Quickstart: Viewer Usability and Search

## Purpose

Use this guide to validate the repository-browsing improvements covered by this feature: copy actions, picker activation, refresh persistence, live repository updates, collapsible navigation, and repository search.

## Prerequisites

- Node.js 22+
- git 2.22+
- A local test repository with:
  - Markdown files containing fenced code blocks
  - Nested folders
  - A mix of text files for search validation

## 1. Start GitLocal

1. Install dependencies if needed:

```sh
npm ci
npm --prefix ui ci
```

2. Start GitLocal against a local repository or a parent folder:

```sh
node --experimental-strip-types src/cli.ts /path/to/local/repo
```

3. Open the local browser URL printed by the CLI.

## 2. Validate Copy Actions

1. Open a markdown file that contains fenced code blocks.
2. Confirm each visible code block shows a copy action in its top-right area.
3. Activate the copy action and paste into another document to confirm only that block's text was copied.
4. Switch the same file to raw view.
5. Confirm the raw content panel shows a copy action in its top-right area.
6. Activate the raw copy action and confirm the pasted content matches the entire raw file.

## 3. Validate Picker Double-Click Behavior

1. Start GitLocal with a non-repository parent folder:

```sh
node --experimental-strip-types src/cli.ts /path/to/parent-folder
```

2. In folder-selection mode, single-click a folder row and confirm it only selects the row.
3. Double-click a non-repository folder row and confirm the browser drills into that folder.
4. Double-click a repository row and confirm GitLocal opens the repository viewer directly.

## 4. Validate Refresh Persistence and Sidebar Recovery

1. Open a nested file inside the repository viewer.
2. Collapse the left sidebar and confirm the content area expands.
3. Refresh the browser page.
4. Confirm the same repository, branch, selected file, raw-versus-rendered mode, sidebar state, and active search mode are restored when still valid.
5. Expand the sidebar again and confirm the current file context is unchanged.

## 5. Validate Live Filesystem Updates

1. With GitLocal open to a visible file, edit that file locally and save it.
2. Confirm the content refreshes automatically within a few seconds.
3. Create or delete a file or folder within the currently visible tree.
4. Confirm the tree updates automatically without manually reloading the browser.
5. Delete the file currently open in the viewer.
6. Confirm GitLocal removes the stale content, shows a clear status message, and falls back to the nearest valid location.

## 6. Validate Repository Search

1. Confirm the top area of the repository viewer shows a compact icon-only search trigger when search is idle.
2. Activate the trigger and confirm the expanded repository search UI opens in place.
3. Close or clear search back to idle, then press `Command+F` on macOS or `Control+F` on Windows or Linux.
4. Confirm the expanded search UI opens again and the query input is focused immediately.
5. Run a name search for a known folder or file and confirm the result navigates to that location.
6. Switch to content search and search for a known string inside a file.
7. Confirm content results include enough context to identify the match.
8. Toggle case sensitivity and repeat a search whose result set should change.
9. Confirm the results update to match the selected case mode.
10. Search for a string with no matches and confirm the empty state is clear without leaving the current repository context.
11. While a query or result set is still active, confirm the expanded search UI stays open until you dismiss it or intentionally return it to an idle state.

## 7. Run Automated Verification

1. Run the test suite:

```sh
npm test
```

2. Run the type check and build:

```sh
npm run lint
npm run build
```

## Expected Outcome

GitLocal should let users copy visible code or raw content directly, navigate more naturally in picker mode, retain repository context across refresh, react to local filesystem changes without manual reloads, collapse and restore navigation safely, and search by both path names and file contents with explicit case-matching controls through a compact top-of-viewer trigger that expands on demand and responds to `Command+F` or `Control+F`.
