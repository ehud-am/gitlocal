# Quickstart: Current Product Baseline

## Purpose

Use this guide to verify the documented baseline behavior of GitLocal against the current implementation.

## Prerequisites

- Node.js 22+
- git 2.22+
- A local browser
- A local git repository to inspect

## Setup

1. Install dependencies from the repository root:

```sh
npm install
```

2. Run the full test suite:

```sh
npm test
```

3. Start the application against the current repository:

```sh
node --experimental-strip-types src/cli.ts .
```

## Validation Flow

1. Confirm the CLI prints a local `http://localhost:<port>` URL and opens the default browser.
2. Verify the header shows the repository name and the sidebar shows the active branch.
3. Confirm a top-level README opens automatically when present.
4. Expand at least one folder in the tree and verify only immediate child entries appear.
5. Open one Markdown file, one code or text file, one image file, and one binary file if available.
6. For Markdown or text files, toggle between rendered and raw views.
7. Use breadcrumbs or a relative Markdown link to navigate to another file.
8. Change the selected branch and verify the commit list refreshes for that branch.
9. Restart the app with no arguments:

```sh
node --experimental-strip-types src/cli.ts
```

10. Submit a valid repository path through the picker and verify the viewer reloads into that repository.
11. Submit an invalid or non-git path and verify an inline error is displayed.

## Build Verification

1. Build the distributable bundles:

```sh
npm run build
```

2. Verify the generated CLI bundle exists at `dist/cli.js`.
3. Verify the built frontend assets exist under `ui/dist/`.

## Expected Outcome

The product should provide a fully local, read-only repository browsing experience with repository selection, lazy tree navigation, file-type-aware rendering, branch context, recent commit history, and clear error handling.
