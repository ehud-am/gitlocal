# Tasks: Shadcn GitHub-Style Browser Refresh

**Input**: Design documents from `specs/009-shadcn-github-browser/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Tests**: Include targeted backend and frontend tests because the whole-app UI migration, destructive git workflows, remote-git exception handling, and setup bootstrap routes all carry high regression risk and must preserve the constitution's coverage threshold.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g. `US1`, `US2`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install and configure the shared shadcn/Tailwind foundation the whole app migration depends on.

- [X] T001 Add Tailwind and shadcn build dependencies plus config in `ui/package.json`, `ui/package-lock.json`, `ui/postcss.config.js`, `ui/tailwind.config.ts`, and `ui/components.json`
- [X] T002 [P] Add shared class-name utilities in `ui/src/lib/utils.ts`
- [X] T003 Add theme hydration and persistence helpers in `ui/src/services/theme.ts` and wire them from `ui/src/main.tsx`
- [X] T004 [P] Scaffold shared shadcn primitives in `ui/src/components/ui/button.tsx`, `ui/src/components/ui/dialog.tsx`, `ui/src/components/ui/dropdown-menu.tsx`, `ui/src/components/ui/input.tsx`, `ui/src/components/ui/select.tsx`, `ui/src/components/ui/separator.tsx`, and `ui/src/components/ui/switch.tsx`
- [X] T005 Replace the global CSS entry with app-wide GitHub-like light/dark tokens in `ui/src/styles/globals.css` and update imports in `ui/src/main.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared contracts, git helpers, and route plumbing that all three user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Extend shared server contracts for repo context, branch options, branch switching, folder-scoped README lookup, and setup actions in `src/types.ts`
- [X] T007 [P] Mirror enriched repo, branch, dialog, and setup models in `ui/src/types/index.ts`
- [X] T008 [P] Extend the frontend API client for enriched repo info, folder README queries, branch switching, and setup bootstrap mutations in `ui/src/services/api.ts`
- [X] T009 Extend git helpers for user identity lookup, remote selection, remote URL conversion, folder-scoped README lookup, working-tree change inspection, branch switching, `git init`, and clone execution in `src/git/repo.ts`
- [X] T010 [P] Register branch-switch and setup-bootstrap routes in `src/server.ts`
- [X] T011 [P] Extend git handlers for enriched repo info, branch options, folder-scoped README lookup, and branch-switch mutations in `src/handlers/git.ts`
- [X] T012 [P] Extend picker handlers for capability flags, create-folder, `git init`, clone, and repository-open flows in `src/handlers/pick.ts`
- [X] T013 [P] Add unit coverage for repo context, branch option normalization, remote URL conversion, folder README lookup, and branch-switch helpers in `tests/unit/git/repo.test.ts`
- [X] T014 [P] Add handler coverage for enriched repo info, branches, folder README lookup, and branch-switch mutation responses in `tests/unit/handlers/git.test.ts`
- [X] T015 [P] Add handler coverage for setup browse flags plus create-folder, `git init`, and clone routes in `tests/unit/handlers/pick.test.ts`
- [X] T016 [P] Add integration coverage for repo context, branch-switch, and setup-bootstrap routes in `tests/integration/server.test.ts`

**Checkpoint**: Foundation ready - user story work can now begin in parallel

---

## Phase 3: User Story 1 - Browse repository context in a GitHub-like right panel (Priority: P1) 🎯 MVP

**Goal**: Deliver the whole-app GitHub-like shadcn refresh, including light/dark themes, richer right-panel context, `..` navigation, and README-below-list folder views.

**Independent Test**: Open a repository with nested folders and a README, then verify the app renders in light and dark themes, the right panel shows title/path/git metadata, folder views include a `..` row, and folder README content appears below the file list.

### Tests for User Story 1

- [X] T017 [P] [US1] Add app-shell and theme-persistence coverage in `ui/src/App.test.tsx`
- [X] T018 [P] [US1] Add repo-context header coverage in `ui/src/components/RepoContext/RepoContextHeader.test.tsx`
- [X] T019 [P] [US1] Add folder-view coverage for `..` navigation and README-after-list ordering in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 1

