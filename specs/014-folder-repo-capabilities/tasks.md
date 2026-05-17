# Tasks: Folder and Repository Capabilities

**Input**: Design documents from `specs/014-folder-repo-capabilities/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/local-api.md](contracts/local-api.md), [quickstart.md](quickstart.md)

**Tests**: Included because the plan and constitution require preserving 90% per-file coverage for server and UI changes.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks in the same phase
- **[Story]**: User story label for traceability: [US1], [US2], [US3]
- Every task includes exact file paths
- Command-only and manual validation tasks may name the command or validation artifact instead of a source file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current interfaces and test surfaces before changing behavior.

- [X] T001 Inspect current active repo/folder routing and file handlers in `src/server.ts`, `src/handlers/file.ts`, `src/handlers/folder.ts`, `src/handlers/repo.ts`, `src/git/repo.ts`, and `src/git/tree.ts`
- [X] T002 [P] Inspect current repository context and identity UI flows in `ui/src/App.tsx`, `ui/src/components/RepoContext/RepoContextHeader.tsx`, and `ui/src/components/AppDialogs.tsx`
- [X] T003 [P] Inspect existing server and UI test helper patterns in `tests/unit/handlers/file.test.ts`, `tests/unit/handlers/folder.test.ts`, `tests/unit/handlers/repo.test.ts`, `tests/integration/server.test.ts`, `ui/src/components/RepoContext/RepoContextHeader.test.tsx`, and `ui/src/App.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared contracts and root-safe local filesystem primitives that all user stories depend on.

**Critical**: No user story work should begin until this phase is complete.

- [X] T004 Add active local-root terminology and regular-folder capability fields to shared server contracts in `src/types.ts`
- [X] T005 Mirror the active local-root and SSH key path contract changes in UI contracts in `ui/src/types/index.ts`
- [X] T006 [P] Add root-safe path normalization helpers for regular folders in `src/git/repo.ts`
- [X] T007 [P] Add regular-folder directory listing helper that returns `TreeNode[]` entries in `src/git/tree.ts`
- [X] T008 Add regular-folder file read, write, delete, editability, and revision-token helpers in `src/git/repo.ts`
- [X] T009 Add unit coverage for root-safe regular-folder path validation and file helpers in `tests/unit/git/repo.test.ts`
- [X] T010 [P] Add unit coverage for regular-folder tree listing in `tests/unit/git/tree.test.ts`

**Checkpoint**: Shared contracts and filesystem helpers are ready for story implementation.

---

## Phase 3: User Story 1 - Manage Non-Git Folders (Priority: P1) MVP

**Goal**: A user can open a regular non-git folder, browse its full file list, view files, create a file, edit a file, and delete a file without initializing git.

**Independent Test**: Start GitLocal with a temporary non-git folder, browse nested entries, view a text file, create a new file, update it, delete it, and verify all outcomes through the UI and API.

### Tests for User Story 1

