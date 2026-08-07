# Tasks: Per-Repo/Folder Configuration File

**Input**: Design documents from `specs/033-repo-config-file/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/repo-layout-config.md, quickstart.md

**Tests**: Included — the contract and constitution (90% per-file coverage) require regression coverage for the service's read/write/error-tolerance behavior, the handler's request/response/error-code shape, and the UI's initial-state priority ordering.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing patterns this feature mirrors, and scaffold the new files expected by the plan.

- [ ] T001 Inspect `src/services/startup-preferences.ts` (read/write/error-tolerance shape) and `src/handlers/repo.ts` + `src/server.ts`'s existing `/api/repo/...` route registrations as the patterns this feature mirrors
- [ ] T002 [P] Create the repo-layout service scaffold in `src/services/repo-layout.ts`
- [ ] T003 [P] Create the repo-layout service test scaffold in `tests/unit/services/repo-layout.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared read/write service and API types that all user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Add `RepoLayout`, `RepoLayoutResponse`, `RepoLayoutUpdateRequest` types to `src/types.ts`
- [ ] T005 Add failing tests for valid roundtrip, missing directory/file, malformed JSON, unwritable path, and unknown-field tolerance in `tests/unit/services/repo-layout.test.ts`
- [ ] T006 Implement `readRepoLayout(repoPath)` / `writeRepoLayout(repoPath, layout)` in `src/services/repo-layout.ts` at `join(repoPath, '.gitlocal', '.layout')`, mirroring `startup-preferences.ts`'s try/catch-to-default read and `mkdirSync` + `writeFileSync` write
- [ ] T007 Run the focused service tests with `npm test -- repo-layout` and fix issues in `src/services/repo-layout.ts`

**Checkpoint**: The service layer is ready for handler and UI integration.

---

## Phase 3: User Story 1 - Reopen a repo where you left off (Priority: P1) 🎯 MVP

**Goal**: Automatically persist and restore the last-viewed branch, file path, and raw/pretty view mode for a git repo, across both GitLocal distributions.

**Independent Test**: Open a repo, navigate to a specific branch/file/view mode, close GitLocal entirely, reopen the same repo, and confirm the same branch/file/view mode is restored automatically with no user action required.

### Tests for User Story 1

