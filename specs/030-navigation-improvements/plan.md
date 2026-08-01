# Implementation Plan: Navigation Concepts Improvements

**Branch**: `030-navigation-improvements` | **Date**: 2026-07-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/030-navigation-improvements/spec.md`

## Summary

GitLocal's only parent-navigation affordance today is a synthetic ".." table row (`ContentPanel.tsx`'s `renderDirectoryList`), which exists only inside folder listings — file view and file edit have no parent-navigation control at all — and which conflates two different actions (step up within the opened root vs. leave the repository's scope entirely) under two different badge labels ("Parent" vs "Browse"). There is also no quick way to jump to a git repository's home folder or open its home README from deep inside it; the closest existing primitive, `findReadme(repoPath, branch, folderPath='')`, already computes "the README at a given root" correctly but is only ever invoked against the *current* folder, never forced to the repo's home folder, and there is no live re-classification of "which repo am I nested inside right now" once a root is opened and the user browses further via the in-app tree (that classification, `classifyLocalPath`, exists and is correct, but today only runs at repo-open time and in the OS folder picker). The technical approach: (1) delete the ".." row entirely and replace it with a single "Parent Folder" button that mounts once, mode-independently, in `RepoContextHeader` (the one component `App.tsx` already renders above folder listing, file view, and file edit alike); (2) add "Home" and "Readme" buttons beside it, git-repo-only; (3) add one small new read-only endpoint, `GET /api/repo/location`, that reuses the existing `classifyLocalPath`/`findReadme` primitives against the user's *current* in-app selection (not just the globally opened root) to correctly resolve the nearest enclosing repository root and its home README, including for nested sub-repositories. No new architecture, no new persisted state, no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (server/CLI); React 18 UI. No Swift/native-wrapper changes — this is a UI/API-layer feature with no macOS-specific surface.
**Primary Dependencies**: Hono ^4.x + @hono/node-server (HTTP server), React 18 + Vite 7 + @tanstack/react-query (UI), Vitest + @vitest/coverage-v8 (tests) — all existing, no new dependencies required.
**Storage**: N/A — the new endpoint is a pure read computed at request time from the filesystem/git state via the existing `classifyLocalPath`/`findReadme` functions; no persisted preference or schema changes.
**Testing**: Vitest (backend `tests/`, frontend `ui/src/**/*.test.tsx`); constitution requires ≥90% branch coverage per file, so the new endpoint's branches (nested repo, non-nested repo, non-git path, already-at-root, no-readme) and every new/changed UI branch (button visible/hidden/enabled/disabled × three buttons × three modes) each need dedicated test cases, not just happy-path coverage.
**Target Platform**: Cross-platform npm package and the macOS Homebrew native app — the fix lives entirely in shared `src/`/`ui/` code both distributions run; no native wrapper changes.
**Project Type**: Web application (Node.js/Hono backend in `src/`, React/Vite frontend in `ui/`) — existing structure, unchanged.
**Performance Goals**: Not a performance feature. The new `/api/repo/location` call adds one `git rev-parse --show-toplevel` (already how `classifyLocalPath` works) per navigation when inside a git repo — same order of cost as the existing `/api/readme`/`/api/tree` calls already made on every navigation; no new performance budget needed.
**Constraints**: Must not reintroduce the ".." row in any form (FR-001); must keep all three controls in one consistent location across folder/file/edit modes (FR-015); must keep the combined toolbar's height at or below the current single-row header it augments (FR-014/SC-004); must not regress existing repo-boundary-crossing behavior (`onBrowseParent`/`handleBrowseParentFolder`/the repo-boundary confirmation dialog) or breadcrumb/sidebar/branch-switch navigation (FR-016).
**Scale/Scope**: Small-to-medium, UI-toolbar-plus-one-endpoint feature touching a known, bounded set of files (see Project Structure below). No new pages, no new routes beyond one additive `GET`, no new top-level modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. TypeScript-First Product Core | All changes are in the existing TypeScript server/CLI (`src/`) and React UI (`ui/`); no new backend language; no native Swift wrapper changes (this feature has no macOS-specific surface) | PASS |
| II. Test Coverage (NON-NEGOTIABLE) | Every new endpoint branch (`repositoryLocationHandler`'s nested/non-nested/non-git/at-root/no-readme cases, `repositoryParentFolderHandler`'s new filesystem-root guard) and every new/changed UI branch (three buttons × visible/hidden/enabled/disabled across three modes) ships with a test hitting that branch, keeping each touched file ≥90% branch coverage; removing the old `.."` row also requires removing/updating its now-obsolete test cases rather than leaving dead assertions | PASS (enforced in tasks) |
| III. Local-First with Git Remote Exception | No network calls introduced; the new endpoint only reads local filesystem/git state via the already-local `classifyLocalPath`/`findReadme`/`git rev-parse` primitives | PASS |
| IV. Node.js-Served React UI | No change to the serving model; the new endpoint is served by the same Hono app, UI continues to be built by Vite and served as static assets | PASS |
| V. Clean & Useful UI | New buttons reuse the existing `Button` component's established variants/sizes (`variant="secondary" size="icon"`/`"sm"`) and the existing icon+conditional-label responsive pattern already used by `SearchTrigger`, rather than introducing a new visual language; satisfies FR-014's "minimize real estate" via existing compact-control conventions | PASS |
| VI. Free & Open Source | No new dependencies (no tooltip library — native `title`/`aria-label` reused per research.md §6), no proprietary services | PASS |
| VII. Repository-Relative Paths & Release Docs | This plan and all generated artifacts use repo-relative paths; a `CHANGELOG.md` entry is required at release time (tracked as a task, not part of design) | PASS |
| VIII. Release Branches, Pre-GA Versioning, Contrarian QA | This feature ships inside a normal release branch; contrarian QA review is a release-time gate, not a design-time concern | PASS (N/A at plan stage) |

