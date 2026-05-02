# Tasks: Folder Create And Delete

**Input**: Design documents from `specs/011-folder-create-delete/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/folder-operations.md](./contracts/folder-operations.md), [quickstart.md](./quickstart.md)

**Tests**: Included because the feature mutates local filesystem content and the project constitution requires >=90% per-file branch coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or depends only on completed foundation tasks
- **[Story]**: User story label, required only for user story phases
- Every task includes an exact repository-relative file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current repository surfaces and tests that folder operations will extend.

- [X] T001 Inspect existing working-tree mutation helpers in `src/git/repo.ts`
- [X] T002 [P] Inspect existing manual file operation handlers in `src/handlers/files.ts`
- [X] T003 [P] Inspect existing API route registration in `src/server.ts`
- [X] T004 [P] Inspect existing folder tree and directory UI flows in `ui/src/App.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`, and `ui/src/components/FileTree/FileTreeNode.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared folder operation types, server routes, and repository-safe helpers required by all user stories.

**Critical**: No user story work should begin until these shared contracts and helpers exist.

- [X] T005 Add folder operation request, preview, result, and status types in `src/types.ts`
- [X] T006 Mirror folder operation request, preview, result, and status types in `ui/src/types/index.ts`
- [X] T007 Implement repository-relative folder name validation helper in `src/git/repo.ts`
- [X] T008 Implement safe folder target resolution and parent-folder validation helpers in `src/git/repo.ts`
- [X] T009 Add folder route placeholders and imports for create, preview-delete, and delete handlers in `src/server.ts`
- [X] T010 Add API client methods for `POST /api/folder`, `GET /api/folder/delete-preview`, and `DELETE /api/folder` in `ui/src/services/api.ts`
- [X] T011 [P] Add baseline backend tests for shared folder validation helpers in `tests/unit/git/repo.test.ts`
- [X] T012 Add baseline UI API type coverage for folder operation methods in `ui/src/services/api.ts`

**Checkpoint**: Shared types, routes, API methods, and safe path primitives are ready for story implementation.

---

## Phase 3: User Story 1 - Create a Subfolder (Priority: P1) MVP

**Goal**: Users can create one direct child folder inside the repository folder they are currently viewing.

**Independent Test**: Open a repository folder, create a valid new subfolder, confirm it appears in that folder without manual refresh, and confirm invalid names or duplicates are blocked.

### Tests for User Story 1

- [X] T013 [US1] Add backend create-folder success and duplicate-name tests in `tests/unit/handlers/files.test.ts`
- [X] T014 [US1] Add backend invalid-name, nested-path, absolute-path, traversal, missing-parent, and non-folder-parent tests in `tests/unit/handlers/files.test.ts`
- [X] T015 [P] [US1] Add integration coverage for `POST /api/folder` and refreshed `GET /api/tree` behavior in `tests/integration/server.test.ts`
- [X] T016 [P] [US1] Add UI tests for create-folder controls and validation feedback in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [X] T017 [US1] Implement `createWorkingTreeFolder` helper using safe repository-boundary checks in `src/git/repo.ts`
- [X] T018 [US1] Implement `createFolderHandler` for `POST /api/folder` in `src/handlers/files.ts`
- [X] T019 [US1] Register `POST /api/folder` with `createFolderHandler` in `src/server.ts`
- [X] T020 [US1] Add create-folder mutation wiring and query refresh behavior in `ui/src/App.tsx`
- [X] T021 [US1] Add create-folder dialog or inline control for the current folder view in `ui/src/components/AppDialogs.tsx`
- [X] T022 [US1] Add create-folder action entry point in the folder content view in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T023 [US1] Surface create-folder validation and success messages in `ui/src/App.tsx`

**Checkpoint**: User Story 1 is fully functional and independently testable as the MVP.

---

## Phase 4: User Story 2 - Delete a Folder With Strong Confirmation (Priority: P2)

**Goal**: Users can delete a selected subfolder and its contents only after viewing impact details and typing the exact folder name.

