# Phase 0 Research: Navigation Concepts Improvements

This feature replaces an existing, working (if inconsistent) navigation mechanism with a new one, in a well-understood codebase. Research here documents exactly how today's ".." row and README lookup behave, what's already available server-side for repo-root/sub-repo detection, and what's genuinely missing. Most open questions are resolved directly from the code; the few real unknowns are marked `NEEDS CLARIFICATION` and given a reasoned default per spec.md's Assumptions section.

## 1. How the ".." row works today

**Investigated**: `ui/src/components/ContentPanel/ContentPanel.tsx`.

**Finding**: There is exactly one synthetic-row mechanism, with two shapes, built entirely inside `renderDirectoryList()` (L635-819):

```ts
const parentRow: DirectoryRow | null = path
  ? {
      name: '..', path: parentPathOf(path), type: 'dir', localOnly: false,
      isParent: true, exitsRepo: false,
      displayPath: parentPathOf(path) || 'repository root',
    }
  : onBrowseParent
    ? {
        name: '..', path: '', type: 'dir', localOnly: false,
        isParent: true, exitsRepo: true,
        displayPath: 'Leave the current repository scope',
      }
    : null
```

- **In-repo parent** (`path` truthy, i.e. browsing a subfolder): `exitsRepo: false`. Clicking calls `onOpenPath(parentPathOf(path), 'dir', false)` — a pure in-app navigation, no server round-trip beyond the normal tree fetch.
- **Repo-boundary "Browse"** (`path === ''`, i.e. already at the repo root/home folder, or a non-git folder's root): `exitsRepo: true`, only present `if (onBrowseParent)` is supplied. Clicking calls `onBrowseParent?.()` (wired from `App.tsx` to `handleBrowseParentRequest` → confirmation dialog → `handleBrowseParentFolder` → `POST /api/repo/parent-folder` → **full page reload** into OS-picker mode at `dirname(repoPath)`).
- Row rendering: `DirectoryRow.isParent`/`exitsRepo` drive badge text ("Parent" vs "Browse"), `aria-label`, and the `Kind` column text (L780-813). `openDirectoryRow()` (L675-682) is the single click handler for all rows, branching on `exitsRepo`.
- The row is **only rendered in the folder-listing render path** (`renderDirectoryList`). The file view/edit render path (`mode === 'view' | 'edit'`, starting ~L1002) has its own `content-active-context` toolbar (L1029-1140: Find in file, Markdown share, Copy, kebab menu) with **no parent-navigation affordance of any kind** today — confirming FR-005 (parent nav from file view/edit) is net-new UI, not a relocation of existing UI.

**Decision**: Removing the ".." row means deleting the `parentRow` construction and its inclusion in `rows` (L641-667), and the two `isParent`/`exitsRepo` branches in the row-rendering JSX (L780-819). The two existing behaviors it triggers (`onOpenPath` for in-repo, `onBrowseParent` for boundary-crossing) are still exactly right and are reused as-is by the new "Parent Folder" button — this is a UI relocation, not a new capability, for the folder-listing case. `onBrowseParent` is prop-drilled from `App.tsx` unchanged.

**What "one level up" already means in each case (reused for FR-002/FR-006 disabled-state logic)**:
- Subfolder inside a repo/folder → `parentPathOf(path)` (pure string slice on the last `/`), still within the same opened root.
- Repository/folder *home* (path === '') → the OS folder **containing** the opened root (`dirname(repoPath)` server-side), which requires leaving the currently-opened root and re-opening a new one — hence the existing full-page-reload + OS-picker round trip. No shortcut exists to do this without a server call, because the client has no filesystem access outside what the server has already opened.

## 2. README lookup and fallback logic today

**Investigated**: `ContentPanel.tsx` L148-151, L266-277; `src/git/repo.ts` `findReadme()` L549-572; `src/handlers/repo.ts` `readmeHandler()` L313-322; `ui/src/services/api.ts` `getReadme()` L202-208.

**Finding — client-side**: `findReadmePathFromEntries()` is a **non-git-only fallback** that scans the already-fetched `TreeNode[]` for the *current* folder for an exact case-insensitive `"readme.md"` match:

```ts
function findReadmePathFromEntries(entries?: TreeNode[]): string {
  const readme = entries?.find((entry) => entry.type === 'file' && entry.name.toLowerCase() === 'readme.md')
  return readme?.path ?? ''
}
```

For git repos, the README query instead calls `api.getReadme(directoryPath, branch)` — **`directoryPath` is always the currently-browsed folder**, never forced to the repo home folder. There is **no existing client-side concept of "home folder README" distinct from "current folder README."** Today's "README" link (L716-720, `<a href="#folder-readme">`) is an in-page anchor scroll to a panel showing the *current* folder's README (or "No README is available for this folder"), not a distinct navigation action.

**Finding — server-side, and good news for this feature**: `findReadme(repoPath, branch, folderPath)` (`src/git/repo.ts:549-572`) is **already generic over `folderPath`**, matching a broader `/^readme(\.\w+)?$/i` pattern than the frontend's exact-match fallback (case-insensitive, any extension — e.g. `Readme.txt`, `README.rst` all match, not just `.md`). Calling it with `folderPath=''` already returns the README located **directly in `repoPath`'s root**, regardless of what subfolder is being browsed — this is exactly "the repo home README," already implemented, just not currently invoked that way from the client. `readmeHandler` (`src/handlers/repo.ts:313-322`) passes the `path` query param straight through as `folderPath`, so `GET /api/readme` (no `path`) already returns the **global-`repoPath`-relative** home README today. `findKeyDocuments()` (`src/git/repo.ts` ~L1144) is existing precedent for "always resolve relative to repo root regardless of current browsing depth," reinforcing that this pattern is an established convention in this codebase, not a new one.

**The gap**: `readmeHandler` resolves relative to the single global `repoPath` (the whole opened root), not relative to whatever the *nearest enclosing (sub-)repo* is for the user's current in-app location. This only matters when the user is inside a nested sub-repository (see §3) — for the common case (no nesting), calling `GET /api/readme` with no `path` param today already does exactly what Story 3 needs, with zero backend changes.

**Decision**: Reuse `findReadme`/`readmeHandler`/`api.getReadme` as-is for the non-nested case (call with `path` omitted, i.e. `''`, and the correct `branch`). For the nested-sub-repo case, see §3 — the fix belongs in *which `repoPath`/relative-path pair* the client passes, not in `findReadme` itself.

## 3. Nested sub-repository ("nearest enclosing repo root") detection — the one real gap

**Investigated**: `src/git/repo.ts` `getContainingGitRoot()` (L295-303, uses `git rev-parse --show-toplevel`, inherently nearest-ancestor-`.git`-aware) and `classifyLocalPath()` (L314-370, wraps it into `LocalPathClassification` with `repositoryRootPath`/`gitState`/`openMode`); `src/handlers/folder.ts` `listFolderEntries()` (L52-79, calls `classifyLocalPath` **per entry** — this is where `FolderBrowseEntry.repositoryRootPath`/`gitState` for the OS picker come from); `src/handlers/repo.ts` `repositoryOpenHandler()` (L138-213, calls `classifyLocalPath` once, at the moment a path is opened, to decide the new global `repoPath`); `src/handlers/file.ts` `treeHandler()` (L41-50) and `src/handlers/repo.ts` `infoHandler()`/`readmeHandler()` — none of these three call `classifyLocalPath`; they all operate directly against the single already-set global `repoPath` via `c.get('repoPath')`.

**Finding**: The primitive for "nearest enclosing repo root of an arbitrary path" (`getContainingGitRoot`/`classifyLocalPath`) already exists and is correct (confirmed by spec 016, "Fix Nested Repository Detection" — but that fix was scoped entirely to the **OS folder picker** correctly labeling a direct child as a repo before it's opened, i.e. *before* a root is chosen). Nothing analogous runs **after** a root is opened and the user is browsing in-app via `selectedPath`/`TreeNode`s. Confirmed by reading `TreeNode` (`ui/src/types/index.ts` L205-212): it carries no `repositoryRootPath` field at all. `listWorkingTreeDirectoryEntries`/`listDir` (the functions backing `/api/tree`) build `TreeNode[]` with zero repo-root classification per entry.

**Consequence for this feature**: If the currently-opened root (`viewerRepoPath`/global `repoPath`) contains a nested sub-repository, and the user browses into it via ordinary tree navigation (not the OS picker, not re-opening), the app currently has **no way to know** that the user has crossed into a different git repository's scope. Both the "Home" button (FR-007/008/009) and "Readme" button (FR-010/011) need this to behave correctly per spec Edge Case 3 ("nearest enclosing repository's home folder, not the outer repository").

**Decision**: Add one new small, read-only endpoint, `GET /api/repo/location`, that calls `classifyLocalPath` against `resolveRepoPath(repoPath, selectedPath)` (the absolute filesystem path for whatever the client currently has selected — folder or file) and returns the resulting `repositoryRootPath` (relative to nothing — an absolute path, like the existing `LocalActionResponse.repositoryRootPath`) plus whether a home README exists at that root. This is the smallest change that reuses 100% existing, already-correct logic (`classifyLocalPath`) rather than inventing new git-boundary detection. See `contracts/repo-location-contract.md` for the full shape. This is a **read** endpoint (no state mutation), called on navigation, mirroring the existing `['tree', ...]`/`['info']` query pattern already used throughout `App.tsx`/`ContentPanel.tsx`.

**Alternatives considered**:
- *Extend `/api/tree` to include `repositoryRootPath` per entry*: rejected — would require classifying every entry in every listing (expensive, one `git rev-parse` per row) when only the *current* location's classification is ever needed by the toolbar. A single endpoint keyed on the current selection is O(1) instead of O(entries).
- *Extend `/api/info` to include nested-repo info*: rejected — `/api/info` reflects the *opened root's* identity (fetched once per app load / repo-open), not the *currently browsed subpath's* identity, which changes on every navigation. Conflating the two would require re-fetching `/api/info` on every folder/file navigation, which is a much larger behavioral change than adding one small endpoint.
- *Compute nested-repo detection entirely client-side by re-walking `TreeNode`s looking for `.git`*: rejected — `.git` directories are already filtered out of tree listings (dotfile handling), and directory listings don't reveal whether a `.git` entry is a real repo vs. a stray file; only `git`/filesystem operations the server already performs (`getContainingGitRoot`) can answer this correctly.

## 4. File view/edit mode structure — is there an existing toolbar to extend?

**Investigated**: `ContentPanel.tsx` L1002-1140 (file view/edit render branch), `App.tsx` L1245-1283 (JSX mount order).

**Finding**: Yes, but it's the wrong one to reuse directly. `content-active-context` (L1031-1140) is a **per-mode, file-scoped** toolbar (Find in file, Markdown share, Copy, kebab menu for raw/edit/delete) that only renders `mode === 'view'`, not `edit`, and has no equivalent structure in the folder-listing view (`content-directory-header`, L707-762, is a different, differently-styled toolbar with its own dotfile toggle / folder-actions kebab). Neither is a good single home for controls that must appear identically across folder listing, file view, *and* file edit (FR-015's "single, consistent, predictable location").

**Finding — the actual right location already exists**: `App.tsx` mounts `<RepoContextHeader>` (L1246-1283) **once**, immediately above `<Breadcrumb>` (L1314) and `<ContentPanel>` (L1328-1362), completely outside and above all three of `ContentPanel`'s internal render branches (dashboard/root, folder listing, file view, file edit — all are internal `if`/return branches inside the same `ContentPanel` component, `App.tsx` never conditionally un-mounts `RepoContextHeader` based on mode). This is confirmed to be the one place in the component tree that is genuinely mode-independent today, and it already receives `info` (carrying `isGitRepo`), `selectedPath`, and `selectedPathType` as props — everything needed to decide each button's visibility/enabled state without new prop plumbing beyond what's already passed.

**Decision**: The three new buttons live in `RepoContextHeader`, in its existing top action-row (next to the branch selector / `SearchTrigger`, `RepoContextHeader.tsx` L135-160), not inside `ContentPanel`. This satisfies FR-015 for free (one mount point, not three), keeps `ContentPanel` (already the largest, most complex file touched by recent features) free of new toolbar surface, and requires only new props/callbacks on `RepoContextHeader`, not new render branches.

## 5. Filesystem-root detection for "Parent Folder" disabled state (FR-004)

**Investigated**: `src/handlers/folder.ts` `getParentPath()` (L81-84, used only by the OS picker): returns `null` when `dirname(currentPath) === currentPath`, i.e. true OS root (`/` on POSIX, a drive root on Windows). This is the only existing "am I at the filesystem root" check in the codebase, and it operates on the **picker's** `currentPath`, a different code path than the in-app opened-root/selected-path state.

**Decision**: Reuse the identical `dirname(p) === p` check, applied to whichever absolute path "Parent Folder" would navigate to next (i.e., check *before* navigating whether going up from the *current absolute location* — `resolveRepoPath(viewerRepoPath, selectedPath || '')` — would still have a parent). This can be computed with the existing `/api/repo/location` endpoint from §3 by having it also report the absolute current path's parent-existence, OR computed purely client-side using the already-known `viewerRepoPath`/`selectedPath` strings the same way `parentPathOf` already does today, falling back to server truth only at the true edge case (crossing out of the opened root entirely, which already round-trips through `/api/repo/parent-folder`). See data-model.md for the precise decision boundary chosen (client-computed disables the common case instantly with no network round-trip; the existing `/api/repo/parent-folder` call already surfaces a real filesystem-root failure gracefully via its existing error response if the client's optimistic guess were ever wrong, so no user-facing correctness risk).