- [X] T011 [P] [US1] Add handler tests for `GET /api/info` regular-folder metadata in `tests/unit/handlers/repo.test.ts`
- [X] T012 [P] [US1] Add handler tests for regular-folder `GET /api/tree` and `GET /api/file` in `tests/unit/handlers/file.test.ts`
- [X] T013 [P] [US1] Add handler tests for regular-folder `POST /api/file`, `PUT /api/file`, and `DELETE /api/file` in `tests/unit/handlers/file.test.ts`
- [X] T014 [P] [US1] Add integration coverage for opening and mutating a non-git folder in `tests/integration/server.test.ts`
- [X] T015 [P] [US1] Add UI API client coverage for regular-folder file operations in `ui/src/services/api.ts` and existing UI API tests if present
- [X] T016 [P] [US1] Add component coverage for browsing regular-folder entries in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T017 [P] [US1] Add component coverage for regular-folder view/create/edit/delete flows in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T018 [P] [US1] Add app-level coverage for active regular-folder mode in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [X] T019 [US1] Update active path initialization so valid non-git folders become the active browsable root in `src/server.ts`
- [X] T020 [US1] Update `infoHandler` to return regular-folder metadata, root entry count, and null git context in `src/handlers/repo.ts`
- [X] T021 [US1] Update `treeHandler` to list regular-folder entries when no git repo is active in `src/handlers/file.ts`
- [X] T022 [US1] Update `fileHandler` to read regular-folder file contents, detect type, set editability, and return revision tokens in `src/handlers/file.ts`
- [X] T023 [US1] Update `createFileHandler`, `updateFileHandler`, and `deleteFileHandler` to mutate regular-folder files through root-safe helpers in `src/handlers/file.ts`
- [X] T024 [US1] Update file operation error messages for missing paths, duplicate paths, path escape attempts, unsupported files, and permission failures in `src/handlers/file.ts`
- [X] T025 [US1] Update UI startup and state handling so non-git folders load the tree and content panels instead of staying in picker-only behavior in `ui/src/App.tsx`
- [X] T026 [US1] Update file tree rendering for regular-folder entries without git sync labels in `ui/src/components/FileTree/FileTree.tsx` and `ui/src/components/FileTree/FileTreeNode.tsx`
- [X] T027 [US1] Update content panel create/edit/delete controls to remain available for editable files in regular folders in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T028 [US1] Update regular-folder empty state and binary/unsupported file messaging in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T029 [US1] Run the User Story 1 quickstart checks from `specs/014-folder-repo-capabilities/quickstart.md`
- [X] T029a [P] [US1] Add picker browse tests for listing files and folders, one Open action, and file-open rejection behavior in `tests/unit/handlers/folder.test.ts` and `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T029b [US1] Update folder picker responses to include file/folder entry type and folder-only open eligibility in `src/handlers/folder.ts`, `src/types.ts`, and `ui/src/types/index.ts`
- [X] T029c [US1] Update the folder picker to remove separate browse/open actions and use one primary Open button in `ui/src/components/Picker/PickerPage.tsx`
- [X] T029d [US1] Align the folder picker's left navigation panel with the main viewer tree organization in `ui/src/components/Picker/PickerPage.tsx` and `ui/src/styles/globals.css`
- [X] T029e [US1] Add visible outcomes for the scoped failure matrix from SC-006 in `tests/unit/handlers/file.test.ts`, `tests/unit/handlers/repo.test.ts`, `ui/src/components/ContentPanel/ContentPanel.test.tsx`, and `ui/src/App.test.tsx`

**Checkpoint**: User Story 1 is functional and testable as the MVP.

---

## Phase 4: User Story 2 - Compare Local and Remote Repository Identity (Priority: P2)

**Goal**: A user expands a git repository and sees local repository path and remote repository together, with no repeated current branch and no "Upstream sync" field.

**Independent Test**: Open a git repository with a remote, expand the repository context, and verify local path plus remote appear in one row while current branch and upstream sync are absent from the expanded view.

### Tests for User Story 2

- [X] T030 [P] [US2] Update repository context component tests to expect local path and remote repository in the first expanded row in `ui/src/components/RepoContext/RepoContextHeader.test.tsx`
- [X] T031 [P] [US2] Add repository context tests for no-remote and multiple-remote display states in `ui/src/components/RepoContext/RepoContextHeader.test.tsx`
- [X] T032 [P] [US2] Add or update remote context selection tests in `tests/unit/git/repo.test.ts`

### Implementation for User Story 2

- [X] T033 [US2] Ensure `getInfo` returns deterministic selected remote context for upstream, origin, first remote, and no-remote cases in `src/git/repo.ts`
- [X] T034 [US2] Restructure expanded repository context layout to place local repository and remote repository in one row in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T035 [US2] Remove repeated current branch display from the expanded repository context in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T036 [US2] Remove the "Upstream sync" field and related expanded-view copy from `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T037 [US2] Run the expanded git repository context quickstart checks from `specs/014-folder-repo-capabilities/quickstart.md`

**Checkpoint**: User Story 2 is independently functional without changing US1 behavior.

---

## Phase 5: User Story 3 - Manage SSH Key Path in Git Identity (Priority: P3)

**Goal**: A user can view and edit the repository-scoped SSH key path from git identity details, while commit and remote sync check actions are no longer offered in the repository context UI.

**Independent Test**: Open git identity details, save an SSH key path, reopen identity details to verify it, clear it, and confirm commit/sync actions are absent from repository context actions.

### Tests for User Story 3

- [X] T038 [P] [US3] Add git identity unit tests for reading, setting, changing, and clearing repository SSH key path in `tests/unit/git/repo.test.ts`
- [X] T039 [P] [US3] Add handler tests for `PUT /api/git/identity` with `sshKeyPath` in `tests/unit/handlers/repo.test.ts`
- [X] T040 [P] [US3] Update repository context tests to assert commit and remote sync actions are absent in `ui/src/components/RepoContext/RepoContextHeader.test.tsx`
- [X] T041 [P] [US3] Update identity dialog tests for SSH key path view, edit, save, and clear flows in `ui/src/components/AppDialogs.tsx` and existing dialog/app tests

### Implementation for User Story 3

- [X] T042 [US3] Add `sshKeyPath` to git identity request and response contracts in `src/types.ts`
- [X] T043 [US3] Add repository-local SSH key path read/write/clear behavior to git identity helpers in `src/git/repo.ts`
- [X] T044 [US3] Update `gitIdentityUpdateHandler` to accept and persist `sshKeyPath` without corrupting name or email in `src/handlers/repo.ts`
- [X] T045 [US3] Mirror `sshKeyPath` identity contracts and API payloads in `ui/src/types/index.ts` and `ui/src/services/api.ts`
- [X] T046 [US3] Add SSH key path field, empty state, validation feedback, and save/clear behavior to the identity dialog in `ui/src/components/AppDialogs.tsx`
- [X] T047 [US3] Pass current SSH key path into the identity dialog and update local info state after save in `ui/src/App.tsx`
- [X] T048 [US3] Remove commit and remote sync action buttons, labels, and callbacks from repository context props and rendering in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T049 [US3] Remove now-unused commit/sync UI callbacks from `ui/src/App.tsx` while leaving backend compatibility routes untouched unless they become unreachable dead code
- [X] T050 [US3] Run the SSH key path quickstart checks from `specs/014-folder-repo-capabilities/quickstart.md`

