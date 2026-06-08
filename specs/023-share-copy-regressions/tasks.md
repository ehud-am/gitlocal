# Tasks: Share and Copy Regression Patch

**Input**: Design documents from `specs/023-share-copy-regressions/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Tests**: Required by project coverage policy and quickstart feature verification targets.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or has no dependency on incomplete tasks
- **[Story]**: Maps to a user story from `specs/023-share-copy-regressions/spec.md`
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm patch scope and prepare shared validation artifacts before implementation.

- [x] T001 Review the current action and folder-classification contracts in `specs/023-share-copy-regressions/contracts/ui-actions.md` and `specs/023-share-copy-regressions/contracts/local-api.md`
- [x] T002 [P] Create the patch release review stub with validation sections in `specs/023-share-copy-regressions/release-review.md`
- [x] T003 [P] Review current UI action implementation entry points in `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/components/ContentPanel/MarkdownShareActions.tsx`, and `ui/src/App.tsx`
- [x] T004 [P] Review current folder classification entry points in `src/git/repo.ts`, `src/server.ts`, `src/handlers/repo.ts`, and `src/handlers/folder.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared types/helpers needed by multiple stories before user-story implementation.

**Critical**: No user story implementation should begin until this phase is complete.

- [x] T005 Add shared text action representation types for raw/rendered copy and PDF output in `ui/src/types/index.ts`
- [x] T006 [P] Add copy/PDF output helper test placeholders for shared behavior in `ui/src/components/ContentPanel/markdown-output.test.ts`
- [x] T007 Implement shared rendered/plain text extraction helpers for copy and PDF flows in `ui/src/components/ContentPanel/markdown-output.ts`
- [x] T008 [P] Add shared icon button CSS primitives for compact icon-label actions in `ui/src/styles/globals.css`

**Checkpoint**: Shared UI/action helpers are ready for story-specific work.

---

## Phase 3: User Story 1 - Copy Text From Any Text View (Priority: P1) - MVP

**Goal**: Copy appears as an icon-and-label button for every supported text-based file view and copies the active raw or rendered representation.

**Independent Test**: Open Markdown, plain text, and source-like files; verify Copy is visible as an icon-and-label button and copies raw or rendered text according to the active view.

### Tests for User Story 1

- [x] T009 [P] [US1] Add failing tests for Copy button visibility in raw text and source views in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [x] T010 [P] [US1] Add failing tests for rendered text copy behavior in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [x] T011 [P] [US1] Add helper tests for raw versus rendered copy extraction in `ui/src/components/ContentPanel/markdown-output.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Update the reusable copy control to render an icon plus visible label without link styling in `ui/src/components/ContentPanel/CopyButton.tsx`
- [x] T013 [US1] Add Copy button support for raw readable file views in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T014 [US1] Add Copy button support for rendered Markdown/readme views using rendered text extraction in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T015 [US1] Wire rendered copy status success and failure messages through `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T016 [US1] Style the Copy icon-label button and copied/error states in `ui/src/styles/globals.css`
- [x] T017 [US1] Run targeted US1 tests for `ui/src/components/ContentPanel/ContentPanel.test.tsx`, `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`, and `ui/src/components/ContentPanel/markdown-output.test.ts`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Use Focused Share and Export Actions (Priority: P1)

**Goal**: Unsupported Email, Slack, and Print actions are removed; Share has an icon; Save PDF works for rendered text or reports a clear failure.

**Independent Test**: Open a share-capable rendered text file and verify Email, Slack, and Print are absent, Share includes an icon, and Save PDF starts a clean rendered PDF flow.

### Tests for User Story 2

