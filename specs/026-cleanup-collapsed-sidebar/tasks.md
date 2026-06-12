# Tasks: Clean Up Collapsed Sidebar

**Input**: Design documents from `specs/026-cleanup-collapsed-sidebar/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/collapsed-sidebar-ui.md, quickstart.md

**Tests**: Included because the specification and plan require automated usability and accessibility regression coverage for the collapsed rail.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current collapsed-sidebar implementation and test surfaces before changing behavior.

- [X] T001 Review the existing main viewer collapsed rail markup and handlers in `ui/src/App.tsx`
- [X] T002 [P] Review the existing one-button picker collapsed rail reference in `ui/src/components/Picker/PickerPage.tsx`
- [X] T003 [P] Review current collapsed rail tests and shortcut-button expectations in `ui/src/App.test.tsx`
- [X] T004 [P] Review sidebar rail responsive styling in `ui/src/styles/globals.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared behavior contract that all user-story work must preserve.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Map former collapsed shortcut actions to their remaining expanded-panel or main-page access paths using `specs/026-cleanup-collapsed-sidebar/contracts/collapsed-sidebar-ui.md`
- [X] T006 Confirm the `sidebarCollapsed` viewer preference remains unchanged in `ui/src/services/viewerState.ts`
- [X] T007 Identify any App-level helpers that become unused after removing collapsed shortcuts in `ui/src/App.tsx`

**Checkpoint**: Foundation ready. The implementation can remove collapsed shortcuts without removing product capability or preference behavior.

---

## Phase 3: User Story 1 - Reopen the Collapsed Sidebar (Priority: P1) MVP

**Goal**: The collapsed main viewer rail shows exactly one clear control that reopens the left side panel.

**Independent Test**: Collapse the left side panel from the main repository viewer and confirm the collapsed navigation area contains one button, no former shortcut buttons, and the single button expands the panel.

### Tests for User Story 1

- [X] T008 [US1] Update `ui/src/App.test.tsx` so the collapsed repository tree rail test expects exactly one button inside the collapsed navigation area
- [X] T009 [US1] Update `ui/src/App.test.tsx` to assert former collapsed shortcuts are absent: repository search, changed files, recent files, key documents, and current folder
- [X] T010 [US1] Update `ui/src/App.test.tsx` to assert the single collapsed rail button has the expand/open navigation accessible name and restores the repository tree

### Implementation for User Story 1

- [X] T011 [US1] Remove the collapsed-only shortcut buttons for search, changed files, recent files, key documents, and current folder from `ui/src/App.tsx`
- [X] T012 [US1] Keep a single expand/open navigation button in the collapsed main viewer rail in `ui/src/App.tsx`
- [X] T013 [US1] Remove or simplify any App-level collapsed shortcut handlers that are no longer used by the collapsed rail in `ui/src/App.tsx`
- [X] T014 [US1] Run the focused main viewer collapsed rail tests in `ui/src/App.test.tsx`

**Checkpoint**: User Story 1 is independently functional and testable as the MVP.

---

## Phase 4: User Story 2 - Preserve Access to Existing Functions (Priority: P2)

**Goal**: Removing collapsed shortcuts does not remove search, changed-files, recent-files, key-docs, current-folder, or repository browsing workflows from their normal locations.

**Independent Test**: Collapse and reopen the left panel, then confirm normal panel/main-page workflows remain reachable without relying on collapsed shortcut buttons.

### Tests for User Story 2

- [X] T015 [US2] Add or adjust assertions in `ui/src/App.test.tsx` that search remains reachable from its normal non-collapsed location after the rail shortcuts are removed
- [X] T016 [P] [US2] Add or adjust state-toggle coverage in `ui/src/App.logic.test.tsx` so initializing with `sidebarCollapsed: true` still expands back to normal navigation

### Implementation for User Story 2