**Independent Test**: Open a folder containing nested content, start deletion, review the warning and file count, verify the final action is disabled until the exact folder name is typed, confirm deletion, and verify the folder is gone while the parent remains.

### Tests for User Story 2

- [X] T024 [US2] Add backend delete-preview tests for recursive tracked, untracked, ignored, hidden, and nested file counts in `tests/unit/handlers/files.test.ts`
- [X] T025 [US2] Add backend delete confirmation tests for exact-name matching, mismatch blocking, stale-folder revalidation, and repository-root blocking in `tests/unit/handlers/files.test.ts`
- [X] T026 [P] [US2] Add integration coverage for `GET /api/folder/delete-preview`, `DELETE /api/folder`, and refreshed parent tree behavior in `tests/integration/server.test.ts`
- [X] T027 [P] [US2] Add UI tests for delete dialog warning text, file count display, exact-name enablement, cancel behavior, and parent refresh in `ui/src/App.test.tsx`

### Implementation for User Story 2

- [X] T028 [US2] Implement recursive folder impact counting helper in `src/git/repo.ts`
- [X] T029 [US2] Implement recursive `deleteWorkingTreeFolder` helper with post-delete verification in `src/git/repo.ts`
- [X] T030 [US2] Implement `folderDeletePreviewHandler` for `GET /api/folder/delete-preview` in `src/handlers/files.ts`
- [X] T031 [US2] Implement `deleteFolderHandler` for `DELETE /api/folder` in `src/handlers/files.ts`
- [X] T032 [US2] Register delete-preview and delete-folder routes in `src/server.ts`
- [X] T033 [US2] Add delete preview and delete mutations with parent navigation behavior in `ui/src/App.tsx`
- [X] T034 [US2] Build the typed folder deletion confirmation dialog in `ui/src/components/AppDialogs.tsx`
- [X] T035 [US2] Add delete-folder action entry points for valid folder rows in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T036 [US2] Add delete-folder action entry points for valid tree folder nodes in `ui/src/components/FileTree/FileTreeNode.tsx`
- [X] T037 [US2] Ensure successful delete invalidates tree, content, sync, and selected-path queries in `ui/src/App.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently, with deletion protected by typed confirmation.

---

## Phase 5: User Story 3 - Understand Delete Impact Before Confirming (Priority: P3)

**Goal**: The delete confirmation clearly communicates folder identity, location, recursive file count, and zero-file cases before confirmation.

**Independent Test**: Open deletion confirmation for folders with nested files, duplicate folder names in different parents, and empty folders; verify the displayed identity and counts match the selected folder before any deletion request can be sent.

### Tests for User Story 3

- [X] T038 [P] [US3] Add backend preview tests for empty folders and duplicate folder names in different parents in `tests/unit/handlers/files.test.ts`
- [X] T039 [P] [US3] Add UI tests for folder location disambiguation, zero-file wording, and stale preview refresh messaging in `ui/src/App.test.tsx`

### Implementation for User Story 3

- [X] T040 [US3] Refine delete preview response messages for empty folders, nested folders, and duplicate-name location context in `src/handlers/files.ts`
- [X] T041 [US3] Render folder path, exact required name, file count, folder count, and zero-file wording in `ui/src/components/AppDialogs.tsx`
- [X] T042 [US3] Add stale-preview loading, refresh, and error states to the delete dialog flow in `ui/src/App.tsx`
- [X] T043 [US3] Ensure folder action labels and tooltips distinguish create and delete actions in `ui/src/components/ContentPanel/ContentPanel.tsx` and `ui/src/components/FileTree/FileTreeNode.tsx`

**Checkpoint**: All user stories are independently functional and the destructive confirmation is understandable before the user confirms.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify coverage, quality, and end-to-end behavior across the complete feature.

- [X] T044 [P] Add any missing branch coverage for folder helper failure paths in `tests/unit/git/repo.test.ts`
- [X] T045 [P] Add any missing branch coverage for folder operation handler failures in `tests/unit/handlers/files.test.ts`
- [X] T046 [P] Add any missing UI branch coverage for dialog and mutation error states in `ui/src/App.branch-coverage.test.tsx`
- [X] T047 Run the quickstart validation flow and record any spec drift in `specs/011-folder-create-delete/quickstart.md`
- [X] T048 Run `npm test` and address coverage failures in `tests/unit/git/repo.test.ts`, `tests/unit/handlers/files.test.ts`, and `ui/src/App.test.tsx`
- [X] T049 Run `npm run lint` and fix TypeScript errors in `src/types.ts`, `src/handlers/files.ts`, `src/git/repo.ts`, `ui/src/types/index.ts`, and `ui/src/App.tsx`
- [X] T050 Run `npm run build` and fix build issues in `src/server.ts`, `ui/src/services/api.ts`, and `ui/src/components/AppDialogs.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and can be implemented after or alongside US1, but the full folder-management experience needs US1 and US2 together.
- **User Story 3 (Phase 5)**: Depends on US2 because it refines the delete preview and confirmation flow.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 - Create a Subfolder**: Starts after Phase 2; no dependency on other stories.
- **US2 - Delete a Folder With Strong Confirmation**: Starts after Phase 2; can be built independently from create-folder, but shares foundational folder operation types and helpers.
- **US3 - Understand Delete Impact Before Confirming**: Starts after US2 delete preview and dialog basics exist.