- [x] T018 [P] [US2] Add failing tests that Email, Slack, and Print are not rendered in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [x] T019 [P] [US2] Add failing tests for Share icon presence and accessible name in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [x] T020 [P] [US2] Add failing tests for Save PDF success and failure status handling in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [x] T021 [P] [US2] Add rendered PDF output preparation tests that exclude app chrome in `ui/src/components/ContentPanel/markdown-output.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Remove `print`, `email`, and `slack` from Markdown share action types in `ui/src/types/index.ts`
- [x] T023 [US2] Remove Email, Slack, and visible Print controls from `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T024 [US2] Add a recognizable Share icon while preserving the Share accessible name in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T025 [US2] Implement Save PDF rendered-output preparation and clear failure handling in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T026 [US2] Update rendered output helper support for PDF title/body generation in `ui/src/components/ContentPanel/markdown-output.ts`
- [x] T027 [US2] Remove or update stale Print/Email/Slack expectations in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [x] T028 [US2] Run targeted US2 tests for `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`, `ui/src/components/ContentPanel/markdown-output.test.ts`, and `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Recognize Opened Git Folders Reliably (Priority: P1)

**Goal**: Git repository roots are recognized consistently across startup, picker, typed open, current-folder open, nested folders, files inside repositories, and git worktrees.

**Independent Test**: Open known git repositories, non-git folders, nested folders, repository files, and linked worktrees; verify `/api/info`, picker metadata, and repository UI agree with the expected classification.

### Tests for User Story 3

- [x] T029 [P] [US3] Add local path classification regression tests for repository roots, non-git folders, nested folders, repository files, and linked worktrees in `tests/unit/git/repo.test.ts`
- [x] T030 [P] [US3] Add `/api/repo/open` regression tests for repository roots, files inside repositories, and plain folders in `tests/unit/handlers/repo.test.ts`
- [x] T031 [P] [US3] Add startup/direct launch active-root regression tests in `tests/unit/handlers/repo.test.ts`
- [x] T032 [P] [US3] Add picker browse and current-folder open regression tests for repository roots and nested folders in `tests/unit/handlers/folder.test.ts`
- [x] T033 [P] [US3] Add picker UI regression tests for repository-row open routing and plain-folder routing in `ui/src/components/Picker/PickerPage.test.tsx`

### Implementation for User Story 3

- [x] T034 [US3] Normalize repository-root storage and returned root paths in `src/handlers/repo.ts`
- [x] T035 [US3] Ensure startup initialization stores repository roots from classification consistently in `src/server.ts`
- [x] T036 [US3] Harden local path classification for repository roots, nested folders, files, and worktrees in `src/git/repo.ts`
- [x] T037 [US3] Ensure folder browse/current-folder open capabilities use the same classification contract in `src/handlers/folder.ts`
- [x] T038 [US3] Ensure picker open routing preserves `openMode: "repository"` for repository rows in `ui/src/components/Picker/PickerPage.tsx`
- [x] T039 [US3] Document the diagnosed git-folder recognition cause and implemented fix in `specs/023-share-copy-regressions/release-review.md`
- [x] T040 [US3] Run targeted US3 tests for `tests/unit/git/repo.test.ts`, `tests/unit/handlers/repo.test.ts`, `tests/unit/handlers/folder.test.ts`, and `ui/src/components/Picker/PickerPage.test.tsx`

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: User Story 4 - Scan Toolbar Actions Quickly (Priority: P2)

**Goal**: Find in File, Refresh, and Light/Dark Theme controls include recognizable icons without losing existing labels, tooltips, accessibility, or behavior.

**Independent Test**: Open the content view and verify Find in File, Refresh, and Light/Dark Theme each display an appropriate icon and continue to perform the same action.

### Tests for User Story 4

- [x] T041 [P] [US4] Add tests for Refresh and Light/Dark Theme icon presence and accessible names in `ui/src/App.test.tsx`
- [x] T042 [P] [US4] Add tests for Find in File icon presence and accessible name in `ui/src/App.test.tsx`
- [x] T043 [P] [US4] Add native command parity regression coverage if toolbar icon changes affect native shortcuts in `ui/src/App.native-shortcuts.test.tsx`

### Implementation for User Story 4

- [x] T044 [US4] Add icons to Refresh and Light/Dark Theme controls while preserving behavior in `ui/src/App.tsx`
- [x] T045 [US4] Add an icon to the Find in File control while preserving behavior in `ui/src/App.tsx`
- [x] T046 [US4] Adjust toolbar icon spacing and responsive fit in `ui/src/styles/globals.css`
- [x] T047 [US4] Run targeted US4 tests for `ui/src/App.test.tsx` and `ui/src/App.native-shortcuts.test.tsx`

**Checkpoint**: User Story 4 is independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and release-readiness work across all stories.

- [x] T048 [P] Update patch release notes in `CHANGELOG.md`
- [x] T049 [P] Complete manual quickstart results for copy, Save PDF, removed actions, icons, and git-folder recognition in `specs/023-share-copy-regressions/release-review.md`
- [x] T050 [P] Review user-facing copy and accessibility names for action controls in `ui/src/components/ContentPanel/MarkdownShareActions.tsx` and `ui/src/App.tsx`
- [x] T051 Run full validation commands defined in `package.json`: `npm test`, `npm run lint`, and `npm run build`
- [x] T052 Run contrarian QA and consolidate findings in `specs/023-share-copy-regressions/release-review.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; blocks all user-story implementation.
- **User Stories (Phases 3-6)**: Depend on Phase 2.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: MVP; can start after Foundation and has no dependency on other stories.
- **User Story 2 (P1)**: Can start after Foundation; overlaps files with US1, so coordinate changes in `MarkdownShareActions.tsx`, `ContentPanel.tsx`, `markdown-output.ts`, and tests.
- **User Story 3 (P1)**: Can start after Foundation and can run independently from UI share/copy work.
- **User Story 4 (P2)**: Can start after Foundation; should be after or coordinated with US1/US2 if toolbar layout styles are being changed.

