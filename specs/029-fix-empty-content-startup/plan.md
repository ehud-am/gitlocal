# Implementation Plan: Fix Empty Content on Startup

**Branch**: `029-fix-empty-content-startup` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/029-fix-empty-content-startup/spec.md`

## Summary

GitLocal can render its main content area as if a folder were empty when it is actually inaccessible. A prior deep-dive investigation traced this to three independent, cooperating gaps rather than one bug: (1) fetch failures for the app's bootstrap `['info']` query and the tree/folder listing query are not distinguished from "genuinely empty" anywhere the UI renders its primary content, while the sidebar's equivalent query already handles this correctly; (2) filesystem calls on the non-git / generic-folder code path (`readdirSync`, `realpathSync`) are unguarded and there is no server-side `onError` handler, so a permission or availability failure throws and is swallowed into a generic error the client can't act on; (3) an invalid explicit/remembered path silently falls back to `process.cwd()` without surfacing the failure to the user. The technical approach is to make failure states explicit and propagated end-to-end — guard the unguarded filesystem calls, add a global server error handler, extend the existing (currently unused-for-errors) `['info']` and `['tree']` query error states into real UI feedback mirroring the pattern `FileTree.tsx` already uses correctly, verify startup-folder candidates are actually enumerable before accepting them, and stop discarding the reason an explicit open target failed. No new architecture, storage, or dependencies are introduced.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (server/CLI); Swift 5.9 only for the existing scoped macOS wrapper (`native/macos/`), unaffected by this fix per the investigation (native launch sequencing was checked and found correct — ruled out as a cause)
**Primary Dependencies**: Hono ^4.x + @hono/node-server (HTTP server), React 18 + Vite 7 + @tanstack/react-query (UI), Vitest + @vitest/coverage-v8 (tests) — all existing, no new dependencies required
**Storage**: N/A — filesystem/git state read at request time; the only persisted preference files are `~/.gitlocal/startup-folder.json` and `~/.gitlocal/default-reader.json` (existing, reused as-is; no schema change)
**Testing**: Vitest (backend `tests/`, frontend `ui/src/**/*.test.tsx`); constitution requires ≥90% branch coverage per file, so every guarded/new error branch introduced by this fix needs its own test case, not just the happy path
**Target Platform**: Cross-platform npm package (macOS/Linux/Windows, browser-based UI) and the macOS Homebrew native app (embedded WebKit); the fix lives entirely in the shared `src/`/`ui/` code both distributions run, so one change covers both
**Project Type**: Web application (Node.js/Hono backend in `src/`, React/Vite frontend in `ui/`) — matches the existing repo layout, not a new structure
**Performance Goals**: Not a performance feature; the only latency-flavored target is spec SC-001 (failure explanation visible within 2s of the failure being detected), which existing query `retry`/`staleTime` settings already support once error states are surfaced
**Constraints**: Must preserve all currently-correct detection behavior (FR-010) — this is a failure-surfacing fix, not a rewrite of git/sub-repo/empty-folder detection; must not introduce a new persisted data model (spec Assumptions); must satisfy constitution Principle II (≥90% per-file branch coverage) on every touched file
**Scale/Scope**: Small, targeted fix touching a known, bounded set of files identified by investigation: `src/server.ts`, `src/git/repo.ts` (no change, confirmed by testing), `src/services/startup-preferences.ts`, `src/handlers/repo.ts`, `src/cli.ts` on the backend; `ui/src/main.tsx`, `ui/src/App.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/components/Picker/PickerPage.tsx` on the frontend; plus corresponding test files. Two significant pieces were not in the original Phase 1 design and were only discovered by manually testing each user story end-to-end in a real browser rather than trusting mocked unit tests: `ui/src/main.tsx`'s `QueryClient`/`focusManager` configuration (research.md item #4a) and `src/server.ts`/`src/handlers/repo.ts`'s startup-folder-resolution capture, needed because the CLI's own `rememberStartupFolder` side effect was erasing the fallback evidence before any client could observe it (research.md item #5a)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. TypeScript-First Product Core | Fix is entirely within the existing TypeScript server/CLI and React UI; no new backend language; native Swift wrapper is untouched (root cause #3 was investigated and ruled out) | PASS |
| II. Test Coverage (NON-NEGOTIABLE) | Every guarded filesystem call, new error branch, and new UI error state must ship with a test hitting that branch, keeping each touched file ≥90% branch coverage | PASS (enforced in tasks) |
| III. Local-First with Git Remote Exception | No network calls introduced; all changes are local error handling around existing local filesystem/git reads | PASS |
| IV. Node.js-Served React UI | No change to the serving model; UI continues to be built by Vite and served as static assets by the Hono server | PASS |
| V. Clean & Useful UI | New error states must reuse the existing minimal, GitHub-inspired error presentation already established by `FileTree.tsx`'s "Failed to load file tree" message and `PickerPage.tsx`'s error banner, not introduce a new visual language | PASS (design constraint carried into Phase 1) |
| VI. Free & Open Source | No new dependencies, no proprietary services | PASS |
| VII. Repository-Relative Paths & Release Docs | This plan and all generated artifacts use repo-relative paths; a `CHANGELOG.md` entry is required at release time (tracked as a task, not part of design) | PASS |
| VIII. Release Branches, Pre-GA Versioning, Contrarian QA | This feature ships inside a normal release branch; contrarian QA review is a release-time gate, not a design-time concern — noted for the eventual release, not applicable to plan approval | PASS (N/A at plan stage) |

No violations identified. Complexity Tracking table is not needed.

**Post-Phase 1 re-check**: Design artifacts (research.md, data-model.md, contracts/, quickstart.md) were completed and reviewed against the table above. No new dependencies, storage, architecture, or cross-platform-parity risks were introduced during design — the contracts formalize behavior of endpoints and components that already exist, and the data model reuses existing types unchanged in shape. All rows remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/029-fix-empty-content-startup/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── error-response-contract.md
│   └── startup-resolution-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

Existing web-application layout (Node.js/Hono backend + React/Vite frontend, single npm package). No new top-level directories are introduced; this feature only touches files inside the existing tree:

```text
src/
├── server.ts                        # add global app.onError handler (currently none registered)
├── cli.ts                           # stop conflating "invalid explicit path" with "file launch"; surface manual browser-open fallback message
├── git/
│   └── repo.ts                      # no code change (confirmed empirically: readdirSync/realpathSync failures already propagate correctly to the new onError handler); gains only a regression-guard comment (T033)
└── services/
    └── startup-preferences.ts       # isReadableDirectory must verify enumerability, not just existsSync+statSync

ui/src/
├── main.tsx                          # [added during implementation] QueryClient networkMode:'always' + focusManager.setFocused(true) — without this, a failed query can pause forever instead of ever reaching isError (research.md item #4a)
├── App.tsx                          # add isError handling to the ['info'] query; stop silently falling through to the full shell on bootstrap failure
└── components/
    ├── ContentPanel/
    │   └── ContentPanel.tsx         # root/default and folder views must check isDirectoryError (mirroring FileTree.tsx's existing correct handling)
    ├── FileTree/
    │   └── FileTree.tsx             # reference implementation only — no change expected, already handles isError correctly
    └── Picker/
        └── PickerPage.tsx           # surface startup-open-target failure messages instead of silently browsing process.cwd()

tests/                                # backend Vitest specs mirroring the src/ paths above
ui/src/**/*.test.tsx                  # frontend Vitest specs mirroring the ui/src/ paths above
```

**Structure Decision**: Reuse the existing `src/` (Hono backend/CLI) + `ui/` (React/Vite frontend) split as-is. This is a targeted bug-fix confined to files already identified by investigation; no new modules, packages, or directories are warranted.

## Complexity Tracking

*No Constitution Check violations were identified — this table is intentionally empty.*
