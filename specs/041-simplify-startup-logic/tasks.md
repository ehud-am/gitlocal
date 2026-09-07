# Tasks: Simplify Startup Folder Resolution

**Input**: Design documents from `specs/041-simplify-startup-logic/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/startup-api.md](./contracts/startup-api.md), [quickstart.md](./quickstart.md)

**Tests**: Included. The constitution enforces ≥90% per-file branch coverage (non-negotiable), and
this feature is specifically about reliability of core startup code, so test tasks are mandatory,
not optional, for every phase below.

**Organization**: Tasks are grouped by user story (US1/US2/US3, per spec.md priorities P1/P2/P2) so
each story is independently implementable, testable, and shippable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to US1, US2, or US3
- Every task names its exact file path(s)

## Path Conventions

Existing single-project layout: `src/` (backend), `ui/src/` (frontend, minimal touch), `tests/`
(Vitest). No new directories are introduced.

---

## Phase 1: Setup

**Purpose**: Establish the baseline this feature's size-reduction validation (SC-005) is measured
against, before any code changes.

- [ ] T001 Record a line-count baseline for every file this feature will touch — run
  `wc -l src/services/startup-preferences.ts src/server.ts src/handlers/repo.ts src/types.ts src/git/repo.ts` — and save the output to `specs/041-simplify-startup-logic/baseline-loc.txt`

**Checkpoint**: Baseline captured; ready for foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single shared primitives every user story's work depends on: the narrowed
`StartupFolderSource` type, and the one-and-only OS-default location helper (Decision 1 and
Decision 4 in [research.md](./research.md)).

**⚠️ CRITICAL**: No user story work below can begin until this phase is complete.

- [ ] T002 [P] In `src/types.ts`, narrow `StartupFolderSource` to `'explicit' | 'last-used' | 'os-default'` and remove the `platformDefaultPath` field from the `StartupFolderResolution` interface (confirmed dead in data-model.md — no production reader)
- [ ] T003 [P] In `ui/src/types/index.ts`, mirror the same `StartupFolderSource` narrowing and `platformDefaultPath` removal on the UI-side `StartupFolderResolution` type
- [ ] T004 In `src/services/startup-preferences.ts`, replace `resolveGuaranteedFallbackPath()`'s multi-candidate chain (Documents → home → cwd → tmp dir → filesystem root) with a single `resolveOsDefaultLocation()` function that tries only the home directory, falling through exactly once to the filesystem root if home itself is unreadable, returning `{ path, readable }` (depends on T002 for the type it will be used with)

**Checkpoint**: Foundation ready — `resolveOsDefaultLocation()` exists and is unit-testable in isolation; all three user stories can now proceed.

---

## Phase 3: User Story 1 - Startup always reaches a working screen (Priority: P1) 🎯 MVP

**Goal**: Collapse the 5-tier folder resolution into 3 (`explicit` / `last-used` / `os-default`)
and make every startup failure path — explicit path bad, remembered folder bad, file-launch target
bad — converge on the one `resolveOsDefaultLocation()` outcome from Phase 2, instead of each
computing its own ad hoc fallback.

**Independent Test**: Run quickstart.md steps 1-5 — valid explicit path, healthy remembered
folder, deleted remembered folder, nonexistent explicit path, and confirming both failure cases
land on the identical `os-default` location and message shape.

### Tests for User Story 1

- [ ] T005 [P] [US1] Update `tests/unit/services/startup-preferences.test.ts`: rewrite the tests asserting on `'platform-default'` / `'home-fallback'` / `'safe-fallback'` sources to assert on the single `'os-default'` source, preserving the underlying scenarios (deleted vs. permission-denied vs. disconnected remembered folder all produce `os-default` with a distinct `fallbackReason` string, per FR-009)
- [ ] T006 [P] [US1] Add new unit tests for `resolveOsDefaultLocation()` in `tests/unit/services/startup-preferences.test.ts` covering: home directory readable (returns home); home unreadable, filesystem root readable (returns root, `readable: true`); both unreadable (returns root path with `readable: false`, never throws)

### Implementation for User Story 1

- [ ] T007 [US1] In `src/services/startup-preferences.ts`, rewrite `resolveStartupFolder()` to the 3-stage flow — explicit (valid/invalid) → last-used (valid/invalid) → `resolveOsDefaultLocation()` — removing the separate `platform-default`/`home-fallback` branches now superseded by T004's single helper (depends on T004)
- [ ] T008 [US1] In `src/server.ts`'s `initializePaths()`, replace the two inline `resolveGuaranteedFallbackPath()` + hand-built `buildSafeFallbackResolution(...)` call sites (explicit-path-failure branch, and the not-a-readable-directory branch) with calls to the same `resolveOsDefaultLocation()` from T004, so both converge on one shape and one set of computed values instead of two independently-constructed ones (depends on T004, T007)
- [ ] T009 [US1] In `src/handlers/repo.ts`, update the two remaining `resolveGuaranteedFallbackPath()` call sites (`recoverIfRepoPathUnavailable`'s caller and `repositoryParentFolderHandler`) to call `resolveOsDefaultLocation()` instead, keeping `buildSafeFallbackResolution()` as the shared shape-builder around it (depends on T004)
- [ ] T010 [US1] In `src/cli.ts`, verify `main()` still passes the (now 3-tier) `resolveStartupFolder()` result straight through to `createApp()` unchanged, and update any log-message logic that referenced the removed tiers (depends on T007)

### Test Updates for User Story 1 (integration)

- [ ] T011 [US1] Update `tests/integration/server.test.ts`: rewrite startup-resolution scenarios so an explicit-path failure and a remembered-folder failure are both asserted to produce the same `os-default` `source` and a location identical to `resolveOsDefaultLocation()`'s own output (depends on T008, T009)

### Validation

- [ ] T012 [US1] Run `npm run test:server` and confirm ≥90% branch coverage on `src/services/startup-preferences.ts`, `src/server.ts`, `src/cli.ts`, `src/handlers/repo.ts`; fix any gap before proceeding

**Checkpoint**: User Story 1 is fully functional and independently testable — quickstart.md steps 1-5 pass.

---

## Phase 4: User Story 2 - Sidebar and state correctly reflect repo vs. independent folder (Priority: P2)

**Goal**: Extract the repo-vs-independent-folder + tree-root/selection computation, currently
duplicated between `resolveOpenTarget()` (startup native file-open) and `repositoryOpenHandler()`
(runtime file/folder open API), into one shared function used by both.

**Independent Test**: Run quickstart.md steps 6-7 — open a file inside a repo directly and confirm
the tree roots at the repo with git context; open a file in an independent folder directly and
confirm the tree roots at that folder with no git context.

### Tests for User Story 2

- [ ] T013 [P] [US2] Add unit tests in `tests/unit/git/repo.test.ts` for the new shared classifier: a file inside a repository (root/selection relative to repo root, `isGitRepo: true`), a file in an independent folder (root = containing folder, `isGitRepo: false`), and a file at a repository's own root

### Implementation for User Story 2

- [ ] T014 [US2] In `src/git/repo.ts`, extract a new exported function `resolveDirectOpenTarget(canonicalPath: string, pathType: 'file' | 'directory')` that calls the existing `classifyLocalPath()` once and returns `{ rootPath, selectedPath, selectedPathType, isGitRepo }`, encoding the rule currently duplicated in `resolveOpenTarget()` and `repositoryOpenHandler()` (depends on T013 existing as the target contract)
- [ ] T015 [US2] In `src/server.ts`, update `resolveOpenTarget()` to compute `rootPath`/`selectedPath` by calling `resolveDirectOpenTarget()` from T014 instead of its own inline `dirname`/`relative` computation, keeping its existing status/message wrapping around that result (depends on T014)
- [ ] T016 [P] [US2] In `src/handlers/repo.ts`, update `repositoryOpenHandler()`'s file-open branch to call `resolveDirectOpenTarget()` from T014 instead of its own inline duplicate computation (depends on T014)

### Test Updates for User Story 2

- [ ] T017 [US2] Update `tests/unit/handlers/repo.test.ts` for `repositoryOpenHandler()` to confirm identical response shape/values after switching to the shared classifier (no behavior change expected — this test proves it) (depends on T016)
- [ ] T018 [US2] Update `tests/integration/server.test.ts`'s native-file-open startup scenarios to confirm identical `rootPath`/`selectedPath`/`isGitRepo` results after `resolveOpenTarget()`'s switch to the shared classifier (depends on T015)

### Validation

- [ ] T019 [US2] Run `npm run test:server` and confirm ≥90% branch coverage on `src/git/repo.ts`, `src/server.ts`, `src/handlers/repo.ts`

**Checkpoint**: User Stories 1 AND 2 both work independently — quickstart.md steps 1-7 pass, and the repo-vs-folder rule now has exactly one implementation.

---

## Phase 5: User Story 3 - "Last viewed" only remembers a top-level location (Priority: P2)

**Goal**: Guarantee — structurally, not just by convention — that the persisted "last viewed"
location is always a repository root or an independent folder's own root, by adding a
defense-in-depth check to the single writer function and removing the one unused, unvalidated
HTTP surface that could otherwise bypass it.

**Independent Test**: Run quickstart.md steps 8-9 — browse deep into a repository, relaunch bare,
confirm only the repo root was persisted and no file/sub-folder is preselected; confirm
`PUT /api/startup-folder` no longer exists (404).

### Tests for User Story 3

- [ ] T020 [P] [US3] Add unit tests in `tests/unit/services/startup-preferences.test.ts` for `writeStartupFolderPreference()`'s new guard: writing a repository root succeeds; writing an independent folder root succeeds; writing a sub-path inside a repository (not the root) throws
- [ ] T021 [P] [US3] Add an integration test in `tests/integration/server.test.ts` confirming `PUT /api/startup-folder` returns a 404 (route no longer registered)

### Implementation for User Story 3

- [ ] T022 [US3] In `src/services/startup-preferences.ts`, add a top-level-only guard inside `writeStartupFolderPreference()`: use `classifyLocalPath()` to reject (throw) a path that is inside a git repository but is not that repository's root, in addition to the existing `isReadableDirectory` check (depends on T020 defining the expected behavior)
- [ ] T023 [US3] Remove the `PUT /api/startup-folder` route registration in `src/server.ts` and the `startupFolderUpdateHandler` function plus its `StartupFolderUpdateRequest` import in `src/handlers/repo.ts`
- [ ] T024 [P] [US3] Remove the now-unused `StartupFolderUpdateRequest` and `StartupFolderUpdateResponse` types from `src/types.ts` and their mirrors from `ui/src/types/index.ts`
- [ ] T025 [P] [US3] Remove the dead `updateStartupFolder` function from `ui/src/services/api.ts` (confirmed to have zero call sites)

### Test Updates for User Story 3

- [ ] T026 [US3] Remove the obsolete `PUT /api/startup-folder` handler tests from `tests/unit/handlers/repo.test.ts` (superseded by T021's 404 integration test) and confirm no remaining reference to `startupFolderUpdateHandler` (depends on T023)

### Validation

- [ ] T027 [US3] Run `npm run test:server` and confirm ≥90% branch coverage on `src/services/startup-preferences.ts`, `src/server.ts`, `src/handlers/repo.ts`, `src/types.ts`; run `npm run test:ui` (or `npm test`) for `ui/src/services/api.ts` and `ui/src/types/index.ts` coverage

**Checkpoint**: All three user stories are independently functional — quickstart.md steps 1-9 all pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the overall simplification goal was met and the codebase/docs reflect it.

- [ ] T028 Re-run `wc -l` on the same file list as T001 (`src/services/startup-preferences.ts src/server.ts src/handlers/repo.ts src/types.ts src/git/repo.ts`), compare against `specs/041-simplify-startup-logic/baseline-loc.txt`, and record the resulting percentage reduction in that same file — confirm it approaches the ~30% target from SC-005 (a shortfall is a signal to look for more redundant code from research.md's decisions, not a hard blocker if correctness would otherwise suffer)
- [ ] T029 [P] Add a "Recent Changes" entry for this feature to `CLAUDE.md`, following the existing per-feature entry format used by prior specs
- [ ] T030 Run `npm run verify` (full build + test + audit) at the repository root and confirm it passes clean
- [ ] T031 Manually execute all 9 steps of [quickstart.md](./quickstart.md) end-to-end against a locally built `dist/cli.js` and confirm every expectation holds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001 is informational only, not a hard blocker, but should run first for an accurate baseline) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (needs `resolveOsDefaultLocation()` from T004)
- **User Story 2 (Phase 4)**: Depends on Foundational; its `src/server.ts` changes (T015) land after User Story 1's `src/server.ts` changes (T008) touch the same file, so implement sequentially after Phase 3 completes even though the two stories are logically independent
- **User Story 3 (Phase 5)**: Depends on Foundational only; does not depend on Phase 3 or 4's changes, but is sequenced last here because it touches `src/services/startup-preferences.ts` (shared with Phase 3) and `src/server.ts`/`src/handlers/repo.ts` (shared with Phases 3-4) — running it last avoids merge churn in files those phases are actively editing
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- Tests are written alongside (not strictly before) implementation here, since this is a refactor
  of existing, already-tested behavior rather than greenfield code — but every test task must pass
  before that story's Validation task is considered complete
- Foundational primitives (Phase 2) before any story-specific wiring
- Shared-function extraction before its call sites are updated to use it

### Parallel Opportunities

- T002 and T003 (type narrowing, two different files) can run in parallel
- T005 and T006 (both in the same test file but independent test blocks) can be drafted in parallel then merged
- T013 (new classifier tests) can be written in parallel with T005/T006 since they target different files
- T016 and T017 touch different files and can run in parallel once T014 lands
- T024 and T025 (dead-code removal in two different files) can run in parallel
- T029 (docs) can run in parallel with T030/T031 (validation)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch the two independent type-narrowing tasks together:
Task: "Narrow StartupFolderSource + remove platformDefaultPath in src/types.ts"
Task: "Mirror the same narrowing in ui/src/types/index.ts"
```

