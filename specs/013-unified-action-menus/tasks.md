# Tasks: Unified Action Menus

**Input**: Design documents from `specs/013-unified-action-menus/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/action-menus.md, quickstart.md

**Tests**: Test tasks are included because the feature contract calls for UI coverage and the project constitution requires >=90% per-file branch coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current action surfaces, reusable menu primitive, and delete confirmation contracts before changing behavior.

- [X] T001 Review current picker folder action menu trigger and setup commands in `ui/src/components/Picker/PickerPage.tsx`
- [X] T002 [P] Review current file and git folder action entry points in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T003 [P] Review current file delete confirmation behavior in `ui/src/components/ContentPanel/DeleteFileDialog.tsx`
- [X] T004 [P] Review current folder delete confirmation behavior in `ui/src/components/AppDialogs.tsx`
- [X] T005 [P] Review shared dropdown menu styling and destructive menu styles in `ui/src/components/ui/dropdown-menu.tsx` and `ui/src/styles/globals.css`
- [X] T006 [P] Review current tests for picker actions, content actions, and delete dialogs in `ui/src/components/Picker/PickerPage.test.tsx`, `ui/src/components/ContentPanel/ContentPanel.test.tsx`, and `ui/src/App.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared menu semantics and helper expectations that all user stories depend on.

**CRITICAL**: No user story implementation should begin until the shared menu and target-name rules are clear.