- [X] T020 [US1] Build the GitHub-like app shell and theme toggle in `ui/src/App.tsx`, `ui/src/components/AppFooter.tsx`, and `ui/src/styles/globals.css`
- [X] T021 [P] [US1] Create the repo context header with title, full path, git identity, remote link, and branch selector rendering in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T022 [US1] Update file and folder panel rendering for repo-context metadata, synthetic `..` navigation, and README-below-list composition in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T023 [P] [US1] Restyle shared browse surfaces to the new shadcn design language in `ui/src/components/Breadcrumb/Breadcrumb.tsx`, `ui/src/components/FileTree/FileTree.tsx`, `ui/src/components/FileTree/FileTreeNode.tsx`, `ui/src/components/Search/SearchPanel.tsx`, `ui/src/components/Search/SearchResults.tsx`, `ui/src/components/Search/SearchTrigger.tsx`, and `ui/src/components/ContentPanel/DeleteFileDialog.tsx`
- [X] T024 [US1] Wire theme preference, enriched repo info, and folder-scoped README loading through `ui/src/App.tsx` and `ui/src/services/theme.ts`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Switch branches by changing the local working tree safely (Priority: P1)

**Goal**: Turn branch selection into a real local checkout flow with commit, discard, cancel, and remote-tracking branch support.

**Independent Test**: Open a repository with multiple branches, switch to another local branch on a clean working tree, then repeat with tracked changes, untracked blockers, and a remote-tracking branch while confirming the correct dialog flow and final UI refresh.

### Tests for User Story 2

- [X] T025 [P] [US2] Add backend coverage for clean switch, tracking-branch creation, confirmation-required responses, and untracked second-confirmation responses in `tests/unit/git/repo.test.ts`, `tests/unit/handlers/git.test.ts`, and `tests/integration/server.test.ts`
- [X] T026 [P] [US2] Add branch-switch dialog coverage for commit, discard, cancel, and untracked-delete confirmation flows in `ui/src/components/RepoContext/RepoContextHeader.test.tsx` and `ui/src/components/RepoContext/BranchSwitchDialog.test.tsx`
- [X] T027 [P] [US2] Add app-level coverage for post-switch refresh, branch fallback, and selected-path reconciliation in `ui/src/App.test.tsx`

### Implementation for User Story 2

- [X] T028 [US2] Implement real branch-switch mutation flows, commit-before-switch, discard-before-switch, and remote-tracking checkout in `src/git/repo.ts` and `src/handlers/git.ts`
- [X] T029 [US2] Build the branch-switch confirmation dialog and commit-message form in `ui/src/components/RepoContext/BranchSwitchDialog.tsx` and `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T030 [US2] Wire branch-switch requests, status messaging, and query refresh behavior through `ui/src/App.tsx` and `ui/src/services/api.ts`

**Checkpoint**: User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Start repositories from a more capable setup flow (Priority: P2)

**Goal**: Replace the standalone picker-first experience with a true setup modal that can browse, create folders, initialize git, and clone into child folders.

**Independent Test**: Launch GitLocal without a repository, use the setup modal to create a folder, initialize a non-git folder, clone into a child folder, and open the resulting repository without leaving the app.

### Tests for User Story 3

- [ ] T031 [P] [US3] Add backend coverage for browse capability flags and setup bootstrap actions in `tests/unit/handlers/pick.test.ts` and `tests/integration/server.test.ts`
- [ ] T032 [P] [US3] Add setup-modal interaction coverage in `ui/src/components/Setup/SetupModal.test.tsx`
- [ ] T033 [P] [US3] Add app-level coverage for launching, dismissing, and completing setup-modal flows in `ui/src/App.test.tsx`

### Implementation for User Story 3

- [ ] T034 [US3] Extend setup browse payloads and bootstrap mutations for create-folder, `git init`, and clone in `src/handlers/pick.ts`, `src/server.ts`, and `src/types.ts`
- [ ] T035 [US3] Build the setup modal with browse, create-folder, `git init`, clone, and open actions in `ui/src/components/Setup/SetupModal.tsx`
- [ ] T036 [US3] Replace the standalone picker-page flow with modal-driven setup state and repository-open transitions in `ui/src/App.tsx` and `ui/src/components/Picker/PickerPage.tsx`

**Checkpoint**: User Story 3 should be fully functional and testable independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish accessibility, copy consistency, manual validation, and full verification across the feature.

- [ ] T037 Review copy, focus management, contrast, and keyboard behavior across `ui/src/components/RepoContext/RepoContextHeader.tsx`, `ui/src/components/RepoContext/BranchSwitchDialog.tsx`, `ui/src/components/Setup/SetupModal.tsx`, `ui/src/components/ContentPanel/DeleteFileDialog.tsx`, and `ui/src/styles/globals.css`
- [ ] T038 [P] Run the manual validation flow in `specs/009-shadcn-github-browser/quickstart.md` and capture follow-up notes in `specs/009-shadcn-github-browser/quickstart.md`
- [ ] T039 [P] Run full verification with `npm test`, `npm run lint`, and `npm run build` from `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and the repo-context header work from User Story 1
- **User Story 3 (Phase 5)**: Depends on Foundational completion and can proceed independently of User Story 2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on later stories
- **User Story 2 (P1)**: Depends on the enriched branch metadata from Foundational and the visible branch-control surface from US1
- **User Story 3 (P2)**: Depends on the setup/bootstrap APIs from Foundational and the shared shadcn foundation from Setup