### Within Each User Story

- Write story tests first and confirm they fail.
- Implement helper/type changes before component/server integration.
- Update styles after component structure is in place.
- Run targeted story tests before moving to the next checkpoint.

---

## Parallel Opportunities

- T002, T003, and T004 can run in parallel after T001.
- T006 and T008 can run in parallel after T005.
- US1 test tasks T009, T010, and T011 can run in parallel.
- US2 test tasks T018, T019, T020, and T021 can run in parallel.
- US3 test tasks T029, T030, T031, T032, and T033 can run in parallel.
- US4 test tasks T041, T042, and T043 can run in parallel.
- US3 implementation can proceed in parallel with US1/US2 implementation because it touches server/picker classification rather than share controls.
- Polish tasks T048, T049, and T050 can run in parallel after story implementation is complete.

## Parallel Example: User Story 1

```text
Task: "T009 [P] [US1] Add failing tests for Copy button visibility in raw text and source views in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T010 [P] [US1] Add failing tests for rendered text copy behavior in ui/src/components/ContentPanel/MarkdownShareActions.test.tsx"
Task: "T011 [P] [US1] Add helper tests for raw versus rendered copy extraction in ui/src/components/ContentPanel/markdown-output.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T029 [P] [US3] Add local path classification regression tests for repository roots, non-git folders, nested folders, repository files, and linked worktrees in tests/unit/git/repo.test.ts"
Task: "T030 [P] [US3] Add /api/repo/open regression tests for repository roots, files inside repositories, and plain folders in tests/unit/handlers/repo.test.ts"
Task: "T032 [P] [US3] Add picker browse and current-folder open regression tests for repository roots and nested folders in tests/unit/handlers/folder.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for Copy across text views.
3. Stop and validate raw and rendered Copy independently.

### Patch-Release Priority

1. Complete all P1 stories: US1, US2, and US3.
2. Validate the action surface and git-folder recognition before toolbar polish.
3. Complete US4 icon polish.
4. Finish release-review, changelog, contrarian QA, and full validation.

### Parallel Team Strategy

1. One engineer handles US3 server/classification tests and implementation.
2. One engineer handles US1/US2 content-panel and share actions, coordinating shared files.
3. One engineer handles US4 toolbar icons and final visual/accessibility QA after action surfaces settle.

## Notes

- Keep this patch local-first: no hosted share links, email provider API, Slack API, telemetry, or cloud storage.
- Do not reintroduce visible Print while repairing Save PDF.
- Preserve nested-folder behavior: folders inside repositories are not repository roots unless local git classifies them as independent worktree roots.
- Commit after each user story or logical checkpoint if using the optional git hook workflow.
