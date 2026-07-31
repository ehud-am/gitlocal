# Phase 1 Data Model: Navigation Concepts Improvements

This feature introduces one new small read endpoint (see `contracts/repo-location-contract.md`) and reshapes existing client-side navigation state; it does not add persistent storage. The "entities" below map spec.md's Key Entities section onto concrete current types (`ui/src/types/index.ts`, `src/types.ts`) plus the new fields/state this feature requires.

## Entity: Parent Folder Target

Spec definition: "The filesystem folder that directly contains the current folder or file. Undefined/absent when the current location is already the filesystem root."

**Maps to**: no new type — an existing computed value, `parentPathOf(selectedPath)` (duplicated today in both `ContentPanel.tsx:113-116` and `App.tsx:683-686`; this feature does not need to deduplicate that helper, though it's a reasonable adjacent cleanup), combined with the existing `onBrowseParent` prop chain for the repo-boundary-crossing case.

| Concept | Current representation | Change in this feature |
|---|---|---|
| "Up one level, still inside opened root" | `parentPathOf(selectedPath)` (string, may be `''` for "opened root itself") | Unchanged computation; now drives a persistent toolbar button's `onClick` instead of a conditionally-rendered table row |
| "Up one level, leaving the opened root" | `onBrowseParent` → `handleBrowseParentRequest` → confirm dialog → `handleBrowseParentFolder` → `POST /api/repo/parent-folder` → full reload | Unchanged chain. New: `repositoryParentFolderHandler` gains a filesystem-root guard (below) |
| "At the true filesystem root, no further parent" | Not modeled today for the in-app case (only `getParentPath` in the OS picker models it, via `dirname(p) === p` returning `null`) | **New**: `repositoryParentFolderHandler` (`src/handlers/repo.ts:215-226`) checks `dirname(repoPath) === repoPath` before computing a parent, returning `{ ok: false, error: '...' }` instead of a nonsensical picker path. The client already renders `LocalActionResponse.ok === false` as a status message (`handleBrowseParentFolder`, `App.tsx:734-746`) — reused unchanged as the disabled-button fallback surface for the one edge case an optimistic client-side guess can't fully rule out (Edge Case 6: opened root itself is the OS root) |

**New client state**: none required as `useState` — "Parent Folder enabled?" is a pure render-time derivation:

```ts
const parentFolderEnabled = Boolean(selectedPath) || Boolean(onBrowseParent)
```

This is exactly today's `parentRow` presence check (`path ? {...} : onBrowseParent ? {...} : null`), inverted into a boolean instead of a row object — no new information is needed to decide it, only a different rendering of the same existing signal. `onBrowseParent` is already `undefined` when there's nothing to browse to (see `App.tsx:1358`, always passed today — the one case it should become conditionally `undefined` is discussed under "Behavior changes" in plan.md, for the true-filesystem-root case at the opened root, which is rare and mostly caught by the server-side guard above surfacing as a disabled-after-click status message on the rare occasion the client's optimistic assumption is wrong).

**Validation rule (new)**: The "Parent Folder" button must be present (rendered, just `disabled`) in all three modes (folder listing, file view, file edit) — not conditionally mounted like today's row. This is the FR-004 "visibly disabled, not hidden" requirement applied uniformly.

## Entity: Repository Home Folder

Spec definition: "The top-level folder of the git repository (or nested sub-repository) that contains the user's current location. Absent when the current location is not inside any git repository."

**Maps to**: new `RepoLocationResponse.repositoryRootPath` (absolute path), fetched via the new `GET /api/repo/location` endpoint (`contracts/repo-location-contract.md`), built entirely from the existing `classifyLocalPath()` primitive (`src/git/repo.ts:314-370`) — no new git-boundary detection logic, only a new call site reusing it against the current in-app `selectedPath` instead of only at repo-open time.

| Field | Type | Meaning | Source |
|---|---|---|---|
| `repositoryRootPath` | `string` (absolute path, `''` if none) | Nearest enclosing repo root for the current `selectedPath` | `classifyLocalPath(...).repositoryRootPath ?? ''` |
| `isRepositoryRoot` | `boolean` | Whether the current location already IS that root | `classifyLocalPath(...).gitState === 'repository-root'` |

**Relationship to existing `RepoInfo.path`**: `RepoInfo.path` (`ui/src/types/index.ts:1-11`) is the **globally opened root**, fixed for the life of the session (or until a new repo/folder is opened via the picker). `repositoryRootPath` from the new endpoint is the **nearest enclosing repo root for wherever the user currently is**, which equals `RepoInfo.path` in the common (non-nested) case and differs only when the user has navigated into a nested sub-repository. This distinction is the entire reason the new endpoint exists (research.md §3) — reusing `RepoInfo.path` alone would violate FR-009 for nested repos.

**New client state**: one new React Query, added to `App.tsx` alongside the existing `['tree', ...]`/`['info']` queries:

```ts
const { data: repoLocation } = useQuery({
  queryKey: ['repo-location', selectedPath, currentBranch],
  queryFn: () => api.getRepoLocation(selectedPath),
  enabled: Boolean(info?.isGitRepo),
})
```

No new `useState` — this is server-derived, cached, and re-fetched on navigation exactly like `['tree', ...]` already is, keeping this feature consistent with the app's existing "state lives in query cache, not ad hoc `useState`" convention for filesystem-derived data.

**Navigation action**: clicking "Home" calls the existing `onOpenPath`/`handleSelectFolder(path, false)` (already used by every other in-app folder navigation) with `path = relative(viewerRepoPath, repoLocation.repositoryRootPath)` — no new navigation primitive, just a new computed target for the existing one. When `repositoryRootPath === viewerRepoPath` exactly (non-nested case, the overwhelming majority of usage), this simplifies to `path = ''`.

**Validation rule (new)**: Home button MUST be hidden (not merely disabled) when `!info?.isGitRepo` (FR-008), and disabled (not hidden, per research.md §7's resolved default) when `repoLocation?.isRepositoryRoot === true`.

## Entity: Repository Home README

Spec definition: "The README file, if any, located directly in the Repository Home Folder (not in any subfolder). Its presence/absence determines whether the Readme control is enabled."

**Maps to**: new `RepoLocationResponse.homeReadmePath` (string, repo-root-relative, `''` if none), computed server-side by calling the **existing, unmodified** `findReadme(repositoryRootPath, currentBranch, '')` (`src/git/repo.ts:549-572`) against the *resolved nested root* rather than the globally opened `repoPath`. This directly reuses research.md §2's finding that `findReadme(..., folderPath='')` already means "the README at this root," with zero changes to that function's logic.

| Field | Type | Meaning | Source |
|---|---|---|---|
| `homeReadmePath` | `string` (repo-root-relative, `''` if none) | The Readme button's navigation target | `findReadme(repositoryRootPath, branch, '')` |

**Relationship to today's `ContentPanel` README lookup**: Today's `directoryReadmePath` (`ContentPanel.tsx:276`, via `api.getReadme(directoryPath, branch)`) is **current-folder-scoped** and continues to serve its existing purpose unchanged (the in-page README panel shown when browsing a folder that happens to contain its own README — spec.md Assumptions confirm this feature does not change how folder listings render their own README panel, only adds a *separate, always-home-scoped* navigation control). The new `homeReadmePath` is a distinct, additional signal — the two can legitimately differ (browsing a subfolder with its own README, while the Readme *button* still targets the home folder's different README), which is precisely spec.md Acceptance Scenario 3.2's required behavior.

**Navigation action**: clicking "Readme" calls the existing `onNavigate`/`handleSelectFile(path, false)` with `path = relative(viewerRepoPath, resolve(repoLocation.repositoryRootPath, repoLocation.homeReadmePath))` — again, no new navigation primitive.

**Validation rule (new)**: Readme button MUST be hidden when `!info?.isGitRepo` (FR-012), and disabled when `!repoLocation?.homeReadmePath` (FR-013, research.md §7's resolved default: disable rather than omit, matching `ContentPanel`'s existing `directoryReadmePath`-driven conditional-link precedent).

**Staleness rule (from spec Edge Case 4)**: Because `homeReadmePath` is served fresh on every `['repo-location', selectedPath, ...]` query (re-fetched on navigation, not cached indefinitely), a README added/removed/renamed at the home folder between navigations is picked up the next time the query re-runs — no special invalidation logic needed beyond React Query's existing per-navigation refetch behavior, already relied upon by `['tree', ...]` today.

## Cross-cutting: `RepoContextHeader` prop surface (the toolbar's new inputs)

Per research.md §4, all three controls mount in `RepoContextHeader.tsx`, which currently has no path-navigation callbacks at all (only `onBranchChange`, `onEditGitIdentity`, `onOpenSearch`, `onOpenChangedFiles`/`onOpenChangedFile`, `onCloseChangedFiles`). New props required:

```ts
interface Props {
  // ...existing props unchanged...
  onNavigateParent?: () => void       // reuses existing parentPathOf/onBrowseParent logic, lifted from ContentPanel to App-level
  parentFolderEnabled?: boolean       // see Parent Folder Target above
  onNavigateHome?: () => void
  repoLocation?: RepoLocationResponse // new type from contracts/repo-location-contract.md, re-exported via ui/src/types/index.ts
  onNavigateReadme?: () => void
}
```

`selectedPath`/`selectedPathType`/`info` are already props on `RepoContextHeader` today (`RepoContextHeader.tsx:9-13`) and are sufficient, combined with the new `repoLocation`, to derive all three buttons' visibility/enabled state without further plumbing.

**Behavior change note**: Because Parent Folder now needs to work from file view/edit mode too (FR-005), and `RepoContextHeader` (not `ContentPanel`) is where the button lives, the *"close file view and go to its containing folder"* part of FR-005 becomes `onNavigateParent` calling `handleSelectFolder(parentPathOf(selectedPath))` when `selectedPathType !== 'none'` — this is the existing `handleSelectFolder` function (`App.tsx`, sets `selectedPathType` back to `'dir'`/`'none'` and clears file-view state), already used elsewhere for exactly this "leave file view, show a folder" transition (e.g. `handleOpenChangedFile`'s not-`canOpen` branch, `App.tsx:708-715`) — reused, not reinvented.

## No new persisted schema

No `~/.gitlocal/*.json` preference file, no new database, no new field on any *existing* wire type (`RepoInfo`, `TreeNode`, `LocalActionResponse`, `FolderBrowseEntry` are all unchanged). The only new wire shape is the additive `RepoLocationResponse` from the new endpoint.
