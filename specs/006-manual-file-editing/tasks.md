# Tasks: Manual Local File Editing

**Input**: Design documents from `specs/006-manual-file-editing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include targeted backend and frontend tests because the implementation plan and project constitution require coverage-preserving validation for file API behavior and UI workflows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared API and UI types for manual file operations.

- [X] T001 Add manual file operation request/response and editable file metadata types in `src/types.ts`
- [X] T002 [P] Mirror manual file operation and editable file metadata types in `ui/src/types/index.ts`
- [X] T003 [P] Extend manual file operation client helpers in `ui/src/services/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared server and tree infrastructure that all stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add repository-boundary validation, text-edit eligibility checks, and revision-token helpers in `src/git/repo.ts`
- [X] T005 Rework working-tree directory listing to read repository filesystem entries safely in `src/git/tree.ts`
- [X] T006 Implement guarded `POST /api/file`, `PUT /api/file`, and `DELETE /api/file` handlers plus editable file metadata in `src/handlers/files.ts`
- [X] T007 Wire manual file operation routes into the server in `src/server.ts`
- [X] T008 [P] Add backend coverage for guarded file reads, create, update, delete, conflicts, and boundary failures in `tests/unit/handlers/files.test.ts`
- [X] T009 [P] Add file API integration coverage for manual file operations in `tests/integration/server.test.ts`
- [X] T010 Update tree refresh behavior for mutable working-tree views in `ui/src/components/FileTree/FileTree.tsx`
- [X] T011 [P] Add file tree coverage for newly created and deleted working-tree nodes in `ui/src/components/FileTree/FileTree.test.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Make a Small File Fix Inline (Priority: P1) 🎯 MVP

**Goal**: Let users edit an existing local text file inline, save safely, and avoid accidental loss of unsaved work.

**Independent Test**: Open an editable working-tree text file, enter edit mode, make a small change, save it, and confirm the updated content is shown. Then make another unsaved change and confirm navigation warns before discard.

### Implementation for User Story 1

- [X] T012 [P] [US1] Add lightweight inline editor UI helpers for editable file state and action controls in `ui/src/components/ContentPanel/InlineFileEditor.tsx`
- [X] T013 [US1] Integrate edit mode, dirty-state tracking, save flow, and unsaved-change protection into `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T014 [US1] Connect content-area status messaging and selection refresh after successful file updates in `ui/src/App.tsx`
- [X] T015 [P] [US1] Add inline editing styles for lightweight text editing states in `ui/src/App.css`
- [X] T016 [P] [US1] Add frontend coverage for edit mode, successful save, conflict handling, and unsaved-change warnings in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 1 should be independently functional and testable

---

## Phase 4: User Story 2 - Add a Missing File Quickly (Priority: P2)

**Goal**: Let users create a new text file inside the opened repository and immediately see and open it in the tree.

**Independent Test**: Start the new-file flow, enter a valid repository-relative path and content, save, and confirm the file appears in the tree and opens. Attempt to reuse an existing path and confirm the action is blocked.

### Implementation for User Story 2

