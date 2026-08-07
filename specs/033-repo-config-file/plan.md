# Implementation Plan: Per-Repo/Folder Configuration File

**Branch**: `033-repo-config-file` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/033-repo-config-file/spec.md`

## Summary

Persist last-viewed branch, file path, and raw/pretty view mode for the currently open repo or folder in a new `.gitlocal/.layout` JSON file at that location's root, and restore it automatically the next time GitLocal opens the same location — regardless of which distribution (npm browser UI or macOS app) or browser is used. The server gains a small file-preference service (mirroring the existing `startup-preferences.ts` pattern) and one new repo-scoped GET/PUT endpoint pair; the UI gains one new fetch that takes priority over the existing URL-param-derived initial state, but below an explicit startup open-target. Reads/writes never block or error out browsing — missing, malformed, or unwritable `.gitlocal/.layout` all fall back to today's default behavior.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server; React 18 TypeScript UI
**Primary Dependencies**: Existing Hono server, Node `fs` (`readFileSync`/`writeFileSync`/`mkdirSync`), existing `@tanstack/react-query`; no new runtime dependency
**Storage**: A new per-repo JSON file, `.gitlocal/.layout`, at the root of the currently open repo/folder (`repoPath`), written with the same non-atomic `writeFileSync` + pretty-print pattern already used by `src/services/startup-preferences.ts`
**Testing**: Vitest (server service/handler unit tests, existing coverage setup), Vitest + React Testing Library (UI)
**Target Platform**: Local browser UI served by GitLocal and the shared macOS wrapper hosting the same UI
**Project Type**: Local-first repository viewer with React frontend and Node.js-served static app
**Performance Goals**: Writing `.layout` on navigation must add no perceptible delay (SC-005); mirrors the existing fire-and-forget `rememberStartupFolder` pattern, which already meets this bar for a comparable write
**Constraints**: Never block or error the app on a missing/malformed/unwritable `.gitlocal/.layout` (FR-007, FR-008); never touch `.git/config` or existing git identity storage (FR-011); never auto-`.gitignore` or auto-commit `.gitlocal/` (FR-012); scope strictly to the fields already named in the spec — branch, path, raw view mode (FR-003), nothing else migrated from `localStorage`/URL params in this feature
**Scale/Scope**: One new server service module, one new handler pair, one new route pair, one new UI fetch + priority-ordered initial-state application, one new directory-plus-file on disk per opened repo/folder; no new project or package boundary

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: Pass. All new code is in the existing TypeScript server (`src/services/`, `src/handlers/`) and TypeScript/React UI; no new runtime dependency.
- **II. Test Coverage**: Pass. Plan includes unit coverage for the new service (write/read/malformed/unwritable/unknown-fields, mirroring `startup-preferences.test.ts`), handler coverage (mirroring `repo.test.ts`), and UI coverage for the new initial-state priority ordering.
- **III. Local-First with Git Remote Exception**: Pass. Purely local filesystem read/write at the already-open repo root; no network behavior added.
- **IV. Node.js-Served React UI**: Pass. The existing React SPA and Hono server remain the only surfaces touched.
- **V. Clean & Useful UI**: Pass. The feature is invisible by design when working (state is just restored); it removes a rough edge (losing your place) rather than adding UI surface.
- **VI. Free & Open Source**: Pass. No new dependency, proprietary or otherwise.
- **VII. Repository-Relative Paths and Release Documentation**: Pass. Planning artifacts use repository-relative paths only.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: Pass. No release is being cut in this planning phase; implementation must still pass normal verification and a contrarian QA pass before any release.

## Project Structure

### Documentation (this feature)

```text
specs/033-repo-config-file/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
└── contracts/
    └── repo-layout-config.md        # Phase 1 output: API + UI contract
```

### Source Code (repository root)

```text
src/services/
├── repo-layout.ts                   # New: read/write .gitlocal/.layout at a given repo root, mirroring startup-preferences.ts
└── (existing) startup-preferences.ts  # Pattern reference only, not modified

src/handlers/
└── repo.ts                          # Add: repoLayoutHandler (GET), repoLayoutUpdateHandler (PUT)

src/server.ts                        # Add: app.get('/api/repo/layout', ...) / app.put('/api/repo/layout', ...)

src/types.ts                         # Add: RepoLayout, RepoLayoutResponse, RepoLayoutUpdateRequest types

tests/unit/services/
└── repo-layout.test.ts              # New: write/read roundtrip, missing dir, malformed JSON, unwritable path, unknown-field tolerance

tests/unit/handlers/
└── repo.test.ts                     # Extend: GET/PUT /api/repo/layout coverage (valid, invalid body, service failure)

ui/src/types.ts
└── (extend)                         # Add: RepoLayoutResponse, RepoLayoutUpdateRequest client-side types

ui/src/services/
└── api.ts                           # Add: getRepoLayout(), updateRepoLayout()

ui/src/App.tsx                       # Add: useQuery for repo layout; extend the existing initial-state effect
                                      # (~lines 588-617) with priority: startup open-target > .gitlocal/.layout > URL-param state
ui/src/App.test.tsx                  # Extend: initial-state priority-ordering coverage
```

**Structure Decision**: Single existing web application (`src/` Node/TypeScript backend + `ui/` React frontend). No new project or package boundary. The feature adds one new server service module (directly modeled on `startup-preferences.ts`, but per-repo instead of global — env-var-override seam intentionally omitted since the path is always derived from the already-resolved `repoPath`, not a fixed global location), one new route pair following the existing `/api/repo/...` naming convention (no `:id` — GitLocal has no repo-id concept, exactly one repo is open per server process), and one new priority tier in `App.tsx`'s existing initial-view-state resolution effect.

## Complexity Tracking

No constitution violations or complexity exceptions.

## Phase 0: Research

Research completed in [research.md](./research.md). Key decisions: mirror `startup-preferences.ts`'s read/write/error-handling shape exactly but scope the path to the open repo's root (`join(repoPath, '.gitlocal', '.layout')`) instead of a global `~/.gitlocal/` path; use a `/api/repo/layout` GET/PUT pair (no `:id`, matching GitLocal's single-open-repo model); slot the new saved state into `App.tsx`'s existing initial-state effect as a priority tier between the explicit startup open-target and the URL-param fallback; writes are fire-and-forget and never surface errors to the user, matching `rememberStartupFolder`.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md): `.gitlocal/.layout` file shape, `RepoLayout` entity, and initial-state priority/resolution model.
- [contracts/repo-layout-config.md](./contracts/repo-layout-config.md): API contract (`GET`/`PUT /api/repo/layout`) and user-facing restore-on-reopen contract.
- [quickstart.md](./quickstart.md): Implementation verification workflow.

## Post-Design Constitution Check

- **TypeScript/service scope** stays within existing patterns; no new dependency.
- **Coverage and QA** are addressed by service tests (write/read/error-path), handler tests (request/response shape, error mapping), and UI tests (initial-state priority ordering, repo-mismatch non-issue since the file is inherently repo-scoped).
- **Local-first behavior** is unaffected — filesystem-only read/write at the already-open repo root, no network call added.
- **Clean, useful UI** is preserved: the feature has no new visible chrome; it only changes what state a repo opens into.
- **Repository-relative documentation** is maintained across generated artifacts.

Result: Pass.
