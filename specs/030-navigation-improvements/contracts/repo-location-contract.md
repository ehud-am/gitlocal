# Contract: Repository Location Endpoint

**Applies to**: new route `GET /api/repo/location`, registered in `src/server.ts` alongside the other `/api/repo/*` routes (near `app.get('/api/repo/summary', repositorySummaryHandler)`, `src/server.ts:285`).
**Handler**: new `repositoryLocationHandler` in `src/handlers/repo.ts`, alongside `repositoryOpenHandler`/`repositoryParentFolderHandler`.
**Consumed by**: `ui/src/services/api.ts` (new `api.getRepoLocation(path?: string)`), called from `RepoContextHeader`'s new Home/Readme/Parent Folder button logic (via a new `['repo-location', selectedPath]` React Query in `App.tsx`, mirroring the existing `['tree', ...]`/`['info']` query pattern).

## Problem this contract fixes

The app's global `repoPath` (set once when a repository/folder is opened) is the only repo-root the server currently exposes to the client (`RepoInfo.path`, `LocalActionResponse.repositoryRootPath` at open-time). Once the user navigates in-app into a nested sub-repository via ordinary folder browsing, nothing re-classifies the *current* location — `classifyLocalPath` (the existing, already-correct nearest-enclosing-repo-root primitive used by the OS picker and by `repositoryOpenHandler` at open-time) is never invoked again during in-app navigation. Both the "Home" button (spec FR-007/008/009) and the "Readme" button (FR-010/011) need to know, for the *current* `selectedPath`, what the nearest enclosing repository's root actually is — which may differ from the globally opened `repoPath` when a sub-repository is nested inside it.

## Request

```
GET /api/repo/location?path=<repo-relative-path>
```

- `path` (optional, default `''`): the currently selected path, **relative to the globally opened `repoPath`** — i.e. exactly the same string already used as `selectedPath` throughout the app and as the `path` query param on `/api/tree` and `/api/readme`. Empty string means "the opened root itself."
- No request body. No mutation. Safe to call on every navigation; safe to omit calling when `info.isGitRepo` is already known `false` (see Non-goals).

## Response shape

```ts
interface RepoLocationResponse {
  /** Absolute filesystem path of the nearest enclosing git repository's root for `path`, or '' if `path` is not inside any git repository. */
  repositoryRootPath: string
  /** True when `path` (resolved to an absolute path) IS repositoryRootPath — i.e. the user is already at the repo home folder. */
  isRepositoryRoot: boolean
  /** Repo-relative path (relative to repositoryRootPath, NOT the globally opened repoPath) of the README directly in repositoryRootPath, or '' if none exists. */
  homeReadmePath: string
  /** True when going up one level from the CURRENT absolute location (opened repoPath + path) would go above the true filesystem root. Always false in practice (see repositoryParentFolderHandler note below) — included for symmetry/testability. */
  atFilesystemRoot: boolean
}
```

- Reuses `classifyLocalPath(resolveRepoPath(repoPath, path))` internally — no new git-boundary detection logic, only a new call site for the existing function.
- `homeReadmePath` reuses `findReadme(repositoryRootPath, currentBranch, '')` unchanged — the existing home-README primitive from research.md §2, just invoked against the *resolved* nested root instead of the global `repoPath`.
- When `path` does not resolve inside any git repository (`classifyLocalPath(...).gitState === 'outside-repository'` or the target has no `repositoryRootPath`), the response is `{ repositoryRootPath: '', isRepositoryRoot: false, homeReadmePath: '', atFilesystemRoot: false }` — the client treats an empty `repositoryRootPath` as "no Home/Readme buttons" (FR-008/FR-012), matching `LocalPathClassification`'s existing optional-field convention.

**Status code**: always `200` for a well-formed request (this is a pure classification read, not a state mutation — there is no "not found" case; "not in a repo" is a valid, successfully-computed answer, not an error). `400` only if `path` would resolve outside the currently opened `repoPath` entirely (defensive; not expected to occur through normal UI navigation since `selectedPath` is always repo-relative by construction).

## Client contract

- `App.tsx` fetches this via a new `useQuery({ queryKey: ['repo-location', selectedPath, currentBranch], queryFn: () => api.getRepoLocation(selectedPath) })`, gated `enabled: Boolean(info?.isGitRepo)` (Non-goal: never called for plain OS folders, satisfying FR-008/FR-012 without a wasted request).
- `RepoContextHeader` receives the resolved `repoLocation` as a new optional prop and uses it to decide: Home button `enabled = Boolean(repoLocation?.repositoryRootPath) && !repoLocation.isRepositoryRoot`; Readme button `enabled = Boolean(repoLocation?.homeReadmePath)`; both `hidden` entirely (not just disabled) when `!info?.isGitRepo` (FR-008/FR-012 say MUST NOT be shown at all for non-git folders — stronger than the disable-not-hide rule that applies to Parent Folder and to Home/Readme's own "already there"/"no readme" sub-states).

## Parent-folder-at-filesystem-root guard (companion fix, same contract scope)

`repositoryParentFolderHandler` (`src/handlers/repo.ts:215-226`) currently computes `dirname(repoPath)` unconditionally. Per research.md §5, add the same guard `getParentPath` already uses (`src/handlers/folder.ts:81-84`): if `dirname(repoPath) === repoPath` (the opened root is already the true filesystem root), return `{ ok: false, error: 'GitLocal is already at the root of the file system.' }` instead of attempting to open a nonsensical picker path. This is the one behavioral (not just additive) change to existing handler code required by this feature, and it's a defensive edge-case guard, not a redesign — the handler's success path is unchanged.

## Non-goals

- This endpoint does not change `/api/info`, `/api/tree`, or `/api/readme`'s existing response shapes — it is purely additive.
- This endpoint is not called for non-git folders (`info.isGitRepo === false`); Home/Readme buttons are unconditionally absent there per FR-008/FR-012, so there is nothing for it to classify.
- This endpoint does not itself navigate or open anything — "Home" navigation is still a plain client-side `onOpenPath`/`handleSelectFolder` call (already existing) using `repositoryRootPath` translated back into a `repoPath`-relative path (`relative(repoPath, repositoryRootPath)`) by the client; "Readme" navigation is a plain `onNavigate`/`handleSelectFile` call using `homeReadmePath` translated the same way. No new mutation endpoints are introduced.
