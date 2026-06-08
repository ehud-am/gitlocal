# Quickstart: Share and Copy Regression Patch

## Prerequisites

- Node.js 22+
- npm dependencies installed at repository root and `ui/`
- A local git repository for repository-recognition checks
- A plain non-git folder for negative classification checks

## Run Locally

```sh
npm run dev:server
```

Open the printed local URL if the browser does not open automatically.

## Core Manual Checks

1. Open a repository with representative text files:
   - Markdown with rendered preview
   - Plain text
   - JSON or other source-like readable text
2. Confirm Copy is shown as an icon-and-label button in each text view.
3. Copy from raw/source view and verify the clipboard contains source text.
4. Copy from rendered view and verify the clipboard contains useful rendered text.
5. Confirm Email, Slack, and Print do not appear in the share/action surface.
6. Confirm Share includes an icon and remains accessible by name.
7. Open rendered text content and choose Save PDF.
8. Confirm the saved output contains rendered content and excludes app chrome.
9. Confirm Find in File, Refresh, and Light/Dark Theme each include an icon and preserve their existing behavior.
10. Open a known git repository root from:
    - typed path
    - picker row
    - current-folder actions
    - direct CLI/native launch
11. Confirm repository-specific UI is available after each open path.
12. Open a known non-git folder and confirm repository-specific UI is not shown.
13. Open a nested folder inside a repository and confirm it follows the product's expected nested-folder behavior.

## Automated Verification Targets

```sh
npm test
npm run lint
npm run build
```

Feature tests should cover:

- Copy button presentation and availability for text-based files.
- Raw versus rendered copy behavior.
- Removed Email, Slack, and Print action visibility.
- Save PDF rendered-output preparation and failure handling.
- Icon presence and accessible names for Share, Find in File, Refresh, Light/Dark Theme, and Copy.
- Folder classification for repository roots, plain folders, nested folders, files inside repositories, and worktrees where `.git` is a file.
- `/api/info` agreement with startup and `/api/repo/open` classification.

## Release Validation

- Update the changelog for the patch release.
- Produce a release-review artifact with contrarian QA findings.
- Include manual notes for Save PDF behavior in the target browser/native wrapper environments.