## Parallel Example: User Story 3

```bash
# Launch the two independent dead-code removals together:
Task: "Remove StartupFolderUpdateRequest/Response types from src/types.ts and ui/src/types/index.ts"
Task: "Remove the dead updateStartupFolder function from ui/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T004) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T005-T012)
4. **STOP and VALIDATE**: run quickstart.md steps 1-5 against a local build
5. This alone already resolves the user's core complaint (startup reliability / hard-to-reproduce failures) and is shippable on its own

### Incremental Delivery

1. Setup + Foundational → shared primitives ready
2. User Story 1 → validate independently → this is the MVP (reliability fix)
3. User Story 2 → validate independently → repo/folder tree-rooting consolidated
4. User Story 3 → validate independently → persistence guarantee hardened, dead endpoint removed
5. Polish → confirm the ~30% reduction goal and update docs

### Suggested Single-Session Order

Given the file overlap noted in Dependencies above, implement phases strictly in order
(1 → 2 → 3 → 4 → 5 → 6) rather than parallelizing across user stories, even though US2 and US3 are
logically independent of each other — this avoids merge conflicts within
`src/server.ts`/`src/handlers/repo.ts`/`src/services/startup-preferences.ts`, which all three
stories touch.

---

## Notes

- [P] tasks = different files (or independent regions of a test file), safe to parallelize
- [Story] label maps every user-story-phase task to US1/US2/US3 for traceability back to spec.md
- Every story ends with a Validation task requiring the constitution's ≥90% per-file coverage gate
- Commit after each task or logical group, consistent with the git extension's per-phase commit hooks
- SC-005's ~30% reduction is validated in Phase 6 (T028) against the Phase 1 (T001) baseline