### Within Each User Story

- Coverage tasks should be written before or alongside implementation for the same story
- Server contract changes before client wiring
- Shared shell and header work before story-specific polish
- Mutation logic before confirmation-dialog refinements

### Parallel Opportunities

- `T002` and `T004` can run in parallel after `T001`
- `T007`, `T008`, `T010`, `T011`, and `T012` can run in parallel after `T006` and `T009`
- `T013` through `T016` can run in parallel once the foundational routes and helpers are in place
- `T017`, `T018`, and `T019` can run in parallel inside US1 before `T020` through `T024`
- `T023` can run in parallel with `T021` and `T022` once the new shell direction is fixed
- `T025`, `T026`, and `T027` can run in parallel inside US2 before `T028` through `T030`
- `T031`, `T032`, and `T033` can run in parallel inside US3 before `T034` through `T036`
- `T038` and `T039` can run in parallel during polish after implementation is complete

---

## Parallel Example: User Story 1

```bash
Task: "Add app-shell and theme-persistence coverage in ui/src/App.test.tsx"
Task: "Add repo-context header coverage in ui/src/components/RepoContext/RepoContextHeader.test.tsx"
Task: "Add folder-view coverage for `..` navigation and README-after-list ordering in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Add backend coverage for clean switch, tracking-branch creation, confirmation-required responses, and untracked second-confirmation responses in tests/unit/git/repo.test.ts, tests/unit/handlers/git.test.ts, and tests/integration/server.test.ts"
Task: "Add branch-switch dialog coverage for commit, discard, cancel, and untracked-delete confirmation flows in ui/src/components/RepoContext/RepoContextHeader.test.tsx and ui/src/components/RepoContext/BranchSwitchDialog.test.tsx"
Task: "Add app-level coverage for post-switch refresh, branch fallback, and selected-path reconciliation in ui/src/App.test.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "Add backend coverage for browse capability flags and setup bootstrap actions in tests/unit/handlers/pick.test.ts and tests/integration/server.test.ts"
Task: "Add setup-modal interaction coverage in ui/src/components/Setup/SetupModal.test.tsx"
Task: "Add app-level coverage for launching, dismissing, and completing setup-modal flows in ui/src/App.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the whole-app refresh, repo context header, theme behavior, and folder-view composition before moving on

### Incremental Delivery

1. Deliver the shared shadcn/Tailwind foundation and server contracts first
2. Ship User Story 1 so the app already feels like the new product direction
3. Add User Story 2 so branch selection becomes a real repository-control workflow
4. Add User Story 3 so setup and bootstrap are handled inside the new modal experience
5. Finish with accessibility tuning, quickstart validation, and full verification

### Parallel Team Strategy

1. One developer handles Tailwind/shadcn setup while another prepares server-side repo/setup contracts
2. After Foundational completes:
   - Developer A: User Story 1 app shell, header, and folder-view composition
   - Developer B: User Story 2 branch-switch server logic and confirmation dialog
   - Developer C: User Story 3 setup modal and bootstrap actions
3. Rejoin for cross-cutting accessibility polish, manual validation, and verification

---

## Notes

- [P] tasks are safe parallel opportunities because they touch different files or depend only on completed shared work
- Each user story is scoped to remain independently testable
- The suggested MVP scope is User Story 1 only
- All tasks follow the required checklist format with task ID, optional parallel marker, story label where needed, and exact file paths