### Within Each User Story

- Tests should be written first and fail before implementation.
- Server helper tasks precede handler tasks.
- Handler tasks precede route registration and UI integration.
- UI mutation wiring precedes detailed dialog/control polish.
- Each story reaches its checkpoint before moving to the next priority.

---

## Parallel Opportunities

- Setup tasks T002, T003, and T004 can run in parallel after T001 begins.
- Foundational backend validation helper tests T011 can run in parallel with route and API setup after the shared type shape is clear.
- US1 integration and UI tests T015 and T016 can run in parallel while backend handler tests T013 and T014 are coordinated in the same file.
- US2 integration and UI tests T026 and T027 can run in parallel while backend handler tests T024 and T025 are coordinated in the same file.
- US3 test tasks T038 and T039 can run in parallel.
- Polish coverage tasks T044, T045, and T046 can run in parallel.

## Parallel Example: User Story 1

```text
Task: "T015 [P] [US1] Add integration coverage for POST /api/folder and refreshed GET /api/tree behavior in tests/integration/server.test.ts"
Task: "T016 [P] [US1] Add UI tests for create-folder controls and validation feedback in ui/src/App.test.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T026 [P] [US2] Add integration coverage for GET /api/folder/delete-preview, DELETE /api/folder, and refreshed parent tree behavior in tests/integration/server.test.ts"
Task: "T027 [P] [US2] Add UI tests for delete dialog warning text, file count display, exact-name enablement, cancel behavior, and parent refresh in ui/src/App.test.tsx"
```

## Parallel Example: User Story 3

```text
Task: "T038 [P] [US3] Add backend preview tests for empty folders and duplicate folder names in different parents in tests/unit/handlers/files.test.ts"
Task: "T039 [P] [US3] Add UI tests for folder location disambiguation, zero-file wording, and stale preview refresh messaging in ui/src/App.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup review.
2. Complete Phase 2 shared folder types, routes, API methods, and safe path helpers.
3. Complete Phase 3 create-folder tests and implementation.
4. Stop and validate User Story 1 independently.

### Incremental Delivery

1. Deliver US1 so users can create subfolders from GitLocal.
2. Deliver US2 so users can delete subfolders with typed confirmation.
3. Deliver US3 to harden delete impact communication and edge-case clarity.
4. Run polish, coverage, lint, build, and quickstart validation.

### Notes

- `[P]` tasks are candidates for parallel execution only when assigned to separate files or when the same-file edits can be coordinated deliberately.
- Preserve the existing manual file operation behavior while adding folder operations.
- Avoid deleting repository root through any helper, handler, route, or UI action.
- Keep all committed documentation paths repository-relative.
