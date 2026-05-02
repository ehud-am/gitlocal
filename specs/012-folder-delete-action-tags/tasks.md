# Tasks: Folder Delete Action And Compact Tags

**Input**: Design documents from `specs/012-folder-delete-action-tags/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/folder-view-actions.md, quickstart.md

**Tests**: Test tasks are included because the project constitution requires >=90% per-file coverage and the feature contract explicitly calls for UI coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current UI surfaces and test fixtures before moving behavior.

- [X] T001 Review current delete-folder entry points in `ui/src/App.tsx`, `ui/src/components/FileTree/FileTree.tsx`, `ui/src/components/FileTree/FileTreeNode.tsx`, and `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T002 [P] Review current local-only and sync tag rendering in `ui/src/components/FileTree/FileTreeNode.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/components/Search/SearchResults.tsx`, and `ui/src/components/ui/meta-tag.tsx`
- [X] T003 [P] Review existing folder delete and tag test coverage in `ui/src/App.test.tsx`, `ui/src/App.branch-coverage.test.tsx`, `ui/src/components/FileTree/FileTree.test.tsx`, and `ui/src/components/ContentPanel/ContentPanel.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared UI semantics before story work begins.

**CRITICAL**: No user story implementation should begin until these shared decisions are reflected in tests or helpers.

- [X] T004 Define the main-view delete-folder eligibility rules from `specs/012-folder-delete-action-tags/contracts/folder-view-actions.md` in comments or test names in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T005 Define compact local-only tag expectations from `specs/012-folder-delete-action-tags/contracts/folder-view-actions.md` in test names or assertions in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T006 [P] Confirm no backend API contract changes are needed by reviewing `ui/src/services/api.ts` and `ui/src/types/index.ts`

**Checkpoint**: Foundation ready. User stories can now be implemented independently.

---

## Phase 3: User Story 1 - Delete Folder From Main View (Priority: P1) MVP

**Goal**: Users delete folders from the main folder view action area, not from the left-panel x icon.

**Independent Test**: Open a deletable folder, verify the left panel has no delete-folder x icon, verify the main folder view shows the delete-folder action, and verify activating it opens the existing typed confirmation flow.

### Tests for User Story 1

- [X] T007 [P] [US1] Add or update a FileTree test proving folder rows no longer render the delete-folder x icon in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T008 [P] [US1] Add a ContentPanel test proving a deletable folder shows a main-view delete-folder action near create actions in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T009 [P] [US1] Add a ContentPanel test proving repository root and file views do not show the folder delete action in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T010 [P] [US1] Add an App integration test proving the main-view delete-folder action opens the existing preview and typed confirmation flow in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [X] T011 [US1] Remove the delete-folder x button rendering and related click handling from `ui/src/components/FileTree/FileTreeNode.tsx`
- [X] T012 [US1] Remove left-panel delete-folder prop plumbing from `ui/src/components/FileTree/FileTree.tsx`
- [X] T013 [US1] Add main-view delete-folder action rendering for deletable folder views in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T014 [US1] Wire the ContentPanel delete-folder action to the existing `onDeleteFolder` callback in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T015 [US1] Update App-to-ContentPanel props so folder deletion is initiated from the main view and no longer from the FileTree in `ui/src/App.tsx`
- [X] T016 [US1] Update App branch-coverage mocks and expectations for the moved delete-folder callback in `ui/src/App.branch-coverage.test.tsx`

**Checkpoint**: User Story 1 is complete when the moved delete action works independently and the left-panel delete icon is gone.

---

## Phase 4: User Story 2 - Recognize Destructive Folder Action (Priority: P2)

**Goal**: The main-view delete-folder action is visually distinct as destructive using red text and a red border.

**Independent Test**: View a deletable folder and confirm the delete-folder action uses alert outline styling while create actions keep normal styling.

### Tests for User Story 2

- [X] T017 [P] [US2] Add a ContentPanel test asserting the delete-folder action has destructive outline styling or a stable destructive variant class in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T018 [P] [US2] Add or update a button style test for the destructive outline variant in `ui/src/components/ui/button.test.tsx`

### Implementation for User Story 2

- [X] T019 [US2] Add or reuse a destructive outline button variant with red text and red border in `ui/src/components/ui/button.tsx`
- [X] T020 [US2] Apply the destructive outline button style to the main delete-folder action in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T021 [US2] Add any needed destructive outline styling tokens or classes in `ui/src/styles/globals.css`

**Checkpoint**: User Story 2 is complete when the main delete-folder action is visually destructive without altering the confirmation flow.

---

## Phase 5: User Story 3 - Scan Smaller Left-Panel Tags (Priority: P3)

**Goal**: Left-panel status tags are shorter and smaller while preserving meaning and readability.

**Independent Test**: View left-panel rows with status tags, confirm local-only displays as `local`, and confirm compact tags do not crowd row names.

### Tests for User Story 3

- [X] T022 [P] [US3] Update FileTree tests to expect the local-only tag label `local` instead of `local only` in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T023 [P] [US3] Update ContentPanel directory-row tests to expect local-only tag label `local` where folder rows mirror left-panel tag wording in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T024 [P] [US3] Update SearchResults tests only if shared compact tag wording changes search result local-only labels in `ui/src/components/Search/SearchResults.test.tsx`
- [X] T025 [P] [US3] Update MetaTag tests to assert compact tag sizing remains smaller and readable in `ui/src/components/ui/meta-tag.test.tsx`

### Implementation for User Story 3

- [X] T026 [US3] Change left-panel local-only tag text from `Local only` to `local` in `ui/src/components/FileTree/FileTreeNode.tsx`
- [X] T027 [US3] Change matching local-only tag text in folder directory rows from `Local only` to `local` in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T028 [US3] Adjust compact tag sizing for left-panel readability in `ui/src/components/ui/meta-tag.tsx`
- [X] T029 [US3] Adjust compact tag CSS spacing and font sizing in `ui/src/styles/globals.css`
- [X] T030 [US3] Verify other status tags from `ui/src/lib/sync.ts` remain understandable after compact styling

**Checkpoint**: User Story 3 is complete when compact tags retain status meaning and improve left-panel scanability.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and regression checks.

- [X] T031 [P] Update feature quickstart notes with any implementation-specific validation findings in `specs/012-folder-delete-action-tags/quickstart.md`
- [X] T032 [P] Update README only if user-facing folder action documentation changes in `README.md`
- [X] T033 Run the full quickstart validation flow from `specs/012-folder-delete-action-tags/quickstart.md`
- [X] T034 Run `npm test` and fix any coverage or regression failures
- [X] T035 Run `npm run build` and fix any type or bundling failures
- [X] T036 Run `npm run verify` before merge or release readiness review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 completion and blocks user-story work.
- **User Story 1 (Phase 3)**: Depends on Phase 2 and is the MVP.
- **User Story 2 (Phase 4)**: Depends on the main delete action from US1.
- **User Story 3 (Phase 5)**: Depends on Phase 2 only and can run independently from US1/US2 after shared tag expectations are clear.
- **Polish (Phase 6)**: Depends on the selected user stories being complete.

### User Story Dependencies

- **US1 - Delete Folder From Main View**: Required MVP; no dependency on other user stories after Phase 2.
- **US2 - Recognize Destructive Folder Action**: Depends on US1 because the button must exist before styling can be finalized.
- **US3 - Scan Smaller Left-Panel Tags**: Independent after Phase 2; can be implemented in parallel with US1.

### Within Each User Story

- Tests should be added or updated before implementation where practical.
- For US1, remove left-panel behavior before final App integration to avoid duplicate delete entry points.
- For US2, establish the reusable button style before applying it to the delete-folder action.
- For US3, update label assertions before changing component text and compact styling.

### Parallel Opportunities

- T002 and T003 can run in parallel with T001.
- T006 can run in parallel with T004 and T005.
- T007, T008, T009, and T010 can run in parallel.
- T017 and T018 can run in parallel.
- T022, T023, T024, and T025 can run in parallel.
- US3 implementation can proceed in parallel with US1 after Phase 2 because it touches tag labels and compact styling rather than delete flow placement.
- T031 and T032 can run in parallel during polish.

---

## Parallel Example: User Story 1

```text
Task: "T007 [P] [US1] Add or update a FileTree test proving folder rows no longer render the delete-folder x icon in ui/src/components/FileTree/FileTree.test.tsx"
Task: "T008 [P] [US1] Add a ContentPanel test proving a deletable folder shows a main-view delete-folder action near create actions in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T009 [P] [US1] Add a ContentPanel test proving repository root and file views do not show the folder delete action in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T010 [P] [US1] Add an App integration test proving the main-view delete-folder action opens the existing preview and typed confirmation flow in ui/src/App.test.tsx"
```

---

## Parallel Example: User Story 3

```text
Task: "T022 [P] [US3] Update FileTree tests to expect the local-only tag label local instead of local only in ui/src/components/FileTree/FileTree.test.tsx"
Task: "T023 [P] [US3] Update ContentPanel directory-row tests to expect local-only tag label local where folder rows mirror left-panel tag wording in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T025 [P] [US3] Update MetaTag tests to assert compact tag sizing remains smaller and readable in ui/src/components/ui/meta-tag.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup review.
2. Complete Phase 2 foundational expectations.
3. Complete Phase 3 User Story 1.
4. Stop and validate: the delete-folder action appears in the main folder view, opens the existing confirmation, and no left-panel x icon remains.

### Incremental Delivery

1. Deliver US1 as the behavior change MVP.
2. Add US2 to make the moved destructive action visually unmistakable.
3. Add US3 to reduce left-panel tag visual noise.
4. Run quickstart and full verification before merge.
