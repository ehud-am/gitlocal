# Tasks: Mac Markdown Open Preview

**Input**: Design documents from `specs/028-mac-md-open-preview/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included because the plan requires maintained 90% per-file coverage and the spec defines independently testable acceptance scenarios.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or does not depend on incomplete tasks
- **[Story]**: Maps task to a user story from `spec.md`
- Every task includes at least one concrete file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the exact files and existing extension points for native file open, startup state, and folder layout work.

- [X] T001 [P] Review macOS document registration and Markdown UTI metadata in `native/macos/GitLocal/GitLocal/Info.plist`
- [X] T002 [P] Review first-run native preference and prompt integration points in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [X] T003 [P] Review shared open-target and viewer state types in `src/types.ts` and `ui/src/types/index.ts`
- [X] T004 [P] Review folder, README, tree, and preview rendering entry points in `ui/src/App.tsx`, `ui/src/components/FileTree/FileTree.tsx`, and `ui/src/components/ContentPanel/ContentPanel.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts and state plumbing that all user stories depend on.

**Critical**: No user story work should begin until this phase is complete.

- [X] T005 [P] Define shared open request, selected file, and workspace layout fields in `src/types.ts`
- [X] T006 [P] Mirror shared open request, selected file, and workspace layout fields in `ui/src/types/index.ts`
- [X] T007 Update startup/default-reader preference persistence semantics in `src/services/startup-preferences.ts`
- [X] T008 Update local service startup/open-target plumbing in `src/cli.ts` and `src/server.ts`
- [X] T009 Update repository open response handling for file targets in `src/handlers/repo.ts`
- [X] T010 Update browser API and viewer state helpers for startup target precedence in `ui/src/services/api.ts` and `ui/src/services/viewerState.ts`

**Checkpoint**: Shared open-request and layout state contracts are ready for story implementation.

---

## Phase 3: User Story 1 - Ask Before Becoming Default Markdown Reader (Priority: P1) MVP

**Goal**: On first macOS launch, GitLocal asks before becoming the default Markdown reader and changes the OS default only after explicit opt-in.

**Independent Test**: Launch the macOS app in a fresh user state, verify the first-run prompt appears, decline without changing the default Markdown reader, then accept in a reset state and verify the association attempt happens only after acceptance.

### Tests for User Story 1

- [X] T011 [P] [US1] Add unit coverage for accepted, declined, not-asked, and failed default-reader preference states in `tests/unit/services/startup-preferences.test.ts`
- [X] T012 [P] [US1] Add native lifecycle validation cases for first-run opt-in and decline behavior in `native/macos/GitLocalTests/LifecycleTests.md`
- [X] T013 [P] [US1] Add package metadata coverage for Markdown document registration in `tests/integration/npm-package-contents.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Register GitLocal as a Markdown-capable app without forcing default ownership in `native/macos/GitLocal/GitLocal/Info.plist`
- [X] T015 [US1] Implement first-run default-reader prompt flow in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [X] T016 [US1] Persist accepted, declined, and failed default-reader states without repeated blocking in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [X] T017 [US1] Attempt macOS default-reader association only after explicit opt-in in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [X] T018 [US1] Surface default-reader association failures without recording success in `native/macos/GitLocal/GitLocal/AppErrorPresenter.swift`
- [X] T061 [US1] Add an explicit post-install `GitLocal > Set as Default Markdown Reader` menu action in `native/macos/GitLocal/GitLocal/AppDelegate.swift` and `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Open Markdown From Finder Into Reading Workspace (Priority: P1)

**Goal**: Double-clicking a Markdown file in Finder activates GitLocal, resolves the containing folder or repository, selects the requested file, and renders it in preview.

**Independent Test**: After opt-in, double-click Markdown files in repository, nested repository, non-git folder, path-with-spaces, and already-running app states; verify the requested file wins over saved state and README defaults.

### Tests for User Story 2

- [X] T019 [P] [US2] Add server integration coverage for file-path open requests resolving `rootPath`, `selectedPath`, and `selectedPathType` in `tests/integration/server.test.ts`
- [X] T020 [P] [US2] Add repository handler unit coverage for nested repository, non-repository, missing file, and path-with-spaces open targets in `tests/unit/handlers/repo.test.ts`
- [X] T021 [P] [US2] Add startup preference unit coverage for Finder-open requests overriding saved viewer state in `tests/unit/services/startup-preferences.test.ts`
- [X] T022 [P] [US2] Add UI startup hydration coverage for native selected file precedence in `ui/src/App.test.tsx`
- [X] T023 [P] [US2] Add API client coverage for startup/open-target responses in `ui/src/services/api.test.ts`
- [X] T024 [P] [US2] Add viewer state coverage for native file targets overriding README/default selection in `ui/src/services/viewerState.test.ts`

