# Quickstart: Repo Safety, Search & Review Fixes + PPTX Preview

## Verify symlink write containment (Bug 1)

1. In a temp repository opened in GitLocal, create a symlink pointing outside the repo: `ln -s /tmp/outside escape` (create `/tmp/outside` first).
2. Attempt to create a file at `escape/proof.txt` via the app's create-file UI (or `POST /api/file` directly).
3. Expected: the request is rejected (non-2xx) and `/tmp/outside/proof.txt` does NOT exist.
4. Attempt to create a folder at `escape/proofdir` similarly.
5. Expected: rejected, and `/tmp/outside/proofdir` does NOT exist.
6. Confirm ordinary file/folder creation at normal in-repo paths still succeeds exactly as before.

## Verify branch search colon parsing (Bug 2)

1. In a test repo, create and commit a tracked file named `docs/a:b.md` containing the text `needle`.
2. Use branch content search for `needle` against that branch.
3. Expected: the result's path is exactly `docs/a:b.md` (not truncated) and its line number is correct (not `null`).
4. Open the result → confirm it opens `docs/a:b.md` at the correct line.

## Verify changed-file review with quoted rename paths (Bug 3)

1. In a test repo, create `base.txt`, commit it, then `git mv "base.txt" "a b.txt"` (stage the rename).
2. Request the changed-file list via the review feature.
3. Expected: the entry's path is exactly `a b.txt` (no quote characters, no escape sequences), `type` is `renamed`, and `canOpen` is `true`.

## Verify non-terminal WebSocket upgrades close promptly (Bug 6)

1. With the GitLocal server running, attempt a WebSocket connection to `/api/not-terminal` (or any path other than the terminal IO route) from a small script or browser console.
2. Expected: within a short bounded time (well under 1s), the socket's ready state reflects a closed/rejected connection, not `CONNECTING` indefinitely.
3. Confirm a normal terminal-tab WebSocket connection still connects and behaves exactly as before.

## Verify PPTX preview

1. `npm run dev` (or the project's existing dev script) and open a repo containing a `.pptx` file with at least 3 slides, where at least one slide has speaker notes and at least one does not.
2. Select the `.pptx` file in the file tree.
3. Expected: the content panel renders the first slide as a single formatted view (positioned text, not raw markup, not a "binary file" fallback).
4. Use next/previous controls → confirm each slide in order renders, and navigation is disabled/no-ops at the first and last slide.
5. On the slide with notes → confirm the notes text appears alongside the slide.
6. On the slide without notes → confirm no empty/broken notes area appears.
7. Confirm no edit controls are present anywhere in the preview and no action modifies the underlying file.
8. Open a corrupted `.pptx` (e.g., truncate a valid file's bytes) → confirm a clear "cannot preview this file" message appears, not a crash or blank panel.
9. Open browser DevTools → Network tab, confirm no request beyond the local `/api/file` fetch occurs while the file is open (Principle III).
10. Open a large `.pptx` (many slides / large embedded images) → confirm the UI remains responsive while it loads (no multi-second freeze).

## Verify zero regression on existing types

1. Open a `.md`/`.json`/`.svg`/`.pdf`/`.csv`/`.xlsx`/`.png` file → each behaves exactly as before this feature.
2. Open a `.ts`/`.py`/etc. code file → syntax-highlighted `CodeViewer` as before.
3. A legacy binary `.ppt` file (unless implemented as an in-scope stretch) remains classified and rendered as `binary`, same as before.

## Run automated checks

```sh
npm test       # full suite incl. new/extended repo.ts, search.ts, websocket.ts, and PptxViewer tests; existing suites must pass unmodified
npm run lint   # tsc --noEmit
npm run build  # server + UI bundle, confirms jszip/fast-xml-parser resolve and lazy-load correctly at build time
```
