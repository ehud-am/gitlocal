# Tasks: Viewer Usability and Search

**Input**: Design documents from `specs/003-viewer-usability-search/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include backend and frontend tests for this feature because the plan and constitution require preserving behavior coverage for changed TypeScript and React files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Server code lives in `src/`
- Server tests live in `tests/`
- UI code lives in `ui/src/`
- UI tests live beside components in `ui/src/components/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature scaffolding, shared types, and validation targets before story work begins

- [x] T001 Update the feature documentation inventory in `specs/003-viewer-usability-search/tasks.md`
- [x] T002 [P] Extend shared API and UI type definitions for viewer state, sync snapshots, and search payloads in `src/types.ts` and `ui/src/types/index.ts`
- [x] T003 [P] Add client-side viewer state helpers for URL serialization and parsing in `ui/src/services/viewerState.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core runtime plumbing that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement repository working-tree snapshot and path validation helpers in `src/git/repo.ts`
- [x] T005 [P] Add repository sync service scaffolding for change detection in `src/services/repo-watch.ts`
- [x] T006 [P] Add sync and search route registration to the server in `src/server.ts`
- [x] T007 Implement sync status handler and response shaping in `src/handlers/sync.ts`
- [x] T008 [P] Implement repository search handler scaffolding for name and content modes in `src/handlers/search.ts`
- [x] T009 Integrate typed sync and search client methods in `ui/src/services/api.ts`
- [x] T010 Update the app shell to hydrate viewer context from URL state and expose shared state setters in `ui/src/App.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Copy Relevant Content Quickly (Priority: P1) 🎯 MVP

**Goal**: Let users copy individual markdown code blocks and full raw-file content with one click

**Independent Test**: Open a markdown file with fenced code blocks and a raw file view, use each copy control, and confirm the clipboard receives exactly the expected text for the selected content region.

### Tests for User Story 1

