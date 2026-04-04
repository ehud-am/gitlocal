# Tasks: Editor Workspace, Folder-First Main View, and Markdown Comment Hiding

**Input**: Design documents from `specs/007-editor-empty-repo/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include targeted backend and frontend tests because the plan, contracts, quickstart, and project constitution require coverage-preserving validation for repository metadata, folder-list behavior, editor layout, and rendered markdown behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g. `US1`, `US2`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared client/server types and feature documentation touchpoints for the refreshed content-panel behavior.

- [X] T001 Add the refreshed folder-first content-panel state shapes to `src/types.ts`
- [X] T002 [P] Mirror the refreshed content-panel and directory-entry state shapes in `ui/src/types/index.ts`
- [X] T003 [P] Update repository info and folder-view API typing in `ui/src/services/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared repository metadata and directory-view plumbing that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Extend repository metadata helpers for commit detection, root-entry counting, and folder-first defaults in `src/git/repo.ts`
- [X] T005 Add or refine directory-list retrieval for immediate child entries in `src/git/tree.ts`
- [X] T006 Expose enriched repository metadata and directory-list responses in `src/handlers/git.ts`
- [X] T007 Wire repository metadata and directory-list data through the viewer state flow in `ui/src/App.tsx`
- [X] T008 Create a reusable main-panel directory-list rendering path in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T009 [P] Add backend coverage for repository metadata and directory-list behavior in `tests/unit/git/repo.test.ts`
- [X] T010 [P] Add handler coverage for repository info, README lookup, and folder-list responses in `tests/unit/handlers/git.test.ts`
- [X] T011 [P] Add integration coverage for repository metadata and folder-list contracts in `tests/integration/server.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Edit comfortably in-place (Priority: P1) 🎯 MVP

**Goal**: Make the inline editor use the available content area much more effectively while keeping controls visible and understandable.

**Independent Test**: Open an existing file in edit mode on a desktop-sized window and verify that the editing surface expands to fill most of the available content area while keeping save and cancel actions visible and usable.

### Implementation for User Story 1

- [X] T012 [P] [US1] Restructure the inline editor header and editing surface for a wider, taller layout in `ui/src/components/ContentPanel/InlineFileEditor.tsx`
- [X] T013 [US1] Update content-panel edit-mode composition to support the expanded editor workspace in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T014 [P] [US1] Adjust editor, toolbar, and content-panel sizing rules for desktop-first expansion in `ui/src/App.css`
- [X] T015 [P] [US1] Add frontend coverage for expanded edit layout, action visibility, and responsive fallback behavior in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 1 should be independently functional and testable

---

## Phase 4: User Story 2 - Land gracefully in an empty repository (Priority: P2)

**Goal**: Make no-README repositories feel intentional and understandable while distinguishing freshly initialized repositories from populated repositories that simply lack a README.

**Independent Test**: Open a local repository that has been initialized but has no README file and verify that the primary content area explains the repository state clearly instead of looking broken or unfinished.

### Implementation for User Story 2

- [X] T016 [US2] Implement no-README and freshly initialized repository state classification in `ui/src/App.tsx`
- [X] T017 [US2] Update the content-panel empty-repository and missing-README messaging around the folder-first main view in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T018 [P] [US2] Refine empty-repository and missing-README presentation styles in `ui/src/App.css`
- [X] T019 [P] [US2] Add app-level coverage for empty-repository versus missing-README classification in `ui/src/App.test.tsx`
- [X] T020 [P] [US2] Add content-panel coverage for intentional no-README and empty-repository messaging in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 2 should be independently functional and testable

---

## Phase 5: User Story 4 - Browse folders in the content area (Priority: P2)

**Goal**: Let users browse selected folders directly in the main content area with a familiar list presentation and clear open actions.

**Independent Test**: Open a folder from the tree and verify the content panel lists child files and folders in the same general style as the non-git folder browser, allows activation with an `Open` button, and supports double-click navigation.

### Implementation for User Story 4

- [X] T021 [US4] Implement selected-folder content rendering with per-row open actions in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T022 [P] [US4] Apply non-git-browser-inspired row layout and empty-folder styles in `ui/src/App.css`
- [X] T023 [P] [US4] Add content-panel coverage for selected-folder list rendering, open buttons, double-click navigation, and empty-folder messaging in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T024 [P] [US4] Add app-level coverage for opening files and folders from the main-panel directory view in `ui/src/App.test.tsx`

**Checkpoint**: User Story 4 should be independently functional and testable

---

## Phase 6: User Story 3 - Recover quickly from the default landing state (Priority: P3)

**Goal**: Make the default or reset state immediately useful by showing the current folder contents in the main panel instead of a custom recovery screen.

**Independent Test**: Open a repository in the default landing state and confirm that the main view shows the current folder contents in a list layout that lets the user open files or folders immediately.

### Implementation for User Story 3

- [X] T025 [US3] Replace the prior main-panel recovery experience with the current-folder fallback list in `ui/src/App.tsx`
- [X] T026 [US3] Remove the dedicated recovery-panel rendering path from `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T027 [P] [US3] Add app-level coverage for repo-switch resets falling back to the current folder list in `ui/src/App.test.tsx`
- [X] T028 [P] [US3] Add content-panel coverage confirming no custom recovery panel appears in the main view in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 3 should be independently functional and testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish rendered-markdown behavior, verify cross-story polish, and run full validation.