- [X] T017 [P] [US2] Add new-file draft controls and path entry UI in `ui/src/components/ContentPanel/NewFileDraft.tsx`
- [X] T018 [US2] Integrate repository-scoped create-file flow, success selection, and duplicate-path error handling into `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T019 [US2] Update app-level selection and tree invalidation after file creation in `ui/src/App.tsx`
- [X] T020 [P] [US2] Add styles for new-file draft entry and validation feedback in `ui/src/App.css`
- [X] T021 [P] [US2] Add frontend coverage for successful file creation, immediate tree visibility, and existing-path rejection in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 2 should be independently functional and testable

---

## Phase 5: User Story 3 - Remove an Unneeded File Safely (Priority: P3)

**Goal**: Let users delete a local file with explicit confirmation and clear failure/conflict feedback.

**Independent Test**: Open an editable working-tree file, trigger delete, confirm removal, and verify the file disappears from the tree and content view. Cancel the confirmation once and confirm the file remains.

### Implementation for User Story 3

- [X] T022 [P] [US3] Add delete-confirmation UI for the content panel in `ui/src/components/ContentPanel/DeleteFileDialog.tsx`
- [X] T023 [US3] Integrate delete confirmation, cancel flow, conflict handling, and post-delete navigation in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T024 [US3] Update app-level selection clearing and status messaging after deletion in `ui/src/App.tsx`
- [X] T025 [P] [US3] Add styles for delete confirmation and destructive action states in `ui/src/App.css`
- [X] T026 [P] [US3] Add frontend coverage for confirmed deletion, canceled deletion, and stale-revision delete conflicts in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 3 should be independently functional and testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and feature-level verification across all stories.

- [X] T027 Review manual file action affordances for non-editable files and non-current branches in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T028 [P] Refresh shared API mocks and supporting viewer test coverage for new manual file operation shapes in `ui/src/App.test.tsx`
- [X] T029 [P] Run the feature validation flow from `specs/006-manual-file-editing/quickstart.md` and capture any required follow-up fixes in `specs/006-manual-file-editing/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and benefits from User Story 1 content-panel editing scaffolding
- **User Story 3 (Phase 5)**: Depends on Foundational completion and benefits from User Story 1 content-panel action scaffolding
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational - reuses content-panel patterns from US1 but remains independently testable
- **User Story 3 (P3)**: Can start after Foundational - reuses content-panel patterns from US1 but remains independently testable

### Within Each User Story

- Shared UI helper components before content-panel integration
- Content-panel integration before app-level selection/status wiring
- UI behavior before final story-specific tests

### Parallel Opportunities

- `T002` and `T003` can run in parallel after `T001`
- `T008`, `T009`, and `T011` can run in parallel once the corresponding foundational behavior exists
- `T012`, `T015`, and `T016` can run in parallel within US1 after the foundational phase
- `T017`, `T020`, and `T021` can run in parallel within US2 after the foundational phase
- `T022`, `T025`, and `T026` can run in parallel within US3 after the foundational phase
- `T028` and `T029` can run in parallel during polish

---

## Parallel Example: User Story 1

```bash
Task: "Add lightweight inline editor UI helpers for editable file state and action controls in ui/src/components/ContentPanel/InlineFileEditor.tsx"
Task: "Add inline editing styles for lightweight text editing states in ui/src/App.css"
Task: "Add frontend coverage for edit mode, successful save, conflict handling, and unsaved-change warnings in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Add new-file draft controls and path entry UI in ui/src/components/ContentPanel/NewFileDraft.tsx"
Task: "Add styles for new-file draft entry and validation feedback in ui/src/App.css"
Task: "Add frontend coverage for successful file creation, immediate tree visibility, and existing-path rejection in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "Add delete-confirmation UI for the content panel in ui/src/components/ContentPanel/DeleteFileDialog.tsx"
Task: "Add styles for delete confirmation and destructive action states in ui/src/App.css"
Task: "Add frontend coverage for confirmed deletion, canceled deletion, and stale-revision delete conflicts in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the inline edit flow independently before expanding scope

### Incremental Delivery

1. Complete Setup + Foundational to establish safe file mutation infrastructure
2. Deliver User Story 1 for existing-file editing as the MVP
3. Add User Story 2 for new-file creation with immediate tree refresh
4. Add User Story 3 for safe deletion with confirmation and conflict handling
5. Finish with cross-cutting validation and cleanup

### Parallel Team Strategy

1. One developer handles server mutation infrastructure in Phase 2 while another prepares UI type/client changes from Phase 1
2. After Foundational completes:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Rejoin for polish and quickstart validation

---

## Notes

- [P] tasks are safe parallel opportunities because they target different files or follow completed shared dependencies
- Each user story phase is scoped to remain independently testable
- The suggested MVP scope is User Story 1 only
- All tasks follow the required checklist format with task ID, optional parallel marker, story label where needed, and exact file paths
