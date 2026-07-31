# Quickstart: Validating the Navigation Concepts Improvements

This guide exercises each user story from [spec.md](spec.md) end-to-end against a local build. As with the 029 quickstart, **verify in an actual browser, not just via `curl`** — button visibility/disabled state and toolbar layout are UI-rendering concerns that an API-level check cannot confirm.

## Prerequisites

```bash
npm install
npm run build
```

Set up a small fixture tree that exercises nesting, a plain folder, and the filesystem root boundary:

```bash
mkdir -p /tmp/gitlocal-nav-quickstart/outer-repo/docs/deep
mkdir -p /tmp/gitlocal-nav-quickstart/outer-repo/vendor/inner-repo/src
mkdir -p /tmp/gitlocal-nav-quickstart/plain-folder/subfolder

cd /tmp/gitlocal-nav-quickstart/outer-repo && git init -q && \
  echo '# Outer Repo' > README.md && \
  echo 'a' > docs/deep/file.txt && \
  git add -A && git commit -q -m init

cd /tmp/gitlocal-nav-quickstart/outer-repo/vendor/inner-repo && git init -q && \
  echo '# Inner Repo' > README.md && \
  echo 'b' > src/file.txt && \
  git add -A && git commit -q -m init

echo 'plain' > /tmp/gitlocal-nav-quickstart/plain-folder/subfolder/note.txt
```

## Scenario 1 (User Story 1, P1) — Parent Folder button in all three modes

