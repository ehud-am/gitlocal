# Quickstart: Per-Repo/Folder Configuration File

## Implementation Targets

1. Add `src/services/repo-layout.ts`: `readRepoLayout(repoPath)` / `writeRepoLayout(repoPath, layout)`, mirroring `startup-preferences.ts`'s read/write/error-tolerance shape, at `join(repoPath, '.gitlocal', '.layout')`.
2. Add `RepoLayout`, `RepoLayoutResponse`, `RepoLayoutUpdateRequest` types to `src/types.ts`.
3. Add `repoLayoutHandler` (GET) and `repoLayoutUpdateHandler` (PUT) to `src/handlers/repo.ts`, mirroring `startupFolderHandler`/`startupFolderUpdateHandler`'s request/response and error-code shape.
4. Register `app.get('/api/repo/layout', repoLayoutHandler)` and `app.put('/api/repo/layout', repoLayoutUpdateHandler)` in `src/server.ts`, alongside the existing `/api/repo/...` routes.
5. Add matching client types to `ui/src/types.ts` and `getRepoLayout()`/`updateRepoLayout()` to `ui/src/services/api.ts`, mirroring `getStartupFolder`/`updateStartupFolder`.
6. In `ui/src/App.tsx`: add a `useQuery(['repo-layout'], api.getRepoLayout)`; extend the initial-state effect (~lines 588-617) with the new priority tier (startup open-target > saved layout > URL-param state); add fire-and-forget `api.updateRepoLayout(...)` calls on branch switch, file open, and raw/pretty toggle.
7. Preserve all existing URL-param viewer state, git identity settings, and startup-folder/default-reader behavior unchanged.

## Focused Verification

Run the targeted server tests while implementing:

```sh
npm test -- repo-layout repo.test
```

Run the targeted UI tests:

```sh
npm --prefix ui run test -- App
```

Run the full server + UI coverage suite before handing off implementation:

```sh
npm test
npm --prefix ui run test:ci
```

Run the full project checks if the implementation touches shared helpers or build configuration:

```sh
npm run lint
npm run build
```

## Manual Smoke Samples

- Open a git repo, switch branch, open a file, toggle raw view, close GitLocal, reopen the same repo — confirm branch/file/raw mode are restored.
- Open a repo for the first time (no `.gitlocal/.layout` yet) — confirm it opens at today's existing default, no error.
- Manually delete or corrupt `.gitlocal/.layout` (invalid JSON) — confirm the repo still opens normally at default state.
- Manually delete the saved branch (e.g. delete the branch from git) after it was saved — confirm the repo falls back to the current default branch rather than failing.
- Manually make `.gitlocal/` (or its parent) read-only, then navigate within the repo — confirm browsing still works and no error is shown, even though the write silently fails.
- Open a plain non-git folder, navigate, close, reopen — confirm the same restore behavior as a git repo, with no branch involved.
- Set a layout while running via the npm-served browser UI, then open the same repo via the macOS app (or vice versa) — **this is the primary check for SC-004** — confirm the saved layout is honored across distributions.
- Launch GitLocal by double-clicking a file (explicit startup open-target) on a repo that also has a saved `.gitlocal/.layout` — confirm the explicit open-target wins over the saved layout.
- Confirm `.git/config`-based git identity settings and existing URL-param-only fields (`sidebarCollapsed`, search filters) are unaffected.

Expected result: reopening any previously-visited repo or folder restores branch/path/raw-view-mode automatically with no user action; a missing, corrupted, or unwritable `.gitlocal/.layout` never blocks or errors browsing; an explicit startup open-target always takes priority; behavior is identical across both GitLocal distributions and for non-git folders.