- [X] T017 [US2] Preserve expanded-sidebar repository browsing and search controls while removing only collapsed rail shortcuts in `ui/src/App.tsx`
- [X] T018 [US2] Verify no product capability was removed by checking remaining references for search, changed files, recent files, key documents, and current folder in `ui/src/App.tsx`
- [X] T019 [US2] Run the focused viewer state and access tests in `ui/src/App.test.tsx` and `ui/src/App.logic.test.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently: the collapsed rail is clean, and normal workflows remain reachable.

---

## Phase 5: User Story 3 - Keep the Collapsed State Visually Intentional (Priority: P3)

**Goal**: The collapsed rail looks intentional and remains accessible and stable across common repository views and widths.

**Independent Test**: Review the collapsed state across normal and narrow widths, confirm one visible reopen control, no clipped one-letter labels, and keyboard/assistive-technology operability.

### Tests for User Story 3

- [X] T020 [US3] Add or adjust accessibility assertions for the collapsed reopen control in `ui/src/App.test.tsx`
- [X] T021 [P] [US3] Keep picker parity coverage for the existing one-button collapsed rail in `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T022 [P] [US3] Add or adjust responsive CSS coverage for sidebar rail stability in `ui/src/styles/globals.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Adjust collapsed rail classes or styling only if needed to center and stabilize the single reopen control in `ui/src/App.tsx`
- [X] T024 [US3] Adjust responsive sidebar rail styling only if needed to avoid overlap or clipped labels in `ui/src/styles/globals.css`
- [X] T025 [US3] Run focused accessibility and responsive tests in `ui/src/App.test.tsx`, `ui/src/components/Picker/PickerPage.test.tsx`, and `ui/src/styles/globals.test.ts`

**Checkpoint**: All user stories are independently functional and regression-covered.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and documentation consistency.

- [X] T026 [P] Verify no obsolete collapsed shortcut styles remain or are still referenced in `ui/src/styles/globals.css`
- [X] T027 [P] Verify no obsolete collapsed shortcut tests remain in `ui/src/App.test.tsx`
- [X] T028 Run the quickstart validation workflow from `specs/026-cleanup-collapsed-sidebar/quickstart.md`
- [X] T029 Run full project verification using the `npm run verify` script defined in `package.json`
- [X] T030 Review implementation against `specs/026-cleanup-collapsed-sidebar/contracts/collapsed-sidebar-ui.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks user story work.
- **User Story 1 (Phase 3)**: Depends on Foundational completion; recommended MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can be validated after US1 removes shortcuts.
- **User Story 3 (Phase 5)**: Depends on Foundational completion and can be finalized after the one-button rail exists.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after Phase 2.
- **User Story 2 (P2)**: Can start after Phase 2, but final validation should occur after US1 because it verifies workflows after shortcut removal.
- **User Story 3 (P3)**: Can start after Phase 2, but final visual/a11y validation should occur after US1 because it verifies the final one-button rail.

### Within Each User Story

- Update tests before implementation where behavior is changing.
- Implement the smallest UI change that satisfies the story.
- Run focused tests before moving to the next story.
- Keep each story independently demonstrable.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel during setup because they inspect different files.
- T016 can run alongside US2 implementation work once US1 behavior is known because it targets `ui/src/App.logic.test.tsx`.
- T021 and T022 can run in parallel with US3 main viewer test work because they target picker and CSS test files.
- T026 and T027 can run in parallel during polish because they inspect different files.

---

## Parallel Example: User Story 2

```text
Task: "Add or adjust assertions in ui/src/App.test.tsx that search remains reachable from its normal non-collapsed location after the rail shortcuts are removed"
Task: "Add or adjust state-toggle coverage in ui/src/App.logic.test.tsx so initializing with sidebarCollapsed: true still expands back to normal navigation"
```

---

## Parallel Example: User Story 3

```text
Task: "Add or adjust accessibility assertions for the collapsed reopen control in ui/src/App.test.tsx"
Task: "Keep picker parity coverage for the existing one-button collapsed rail in ui/src/components/Picker/PickerPage.test.tsx"
Task: "Add or adjust responsive CSS coverage for sidebar rail stability in ui/src/styles/globals.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational checks.
3. Complete Phase 3: User Story 1.
4. Stop and validate: collapsed main viewer rail has exactly one expand/open control and no shortcut buttons.

### Incremental Delivery

1. US1 cleans the visible collapsed rail regression.
2. US2 confirms normal workflows remain reachable after shortcut removal.
3. US3 hardens visual stability and accessibility.
4. Polish verifies no obsolete shortcut code/tests remain and runs full validation.

### Single-Developer Strategy

1. Work sequentially through T001-T014 for the MVP.
2. Complete T015-T019 to guard workflow preservation.
3. Complete T020-T025 for accessibility and visual stability.
4. Finish T026-T030 before opening the implementation PR.

## Notes

- [P] tasks target different files and can be handled in parallel.
- [US1], [US2], and [US3] labels map back to `specs/026-cleanup-collapsed-sidebar/spec.md`.
- Keep implementation scoped to collapsed left side panel behavior.
- Do not add new dependencies or backend/API behavior for this feature.