### Implementation for User Story 2

- [X] T025 [US2] Capture and queue macOS file-open URLs while the app or service starts in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [X] T026 [US2] Forward queued file-open requests to the local service without native Markdown rendering in `native/macos/GitLocal/GitLocal/GitLocalService.swift`
- [X] T027 [US2] Activate the existing viewer window and deliver the most recent open request in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [X] T028 [US2] Expose startup/open-target state with file semantics from `src/server.ts`
- [X] T029 [US2] Resolve Markdown file open requests to repository root or parent folder context in `src/handlers/repo.ts`
- [X] T030 [US2] Send startup/open-target data through the browser API client in `ui/src/services/api.ts`
- [X] T031 [US2] Apply native startup selected files before saved viewer state or README defaults in `ui/src/services/viewerState.ts`
- [X] T032 [US2] Hydrate the requested Markdown file as the selected rendered preview in `ui/src/App.tsx`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Make Folder Navigation Obvious Above README (Priority: P1)

**Goal**: Folder pages use a GitHub-like layout with the folder tree first, README below on the same page, a README quick link when present, and a checkbox to hide or show dotfiles.

**Independent Test**: Open folders with and without README files and with dotfiles; verify the tree appears first, README renders below it when present, the README quick link scrolls down, dotfiles show by default, and the checkbox hides `.*` entries without changing context.

### Tests for User Story 3

- [X] T033 [P] [US3] Add App coverage for folder tree before README, no tree/README top-level tabs, and no-README state in `ui/src/App.test.tsx`
- [X] T034 [P] [US3] Add content panel coverage for README section rendering below the folder tree and quick-link target behavior in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T035 [P] [US3] Add file tree coverage for dotfiles visible by default and hide `.*` checkbox filtering in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T036 [P] [US3] Add style regression coverage for compact folder controls and README link layout in `ui/src/styles/globals.test.ts`

### Implementation for User Story 3

- [X] T037 [US3] Replace the tree-versus-README tab workspace with a folder page state in `ui/src/App.tsx`
- [X] T038 [US3] Render the folder tree as the first primary content area for folder pages in `ui/src/App.tsx`
- [X] T039 [US3] Render the README below the folder tree on the same scrollable page in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T040 [US3] Add a README quick link near the top that scrolls to the README section in `ui/src/App.tsx`
- [X] T041 [US3] Hide the README quick link and show a clear no-README state when no README exists in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T042 [US3] Add dotfile visibility state and a hide `.*` checkbox to the folder tree in `ui/src/components/FileTree/FileTree.tsx`
- [X] T043 [US3] Filter visible `.*` entries without changing active folder, selected file, or preview state in `ui/src/components/FileTree/FileTree.tsx`
- [X] T044 [US3] Update folder page spacing, density, and responsive behavior in `ui/src/styles/globals.css`

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: User Story 4 - Preserve Lightweight Browsing For Non-Technical Users (Priority: P2)

**Goal**: Users can move between Markdown preview and neighboring project files without entering a full-IDE-style workflow.

**Independent Test**: Open a Markdown file, navigate to neighboring Markdown and non-Markdown files, then return to the folder page while confirming the UI remains reading-oriented and preserves folder context.

### Tests for User Story 4

- [X] T045 [P] [US4] Add App coverage for moving between Markdown preview, neighboring files, and folder page context in `ui/src/App.test.tsx`
- [X] T046 [P] [US4] Add content panel coverage for non-Markdown neighboring file rendering without losing folder context in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 4

- [X] T047 [US4] Preserve selected file and active folder labels while navigating from folder tree to file preview in `ui/src/App.tsx`
- [X] T048 [US4] Keep existing non-Markdown viewer behavior integrated with the folder page flow in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T049 [US4] Ensure navigation controls remain compact and reader-oriented in `ui/src/styles/globals.css`

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 7: User Story 5 - Handle Unsupported Or Problem Files Gracefully (Priority: P3)

**Goal**: Missing, unreadable, unsupported, unavailable, or superseded open requests show clear messages and never display stale content as if it were the requested file.

**Independent Test**: Try moved, deleted, unreadable, unsupported, and superseded file-open requests; verify clear errors, no stale preview, and continued ability to open a folder manually.

### Tests for User Story 5

- [X] T050 [P] [US5] Add server integration coverage for missing, unreadable, unsupported, and unavailable containing folder errors in `tests/integration/server.test.ts`
- [X] T051 [P] [US5] Add repo handler unit coverage for stale preview suppression after failed open requests in `tests/unit/handlers/repo.test.ts`
- [X] T052 [P] [US5] Add UI error-state coverage for failed native open requests and superseded requests in `ui/src/App.test.tsx`