- [X] T029 Implement rendered-markdown comment suppression while preserving raw-source fidelity in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T030 [P] Add rendered-markdown coverage for hidden comments in rendered mode and visible comments in raw mode in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T031 Review content-panel copy, row labels, and layout consistency across empty, folder, and edit states in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [ ] T032 [P] Run the validation flow captured in `specs/007-editor-empty-repo/quickstart.md` and update any follow-up notes in `specs/007-editor-empty-repo/quickstart.md`
- [X] T033 [P] Run full verification for the feature with `npm test`, `npm run lint`, and `npm run build` from `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion
- **User Story 4 (Phase 5)**: Depends on Foundational completion
- **User Story 3 (Phase 6)**: Depends on Foundational completion and benefits from the folder-list behavior delivered in User Story 4
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational - no dependency on other stories
- **User Story 4 (P2)**: Can start after Foundational - no dependency on US1 or US2
- **User Story 3 (P3)**: Depends on the shared folder-list primitives from Foundational and is best completed after US4 so the same main-panel list behavior is reused cleanly

### Within Each User Story

- Shared UI wiring before story-specific styling where both touch the same state
- Main behavior before story-specific tests
- Story behavior complete before cross-cutting polish

### Parallel Opportunities

- `T002` and `T003` can run in parallel after `T001`
- `T009`, `T010`, and `T011` can run in parallel after `T004` through `T008`
- `T012`, `T014`, and `T015` can run in parallel within US1 after the foundational phase
- `T018`, `T019`, and `T020` can run in parallel within US2 after `T016` and `T017`
- `T022`, `T023`, and `T024` can run in parallel within US4 after `T021`
- `T027` and `T028` can run in parallel within US3 after `T025` and `T026`
- `T030`, `T032`, and `T033` can run in parallel during polish after `T029`

---

## Parallel Example: User Story 1

```bash
Task: "Restructure the inline editor header and editing surface for a wider, taller layout in ui/src/components/ContentPanel/InlineFileEditor.tsx"
Task: "Adjust editor, toolbar, and content-panel sizing rules for desktop-first expansion in ui/src/App.css"
Task: "Add frontend coverage for expanded edit layout, action visibility, and responsive fallback behavior in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Refine empty-repository and missing-README presentation styles in ui/src/App.css"
Task: "Add app-level coverage for empty-repository versus missing-README classification in ui/src/App.test.tsx"
Task: "Add content-panel coverage for intentional no-README and empty-repository messaging in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "Apply non-git-browser-inspired row layout and empty-folder styles in ui/src/App.css"
Task: "Add content-panel coverage for selected-folder list rendering, open buttons, double-click navigation, and empty-folder messaging in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "Add app-level coverage for opening files and folders from the main-panel directory view in ui/src/App.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the expanded editor experience independently before moving on

### Incremental Delivery

1. Complete Setup + Foundational to establish metadata and folder-list plumbing
2. Deliver User Story 1 for the editor workspace improvement as the MVP
3. Add User Story 2 for intentional empty-repository and missing-README behavior
4. Add User Story 4 for main-panel folder browsing
5. Add User Story 3 so default and reset states fall back to the folder list cleanly
6. Finish with rendered-markdown polish and full validation

### Parallel Team Strategy

1. One developer handles server metadata and backend tests in Phase 2 while another prepares shared UI type and rendering work from Phase 1 and `T008`
2. After Foundational completes:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 4
3. Rejoin for User Story 3 and final polish once the shared folder list is stable

---

## Notes

- [P] tasks are safe parallel opportunities because they target different files or depend only on completed shared work
- Each user story phase is scoped to remain independently testable
- The suggested MVP scope is User Story 1 only
- All tasks follow the required checklist format with task ID, optional parallel marker, story label where needed, and exact file paths