- [X] T007 Define a reusable action-menu trigger label convention in test names or helper assertions in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T008 [P] Define picker menu availability expectations from `specs/013-unified-action-menus/contracts/action-menus.md` in `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T009 [P] Define delete confirmation exact-name matching expectations from `specs/013-unified-action-menus/contracts/action-menus.md` in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T010 Confirm no backend file delete API change is required by reviewing delete call usage in `ui/src/services/api.ts` and `src/handlers/files.ts`

**Checkpoint**: Foundation ready. User stories can now be implemented independently where file ownership allows.

---

## Phase 3: User Story 1 - Use One Action Menu Pattern (Priority: P1) MVP

**Goal**: Non-git folder setup actions, file optional actions, and git folder optional actions all use a consistent three-dots action menu.

**Independent Test**: View a non-git folder in the picker, a file in the content panel, and a git folder in the content panel; each optional command surface opens from a three-dots menu, not a cog icon or standalone button row, and existing non-destructive commands remain available.

### Tests for User Story 1

- [X] T011 [P] [US1] Update picker tests to expect a three-dots folder actions trigger instead of a setup cog icon in `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T012 [P] [US1] Update picker tests to verify create subfolder, run git init, clone into subfolder, and open repository remain available from the menu in `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T013 [P] [US1] Update content panel tests to verify git folder create-file and create-folder actions are menu items instead of standalone buttons in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T014 [P] [US1] Update content panel tests to verify file actions keep the same three-dots trigger naming and behavior as folder actions in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T015 [P] [US1] Add a content panel test proving empty action menus are hidden when no optional commands are available in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T016 [P] [US1] Add an app integration test proving existing create file and create folder flows still launch from the git folder menu in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [X] T017 [US1] Replace the picker cog trigger icon with the shared three-dots trigger affordance and target-specific aria label in `ui/src/components/Picker/PickerPage.tsx`
- [X] T018 [US1] Keep picker setup commands inside the three-dots menu and hide the trigger when no picker folder actions are available in `ui/src/components/Picker/PickerPage.tsx`
- [X] T019 [US1] Move git folder create-file, create-folder, and delete-folder action rendering from standalone buttons into a three-dots menu in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T020 [US1] Preserve git folder create-file and create-folder callbacks after moving them into menu items in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T021 [US1] Align file and folder action trigger class names and aria labels without changing file view/edit/raw behavior in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T022 [US1] Add or adjust shared menu trigger spacing so file, git folder, and picker menus remain visually aligned in `ui/src/styles/globals.css`
- [X] T023 [US1] Update App branch-coverage mocks for the moved folder create and delete menu entry points in `ui/src/App.branch-coverage.test.tsx`

**Checkpoint**: User Story 1 is complete when all optional command entry points use the three-dots menu pattern and existing safe commands still work.

---

## Phase 4: User Story 2 - Recognize Destructive Actions (Priority: P2)

**Goal**: Delete actions inside any action menu use red text while non-destructive options keep normal menu styling.

**Independent Test**: Open action menus that include delete file and delete folder; each delete item is red text, and setup/create/view/edit items are not styled as destructive.

### Tests for User Story 2

- [X] T024 [P] [US2] Add a content panel test asserting delete file uses the `dropdown-danger` styling in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T025 [P] [US2] Add a content panel test asserting delete folder uses the `dropdown-danger` styling after moving into the folder menu in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T026 [P] [US2] Add a content panel test asserting create file, create folder, view raw, and edit file menu items do not use destructive styling in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T027 [P] [US2] Add or update dropdown danger style assertions for focus and normal states in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 2

- [X] T028 [US2] Apply `dropdown-danger` to the moved delete-folder menu item in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T029 [US2] Confirm delete-file keeps `dropdown-danger` after trigger alignment in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T030 [US2] Refine `.dropdown-danger` color and focus styles if needed so destructive items remain red text without changing non-destructive menu items in `ui/src/styles/globals.css`

**Checkpoint**: User Story 2 is complete when destructive actions are visually distinct in every action menu and safe actions retain normal styling.

---

## Phase 5: User Story 3 - Confirm File And Folder Deletes By Typing The Name (Priority: P3)

**Goal**: File and folder delete confirmations require typing the exact displayed target name before deletion can proceed, while folder delete impact and stale-preview safety remain intact.

**Independent Test**: Start deleting a file and a folder; each confirmation shows name and location, blocks mismatched typed values, enables the final delete only on exact match, and cancel leaves content unchanged.

### Tests for User Story 3

- [X] T031 [P] [US3] Add a DeleteFileDialog test or ContentPanel test proving file delete shows the file name and containing location in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T032 [P] [US3] Add a file delete test proving the final delete button is disabled until the exact file name is typed in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T033 [P] [US3] Add a file delete test proving exact matching is case-sensitive and includes spaces, punctuation, and file extensions in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T034 [P] [US3] Add an app integration test proving cancelling file delete after typing leaves the file unchanged in `ui/src/App.test.tsx`
- [X] T035 [P] [US3] Update folder delete tests to verify the folder confirmation shows name, containing location, and recursive impact information after being launched from the menu in `ui/src/App.test.tsx`
- [X] T036 [P] [US3] Update folder delete tests to verify repository root deletion remains unavailable in the folder action menu in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 3

- [X] T037 [US3] Add typed confirmation state and exact display-name matching to file delete mode in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T038 [US3] Update DeleteFileDialog props and rendering to show target name, containing location, typed confirmation input, and disabled final delete behavior in `ui/src/components/ContentPanel/DeleteFileDialog.tsx`
- [X] T039 [US3] Reset file delete typed confirmation state when opening, cancelling, completing, or leaving delete mode in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T040 [US3] Preserve folder delete typed-name confirmation, file count, folder count, stale-preview failure, and filesystem error behavior in `ui/src/components/AppDialogs.tsx`
- [X] T041 [US3] Update any type signatures needed for file delete confirmation props in `ui/src/components/ContentPanel/DeleteFileDialog.tsx` and `ui/src/components/ContentPanel/ContentPanel.tsx`

**Checkpoint**: User Story 3 is complete when every file and folder delete path requires exact typed-name confirmation and existing folder delete safety is unchanged.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and regression checks across all stories.

- [X] T042 [P] Update quickstart notes with implementation-specific validation findings in `specs/013-unified-action-menus/quickstart.md`
- [X] T043 [P] Update README only if user-facing action menu or delete confirmation documentation changes in `README.md`
- [X] T044 Run the full quickstart validation flow from `specs/013-unified-action-menus/quickstart.md`
- [X] T045 Run `npm test` from `package.json` and fix any coverage or regression failures
- [X] T046 Run `npm run build` from `package.json` and fix any type or bundling failures
- [X] T047 Run `npm run verify` from `package.json` before merge or release readiness review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 completion and blocks user-story work.
- **User Story 1 (Phase 3)**: Depends on Phase 2 and is the MVP.
- **User Story 2 (Phase 4)**: Depends on US1 because delete folder must be moved into the menu before final destructive styling can be verified.
- **User Story 3 (Phase 5)**: Depends on US1 for folder delete launch location, but file delete confirmation work can begin after Phase 2.
- **Polish (Phase 6)**: Depends on the selected user stories being complete.

### User Story Dependencies

- **US1 - Use One Action Menu Pattern**: Required MVP; no dependency on US2 or US3 after Phase 2.
- **US2 - Recognize Destructive Actions**: Depends on US1 for the moved folder delete menu item.
- **US3 - Confirm File And Folder Deletes By Typing The Name**: Partially depends on US1 for menu-launched folder delete; file delete confirmation can be implemented independently after Phase 2.

### Within Each User Story

- Tests should be added or updated before implementation where practical.
- For US1, move folder actions into the menu before removing assumptions that standalone buttons exist.
- For US2, assert destructive and non-destructive menu item styling before CSS refinements.
- For US3, add typed-name tests before changing `DeleteFileDialog` behavior.

### Parallel Opportunities

- T002, T003, T004, T005, and T006 can run in parallel with T001.
- T008 and T009 can run in parallel before T010 finalizes backend scope.
- T011, T012, T013, T014, T015, and T016 can run in parallel.
- T024, T025, T026, and T027 can run in parallel.
- T031, T032, T033, T034, T035, and T036 can run in parallel.
- File delete confirmation tasks T037, T038, T039, and T041 can proceed while T040 verifies folder delete preservation, as long as shared files are coordinated.
- T042 and T043 can run in parallel during polish.

---

## Parallel Example: User Story 1

```text
Task: "T011 [P] [US1] Update picker tests to expect a three-dots folder actions trigger instead of a setup cog icon in ui/src/components/Picker/PickerPage.test.tsx"
Task: "T013 [P] [US1] Update content panel tests to verify git folder create-file and create-folder actions are menu items instead of standalone buttons in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T015 [P] [US1] Add a content panel test proving empty action menus are hidden when no optional commands are available in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T016 [P] [US1] Add an app integration test proving existing create file and create folder flows still launch from the git folder menu in ui/src/App.test.tsx"
```

---

## Parallel Example: User Story 2

```text
Task: "T024 [P] [US2] Add a content panel test asserting delete file uses the dropdown-danger styling in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T025 [P] [US2] Add a content panel test asserting delete folder uses the dropdown-danger styling after moving into the folder menu in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T026 [P] [US2] Add a content panel test asserting create file, create folder, view raw, and edit file menu items do not use destructive styling in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

