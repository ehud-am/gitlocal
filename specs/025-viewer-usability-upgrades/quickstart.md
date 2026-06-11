# Quickstart: Viewer Usability Upgrades

## Prerequisites

- Node.js 22+
- npm dependencies installed at the repository root and in `ui/`
- A local Git repository with Markdown files, nested docs, and at least one generated/local-only folder

## Markdown Reading

1. Start GitLocal against a repository.
2. Open `README.md` or another long Markdown file.
3. Confirm the standard repository header, navigation, branch/status, and current path remain available.
4. Use find-in-file and verify matches are highlighted directly in the rendered document.
5. Confirm copy/share read actions remain available without entering edit mode.

## Relative Markdown Links

1. Open a nested Markdown file such as `docs/README.md`.
2. Click a relative link such as `guide.md`.
3. Confirm GitLocal opens `docs/guide.md`, not `guide.md` at the repository root.
4. Click a same-document anchor and confirm it stays in the current Markdown view.
5. Click a missing relative link and confirm a user-readable failure appears.

## Background Change Review

1. Open a Markdown or text file in GitLocal.
2. Modify that file outside GitLocal.
3. Wait for GitLocal to detect the change or use Refresh.
4. Confirm the current file refreshes or shows a clear change notice.
5. Open the changed-files view from repository context.
6. Confirm changed paths are grouped or labeled by meaningful state.
7. Delete or rename the active file outside GitLocal.
8. Confirm GitLocal explains the missing path and routes to a useful parent context.

## Scoped Search

1. Open repository search from a file view.
2. Confirm search appears without permanently pushing the active document out of view.
3. Search for a common term with default scopes.
4. Confirm result count, active scope, loading/empty/partial state, and scope controls are visible.
5. Toggle generated/local-only inclusion and verify results update.
6. Limit search to Markdown-focused content or the current folder.
7. Open a result and confirm the active path and search context remain understandable.

## Root Dashboard and Navigation

1. Navigate to the repository root.
2. Confirm the root view prioritizes repository status, key docs, recent items, changed files, and high-value folders.
3. Confirm raw directory browsing remains available.
4. Collapse the sidebar.
5. Use collapsed navigation controls for search, changed files, recent files, key docs/root, current folder, and expand navigation.
6. Hide generated/local-only files and verify tree, root view, folder list, and search honor the preference.
7. Show generated/local-only files again and verify labels are visible.

## Repository Status

1. Open a repository with a remote.
2. Confirm a plain-language status summary explains branch and remote state.
3. Create or modify local files.
4. Confirm the summary includes local-change counts and links to changed-files review.
5. Open a local-only or no-upstream repository and confirm the summary is still meaningful.

## Rare Edit Safety

1. Open an editable file.
2. Confirm read/find/copy/share/review actions are more prominent than edit/delete.
3. Start editing and make a dirty change.
4. Attempt to navigate, refresh, or select a search result and confirm GitLocal warns before discarding edits.
5. Modify the same file outside GitLocal while editing.
6. Attempt to save and confirm GitLocal blocks accidental overwrite with a readable conflict message.
7. Confirm the conflict state keeps the draft available and offers both Keep editing and Reload from disk recovery actions.

## Automated Checks

After implementation, run focused tests for touched surfaces:

```sh
(cd ui && npx vitest run src/App.test.tsx src/components/ContentPanel/ContentPanel.test.tsx src/components/ContentPanel/InlineFileEditor.test.tsx src/components/ContentPanel/MarkdownRenderer.test.tsx src/components/Search/SearchPanel.test.tsx src/components/Search/SearchResults.test.tsx src/components/FileTree/FileTree.test.tsx src/components/RepoContext/RepoContextHeader.test.tsx src/services/viewerState.test.ts --coverage.enabled=false)
npx vitest run tests/unit/git/repo.test.ts tests/unit/git/tree.test.ts tests/unit/handlers/search.test.ts tests/unit/handlers/repo.test.ts tests/unit/handlers/sync.test.ts tests/unit/handlers/file.test.ts tests/unit/services/repo-watch.test.ts --coverage.enabled=false
```

## Full Verification

Before merge or release candidate review:

```sh
npm test
npm run build
```

## Polish Validation Notes

- 2026-06-11: Focused UI and server tests were run for the implemented viewer workflows, followed by full `npm test` and `npm run build`.
- Manual smoke validation can use any local repository with Markdown docs: start GitLocal, open the root dashboard, run a scoped search, open changed files, start a dirty edit, and verify refresh/search/branch navigation prompts before discarding edits.
- For conflict validation, open a text file, begin editing, change the same file externally, then save in GitLocal. The expected result is a blocked save with recovery actions, not an overwrite.