- [x] T011 [P] [US1] Add copy-action behavior tests for rendered markdown and raw view in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [x] T012 [P] [US1] Add markdown code-block copy rendering tests in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`

### Implementation for User Story 1

- [x] T013 [P] [US1] Create reusable copy button component with success and failure feedback in `ui/src/components/ContentPanel/CopyButton.tsx`
- [x] T014 [US1] Embed code-block copy controls into rendered markdown blocks in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [x] T015 [US1] Add raw-view copy action wiring and toolbar state handling in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T016 [P] [US1] Update raw code presentation styling for integrated copy controls in `ui/src/components/ContentPanel/CodeViewer.tsx` and `ui/src/App.css`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Navigate Repositories Faster (Priority: P1)

**Goal**: Allow double-click activation in picker mode while preserving existing single-click behavior

**Independent Test**: In picker mode, single-click a row to select it, double-click a folder row to browse deeper, and double-click a repository row to open the repository viewer directly.

### Tests for User Story 2

- [x] T017 [P] [US2] Add picker interaction tests for single-click selection and double-click activation in `ui/src/components/Picker/PickerPage.test.tsx`
- [x] T018 [P] [US2] Add picker handler tests covering repository-open and folder-browse outcomes in `tests/unit/handlers/pick.test.ts`

### Implementation for User Story 2

- [x] T019 [US2] Extend picker browsing responses and activation helpers for row-driven navigation in `src/handlers/pick.ts` and `src/types.ts`
- [x] T020 [US2] Implement double-click row activation while preserving explicit action buttons in `ui/src/components/Picker/PickerPage.tsx`
- [x] T021 [P] [US2] Refine picker row styling and affordances for selected and activatable entries in `ui/src/App.css`

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Keep Context While the Repository Changes (Priority: P1)

**Goal**: Preserve viewer context across refresh, auto-refresh affected data when the repository changes, recover gracefully from deletions, and support collapsible sidebar state

**Independent Test**: Navigate to a nested file, collapse the sidebar, refresh the page, then edit and delete files or folders in the repository and confirm the viewer restores context, updates automatically, and falls back safely when paths disappear.

### Tests for User Story 3

- [x] T022 [P] [US3] Add server sync and fallback coverage for changed and deleted paths in `tests/unit/handlers/files.test.ts`, `tests/unit/handlers/git.test.ts`, and `tests/integration/server.test.ts`
- [x] T023 [P] [US3] Add UI tests for refresh state hydration, sidebar collapse, and recovery messaging in `ui/src/App.test.tsx` and `ui/src/components/FileTree/FileTree.test.tsx`
- [x] T024 [P] [US3] Add content refresh and invalid-path handling tests in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 3

- [x] T025 [US3] Implement repository sync snapshot calculation and deletion recovery logic in `src/services/repo-watch.ts`, `src/handlers/sync.ts`, and `src/handlers/files.ts`
- [x] T026 [P] [US3] Update file-tree loading to support sync-driven refetch and invalid path recovery in `ui/src/components/FileTree/FileTree.tsx` and `ui/src/components/FileTree/FileTreeNode.tsx`
- [x] T027 [US3] Persist selected branch, path, raw mode, sidebar state, and status messages through URL-backed viewer state in `ui/src/App.tsx` and `ui/src/services/viewerState.ts`
- [x] T028 [US3] Implement sync polling, content fallback messaging, and current-file refresh in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T029 [US3] Add collapsible sidebar controls and preserved panel state in `ui/src/App.tsx`, `ui/src/components/GitInfo/GitInfo.tsx`, and `ui/src/App.css`

**Checkpoint**: At this point, User Stories 1, 2, and 3 should all work independently

---

## Phase 6: User Story 4 - Find Files Quickly From the Viewer (Priority: P2)

**Goal**: Add a compact top-of-viewer quick finder that shows live file-name results after 3 characters and navigates directly into the selected file

**Independent Test**: Open the repository viewer with search idle, confirm the top area shows a compact icon-only trigger, open search through the trigger and through `Command+F` or `Control+F`, type fewer than 3 characters and confirm no results appear, then type at least 3 characters and confirm live file-name matches appear and selecting one navigates both the tree and content panel to the file.

### Tests for User Story 4

- [x] T030 [P] [US4] Add backend search handler coverage for name mode, content mode, and matching options in `tests/unit/handlers/search.test.ts`
- [x] T031 [P] [US4] Add repository search UI tests for mode switching, empty states, and result navigation in `ui/src/components/Search/SearchPanel.test.tsx`
- [x] T039 [P] [US4] Add UI tests for compact search trigger rendering, expanded-state persistence, and `Command+F` or `Control+F` activation in `ui/src/components/Search/SearchPanel.test.tsx` and `ui/src/App.test.tsx`
- [x] T040 [P] [US4] Add viewer-state coverage for compact-versus-expanded search persistence in `ui/src/services/viewerState.test.ts`

### Implementation for User Story 4

- [x] T032 [US4] Implement repository name and content search execution with case-matching controls in `src/handlers/search.ts` and `src/git/tree.ts`
- [x] T033 [P] [US4] Add search request and result types to shared client/server models in `src/types.ts` and `ui/src/types/index.ts`
- [x] T034 [P] [US4] Create search panel and result list components in `ui/src/components/Search/SearchPanel.tsx` and `ui/src/components/Search/SearchResults.tsx`
- [x] T035 [US4] Integrate search state, result navigation, and empty-state handling into the viewer shell in `ui/src/App.tsx` and `ui/src/App.css`
- [x] T041 [P] [US4] Add compact trigger and expanded-search presentation state to shared client models and URL persistence in `ui/src/types/index.ts` and `ui/src/services/viewerState.ts`
- [x] T042 [P] [US4] Create the compact icon-only search trigger component in `ui/src/components/Search/SearchTrigger.tsx`
- [x] T043 [US4] Redesign the search panel to support collapsed, expanded-idle, and expanded-active states in `ui/src/components/Search/SearchPanel.tsx`, `ui/src/components/Search/SearchResults.tsx`, and `ui/src/App.css`
- [x] T044 [US4] Integrate the compact trigger, `Command+F` or `Control+F` shortcut handling, focus management, and dismiss behavior into `ui/src/App.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T036 [P] Add or update focused tests for new helper modules in `tests/unit/git/repo.test.ts`, `tests/unit/git/tree.test.ts`, and `ui/src/services/viewerState.test.ts`
- [ ] T037 Validate the end-to-end feature flow, including the compact search trigger and keyboard shortcut behavior, in `specs/003-viewer-usability-search/quickstart.md`
- [x] T038 Run full verification and fix any regressions surfaced by `npm test`, `npm run lint`, and `npm run build`

### Refinement Follow-up

