# Phase 1 Data Model: Simplify Startup Folder Resolution

This feature has no persistent database and introduces no new storage mechanism. The "entities"
below are the in-memory/JSON-file shapes involved in startup resolution, shown as **before** (today)
and **after** (this feature) to make the simplification concrete.

## Entity: Startup Location Resolution

The result of deciding what location GitLocal opens at process start (or falls back to).

**Before** — `StartupFolderResolution` (`src/types.ts`), 5-value `source`:

| Field | Type | Notes |
|---|---|---|
| `path` | string | Resolved absolute path |
| `source` | `'explicit' \| 'last-used' \| 'platform-default' \| 'home-fallback' \| 'safe-fallback'` | 5 distinct outcomes |
| `exists` | boolean | |
| `readable` | boolean | |
| `platformDefaultPath` | string | Documents-folder path — confirmed unread by any UI rendering logic (only appears in test fixtures) |
| `lastUsedPath` | string | Remembered path, tracked even when unused |
| `fallbackReason` | string | Human-readable explanation, worded per-tier |

**After** — same shape, narrowed `source`:

| Field | Type | Notes |
|---|---|---|
| `path` | string | Resolved absolute path |
| `source` | `'explicit' \| 'last-used' \| 'os-default'` | 3 outcomes — `platform-default`/`home-fallback`/`safe-fallback` collapse into `os-default` |
| `exists` | boolean | Unchanged |
| `readable` | boolean | Unchanged |
| `platformDefaultPath` | string \| *(removed)* | Removed from the type and every producer — confirmed dead (no production UI code reads it; test fixtures updated to drop it) |
| `lastUsedPath` | string | Unchanged — still needed to explain "your last folder is gone" |
| `fallbackReason` | string | Now has exactly one phrasing family (falling back to the OS default), parameterized by *why* (explicit path bad / remembered path bad / both absent), not by *which fallback tier* |

**Validation rules** (after): `source === 'os-default'` implies `path` was independently verified
readable at resolution time (never assumed); if verification fails even for the OS-default
location, resolution still returns a path (filesystem root, as today) with `readable: false`, so
the picker page can render a "nothing is readable" state instead of the server crashing.

**State transitions**: None — this is a one-shot computation at startup (and re-computed, not
mutated, on each subsequent recovery check such as `infoHandler`'s self-heal).

## Entity: Last-Viewed Preference (persisted)

The on-disk record of the last top-level location the user opened, read on the next bare launch.

**Before/After** — `StartupFolderPreference` (`~/.gitlocal/startup-folder.json`): **shape
unchanged** —

| Field | Type | Notes |
|---|---|---|
| `path` | string | Must be a repository root or an independent (non-repository) folder's own root |
| `openedAt` | string (ISO datetime) | |
| `source` | `StartupFolderUpdateSource` (`'explicit-launch' \| 'picker-open' \| 'repo-open' \| 'native-open'`) | Unchanged |

**Validation rules** (after, strengthened): The single writer function
(`writeStartupFolderPreference`) rejects (throws, caught by the existing best-effort
`rememberStartupFolder` wrapper) a path that is provably *not* a top-level location — i.e., a path
that is inside a git repository but is not that repository's root. This is a new defense-in-depth
check added directly to the existing writer (Decision 3 in research.md), not a new entity.

**Removed surface**: The `PUT /api/startup-folder` HTTP endpoint, and its request/response types
(`StartupFolderUpdateRequest`, `StartupFolderUpdateResponse`), are deleted — they had no caller and
were the only path by which an external caller could attempt to bypass the top-level-only guarantee.

## Entity: Direct-Open Target (repo-vs-independent-folder classification)

The result of classifying a directly-opened file or folder to decide the tree root and available
git-aware state.

**Before** — computed independently in two places (`resolveOpenTarget` in `src/server.ts` for
startup file-launches; inline in `repositoryOpenHandler` in `src/handlers/repo.ts` for runtime
opens), each producing an equivalent but separately-implemented result.

**After** — one shared shape, produced by one function, consumed by both call sites:

| Field | Type | Notes |
|---|---|---|
| `rootPath` | string | Repository root (if the target is inside a repo) or the target's own containing folder (if independent) |
| `selectedPath` | string | Path of the opened file/folder relative to `rootPath` (empty when the target *is* `rootPath`) |
| `selectedPathType` | `'file' \| 'dir' \| 'none'` | |
| `isGitRepo` | boolean | Drives whether repository-only UI state/actions are shown |

**Validation rules**: `rootPath` MUST always be either a git repository root (per
`classifyLocalPath`'s `repositoryRootPath`) or a plain, existing, readable directory — never a
non-root path inside either. This is the mechanism that satisfies spec FR-005/FR-006.

**Relationships**: This classification is computed from, but does not replace,
`LocalPathClassification` (`src/types.ts`, produced by `classifyLocalPath` in `src/git/repo.ts`),
which remains unchanged — it is the shared lower-level primitive both the Startup Location
Resolution's explicit-path check and this Direct-Open Target classification build on.

## No new entities

No new persisted or transmitted data shapes are introduced. This feature is a consolidation of
existing shapes and the functions that produce them; the "after" column above is the complete set
of intended shape/behavior changes.
