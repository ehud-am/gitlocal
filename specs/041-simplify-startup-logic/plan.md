# Implementation Plan: Simplify Startup Folder Resolution

**Branch**: `041-simplify-startup-logic` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/041-simplify-startup-logic/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

GitLocal's startup path resolution is currently spread across three semi-independent
resolvers with overlapping failure handling: `resolveStartupFolder` (pre-server, CLI-side
"what folder to open" with 5 named outcome tiers: `explicit` / `last-used` /
`platform-default` / `home-fallback` / `safe-fallback`), `initializePaths` (server-side,
which re-derives explicit-path and file-open handling largely from scratch instead of
reusing the CLI-side result, and constructs its own ad hoc safe-fallback objects at three
separate call sites), and `resolveOpenTarget` (a parallel, mostly-duplicate implementation
of "is this file inside a repo or not, and what's the tree root" that overlaps with logic
already in `repositoryOpenHandler`). A fourth loosely-related surface — the unused
`PUT /api/startup-folder` endpoint — accepts and persists an arbitrary path with no
guarantee it is a top-level (repo-root or independent-folder-root) location, which is the
one place today's code could persist something other than a top-level "last viewed" path.

The technical approach: (1) collapse the 5-tier folder-resolution vocabulary into 3 stages —
**explicit → last-used → os-default** — with `os-default` being a single, minimally-nested,
always-verified-readable location (home directory, with one silent last-resort step only if
home itself is unreadable); (2) extract one shared "classify this path as inside-a-repo vs.
independent-folder, and compute the resulting tree root + selection" function and make every
call site (native file-open at startup, runtime "open this file/folder" API, "leave repo to
parent folder" API) use that single function instead of each re-deriving the same thing;
(3) route every "last viewed" write through one function that only ever accepts and stores a
verified top-level (repo-root or independent-folder-root) path, and remove the unused,
unvalidated generic update endpoint that this feature spec would otherwise leave as a stray
way to violate that guarantee; (4) delete the now-redundant fallback-construction code this
consolidation makes obsolete. Target: ~30% reduction in the combined size of the affected
startup-resolution source files, with existing user-visible fallback messaging preserved
(reworded around 3 tiers instead of 5) and no behavior change to repo-vs-folder tree
rooting for direct file opens (User Story 2 codifies existing, already-correct behavior;
User Story 3 is largely already satisfied server-side and mainly requires removing the one
surface that could violate it).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (server/CLI); React 18 + TypeScript (UI) — unchanged, no new language/runtime
**Primary Dependencies**: Hono ^4.x (`@hono/node-server`) for the HTTP server; Node's built-in `node:fs`, `node:path`, `node:os` for all path/filesystem resolution — no new dependencies introduced
**Storage**: A single JSON preference file at `~/.gitlocal/startup-folder.json` (last-viewed top-level path) plus the existing `~/.gitlocal/default-reader.json` (unrelated preference, untouched) — no database, unchanged storage mechanism
**Testing**: Vitest (`tests/unit/services/startup-preferences.test.ts`, `tests/unit/handlers/repo.test.ts`, `tests/unit/git/repo.test.ts`, `tests/integration/server.test.ts`) — ≥90% branch coverage per file enforced by the constitution
**Target Platform**: Cross-platform Node.js CLI/server (macOS, Windows, Linux) consumed by a browser UI, plus the macOS Homebrew app's embedded WebKit view (same server, no native-code dependency on these internals — confirmed no Swift source references `startup-folder`/`pickerMode`)
**Project Type**: Existing single-repo web application (Node/Hono backend + React/Vite frontend) — this feature only touches backend resolution logic (`src/`) and, for User Story 3's persistence guarantee, does not require any UI changes since the client already never restores a specific file/sub-path across a real process relaunch (`ui/src/services/viewerState.ts` state lives in the URL, which is empty on a fresh navigation)
**Performance Goals**: N/A (startup resolution is a handful of synchronous filesystem stat/readdir calls; no measurable performance target beyond "does not add syscalls beyond what today's code already performs")
**Constraints**: Must not change the on-disk shape of `~/.gitlocal/startup-folder.json` in a way that breaks reading a file already written by an older GitLocal version; must not remove the "always land on the picker page, never a blank/crashed screen" guarantee; must not change repo-vs-folder tree-rooting behavior for direct file opens (already correct — being consolidated, not redesigned)
**Scale/Scope**: Single feature touching ~5 backend source files (`src/cli.ts`, `src/server.ts`, `src/services/startup-preferences.ts`, `src/handlers/repo.ts`, `src/git/repo.ts`) and their corresponding unit/integration tests; no frontend source changes required; no new files beyond what Phase 1 design calls for

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: PASS. All changes stay within the existing TypeScript/Node.js server core; no new runtime, no new third-party dependency (the consolidation uses only `node:fs`/`node:path`/`node:os`, already in use).
- **II. Test Coverage (NON-NEGOTIABLE)**: PASS (must remain true through implementation). Every touched file must stay at ≥90% per-file branch coverage; consolidating overlapping logic into fewer functions with fewer branches makes this easier to satisfy, not harder. Existing tests for removed/merged functions must be updated to target the consolidated functions rather than deleted outright without replacement coverage.
- **III. Local-First with Git Remote Exception**: PASS. No network behavior is introduced or changed; this feature is entirely local filesystem/preference-file resolution.
- **IV. Node.js-Served React UI**: PASS. No change to how the UI is built or served; no UI source changes are required by this feature.
- **V. Clean & Useful UI**: PASS. User-visible fallback messages are preserved in spirit (simplified from 5 named tiers to 3), keeping the picker banner's plain-language explanation intact.
- **VI. Free & Open Source**: PASS. No licensing/dependency changes.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. This plan and all generated artifacts use repository-relative paths only.

No violations requiring justification. Complexity Tracking table is omitted (not needed).

**Post-Phase 1 re-check**: PASS, unchanged. Phase 1 design (data-model.md, contracts/, quickstart.md)
introduced no new dependency, storage mechanism, or UI requirement — it only narrowed existing
types (`StartupFolderSource`, removal of `platformDefaultPath`/`StartupFolderUpdateRequest`/
`StartupFolderUpdateResponse`) and consolidated existing functions. All 7 principles remain PASS
for the reasons stated above.

## Project Structure

### Documentation (this feature)

```text
specs/041-simplify-startup-logic/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── startup-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli.ts                          # Entry point — calls the simplified resolver, passes result to createApp
├── server.ts                       # createApp/initializePaths — consolidated to call shared resolver +
│                                    #   shared repo-context classifier instead of re-deriving both
├── services/
│   └── startup-preferences.ts      # Simplified resolver (3 tiers), single last-viewed writer,
│                                    #   single OS-default helper — main size-reduction target
├── git/
│   └── repo.ts                     # classifyLocalPath (repo-vs-folder + tree-root inputs) — reused,
│                                    #   not duplicated, by server.ts and handlers/repo.ts
├── handlers/
│   └── repo.ts                     # repositoryOpenHandler, repositoryParentFolderHandler —
│                                    #   updated to call the shared repo-context classifier instead
│                                    #   of re-deriving rootPath/selectedPath inline; startupFolderUpdateHandler
│                                    #   (PUT /api/startup-folder) removed as unused/unvalidated
└── types.ts                        # StartupFolderSource narrowed to 3 values; StartupFolderUpdateRequest/
                                     #   Response types removed with the endpoint

tests/
├── unit/services/startup-preferences.test.ts   # Updated for the 3-tier resolver + single writer
├── unit/handlers/repo.test.ts                  # Updated for the removed PUT endpoint + shared classifier
├── unit/git/repo.test.ts                       # Unchanged contract for classifyLocalPath (reused, not modified)
└── integration/server.test.ts                  # Updated startup-resolution scenarios (fewer named fallback
                                                 #   tiers; same end-to-end guarantees)

ui/                                  # No source changes required (see Technical Context)
```

**Structure Decision**: This is a backend-only refactor within the existing single-project
layout (`src/`, `tests/`, `ui/`). No new top-level directories, no new services, no change
to the frontend/backend split. All work happens in the existing `src/services/`,
`src/handlers/`, `src/git/`, and `src/` (cli/server) locations already responsible for
startup resolution.

## Complexity Tracking

*No violations — table omitted.*