- [ ] T008 [P] [US1] Add handler tests for `GET /api/repo/layout` (valid saved layout, no saved layout falls back to defaults) in `tests/unit/handlers/repo.test.ts`
- [ ] T009 [P] [US1] Add handler tests for `PUT /api/repo/layout` (valid body persists and echoes back, invalid body returns 400) in `tests/unit/handlers/repo.test.ts`
- [ ] T010 [P] [US1] Add a UI test confirming a saved `.gitlocal/.layout` (branch/path/raw) is applied as initial state when there is no startup open-target, in `ui/src/App.test.tsx`
- [ ] T011 [P] [US1] Add a UI test confirming an explicit startup open-target still wins over a saved layout, in `ui/src/App.test.tsx`
- [ ] T012 [P] [US1] Add a UI test confirming a saved branch that no longer exists falls through to the existing branch-validation fallback (repo's current default branch), in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [ ] T013 [US1] Add `repoLayoutHandler` (GET) and `repoLayoutUpdateHandler` (PUT) to `src/handlers/repo.ts`, mirroring `startupFolderHandler`/`startupFolderUpdateHandler`'s request/response and error-code shape
- [ ] T014 [US1] Register `app.get('/api/repo/layout', repoLayoutHandler)` and `app.put('/api/repo/layout', repoLayoutUpdateHandler)` in `src/server.ts`, alongside the existing `/api/repo/...` routes
- [ ] T015 [US1] Add matching client types (`RepoLayout`, `RepoLayoutResponse`, `RepoLayoutUpdateRequest`) to `ui/src/types.ts`
- [ ] T016 [US1] Add `getRepoLayout()` / `updateRepoLayout()` to `ui/src/services/api.ts`, mirroring `getStartupFolder`/`updateStartupFolder`
- [ ] T017 [US1] Add `useQuery(['repo-layout'], api.getRepoLayout)` in `ui/src/App.tsx`
- [ ] T018 [US1] Extend the initial-state resolution effect (~lines 588-617) in `ui/src/App.tsx` with the new priority tier: startup open-target (highest) > saved `.gitlocal/.layout` (new) > URL-param state (existing fallback)
- [ ] T019 [US1] Feed saved `branch` from the resolved layout into the existing branch-validation fallback pass (lines 266-303) in `ui/src/App.tsx`, without adding new validation logic
- [ ] T020 [US1] Add fire-and-forget `api.updateRepoLayout(...)` calls on branch switch, file open, and raw/pretty toggle in `ui/src/App.tsx`
- [ ] T021 [US1] Run `npm test -- repo-layout repo.test` and `npm --prefix ui run test -- App` and fix US1 regressions

**Checkpoint**: User Story 1 is fully functional and testable independently for git repos.

---

## Phase 4: User Story 2 - Same behavior for a plain (non-git) folder (Priority: P2)

**Goal**: Extend the same automatic persistence/restore behavior to plain filesystem folders with no `.git` directory.

**Independent Test**: Open a plain folder (no `.git` directory) in GitLocal, navigate to a file, close and reopen that same folder, and confirm the last-viewed file/view mode is restored the same way it is for a git repo.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add a service test confirming `readRepoLayout`/`writeRepoLayout` behave identically for a non-git folder path (no `.git` present) in `tests/unit/services/repo-layout.test.ts`
- [ ] T023 [P] [US2] Add a UI test confirming a non-git folder restores saved `path`/`raw` with `branch` always `null`, in `ui/src/App.test.tsx`

### Implementation for User Story 2

- [ ] T024 [US2] Confirm `repoLayoutHandler`/`repoLayoutUpdateHandler` in `src/handlers/repo.ts` make no git-specific assumptions (branch is simply `null` when absent) — adjust only if a gap is found
- [ ] T025 [US2] Confirm the `ui/src/App.tsx` priority-tier logic from US1 applies unchanged when `currentBranch`/branch validation is not applicable for a non-git folder — adjust only if a gap is found
- [ ] T026 [US2] Run `npm test -- repo-layout repo.test` and `npm --prefix ui run test -- App` and fix US2 regressions

**Checkpoint**: User Stories 1 and 2 both work independently, for git repos and plain folders alike.

---

## Phase 5: User Story 3 - Configuration survives a corrupted or hand-edited file (Priority: P3)

**Goal**: Guarantee that a missing, malformed, or unwritable `.gitlocal/.layout` never blocks opening or browsing a repo/folder.

**Independent Test**: Manually corrupt a repo's `.gitlocal/.layout` file (invalid JSON), open that repo in GitLocal, and confirm it opens normally at default state with no error blocking access.

### Tests for User Story 3

- [ ] T027 [P] [US3] Add a service test for malformed JSON in `.layout` falling back to `{ branch: null, path: null, pathType: 'none', raw: false }` in `tests/unit/services/repo-layout.test.ts`
- [ ] T028 [P] [US3] Add a service test for an unwritable `.gitlocal/` location (write throws) not propagating an error to the caller in `tests/unit/services/repo-layout.test.ts`
- [ ] T029 [P] [US3] Add a service test for `.gitlocal/` existing but `.layout` missing resolving to defaults in `tests/unit/services/repo-layout.test.ts`
- [ ] T030 [P] [US3] Add a service test for unrecognized fields in an existing `.layout` file being ignored without error in `tests/unit/services/repo-layout.test.ts`
- [ ] T031 [P] [US3] Add a handler test confirming `GET /api/repo/layout` never returns an error status for a malformed/missing file in `tests/unit/handlers/repo.test.ts`
- [ ] T032 [P] [US3] Add a UI test confirming a fetch failure for `repo-layout` is treated as "nothing saved yet" and never blocks or errors the initial-state effect in `ui/src/App.test.tsx`

### Implementation for User Story 3

- [ ] T033 [US3] Ensure `readRepoLayout` in `src/services/repo-layout.ts` wraps every read/parse step in try/catch returning the default object, matching FR-007/FR-009 (should already hold from T006; harden only if a gap is found)
- [ ] T034 [US3] Ensure `writeRepoLayout` in `src/services/repo-layout.ts` swallows write failures (unwritable directory) without throwing to the caller, matching FR-008 (should already hold from T006; harden only if a gap is found)
- [ ] T035 [US3] Ensure `repoLayoutHandler` in `src/handlers/repo.ts` never surfaces a service-level read failure as a `4xx`/`5xx` to the client
- [ ] T036 [US3] Run `npm test -- repo-layout repo.test` and `npm --prefix ui run test -- App` and fix US3 regressions

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and non-regression checks across the whole feature.

- [ ] T037 [P] Confirm `.git/config`-based git identity settings (020-local-git-identity) are unaffected by running the existing git-identity test suites unchanged
- [ ] T038 [P] Confirm existing URL-param-only `viewerState.ts` fields (`sidebarCollapsed`, `generatedLocalVisibility`, `search*`) are unaffected by running the existing `App.test.tsx` suite unchanged
- [ ] T039 Run focused verification from `specs/033-repo-config-file/quickstart.md` with `npm test -- repo-layout repo.test` and `npm --prefix ui run test -- App`
- [ ] T040 Run full server + UI coverage validation with `npm test` and `npm --prefix ui run test:ci`
- [ ] T041 Run full project validation with `npm run lint` and `npm run build`
- [ ] T042 Manually walk the 9 Manual Smoke Samples in `specs/033-repo-config-file/quickstart.md`, including the SC-004 cross-distribution check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002-T003 can run in parallel after T001 starts.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; reuses the handler/UI logic US1 adds, so finish US1 first to avoid rework.
- **User Story 3 (Phase 5)**: Depends on Foundational; hardens the same service/handler US1 adds, independent of US2's non-git-folder scope.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2; no dependency on US2 or US3.
- **User Story 2 (P2)**: Can start after Phase 2; verifies US1's handler/UI code path works unchanged for non-git folders, so finish US1 first to avoid rework.
- **User Story 3 (P3)**: Can start after Phase 2; hardens error-tolerance in the same service/handler US1 adds, so finish US1's implementation tasks first to avoid rework.

### Within Each User Story

- Write story-specific tests first and confirm they fail for the missing behavior.
- Service layer before handler layer before UI wiring.
- Update `App.tsx`'s initial-state effect before adding fire-and-forget save calls.
- Run the story checkpoint command before moving to the next priority.

### Parallel Opportunities

- T002, T003 can run in parallel.
- T008, T009, T010, T011, T012 can run in parallel once Phase 2 is complete.
- T022, T023 can run in parallel once US1 is implemented.
- T027, T028, T029, T030, T031, T032 can run in parallel once Phase 2 is complete.
- T037 and T038 can run in parallel after all selected user stories are implemented.

---

## Parallel Example: User Story 1

```bash
Task: "T008 [P] [US1] Add handler tests for GET /api/repo/layout (valid saved layout, no saved layout falls back to defaults) in tests/unit/handlers/repo.test.ts"
Task: "T009 [P] [US1] Add handler tests for PUT /api/repo/layout (valid body persists and echoes back, invalid body returns 400) in tests/unit/handlers/repo.test.ts"
Task: "T010 [P] [US1] Add a UI test confirming a saved .gitlocal/.layout (branch/path/raw) is applied as initial state when there is no startup open-target, in ui/src/App.test.tsx"
Task: "T011 [P] [US1] Add a UI test confirming an explicit startup open-target still wins over a saved layout, in ui/src/App.test.tsx"
Task: "T012 [P] [US1] Add a UI test confirming a saved branch that no longer exists falls through to the existing branch-validation fallback, in ui/src/App.test.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T027 [P] [US3] Add a service test for malformed JSON in .layout falling back to defaults in tests/unit/services/repo-layout.test.ts"
Task: "T028 [P] [US3] Add a service test for an unwritable .gitlocal/ location not propagating an error in tests/unit/services/repo-layout.test.ts"
Task: "T029 [P] [US3] Add a service test for .gitlocal/ existing but .layout missing resolving to defaults in tests/unit/services/repo-layout.test.ts"
Task: "T030 [P] [US3] Add a service test for unrecognized fields being ignored without error in tests/unit/services/repo-layout.test.ts"
Task: "T031 [P] [US3] Add a handler test confirming GET /api/repo/layout never errors on a malformed/missing file in tests/unit/handlers/repo.test.ts"
Task: "T032 [P] [US3] Add a UI test confirming a repo-layout fetch failure never blocks the initial-state effect in ui/src/App.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 service/type foundation.
3. Complete Phase 3 User Story 1.
4. Stop and validate with `npm test -- repo-layout repo.test` and `npm --prefix ui run test -- App`.
5. Demo with a git repo: switch branch, open a file, toggle raw, reopen.

### Incremental Delivery

1. Add US1 for the core git-repo restore experience.
2. Add US2 to confirm/extend parity for plain non-git folders.
3. Add US3 to harden corrupted/unwritable-file resilience.
4. Finish polish and full validation.

### Parallel Team Strategy

After Phase 2, one developer can focus on the handler + `App.tsx` wiring for US1, another on non-git-folder verification for US2, and another on error-tolerance hardening/tests for US3. Coordinate edits to `src/handlers/repo.ts` and `ui/src/App.tsx` since they are shared across all three stories.

## Notes

- [P] tasks use different files or independent test additions and can run without waiting on non-parallel tasks in the same phase.
- Every user story has an independent test criterion and checkpoint.
- No new npm dependency, database, or schema changes are planned.
- Keep all paths repository-relative in committed docs.