**Resolved without a NEEDS CLARIFICATION marker**: Because the app's opened root is itself always the result of a prior successful "does this path exist and is it below the filesystem root" resolution (`repositoryOpenHandler`/`resolveStartupFolder`, both already tested), and `dirname` on an absolute path only fails to produce a shorter path at the true OS root, the client can safely assume "Parent Folder" is enabled whenever there is *any* parent path string to navigate to (in-repo subfolder, or the opened root itself with `onBrowseParent` available) and disabled only when neither is true — this exactly mirrors the existing `parentRow` presence check (`path ? {...} : onBrowseParent ? {...} : null`), just inverted into a disabled boolean instead of an absent row. The one case this doesn't cover automatically — the *opened root itself already being the OS filesystem root* (spec Edge Case 6) — is handled because `handleBrowseParentFolder`'s existing `POST /api/repo/parent-folder` calls `dirname(repoPath)`; if `repoPath` is already `/`, `dirname('/') === '/'`, and today's handler would attempt to "open" `/` as the new picker path rather than reporting a clean failure. This is a genuine small gap, addressed in data-model.md/plan.md by having `repositoryParentFolderHandler` reuse the same `dirname(p) === p` guard as `getParentPath` and return a `blocked`-style response the client renders as an already-disabled button rather than a clickable no-op — see `contracts/repo-location-contract.md`.