No violations identified. Complexity Tracking table is not needed — the one new endpoint is additive and reuses existing internal functions verbatim; see Complexity Tracking below for the explicit justification of why this doesn't count as new architecture.

**Post-Phase 1 re-check**: Design artifacts (research.md, data-model.md, contracts/repo-location-contract.md, quickstart.md) were completed and reviewed against the table above. The new endpoint reuses `classifyLocalPath` and `findReadme` unmodified; the only behavioral change to existing handler code is a defensive `dirname(p) === p` guard added to `repositoryParentFolderHandler` (mirroring the identical guard `getParentPath` already uses in the OS picker), not a redesign. No new dependencies, storage, or cross-platform-parity risks were introduced. All rows remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/030-navigation-improvements/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md         # Phase 1 output (/speckit.plan command)
├── contracts/            # Phase 1 output (/speckit.plan command)
│   └── repo-location-contract.md
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

Existing web-application layout (Node.js/Hono backend + React/Vite frontend, single npm package). No new top-level directories; this feature only touches files inside the existing tree:

```text
src/
├── server.ts                              # register one new route: app.get('/api/repo/location', repositoryLocationHandler)
├── handlers/
│   └── repo.ts                            # add repositoryLocationHandler (new, reuses classifyLocalPath + findReadme);
│                                           # add filesystem-root guard to repositoryParentFolderHandler (dirname(p) === p check,
│                                           # mirrors handlers/folder.ts's existing getParentPath guard)
├── git/
│   └── repo.ts                            # no code change — classifyLocalPath (L314-370) and findReadme (L549-572)
│                                           # are reused verbatim from a new call site only
└── types.ts                               # add RepoLocationResponse interface (see contracts/repo-location-contract.md)

ui/src/
├── types/
│   └── index.ts                           # add RepoLocationResponse (mirrors src/types.ts)
├── services/
│   └── api.ts                             # add api.getRepoLocation(path?: string): Promise<RepoLocationResponse>
├── App.tsx                                # add ['repo-location', selectedPath, currentBranch] query (enabled: info?.isGitRepo);
│                                           # add onNavigateParent/onNavigateHome/onNavigateReadme handlers built on the
│                                           # existing handleSelectFolder/handleSelectFile/handleBrowseParentRequest;
│                                           # pass new props to <RepoContextHeader> (mounted L1246-1283, unchanged position)
└── components/
    ├── RepoContext/
    │   ├── RepoContextHeader.tsx           # add Parent Folder / Home / Readme buttons to the existing top action row
    │   │                                   # (beside branch selector / SearchTrigger, L135-160); new props per data-model.md
    │   └── RepoContextHeader.test.tsx      # new test cases: each button's visible/hidden/enabled/disabled states,
    │                                       # nested-repo Home/Readme targeting, click → callback wiring
    └── ContentPanel/
        ├── ContentPanel.tsx                # remove parentRow construction (L641-661), isParent/exitsRepo row rendering
        │                                   # (L780-819) and the DirectoryRow.isParent/exitsRepo fields (L89-90);
        │                                   # openDirectoryRow's exitsRepo branch (L675-682) is removed with it since
        │                                   # onBrowseParent moves up to App.tsx-driven RepoContextHeader instead
        └── ContentPanel.test.tsx           # remove/replace now-obsolete ".." row assertions (e.g. 'shows the root
                                             # directory table with a parent-scope row when no file is selected')

tests/                                      # backend Vitest specs mirroring the src/ paths above
ui/src/**/*.test.tsx                        # frontend Vitest specs mirroring the ui/src/ paths above
```

**Structure Decision**: Reuse the existing `src/` (Hono backend/CLI) + `ui/` (React/Vite frontend) split as-is. This is a toolbar-consolidation feature plus one small additive read endpoint, confined to files already identified by research; no new modules, packages, or directories are warranted. The one net-new backend surface (`GET /api/repo/location`) is documented as a formal contract (`contracts/repo-location-contract.md`) precisely because — unlike a pure UI relocation — it is new wire-level behavior a client depends on, matching the precedent set by 029's `contracts/` usage for its own new/changed wire contracts.

## Complexity Tracking

*No Constitution Check violations were identified — this table is intentionally empty.*

The one new endpoint is not tracked as a complexity violation because it introduces no new architecture: it is a single Hono route reusing two already-existing, already-tested pure functions (`classifyLocalPath`, `findReadme`) against a new call site, with no new persisted state, no new external dependency, and no deviation from the existing `src/handlers/*.ts` + `contracts/*.md` documentation pattern already established by feature 029.
