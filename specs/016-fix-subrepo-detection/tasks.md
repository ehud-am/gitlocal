# Tasks: Fix Nested Repository Detection

**Input**: Design documents from `specs/016-fix-subrepo-detection/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/local-api.md, quickstart.md
**Tests**: Included because the specification requires automated coverage for repository child detection and entry-point consistency.
**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on incomplete tasks.
- **[Story]**: Maps to the user story from `specs/016-fix-subrepo-detection/spec.md`.
- Every task includes at least one exact repository-relative file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing code and test locations before adding the mixed-parent reproducer.

- [X] T001 Review current local path classification behavior in `src/git/repo.ts` and current classifier coverage in `tests/unit/git/repo.test.ts`
- [X] T002 [P] Review current folder browse and repository open handler behavior in `src/handlers/folder.ts`, `src/handlers/repo.ts`, and `tests/unit/handlers/folder.test.ts`
- [X] T003 [P] Review current picker repository-row behavior and API mocks in `ui/src/components/Picker/PickerPage.tsx` and `ui/src/components/Picker/PickerPage.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the reusable mixed plain-parent fixture pattern that all user stories depend on.

**Critical**: No user story work should begin until these fixture and baseline checks are complete.

- [X] T004 Add or identify a helper that creates a plain parent with one repository child and one regular child in `tests/unit/handlers/folder.test.ts`
- [X] T005 [P] Add or identify a helper that creates the same mixed plain-parent layout for classifier tests in `tests/unit/git/repo.test.ts`
- [X] T006 [P] Add typed mock response data for a plain parent containing repository and regular children in `ui/src/components/Picker/PickerPage.test.tsx`

**Checkpoint**: Mixed-parent fixtures are ready for user story tests.

---

## Phase 3: User Story 1 - Open Repository Child From Plain Folder (Priority: P1) MVP

**Goal**: A repository child discovered from a plain parent is labeled as a repository and opens in repository mode on the first open action.

**Independent Test**: Start from a plain parent containing a repository child, browse the parent, open the repository child, and verify repository mode plus repository context.

### Tests for User Story 1

- [X] T007 [P] [US1] Add a classifier test proving a repository child under a plain parent returns `gitState: "repository-root"` and `openMode: "repository"` in `tests/unit/git/repo.test.ts`
- [X] T008 [P] [US1] Add a folder browse API test proving a repository child under a plain parent is returned with `isGitRepo: true`, `gitState: "repository-root"`, and `openMode: "repository"` in `tests/unit/handlers/folder.test.ts`
- [X] T009 [P] [US1] Add a repository open API test proving opening the repository child from a plain parent returns `ok: true`, `rootPath` equal to the child path, and `openMode: "repository"` in `tests/unit/handlers/folder.test.ts`
- [X] T010 [P] [US1] Add a picker UI test proving a repository child row from a plain parent shows repository labeling and double-click calls `api.openRepository` instead of browsing into the child in `ui/src/components/Picker/PickerPage.test.tsx`

### Implementation for User Story 1

- [X] T011 [US1] Fix repository child classification for plain-parent browse entries in `src/git/repo.ts`
- [X] T012 [US1] Ensure folder browse entries consume the corrected repository child classification for `isGitRepo`, `gitState`, `openMode`, and `repositoryRootPath` in `src/handlers/folder.ts`
- [X] T013 [US1] Ensure repository open responses preserve repository mode and active root state for repository child paths in `src/handlers/repo.ts`
- [X] T014 [US1] Ensure picker double-click and Open behavior uses `isGitRepo` or `openMode: "repository"` to open repository child rows in `ui/src/components/Picker/PickerPage.tsx`

**Checkpoint**: User Story 1 is independently functional and is the MVP.

---

## Phase 4: User Story 2 - Preserve Plain Folder Behavior Beside Repository Children (Priority: P2)

**Goal**: Regular sibling folders beside repository children remain regular folders and do not show repository controls or labels.

**Independent Test**: In the same plain parent, verify the repository child is a repository while the regular child remains folder mode.

### Tests for User Story 2

- [X] T015 [P] [US2] Add a folder browse API test proving a regular sibling beside a repository child returns `isGitRepo: false`, `gitState: "outside-repository"`, and `openMode: "folder"` in `tests/unit/handlers/folder.test.ts`
- [X] T016 [P] [US2] Add a repository open API test proving opening the regular sibling returns folder mode and does not set repository metadata in `tests/unit/handlers/folder.test.ts`
- [X] T017 [P] [US2] Add a picker UI test proving a regular sibling beside a repository child is labeled as a folder and double-click browses into it in `ui/src/components/Picker/PickerPage.test.tsx`

### Implementation for User Story 2

- [X] T018 [US2] Adjust folder entry classification logic so sibling repository status cannot leak into regular child entries in `src/handlers/folder.ts`
- [X] T019 [US2] Adjust picker row labeling and double-click branching if needed so regular sibling rows stay folder rows in `ui/src/components/Picker/PickerPage.tsx`
- [X] T020 [US2] Verify plain-folder active-root info continues to disable repository-only metadata through existing behavior in `src/git/repo.ts`

**Checkpoint**: User Stories 1 and 2 both work independently in the same mixed parent.

---

## Phase 5: User Story 3 - Consistent Classification Across Entry Points (Priority: P3)

**Goal**: The same repository child has the same repository classification whether opened directly at startup, from parent browsing, from typed path entry, or from folder actions.

**Independent Test**: Open the same repository child through every supported entry point and compare the resulting repository-vs-folder mode.