1. `node dist/cli.js /tmp/gitlocal-nav-quickstart/outer-repo`
2. Open the served URL. **Expected**: no ".." row anywhere in the folder listing; a "Parent Folder" control is visible in the header toolbar, enabled.
3. Navigate into `docs/deep`. Click "Parent Folder". **Expected**: lands on `docs` (not `docs/deep`'s listing anymore) — one level up, same as clicking a `..` row would have.
4. From `docs`, open `deep/file.txt` (a file view). **Expected**: "Parent Folder" is still visible and enabled in the same toolbar location; clicking it closes the file and shows the `docs/deep` folder listing (its containing folder).
5. Click "Parent Folder" (or the kebab menu's "Edit file", then look for the control) while editing a file. **Expected**: same control, same position, same behavior — closes the editor and navigates to the containing folder (confirm any unsaved-changes discard prompt still fires, unchanged from today's `onBrowseParent`/navigation guards).
6. Navigate back to the repo root (`outer-repo`'s home listing). Click "Parent Folder" again. **Expected**: this is the boundary-crossing case — confirm the existing repo-boundary dialog still appears (unchanged behavior), and confirming it leaves the repo, landing in OS-picker mode at `/tmp/gitlocal-nav-quickstart`.

## Scenario 2 (User Story 1, P1) — Filesystem root disables Parent Folder

1. `node dist/cli.js /`
2. Open the served URL. **Expected**: "Parent Folder" is visibly disabled (not hidden) — matches FR-004. Confirm clicking it (if the disabled attribute is bypassed via devtools, as a defense-in-depth check) does not navigate or error.

## Scenario 3 (User Story 2, P1) — Home button, plain nesting

1. `node dist/cli.js /tmp/gitlocal-nav-quickstart/outer-repo`
2. Navigate into `docs/deep`. **Expected**: a "Home" button is visible and enabled.
3. Click "Home". **Expected**: navigates directly to the `outer-repo` root listing in one click.
4. Open `docs/deep/file.txt` (file view). Click "Home". **Expected**: same one-click jump to the repo root, from file view too.
5. At the repo root itself, check "Home". **Expected**: per the resolved default (research.md §7), the button is visibly disabled (not hidden) — you're already there.

## Scenario 4 (User Story 2, P1) — Home button targets the nearest enclosing sub-repo, not the outer repo

1. `node dist/cli.js /tmp/gitlocal-nav-quickstart/outer-repo`
2. Navigate into `vendor/inner-repo/src`. **Expected**: "Home" is enabled.
3. Click "Home". **Expected**: lands on `vendor/inner-repo`'s own root listing (showing `README.md` and `src/`) — **not** `outer-repo`'s root. This is the critical FR-009 check; if "Home" instead jumps to `outer-repo`'s root, the nested-repo classification (`GET /api/repo/location`) is not correctly resolving `repositoryRootPath` for the current selection.
4. From `vendor/inner-repo` (its own root), click "Parent Folder" once. **Expected**: lands on `vendor` — a plain, non-git folder inside `outer-repo`. Confirm "Home" and "Readme" both disappear entirely at this location (Edge Case 2 — visibility reflects the *current* location).
5. From `vendor` (non-git), click "Parent Folder" again to reach `outer-repo`'s root. **Expected**: "Home" (now disabled, already there) and "Readme" reappear, scoped to `outer-repo` again — confirms the transition back out of the sub-repo also updates correctly.

## Scenario 5 (User Story 3, P2) — Readme button always targets the home README, never a subfolder's

1. `node dist/cli.js /tmp/gitlocal-nav-quickstart/outer-repo`
2. Add a decoy: `echo '# Docs Readme' > /tmp/gitlocal-nav-quickstart/outer-repo/docs/README.md && (cd /tmp/gitlocal-nav-quickstart/outer-repo && git add -A && git commit -q -m 'add docs readme')`
3. Navigate into `docs` (which now has its own `README.md`, and its own in-page README panel will show "Docs Readme" content — that's expected and unchanged). Click the "Readme" toolbar button. **Expected**: opens `outer-repo`'s root `README.md` ("# Outer Repo"), not `docs/README.md` — confirms FR-011.
4. Open `docs/deep/file.txt` (file view, no README anywhere near it). Click "Readme". **Expected**: still opens `outer-repo`'s root README, from file view too.
5. Navigate into `vendor/inner-repo/src`. Click "Readme". **Expected**: opens `inner-repo`'s own `README.md` ("# Inner Repo") — confirms the Readme button, like Home, is nested-repo-aware.

## Scenario 6 (User Story 3, P2) — Readme disabled when the home folder has no README

1. `mkdir -p /tmp/gitlocal-nav-quickstart/no-readme-repo && cd /tmp/gitlocal-nav-quickstart/no-readme-repo && git init -q && echo x > file.txt && git add -A && git commit -q -m init`
2. `node dist/cli.js /tmp/gitlocal-nav-quickstart/no-readme-repo`
3. **Expected**: "Readme" button is visibly disabled (not hidden) at the repo root and from anywhere inside this repo — confirms FR-013's resolved default.

## Scenario 7 (Edge Case) — Plain, non-git folder shows no repo-only buttons

1. `node dist/cli.js /tmp/gitlocal-nav-quickstart/plain-folder`
2. **Expected**: "Parent Folder" is visible and enabled (or disabled if this happens to be filesystem root — it won't be here). "Home" and "Readme" are **not rendered at all** — confirms FR-008/FR-012 (hidden, not merely disabled, for non-git folders).
3. Navigate into `subfolder`. **Expected**: same — only "Parent Folder" present.

## Cross-cutting check — toolbar footprint (SC-004)

1. Compare the header area's rendered height before this change (git history / a checkout of `main`) against after, in the same browser window size, for both a folder listing and a file view. **Expected**: the combined toolbar (Parent Folder + Home + Readme, plus existing branch selector/search trigger) does not increase the single-row header height it augments — icon-forward compact buttons per FR-014, confirmed visually, not just by code review.
2. Resize the browser to a narrow/mobile width. **Expected**: buttons collapse to icon-only (title/aria-label still present, confirm via a screen reader or the accessibility inspector) rather than wrapping or overflowing horizontally — confirms Edge Case 5.

## Automated coverage

```bash
npm test
```

Confirm new/updated test cases exist for (≥90% per-file branch coverage per constitution Principle II):
- `src/handlers/repo.ts` — new `repositoryLocationHandler` (nested repo, non-nested repo, non-git path, already-at-root, no-readme branches); `repositoryParentFolderHandler`'s new filesystem-root guard
- `src/git/repo.ts` — no new logic expected (reusing `classifyLocalPath`/`findReadme` as-is); confirm existing tests still cover both at ≥90%
- `ui/src/components/RepoContext/RepoContextHeader.tsx` — Parent Folder/Home/Readme render, disabled states, hidden-for-non-git states, click handlers
- `ui/src/components/ContentPanel/ContentPanel.tsx` — confirm the removed `parentRow`/`isParent`/`exitsRepo` branches are deleted along with their now-obsolete tests, and no dead code remains below the coverage floor
- `ui/src/App.tsx` — new `['repo-location', ...]` query wiring, `onNavigateParent`/`onNavigateHome`/`onNavigateReadme` handlers
- `ui/src/services/api.ts` — new `getRepoLocation()` call