- [x] T045 [P] [US3] Add UI tests for the collapsed sidebar rail, icon-only restore control, and in-panel collapse placement in `ui/src/App.test.tsx`
- [x] T046 [P] [US4] Add UI tests for the floating search card presentation and updated dismiss affordances in `ui/src/components/Search/SearchPanel.test.tsx` and `ui/src/App.test.tsx`
- [x] T047 [US3] Replace word-based sidebar collapse controls with icon controls anchored inside the sidebar and collapsed rail in `ui/src/App.tsx` and `ui/src/App.css`
- [x] T048 [US4] Redesign the expanded search surface as a floating overlay card with a more modern visual hierarchy in `ui/src/components/Search/SearchPanel.tsx` and `ui/src/App.css`
- [x] T049 [US4] Refine the compact search trigger styling and keyboard hint treatment to match the updated search surface in `ui/src/components/Search/SearchTrigger.tsx`, `ui/src/App.tsx`, and `ui/src/App.css`
- [x] T050 [P] [US2] Add picker-page tests for sidebar collapse and restore using the same rail interaction pattern as the repository viewer in `ui/src/components/Picker/PickerPage.test.tsx`
- [x] T051 [P] [US4] Add UI tests for the 3-character quick-finder threshold, live file-name updates, and result-driven navigation in `ui/src/components/Search/SearchPanel.test.tsx` and `ui/src/App.test.tsx`
- [x] T052 [US2] Apply the same icon-driven sidebar collapse and slim-rail restore pattern to the folder-selection page in `ui/src/components/Picker/PickerPage.tsx` and `ui/src/App.css`
- [x] T053 [US4] Simplify the search panel into a narrower file-name quick finder with live query updates and no mode or case controls in `ui/src/components/Search/SearchPanel.tsx`, `ui/src/components/Search/SearchResults.tsx`, and `ui/src/App.css`
- [x] T054 [US4] Update viewer search state and result selection flow so `Command+F` / `Control+F`, live query changes, and result selection keep the tree and content panel synchronized in `ui/src/App.tsx`, `ui/src/services/viewerState.ts`, and `ui/src/types/index.ts`
- [x] T055 [P] [US4] Add UI tests confirming the quick finder renders as an overlay layer and does not rely on in-flow placement in `ui/src/App.test.tsx`
- [x] T056 [P] [US5] Add tests for the fixed footer year, product link, and running version in `ui/src/App.test.tsx`, `tests/unit/handlers/git.test.ts`, and `tests/integration/server.test.ts`
- [x] T057 [US4] Reposition the quick finder so it overlays the viewer content without pushing breadcrumb or content layout in `ui/src/App.tsx` and `ui/src/App.css`
- [x] T058 [US5] Surface the running application version through shared server/UI metadata in `src/git/repo.ts`, `src/handlers/git.ts`, `src/types.ts`, `ui/src/types/index.ts`, and `ui/src/services/api.ts`
- [x] T059 [US5] Add a shared fixed footer with dynamic year, GitHub link, and running version in `ui/src/App.tsx`, `ui/src/components/Picker/PickerPage.tsx`, and `ui/src/App.css`
- [x] T060 [P] [US2] Add startup-detection coverage for launching without an explicit path from inside a git repository in `tests/integration/server.test.ts`
- [x] T061 [US2] Fix no-argument startup initialization so the current working directory opens directly when it is already a git repository in `src/server.ts` and `src/cli.ts`
- [x] T062 [US2] Document the startup-detection fix in `README.md`, `CHANGELOG.md`, and `specs/003-viewer-usability-search/spec.md`
- [x] T063 [P] [US3] Add regression coverage for stale saved branch state when opening a different repository in `ui/src/App.test.tsx`
- [x] T064 [US3] Fall back to a valid repository branch when hydrated URL branch state does not exist in the newly opened repository in `ui/src/App.tsx`
- [x] T065 [US3] Document the stale-branch recovery fix in `README.md`, `CHANGELOG.md`, and `specs/003-viewer-usability-search/spec.md`
- [x] T066 [P] [US3] Add regression coverage for stale saved file or folder state when opening a different repository in `ui/src/App.test.tsx` and `ui/src/services/viewerState.test.ts`
- [x] T067 [US3] Track repository identity in URL-backed viewer state and clear stale file context when the opened repository changes in `ui/src/App.tsx`, `ui/src/services/viewerState.ts`, and `ui/src/types/index.ts`
- [x] T068 [US3] Document the cross-repository stale-path recovery fix in `README.md`, `CHANGELOG.md`, `specs/003-viewer-usability-search/spec.md`, and `specs/003-viewer-usability-search/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on completion of the desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 3 (P1)**: Can start after Foundational and benefits from the shared sync scaffolding completed in Phase 2
- **User Story 4 (P2)**: Can start after Foundational and should integrate with the shared viewer state established for User Story 3, but remains independently testable once that state layer exists

### Within Each User Story

- Write or update tests before implementation when practical
- Shared types before component or handler integration
- Backend capability before UI integration
- Story-level integration after supporting components are in place
- Validate each story independently at its checkpoint before moving on

### Parallel Opportunities

- T002 and T003 can run in parallel during setup
- T005, T006, and T008 can run in parallel once T004 is complete
- In User Story 1, T011, T012, and T013 can run in parallel
- In User Story 2, T017 and T018 can run in parallel
- In User Story 3, T022, T023, and T024 can run in parallel, followed by T026 and T027 in parallel
- In User Story 4, T030, T031, T033, and T034 can run in parallel after the search contract is settled
- In the updated User Story 4 work, T039, T040, T041, and T042 can run in parallel before T043 and T044 bring the new search presentation together
- In the refinement follow-up, T045 and T046 can run in parallel before T047, T048, and T049 land the updated sidebar and search visuals
- In the latest quick-finder refinement, T050 and T051 can run in parallel before T052, T053, and T054 finalize the picker/sidebar consistency and live file-finder behavior
- In the footer-and-overlay refinement, T055 and T056 can run in parallel before T057, T058, and T059 land the layout and metadata changes

---

## Parallel Example: User Story 1

```bash
# Launch the copy-related tests together:
Task: "Add copy-action behavior tests for rendered markdown and raw view in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "Add markdown code-block copy rendering tests in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"