---

## Parallel Example: User Story 3

```text
Task: "T031 [P] [US3] Add a DeleteFileDialog test or ContentPanel test proving file delete shows the file name and containing location in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T032 [P] [US3] Add a file delete test proving the final delete button is disabled until the exact file name is typed in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T035 [P] [US3] Update folder delete tests to verify the folder confirmation shows name, containing location, and recursive impact information after being launched from the menu in ui/src/App.test.tsx"
Task: "T036 [P] [US3] Update folder delete tests to verify repository root deletion remains unavailable in the folder action menu in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup review.
2. Complete Phase 2 foundational expectations.
3. Complete Phase 3 User Story 1.
4. Stop and validate: non-git folder, file, and git folder optional commands all use the same three-dots menu pattern.

### Incremental Delivery

1. Deliver US1 as the consistency MVP.
2. Add US2 so destructive menu items are visibly distinct everywhere.
3. Add US3 so file and folder deletion share exact typed-name confirmation.
4. Run quickstart and full verification before merge.

### Parallel Team Strategy

1. One developer owns picker menu updates in `ui/src/components/Picker/PickerPage.tsx` and `ui/src/components/Picker/PickerPage.test.tsx`.
2. One developer owns content panel menu placement and styling in `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/components/ContentPanel/ContentPanel.test.tsx`, and `ui/src/styles/globals.css`.
3. One developer owns delete confirmation updates in `ui/src/components/ContentPanel/DeleteFileDialog.tsx`, `ui/src/components/AppDialogs.tsx`, `ui/src/App.test.tsx`, and related tests.