### Implementation for User Story 5

- [X] T053 [US5] Return distinct user-facing errors for missing, unreadable, unsupported, and unavailable paths in `src/handlers/repo.ts`
- [X] T054 [US5] Suppress stale selected file and preview state after failed startup/open requests in `ui/src/services/viewerState.ts`
- [X] T055 [US5] Render clear recovery messaging and manual folder-open affordance for failed opens in `ui/src/App.tsx`

**Checkpoint**: User Story 5 is fully functional and testable independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and release-readiness checks across the feature.

- [X] T056 [P] Update macOS lifecycle/manual validation notes for default-reader setup and Finder open workflow in `native/macos/GitLocalTests/LifecycleTests.md`
- [X] T057 [P] Update user-facing README notes for optional Markdown default-reader setup in `README.md`
- [X] T058 Run shared verification commands from `specs/028-mac-md-open-preview/quickstart.md`
- [X] T059 Run macOS wrapper build validation from `specs/028-mac-md-open-preview/quickstart.md`
- [X] T060 Run package and cask smoke checks from `specs/028-mac-md-open-preview/quickstart.md` if packaging metadata changed
- [X] T062 [P] Update README and lifecycle validation notes for post-install default-reader setup in `README.md` and `native/macos/GitLocalTests/LifecycleTests.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; no dependency on other stories.
- **User Story 2 (P1)**: Can start after Foundational; uses the opt-in outcome for the normal Finder double-click path but remains independently testable through explicit open-with/native open events.
- **User Story 3 (P1)**: Can start after Foundational; independent of default-reader setup and native file-open implementation.
- **User Story 4 (P2)**: Depends on the folder/file navigation behavior from User Story 3.
- **User Story 5 (P3)**: Can start after Foundational, but full UI validation benefits from User Stories 2 and 3.

### Within Each User Story

- Tests should be written or updated before implementation changes.
- Shared types and service contracts precede UI hydration and layout work.
- Native wrapper forwarding precedes Finder workflow manual validation.
- Folder page layout precedes polish and responsive refinements.

### Parallel Opportunities

- Setup tasks T001-T004 can run in parallel.
- Foundational type and test-prep work T005-T006 can run in parallel before shared plumbing tasks.
- US1 test tasks T011-T013 can run in parallel.
- US2 test tasks T019-T024 can run in parallel.
- US3 test tasks T033-T036 can run in parallel.
- US4 test tasks T045-T046 can run in parallel.
- US5 test tasks T050-T052 can run in parallel.
- After Phase 2, US1, US2, and US3 can be staffed in parallel because they touch mostly native/default-reader, startup/open-target, and folder layout surfaces.

---

## Parallel Example: User Story 3

```bash
Task: "T033 [P] [US3] Add App coverage for folder tree before README, no tree/README top-level tabs, and no-README state in ui/src/App.test.tsx"
Task: "T034 [P] [US3] Add content panel coverage for README section rendering below the folder tree and quick-link target behavior in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T035 [P] [US3] Add file tree coverage for dotfiles visible by default and hide .* checkbox filtering in ui/src/components/FileTree/FileTree.test.tsx"
Task: "T036 [P] [US3] Add style regression coverage for compact folder controls and README link layout in ui/src/styles/globals.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete User Story 1 so default-reader setup remains explicitly opt-in.
3. Complete User Story 2 so opted-in Finder double-click opens the requested Markdown file.
4. Complete User Story 3 so the workspace exposes folder navigation using the GitHub-like folder page.
5. Stop and validate P1 stories independently before moving to P2/P3 work.

### Incremental Delivery

1. Setup and Foundational tasks establish shared contracts.
2. US1 protects user consent for OS-level default-reader changes.
3. US2 delivers the Finder-to-preview workflow.
4. US3 fixes navigation discoverability with tree first, README below, README quick link, and dotfile density control.
5. US4 preserves lightweight browsing across neighboring files.
6. US5 hardens failure modes and stale preview suppression.

### Validation Gates

- Run focused tests after each user story phase.
- Run `npm test`, `npm run lint`, and `npm run build` before considering the feature complete.
- Run `xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal -configuration Release build` before macOS workflow acceptance.
- Run package/cask smoke scripts only when packaging metadata changes.

## Notes

- `[P]` tasks use different files or are independent enough to run concurrently.
- `[USx]` labels map directly to user stories in `spec.md`.
- Tasks intentionally use the GitHub-like folder page design from the latest plan update, not the earlier persistent split-navigation design.
- Do not change the user's default Markdown reader unless the first-run prompt has been explicitly accepted or the user chooses the explicit native app menu action.