# Build the reusable UI pieces together:
Task: "Create reusable copy button component with success and failure feedback in ui/src/components/ContentPanel/CopyButton.tsx"
Task: "Update raw code presentation styling for integrated copy controls in ui/src/components/ContentPanel/CodeViewer.tsx and ui/src/App.css"
```

---

## Parallel Example: User Story 3

```bash
# Cover backend and frontend behavior in parallel:
Task: "Add server sync and fallback coverage for changed and deleted paths in tests/unit/handlers/files.test.ts, tests/unit/handlers/git.test.ts, and tests/integration/server.test.ts"
Task: "Add UI tests for refresh state hydration, sidebar collapse, and recovery messaging in ui/src/App.test.tsx and ui/src/components/FileTree/FileTree.test.tsx"
Task: "Add content refresh and invalid-path handling tests in ui/src/components/ContentPanel/ContentPanel.test.tsx"

# Implement independent layers after the tests are in place:
Task: "Update file-tree loading to support sync-driven refetch and invalid path recovery in ui/src/components/FileTree/FileTree.tsx and ui/src/components/FileTree/FileTreeNode.tsx"
Task: "Persist selected branch, path, raw mode, sidebar state, and status messages through URL-backed viewer state in ui/src/App.tsx and ui/src/services/viewerState.ts"
```

---

## Parallel Example: User Story 4

```bash
# Cover the redesigned search behavior and state in parallel:
Task: "Add UI tests for compact search trigger rendering, expanded-state persistence, and Command+F or Control+F activation in ui/src/components/Search/SearchPanel.test.tsx and ui/src/App.test.tsx"
Task: "Add viewer-state coverage for compact-versus-expanded search persistence in ui/src/services/viewerState.test.ts"
Task: "Add compact trigger and expanded-search presentation state to shared client models and URL persistence in ui/src/types/index.ts and ui/src/services/viewerState.ts"
Task: "Create the compact icon-only search trigger component in ui/src/components/Search/SearchTrigger.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm copy actions work for markdown code blocks and raw file view
5. Demo the reduced-friction content-copying workflow

### Incremental Delivery

1. Complete Setup + Foundational to establish URL state, sync, and search scaffolding
2. Deliver User Story 1 for immediate day-to-day value
3. Deliver User Story 2 to improve picker activation without affecting repository viewing
4. Deliver User Story 3 to fix the biggest continuity problems around refresh and local changes
5. Deliver User Story 4 to add powerful but explicit repository search
6. Extend User Story 4 with the compact trigger and keyboard shortcut redesign
7. Apply the sidebar-rail and floating-search visual refinement tasks
8. Simplify the floating search into a live file-name quick finder and align the picker sidebar interaction with the viewer
9. Convert the quick finder into a true overlay and add fixed footer identity chrome
10. Finish with cross-cutting verification and quickstart validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. After User Story 3 establishes shared viewer state conventions:
   - Developer D: User Story 4 search backend and result behavior
   - Developer E: User Story 4 compact trigger, shortcut, and expanded-state UX
4. Finish with shared verification and polish

---

## Notes

- [P] tasks target different files or separable layers with no unresolved prerequisite conflicts
- [US1]-[US4] labels map directly to the feature specification's user stories
- Each story has an explicit independent test and can be validated at its checkpoint
- The suggested MVP scope is **User Story 1** after completing Setup and Foundational work
- All tasks follow the required checklist format with task ID, optional `[P]`, story label where required, and exact file paths