### Tests for User Story 3

- [X] T021 [P] [US3] Add an integration test proving `createApp(repositoryChildPath)` reports `isGitRepo: true` from `GET /api/info` in `tests/integration/server.test.ts`
- [X] T022 [P] [US3] Add an integration test proving `GET /api/folder/browse?path=plainParentPath` and `POST /api/repo/open` for the repository child produce matching repository classification in `tests/integration/server.test.ts`
- [X] T023 [P] [US3] Add a picker UI test proving typed submission of the repository child path calls `api.openRepository` and reloads viewer state with the repository child root in `ui/src/components/Picker/PickerPage.test.tsx`

### Implementation for User Story 3

- [X] T024 [US3] Ensure startup path initialization and open routing use the same corrected classification result for repository children in `src/server.ts` and `src/handlers/repo.ts`
- [X] T025 [US3] Ensure picker submit behavior preserves the selected repository child root returned by the open response in `ui/src/components/Picker/PickerPage.tsx`
- [X] T026 [US3] Update shared response type assumptions if needed for repository child `gitState`, `openMode`, or `repositoryRootPath` in `src/types.ts` and `ui/src/types/index.ts`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the patch end to end and document any release-facing notes.

- [X] T027 [P] Run focused server tests for classifier, folder handler, repo handler, and integration coverage with `npm run test:server` and record failures or coverage gaps in `specs/016-fix-subrepo-detection/quickstart.md`
- [X] T028 [P] Run focused picker UI tests with `npm --prefix ui run test:ci` and record failures or coverage gaps in `specs/016-fix-subrepo-detection/quickstart.md`
- [X] T029 Run full verification with `npm test`, `npm run lint`, and `npm run build`; document any remaining failures in `specs/016-fix-subrepo-detection/quickstart.md`
- [X] T030 Update patch-release notes for the nested repository detection fix in `CHANGELOG.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user-story work.
- Phase 3 (US1) depends on Phase 2 and is the MVP.
- Phase 4 (US2) depends on Phase 2 and can run in parallel with US1 after the shared fixtures exist, but should be validated after US1 if the same implementation files change.
- Phase 5 (US3) depends on Phase 2 and can run in parallel with US1/US2 after the shared fixtures exist, but final consistency validation should happen after US1 and US2 pass.
- Phase 6 depends on the desired user stories being complete.

### User Story Dependencies

- US1: Independent after Phase 2; delivers the reported fix and MVP.
- US2: Independent after Phase 2; protects regular sibling behavior.
- US3: Independent after Phase 2; verifies consistency across entry points.

### Parallel Opportunities

- Setup review tasks T002 and T003 can run in parallel with T001.
- Foundation helper tasks T005 and T006 can run in parallel after T004 is understood.
- US1 test tasks T007, T008, and T010 can run in parallel; T009 shares `tests/unit/handlers/folder.test.ts` with T008 and should be coordinated.
- US2 test tasks T015 and T017 can run in parallel; T016 shares `tests/unit/handlers/folder.test.ts` with T015 and should be coordinated.
- US3 test tasks T021, T022, and T023 can run in parallel because they touch integration and UI test files separately, with coordination between T021 and T022 in `tests/integration/server.test.ts`.
- Polish verification tasks T027 and T028 can run in parallel.

---

## Parallel Example: User Story 1

```text
Task: "T007 [US1] Add classifier coverage in tests/unit/git/repo.test.ts"
Task: "T010 [US1] Add picker UI coverage in ui/src/components/Picker/PickerPage.test.tsx"
```

When coordinating the server handler tests, avoid concurrent edits to `tests/unit/handlers/folder.test.ts` for T008 and T009.

---

## Parallel Example: User Story 2

```text
Task: "T015 [US2] Add regular sibling API coverage in tests/unit/handlers/folder.test.ts"
Task: "T017 [US2] Add regular sibling picker coverage in ui/src/components/Picker/PickerPage.test.tsx"
```

Coordinate T015 and T016 because both edit `tests/unit/handlers/folder.test.ts`.

---

## Parallel Example: User Story 3

```text
Task: "T021 [US3] Add startup consistency coverage in tests/integration/server.test.ts"
Task: "T023 [US3] Add typed submit picker coverage in ui/src/components/Picker/PickerPage.test.tsx"
```

Coordinate T021 and T022 because both edit `tests/integration/server.test.ts`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Add failing US1 tests T007 through T010.
3. Implement T011 through T014.
4. Run the focused server and picker tests for US1.
5. Stop and validate repository child open behavior before broadening scope.

### Incremental Delivery

1. Complete US1 to fix the reported repository child behavior.
2. Complete US2 to confirm regular sibling folders remain regular folders.
3. Complete US3 to confirm startup, browse, typed path, and open actions agree.
4. Complete Phase 6 verification and release notes.

### Parallel Team Strategy

1. One developer owns classifier/server files: `src/git/repo.ts`, `src/handlers/folder.ts`, `src/handlers/repo.ts`, `src/server.ts`, and related server tests.
2. One developer owns picker files: `ui/src/components/Picker/PickerPage.tsx`, `ui/src/components/Picker/PickerPage.test.tsx`, and related UI type checks.
3. Coordinate before touching shared test files listed in the parallel opportunities section.

---

## Notes

- Keep all committed documentation paths repository-relative.
- Keep the patch local-first; do not add network behavior or dependencies.
- Preserve the distinction between a repository root and an ordinary folder inside a repository.
- Verify tests fail before implementing the behavior they cover.