## 6. Compact toolbar / icon-button styling precedent

**Investigated**: `ui/src/components/ui/button.tsx` (47 lines) — `cva`-based `Button` with variants `default | secondary | ghost | outline | danger | dangerOutline` and sizes `default | sm | lg | icon` (icon = `h-9 w-9`, square). Disabled state is the native HTML `disabled` attribute (`disabled:pointer-events-none disabled:opacity-50` baked into the base class) — no extra wiring needed for FR-004's "visibly disabled, not hidden" requirement. No built-in tooltip component exists; the established pattern for icon-only affordances elsewhere in `RepoContextHeader.tsx` (e.g. the git-identity edit button, L294-306) is `aria-label` + `title` on a `size="icon"` `Button`, which already satisfies the spec's accessibility Assumption ("identifiable via tooltip or visible label on hover/focus... accessible name for assistive technology") with the browser's native title-attribute tooltip — no new dependency needed.

**Decision**: Build all three new controls as `<Button variant="secondary" size="icon">` (or `size="sm"` with a short label at wider viewports, consistent with `SearchTrigger`'s existing icon+conditional-label pattern — `RepoContextHeader.tsx` L159, `SearchTrigger` is the closest existing precedent for a compact, icon-forward, always-in-the-header control) with `aria-label`/`title` pairs, satisfying FR-014 (compact) without a new UI dependency.

## 7. Open questions

**NEEDS CLARIFICATION — resolved with a default**: Exact icon choice and exact label text (spec.md Assumptions explicitly defers this to planning). **Default chosen**: "Parent Folder" (icon: up-arrow/folder-up glyph, always visible everywhere per FR-003), "Home" (icon: house glyph, label "Home" per spec.md's own preferred short form over "repository home"), "Readme" (icon: document glyph, label "Readme"). All three render as `size="icon"` on narrow viewports (title-only tooltip) and `size="sm"` with visible short label at `xl:` breakpoint and above, mirroring `RepoContextHeader`'s existing `xl:flex-row` responsive pattern (L112) — satisfies Edge Case 5 (narrow-viewport graceful degradation) using an existing breakpoint convention already in this file, not a new one.

**NEEDS CLARIFICATION — resolved with a default**: Disable-vs-omit for "Home" when already at the repo home folder (spec Acceptance Scenario 2.3 explicitly allows either). **Default chosen**: disable (not omit), for consistency with "Parent Folder"'s own disabled-not-hidden convention (FR-004) and so the toolbar's layout doesn't visibly shift width as the user navigates — matches this codebase's general preference (seen in `Button`'s native `disabled` styling being the default state-communication mechanism throughout `RepoContextHeader`, e.g. branch selector `disabled={branchDisabled || ...}`) over conditional mounting/unmounting.

**NEEDS CLARIFICATION — resolved with a default**: Disable-vs-omit for "Readme" when the repo home folder has no README (spec Acceptance Scenario 3.3 explicitly allows either). **Default chosen**: disable, for the same consistency reason above, and because `directoryReadmePath` (an existing boolean-ish check, `ContentPanel.tsx` L716) already drives a similar disabled/absent link today, giving direct precedent in this codebase for "no readme found" being surfaced as an inert/absent state rather than an error.

**No remaining unknowns.** All three functional gaps (nested sub-repo classification, filesystem-root-at-opened-root edge case, toolbar mount point) have concrete decisions above, each grounded in existing, already-tested code paths (`classifyLocalPath`, `getParentPath`'s `dirname` guard, `RepoContextHeader`'s existing mode-independent mount point) rather than new architecture.
