# Data Model: Per-Repo/Folder Configuration File

## `.gitlocal/.layout` File

The on-disk JSON file this feature reads and writes, located at `join(repoPath, '.gitlocal', '.layout')` for whichever repo/folder is currently open.

**Fields**:

- `branch` (`string | null`): Last-viewed branch name, or `null` for a plain non-git folder or when no branch has been recorded yet.
- `path` (`string | null`): Last-viewed file path, relative to the repo/folder root; `null` when nothing has been viewed yet (e.g. still at the root listing).
- `pathType` (`'file' | 'dir' | 'none'`): Mirrors the existing `ViewerState.pathType` values, so the restored value maps directly onto existing UI state.
- `raw` (`boolean`): Last-selected raw/pretty view toggle for the last-viewed file.

**Validation rules**:

- Every field is read individually with a `typeof`/enum guard and a safe default, not validated against a strict schema — matches the existing `startup-preferences.ts` tolerance pattern and FR-009 (ignore unrecognized fields, tolerate missing ones).
- An entirely missing or malformed file is equivalent to `{ branch: null, path: null, pathType: 'none', raw: false }` (i.e. "nothing saved yet") — never an error state (FR-007).
- The file is only ever written by GitLocal itself as a whole-object replace (no partial/merge writes) — matches the existing `writeStartupFolderPreference` pattern and the PUT-replaces-whole-resource API shape.

## `RepoLayout` (server + client shared shape)

The in-memory/JSON-transport representation of the file above, used by the service, handler, and UI client.

**Fields**: identical to the `.gitlocal/.layout` file fields (`branch`, `path`, `pathType`, `raw`) — this is a direct read/write mirror, not a separate transformation.

**Relationships**:

- `RepoLayoutResponse` (server → client, `GET /api/repo/layout`): `{ layout: RepoLayout }`.
- `RepoLayoutUpdateRequest` (client → server, `PUT /api/repo/layout`): `{ layout: RepoLayout }` (whole-object replace, matching `StartupFolderUpdateRequest`'s shape).
- `RepoLayoutUpdateResponse`: `{ layout: RepoLayout }` (echoes the now-saved value, matching `StartupFolderUpdateResponse`).

## Initial View State Resolution (client, `App.tsx`)

Extends the existing initial-state resolution effect with one new priority tier. Not a new entity — a new input into the existing decision that sets `selectedPath`, `selectedPathType`, `showRaw`, and (as part of existing branch-validation logic) `currentBranch`.

**Priority order** (highest wins):

1. **Explicit startup open-target** (`startupOpenTargetResponse.target`) — an explicit file-open launch (e.g. double-clicking a `.md` file to open GitLocal). Unchanged from today.
2. **Saved `.gitlocal/.layout`** (new) — applied when there is no startup open-target and a saved layout was fetched (`repoLayoutResponse.layout` has a non-`null` `path`, or a non-`null` `branch`).
3. **URL-param state** (`savedInitialViewerStateRef`, existing) — applied only when neither of the above provides a value; retains its existing repo-path-mismatch guard for this case, since URL params can persist across a repo switch in ways a repo-scoped file inherently cannot.

**State transitions**:

- On mount, before any of the above queries resolve: state remains at its existing empty/default seed (`selectedPath = ''`, `selectedPathType = 'none'`, `showRaw = false`) — unchanged from today, no new loading state introduced.
- Once `startupOpenTargetResponse` and the new `repoLayoutResponse` have both resolved (or errored — `repoLayoutResponse` treats a fetch failure the same as "no saved layout," never blocking the effect): the priority order above is applied exactly once, gated by the existing `savedInitialViewerStateAppliedRef`-style one-shot guard.
- Saved `branch` from `.gitlocal/.layout` flows into the same existing branch-validation pass (lines 266-303 of `App.tsx`) that already falls back to `info.currentBranch` when a saved branch no longer exists — no new validation logic needed, the saved value just enters the same pipe URL-param `branch` already used.
- Every subsequent user navigation (branch switch, file open, raw/pretty toggle) triggers a fire-and-forget `api.updateRepoLayout({ layout: { branch, path, pathType, raw } })` call, matching the existing pattern for other ergonomic, non-blocking state writes.
