# Phase 1 Data Model: Fix Empty Content on Startup

This feature does not introduce a new persistent data store (per spec.md Assumptions). The "entities" below are the conceptual state shapes from spec.md's Key Entities section, mapped onto the concrete types the codebase already defines in `src/types.ts` (shared, hand-copied into `ui/src/types.ts` for the frontend). Design work here is about **completing** how these states propagate and render, not inventing new storage.

## Entity: Startup Folder Selection

Maps to the existing `StartupFolderResolution` type (`src/types.ts:95-103`) produced by `resolveStartupFolder()` (`src/services/startup-preferences.ts:127-184`).

| Field | Type | Meaning | Change in this feature |
|---|---|---|---|
| `path` | `string` | The resolved folder path | unchanged |
| `source` | `'explicit' \| 'last-used' \| 'platform-default' \| 'home-fallback'` | Which resolution tier produced this path | unchanged |
| `exists` | `boolean` | Whether the path existed at resolution time | unchanged in shape, but now backed by a real enumerability check (research #3), not just `existsSync`/`statSync` |
| `readable` | `boolean` | Whether the path is usable | same as above — must now reflect actual listability |
| `platformDefaultPath` | `string` | The OS default folder (e.g., `~/Documents`) | unchanged |
| `lastUsedPath` | `string` | The previously remembered folder, if any | unchanged |
| `fallbackReason` | `string` | Why a fallback tier was used | unchanged — already plain-language, just needs to reliably fire now that `readable` is trustworthy |

**Validation rule (new)**: A candidate folder MUST NOT be reported `exists: true, readable: true` unless a guarded attempt to enumerate its contents succeeded, not merely `existsSync` + `statSync().isDirectory()`. This is the direct implementation of FR-006.

**`fallbackReason` sub-classification (added during implementation)**: For the `platform-default` tier specifically, `fallbackReason` is no longer a single fixed string — `describeUnreadableFolder()` (`src/services/startup-preferences.ts`) distinguishes "no longer exists" vs. "permission denied" vs. "currently unreachable" (disconnected drive) using the same Node `fs` error-code categories as `classifyServerError` (see `contracts/error-response-contract.md`), satisfying US2 Acceptance Scenario 2's explicit requirement that the message be distinguishable by cause.

**Lifetime (added during implementation)**: A `StartupFolderResolution` is computed once per process, synchronously, before the HTTP server starts (`src/cli.ts`). Because resolving a readable folder also triggers `rememberStartupFolder()` — which persists that *same* folder as the new "last used" preference — recomputing this entity fresh on every `/api/startup-folder` request would read back the just-mutated preference and lose the very fallback evidence (`lastUsedPath`, `fallbackReason`) the entity exists to convey. `src/server.ts` now holds the first computation in module state (`getStartupFolderResolution`, mirroring the existing `StartupOpenTarget` capture) for the lifetime of the server process; `startupFolderHandler` returns that snapshot rather than a fresh, already-stale recomputation.

**State transitions**: `resolveStartupFolder()`'s existing tier order (explicit → last-used → platform-default → home-fallback) is unchanged; only the readability test at each tier becomes stricter, and the `platform-default` tier's `fallbackReason` becomes cause-specific. No new persisted states are added — only an in-memory snapshot of the existing computation.

## Entity: Content Load Outcome

This is not one existing type but a *pattern* that must be applied consistently everywhere the UI fetches folder/file data — the `['info']` query in `App.tsx` and the `['tree', ...]` query used by both `FileTree.tsx` and `ContentPanel.tsx`. React Query already exposes the three states this entity needs (`isLoading`, `data`, `isError`); the gap is that not every consumer of these queries reads all three.

| Conceptual state | React Query representation | Currently handled correctly in | Currently missing in |
|---|---|---|---|
| Loading | `isLoading` / `isFetching` | `App.tsx` (`['info']`), `ContentPanel.tsx` (`['tree']`) | — |
| Success, has content | `data` populated, `isError: false` | all consumers | — |
| Success, genuinely empty | `data` populated with an empty result, `isError: false` | `App.tsx` (`info.rootEntryCount === 0` empty-state), `ContentPanel.tsx`/`PickerPage.tsx` "this folder is empty" messages | — |
| **Fetch failed** | `isError: true`, `data: undefined` | `FileTree.tsx` (`isError` → "Failed to load file tree") | `App.tsx`'s `['info']` query (no `isError` read at all); `ContentPanel.tsx`'s root/default view (`!selectedPath` branch) and folder view (only checks `isDirectoryError` when `showSelectedLocalOnly`) |

**Validation rule (new)**: Every UI surface rendering data for a given query key MUST branch on `isError` before treating an absent/empty result as "nothing here" — directly implementing FR-002, FR-003, FR-004.

**No new fields are needed on the wire** — `isError`/`isLoading`/`data` are already returned by every affected `useQuery` call; this is a rendering-logic gap, not a data-shape gap. The one wire-level change is server-side: making sure a thrown error actually reaches the client as a distinguishable failure (see `contracts/error-response-contract.md`), rather than an opaque generic 500.

## Entity: Open Target Request

Maps to the existing `StartupOpenTarget` / `StartupOpenTargetResponse` types (`src/types.ts:122-138`), produced by `resolveOpenTarget()` and served by `startupOpenTargetHandler` at `GET /api/startup-open-target`.

| Field | Type | Meaning | Change in this feature |
|---|---|---|---|
| `source` | `StartupOpenSource` (`'explicit-launch' \| 'native-file-open' \| 'picker-open' \| 'repo-open'`) | How this open attempt was initiated | unchanged |
| `inputPath` | `string` | The path/file originally requested | unchanged |
| `rootPath` | `string` | The resolved repository/folder root, if accepted | unchanged |
| `selectedPath` / `selectedPathType` | `string` / `ViewerPathType` | The specific file/folder selected within the root, if any | unchanged |
| `status` | `StartupOpenStatus` (`'pending' \| 'accepted' \| 'blocked' \| 'failed'`) | Outcome of the open attempt | unchanged in shape — already distinguishes blocked vs. failed vs. accepted |
| `message` | `string` | Plain-language explanation | unchanged in shape, but must now actually reach the user in the picker-mode case (see below) |
| `receivedAt` | `string` | Timestamp | unchanged |
| `gitState` / `openMode` / `repositoryRootPath` | optional fields | Extra classification detail when applicable | unchanged |

**Validation rule (new)**: When `initializePaths()` (`src/server.ts:160-197`) falls back to `currentPickerPath = process.cwd()` because an explicit/OS-provided path was invalid, it MUST still populate `currentStartupOpenTarget` with a `status: 'failed'` (not silently omit it), and `PickerPage.tsx` MUST read and display that `message` — directly implementing FR-007. This closes the gap where `App.tsx` already computes the right failure message (`applyOpenFailure`, lines 564-591) but `PickerPage.tsx` never reads it because the picker-mode render branch (`App.tsx:1042-1049`) bypasses the rest of `App.tsx`'s render body.

**State transitions**: `pending → accepted` (success) or `pending → blocked` (e.g., non-Markdown file the app intentionally won't open) or `pending → failed` (path missing/unreadable) — these three terminal states already exist in the type; this feature ensures `failed` is never silently dropped before reaching the picker UI.

## Cross-cutting rule: "empty" vs "error" must never collapse into one visual/message state

Applies to all three entities above. Concretely:
- `RepoInfo.rootEntryCount === 0` (genuinely empty) vs. `['info']` query `isError` (couldn't determine) must produce visibly different UI (FR-004).
- `['tree']` query returning `[]` (genuinely empty folder) vs. `isDirectoryError` (couldn't list it) must produce visibly different UI, consistently between `FileTree.tsx` and `ContentPanel.tsx` (FR-003, FR-004).
- `StartupFolderResolution.readable: false` due to "doesn't exist" vs. "exists but unreadable" should retain distinguishable `fallbackReason` wording (already partially true — this feature must not regress it while tightening the readability check).

No database, migration, or new persisted schema work is implied anywhere in this document.