**Checkpoint**: User Story 3 is independently functional and repository action menus match the requested scope.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full feature, coverage, and documentation after desired user stories are complete.

- [X] T051 [P] Update any changed user-facing docs or README workflow notes for regular-folder support in `README.md`
- [X] T052 [P] Review `CHANGELOG.md` and add an Unreleased entry for regular-folder capabilities and repository context cleanup if the project uses unreleased entries
- [X] T053 Run `npm test` and fix any server or UI coverage regressions in changed files
- [X] T054 Run `npm run lint` and fix TypeScript errors in changed files
- [X] T055 Run `npm run build` and fix build failures in server or UI bundles
- [X] T056 Perform a final manual pass through `specs/014-folder-repo-capabilities/quickstart.md`
- [X] T057 [P] Review README and changelog after picker/navigation refinements in `README.md` and `CHANGELOG.md`
- [X] T058 Run dependency vulnerability checks with `npm audit` at the repository root and `npm --prefix ui audit`, then apply compatible package upgrades if vulnerabilities are found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2. This is the MVP.
- **Phase 4 US2**: Depends on Phase 2 and can proceed independently of US1 after foundation, though final validation should ensure no US1 regression.
- **Phase 5 US3**: Depends on Phase 2 and can proceed independently of US1/US2 after foundation, though it shares repository context files with US2.
- **Phase 6 Polish**: Depends on all selected user stories.

### User Story Dependencies

- **US1 Manage Non-Git Folders**: No dependency on other user stories after foundational helpers.
- **US2 Compare Local and Remote Repository Identity**: No dependency on US1; coordinate with US3 because both edit `ui/src/components/RepoContext/RepoContextHeader.tsx`.
- **US3 Manage SSH Key Path in Git Identity**: No dependency on US1 or US2; coordinate with US2 because both edit repository context and app identity flows.

### Within Each User Story

- Test tasks should be written first and fail or be skipped with a clear reason before implementation.
- Shared contracts should be updated before handlers and UI consumers.
- Server helpers should be implemented before handlers.
- UI type/API updates should be implemented before component integration.
- Quickstart checks run after story implementation.

## Parallel Opportunities

- T002 and T003 can run in parallel with T001.
- T006 and T007 can run in parallel after T004/T005 are understood.
- T009 and T010 can run in parallel once T006/T007/T008 are drafted.
- US1 test tasks T011-T018 can be drafted in parallel because they target different server, integration, and UI files.
- US2 tests T030-T032 can run in parallel.
- US3 tests T038-T041 can run in parallel.
- US2 and US3 can be implemented in parallel by separate owners if they coordinate edits to `ui/src/components/RepoContext/RepoContextHeader.tsx` and `ui/src/App.tsx`.
- T051 and T052 can run in parallel during polish.

## Parallel Example: User Story 1

```text
Task: "T011 [US1] Add handler tests for GET /api/info regular-folder metadata in tests/unit/handlers/repo.test.ts"
Task: "T012 [US1] Add handler tests for regular-folder GET /api/tree and GET /api/file in tests/unit/handlers/file.test.ts"
Task: "T014 [US1] Add integration coverage for opening and mutating a non-git folder in tests/integration/server.test.ts"
Task: "T016 [US1] Add component coverage for browsing regular-folder entries in ui/src/components/FileTree/FileTree.test.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T030 [US2] Update repository context component tests to expect local path and remote repository in the first expanded row in ui/src/components/RepoContext/RepoContextHeader.test.tsx"
Task: "T032 [US2] Add or update remote context selection tests in tests/unit/git/repo.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T038 [US3] Add git identity unit tests for reading, setting, changing, and clearing repository SSH key path in tests/unit/git/repo.test.ts"
Task: "T039 [US3] Add handler tests for PUT /api/git/identity with sshKeyPath in tests/unit/handlers/repo.test.ts"
Task: "T041 [US3] Update identity dialog tests for SSH key path view, edit, save, and clear flows in ui/src/components/AppDialogs.tsx and existing dialog/app tests"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 only.
3. Validate regular-folder browse/view/create/update/delete with the US1 quickstart checks.
4. Run focused server and UI tests for changed US1 files.

### Incremental Delivery

1. Deliver US1 as the MVP for regular-folder capabilities.
2. Deliver US2 to simplify expanded git repository context.
3. Deliver US3 to add SSH key path editing and remove unused git action options.
4. Run full polish verification after all desired stories are complete.

### Parallel Team Strategy

1. One owner completes foundational server contracts and helpers.
2. UI and server test owners draft story-specific failing tests in parallel.
3. US1 owner implements regular-folder server and content/tree UI.
4. US2 and US3 owners coordinate repository context file edits before merging.
