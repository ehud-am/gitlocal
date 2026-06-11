# Tasks: Viewer Usability Upgrades

**Input**: Design documents from `specs/025-viewer-usability-upgrades/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included because the constitution requires 90% per-file coverage and this feature changes shared UI/server behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demonstrated independently after the foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because it touches different files and has no dependency on incomplete tasks
- **[Story]**: Maps the task to a user story from `spec.md`
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the current feature context and protect existing behavior before changing shared viewer surfaces.

- [X] T001 Review current viewer state persistence and URL synchronization in `ui/src/services/viewerState.ts`
- [X] T002 Review current content panel, Markdown renderer, and file find behavior in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T003 Review current repository search request/response behavior in `src/handlers/search.ts`
- [X] T004 Review current repo sync and working-tree revision behavior in `src/services/repo-watch.ts`
- [X] T005 Review current repository header and branch/status presentation in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T006 Review current file tree and local-only presentation in `ui/src/components/FileTree/FileTree.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared contracts, local API plumbing, and persisted viewer state needed by all user stories.

**CRITICAL**: No user story implementation should begin until this phase is complete.

- [X] T007 Extend shared server types for reading preferences, repo summaries, changed files, search scopes, key documents, recent items, and background notices in `src/types.ts`
- [X] T008 Extend shared UI types for reading preferences, repo summaries, changed files, search scopes, key documents, recent items, and background notices in `ui/src/types/index.ts`
- [X] T009 [P] Add viewer state tests for generated/local visibility, search scope, and recent item persistence in `ui/src/services/viewerState.test.ts`
- [X] T010 Implement persisted viewer preferences and recent item helpers in `ui/src/services/viewerState.ts`
- [X] T011 [P] Add API client tests for repo summary, changed files, navigation hints, scoped search, and sync notice parsing in `ui/src/services/api.test.ts`
- [X] T012 Implement API client methods and response typing for repo summary, changed files, navigation hints, scoped search, and sync notices in `ui/src/services/api.ts`
- [X] T013 [P] Add unit tests for generated/local classification, key document discovery, changed-file item mapping, and plain-language repo summaries in `tests/unit/git/repo.test.ts`
- [X] T014 Implement generated/local classification helpers, key document discovery helpers, changed-file item mapping, and plain-language repo summary helpers in `src/git/repo.ts`
- [X] T015 [P] Add unit tests for tree filtering and scoped traversal behavior in `tests/unit/git/tree.test.ts`
- [X] T016 Implement filtered tree traversal helpers for tracked-only, generated/local visibility, current-folder scope, and Markdown-focused search candidates in `src/git/tree.ts`
- [X] T017 [P] Add route coverage for repo summary, changed files, and navigation hints in `tests/unit/handlers/repo.test.ts`
- [X] T018 Add local API routes for repo summary, changed files, and navigation hints in `src/handlers/repo.ts`
- [X] T019 Wire any new repo summary, changed-files, and navigation-hints routes in `src/server.ts`
- [X] T020 Update integration coverage for new local API surfaces in `tests/integration/server.test.ts`

**Checkpoint**: Shared types, API client plumbing, repo helpers, and route foundations are ready for user story work.

---

## Phase 3: User Story 1 - Read Markdown Clearly in the Normal Viewer (Priority: P1) MVP

**Goal**: Open a Markdown file in the normal repository viewer, resolve nested relative links, highlight find matches in rendered Markdown, and keep read actions prominent without hiding repository context.

**Independent Test**: Open a long Markdown file, follow nested relative links, search within rendered content, and verify repository context remains visible without changing files.

### Tests for User Story 1

- [X] T021 [P] [US1] Add tests for duplicate heading IDs, hidden comment exclusion, and relative link resolution in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`
- [X] T022 [P] [US1] Add tests for normal-view find-in-file controls and rendered Markdown highlights in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 1

- [X] T024 [P] [US1] Implement Markdown relative path resolution and heading ID helpers in `ui/src/components/ContentPanel/markdown-navigation.ts`
- [X] T025 [P] [US1] Implement rendered Markdown find highlighting helpers in `ui/src/components/ContentPanel/markdown-find.ts`
- [X] T026 [US1] Update rendered Markdown links, heading anchors, and find-highlight rendering in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T027 [US1] Add normal-view find-highlight integration in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T028 [US1] Add rendered find-highlight styles with narrow-window safeguards in `ui/src/styles/globals.css`

**Checkpoint**: User Story 1 is fully functional and testable independently in the normal repository viewer.

---

## Phase 4: User Story 2 - Notice and Review Background Agent Changes (Priority: P1)

**Goal**: Detect external file changes, explain active-file refresh/deletion, and provide a changed-files review surface.

**Independent Test**: Open a file, modify/delete it outside GitLocal, observe the active-file notice, open changed files, and verify changed paths are grouped by state.

### Tests for User Story 2

- [X] T031 [P] [US2] Add sync notice and missing-path reconciliation tests in `tests/unit/services/repo-watch.test.ts`
- [X] T032 [P] [US2] Add sync handler response tests for activePathNotice and changedFilesSummary in `tests/unit/handlers/sync.test.ts`
- [X] T033 [P] [US2] Add changed-files UI tests for grouped states, deleted item fallback, and generated/local labels in `ui/src/components/RepoContext/RepoContextHeader.test.tsx`
- [X] T034 [P] [US2] Add app flow tests for external active-file refresh, deletion notice, and changed-files navigation in `ui/src/App.test.tsx`

### Implementation for User Story 2

- [X] T035 [US2] Extend sync status generation with active path notices, last refreshed metadata, changed-file summary, and duplicate-notice suppression data in `src/services/repo-watch.ts`
- [X] T036 [US2] Return activePathNotice and changedFilesSummary from sync responses in `src/handlers/sync.ts`
- [X] T037 [US2] Add changed-files list retrieval and deleted-path openability handling in `src/handlers/repo.ts`
- [X] T038 [US2] Add changed-files API consumption and active notice state handling in `ui/src/App.tsx`
- [X] T039 [US2] Add changed-files view, changed-files entry point, and active change notice presentation in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T040 [US2] Add changed-files and background notice styles in `ui/src/styles/globals.css`

**Checkpoint**: User Story 2 works independently with existing file viewing and repository status.

---

## Phase 5: User Story 3 - Search Without Losing Reading Context (Priority: P1)

**Goal**: Search in a separate surface with explicit scopes, result counts, generated/local controls, partial results, and preserved active document context.

**Independent Test**: Open search from a file, run scoped searches, toggle generated/local and Markdown-focused scopes, open a result, close search, and return to the prior document context.

### Tests for User Story 3

- [X] T041 [P] [US3] Add scoped search handler tests for current-folder, Markdown-focused, tracked-only, include-generated/local, limit, cursor, and partial-result behavior in `tests/unit/handlers/search.test.ts`
- [X] T042 [P] [US3] Add SearchPanel tests for scope controls, separate-surface behavior, result counts, partial state, and close behavior in `ui/src/components/Search/SearchPanel.test.tsx`
- [X] T043 [P] [US3] Add SearchResults tests for scope labels, changed/local metadata, keyboard selection, and snippets in `ui/src/components/Search/SearchResults.test.tsx`
- [X] T044 [P] [US3] Add app tests for preserving active file context while opening, scrolling, selecting, and dismissing search in `ui/src/App.test.tsx`

### Implementation for User Story 3

- [X] T045 [US3] Extend search query parsing, validation, result limits, and partial-result metadata in `src/handlers/search.ts`
- [X] T046 [US3] Implement scoped search traversal for current folder, Markdown-focused content, tracked-only, include-generated/local, and cursor continuation in `src/git/tree.ts`
- [X] T047 [US3] Update search API client methods and UI search state mapping in `ui/src/services/api.ts`
- [X] T048 [US3] Refactor repository search into a separate panel or overlay with explicit scope controls in `ui/src/components/Search/SearchPanel.tsx`
- [X] T049 [US3] Render result counts, partial state, scope labels, changed/local metadata, and accessible result actions in `ui/src/components/Search/SearchResults.tsx`
- [X] T050 [US3] Update app search presentation state to preserve active document context and previous search context in `ui/src/App.tsx`
- [X] T051 [US3] Add search surface layout, result count, scope control, and narrow-window styles in `ui/src/styles/globals.css`

**Checkpoint**: User Story 3 can be tested independently after foundational search contracts are in place.

---

## Phase 6: User Story 4 - Navigate Repository Documents Efficiently (Priority: P2)

**Goal**: Surface key documents, recent files, recently changed files, a useful collapsed rail, and a root dashboard before raw directory browsing.

**Independent Test**: Open the root, use key-doc/recent/changed shortcuts, collapse navigation, and verify raw directory browsing remains available.

### Tests for User Story 4

- [X] T052 [P] [US4] Add tests for key document and recent item persistence behavior in `ui/src/services/viewerState.test.ts`
- [X] T053 [P] [US4] Add FileTree tests for generated/local visibility and active-file exceptions in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T054 [P] [US4] Add ContentPanel tests for root dashboard sections, key docs, recent items, changed items, and raw directory fallback in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T055 [P] [US4] Add App tests for collapsed rail actions and root/dashboard navigation in `ui/src/App.test.tsx`

### Implementation for User Story 4

- [X] T056 [US4] Implement key document and recent item server hints in `src/handlers/repo.ts`
- [X] T057 [US4] Persist and prune recently viewed and recently changed items in `ui/src/services/viewerState.ts`
- [X] T058 [US4] Add generated/local visibility filtering and active-file exception rendering in `ui/src/components/FileTree/FileTree.tsx`
- [X] T059 [US4] Add generated/local visibility labels and collapsed-state affordances in `ui/src/components/FileTree/FileTreeNode.tsx`
- [X] T060 [US4] Replace root-first directory presentation with dashboard sections and retained raw directory browsing in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T061 [US4] Add collapsed rail actions for search, changed files, recent files, key docs/root, current folder, and expand navigation in `ui/src/App.tsx`
- [X] T062 [US4] Add dashboard, recent item, key document, generated/local toggle, and collapsed rail styles in `ui/src/styles/globals.css`

**Checkpoint**: User Story 4 works independently once repo hints and viewer state persistence are available.

---

## Phase 7: User Story 5 - Understand Repository State in Plain Language (Priority: P2)

**Goal**: Explain branch, remote, sync, and local changes in a concise sentence while keeping technical badges as supporting detail.

**Independent Test**: Open remote, local-only, no-upstream, no-commit, unavailable remote, and changed repositories and confirm the summary is understandable.

### Tests for User Story 5

- [X] T063 [P] [US5] Add repo summary tests for remote clone, local-only, no upstream, no commits, unavailable remote, ahead, behind, diverged, and local changes in `tests/unit/git/repo.test.ts`
- [X] T064 [P] [US5] Add RepoContextHeader tests for plain-language status, badge fallback, and changed-files entry point in `ui/src/components/RepoContext/RepoContextHeader.test.tsx`
- [X] T065 [P] [US5] Add App tests for repo summary loading and local/generated visibility state propagation in `ui/src/App.test.tsx`

### Implementation for User Story 5

- [X] T066 [US5] Implement plain-language repository status summary generation in `src/git/repo.ts`
- [X] T067 [US5] Return repository status summary and local/generated visibility context from repo info or summary responses in `src/handlers/repo.ts`
- [X] T068 [US5] Add repository summary loading, caching, and invalidation to app-level state in `ui/src/App.tsx`
- [X] T069 [US5] Render plain-language status, technical badge support, local change count, and changed-files action in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [X] T070 [US5] Add repository status summary layout and tone styles in `ui/src/styles/globals.css`

**Checkpoint**: User Story 5 is independently demonstrable with mocked and real repository states.

---

## Phase 8: User Story 6 - Make Rare Edits Safely (Priority: P3)

**Goal**: Keep write actions discoverable but secondary, warn before dirty navigation, and block accidental overwrite when files change externally.

**Independent Test**: Open an editable file, confirm edit/delete are secondary, start a dirty edit, try navigation/search/refresh/branch changes, then modify externally and confirm save conflict handling.

### Tests for User Story 6

- [X] T071 [P] [US6] Add ContentPanel tests for secondary edit/delete placement, dirty navigation warnings, and conflict messaging in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T072 [P] [US6] Add InlineFileEditor tests for external-change conflict messaging and recovery actions in `ui/src/components/ContentPanel/InlineFileEditor.test.tsx`
- [X] T073 [P] [US6] Add App tests for dirty edit warnings during search result selection, refresh, and branch change in `ui/src/App.test.tsx`
- [X] T074 [P] [US6] Add file handler tests for revision-token conflict responses after external modification in `tests/unit/handlers/file.test.ts`

### Implementation for User Story 6

- [X] T075 [US6] Ensure file update conflict responses are user-readable and preserve revision safety in `src/handlers/file.ts`
- [X] T076 [US6] Add edit conflict state and recovery messaging to `ui/src/components/ContentPanel/InlineFileEditor.tsx`
- [X] T077 [US6] Rebalance file and folder action placement so read/review actions remain primary and edit/delete remain secondary in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T078 [US6] Extend dirty edit guard handling for search result selection, refresh, and branch change in `ui/src/App.tsx`
- [X] T079 [US6] Add rare-edit, conflict, and destructive-secondary styles in `ui/src/styles/globals.css`

**Checkpoint**: User Story 6 can be validated independently without changing the read-first workflows.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verify cross-story behavior, accessibility, performance, docs, and release readiness.

- [X] T080 [P] Add or update quickstart validation notes for implemented viewer workflows in `specs/025-viewer-usability-upgrades/quickstart.md`
- [X] T081 [P] Add release-review notes covering usability risks, accessibility checks, and performance observations in `specs/025-viewer-usability-upgrades/release-review.md`
- [X] T082 [P] Review README workflow descriptions for new reading, search, changed-files, and dashboard behavior in `README.md`
- [X] T083 Run focused UI tests from quickstart and fix regressions in `ui/src/App.test.tsx`
- [X] T084 Run focused server tests from quickstart and fix regressions in `tests/unit/handlers/search.test.ts`
- [X] T085 Run `npm test` and address coverage failures in touched files reported by Vitest
- [X] T086 Run `npm run build` and address TypeScript or bundle failures in touched files
- [X] T087 Manually validate quickstart scenarios in a local GitLocal session using `specs/025-viewer-usability-upgrades/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 review tasks and blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2. This is the MVP and can ship first.
- **Phase 4 US2**: Depends on Phase 2. Can run in parallel with US1 after foundation, but integrates best after shared sync/API types exist.
- **Phase 5 US3**: Depends on Phase 2. Can run in parallel with US1/US2 after foundation.
- **Phase 6 US4**: Depends on Phase 2 and benefits from US2 changed-file entities and US5 repo summary, but remains independently testable with mocked data.
- **Phase 7 US5**: Depends on Phase 2. Can run in parallel with US4 after foundation.
- **Phase 8 US6**: Depends on Phase 2 and should be validated after US3 interaction changes because dirty guards span search and navigation flows.
- **Phase 9 Polish**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 Read Markdown Clearly in the Normal Viewer**: MVP; no dependency on other stories after foundation.
- **US2 Notice and Review Background Agent Changes**: Independent after foundation.
- **US3 Search Without Losing Reading Context**: Independent after foundation.
- **US4 Navigate Repository Documents Efficiently**: Independent after foundation but can reuse US2/US5 data when available.
- **US5 Understand Repository State in Plain Language**: Independent after foundation.
- **US6 Make Rare Edits Safely**: Independent after foundation, with extra regression checks against US1 and US3 flows.

### Within Each User Story

- Tests come before implementation and should fail before the story is implemented.
- Shared helpers/types precede UI integration.
- Server helpers and handlers precede API client consumption.
- UI state and component changes precede final layout/style polish.
- Each story reaches a checkpoint where it can be validated independently.

---

## Parallel Execution Examples

### User Story 1

```text
Task: T021 Markdown heading ID and relative link tests in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx
Task: T022 Normal-view find-in-file tests in ui/src/components/ContentPanel/ContentPanel.test.tsx
Task: T024 Markdown navigation helpers in ui/src/components/ContentPanel/markdown-navigation.ts
Task: T025 Markdown find helpers in ui/src/components/ContentPanel/markdown-find.ts
```

### User Story 2

```text
Task: T031 Repo-watch sync notice tests in tests/unit/services/repo-watch.test.ts
Task: T032 Sync handler response tests in tests/unit/handlers/sync.test.ts
Task: T033 Changed-files UI tests in ui/src/components/RepoContext/RepoContextHeader.test.tsx
Task: T034 App flow tests in ui/src/App.test.tsx
```

### User Story 3

```text
Task: T041 Search handler scope tests in tests/unit/handlers/search.test.ts
Task: T042 SearchPanel scope tests in ui/src/components/Search/SearchPanel.test.tsx
Task: T043 SearchResults metadata tests in ui/src/components/Search/SearchResults.test.tsx
Task: T044 App search context tests in ui/src/App.test.tsx
```

### User Story 4

```text
Task: T052 Recent item persistence tests in ui/src/services/viewerState.test.ts
Task: T053 FileTree visibility tests in ui/src/components/FileTree/FileTree.test.tsx
Task: T054 Root dashboard tests in ui/src/components/ContentPanel/ContentPanel.test.tsx
Task: T055 Collapsed rail tests in ui/src/App.test.tsx
```

### User Story 5

```text
Task: T063 Repo summary helper tests in tests/unit/git/repo.test.ts
Task: T064 RepoContextHeader summary tests in ui/src/components/RepoContext/RepoContextHeader.test.tsx
Task: T065 App repo summary loading tests in ui/src/App.test.tsx
```

### User Story 6

```text
Task: T071 ContentPanel rare edit tests in ui/src/components/ContentPanel/ContentPanel.test.tsx
Task: T072 InlineFileEditor conflict tests in ui/src/components/ContentPanel/InlineFileEditor.test.tsx
Task: T073 App dirty guard tests in ui/src/App.test.tsx
Task: T074 File handler revision conflict tests in tests/unit/handlers/file.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup review.
2. Complete Phase 2 foundational types, API plumbing, repo helpers, and viewer preferences.
3. Complete Phase 3 US1 normal-view Markdown reading.
4. Stop and validate US1 independently with the Markdown Reading and Relative Markdown Links quickstart sections.

### Incremental Delivery

1. Add US1 Markdown navigation and rendered find improvements.
2. Add US2 background change and changed-files review.
3. Add US3 scoped search as a separate surface.
4. Add US5 plain-language repo status and US4 dashboard/navigation improvements.
5. Add US6 rare edit safety polish.
6. Finish Phase 9 cross-story verification.

### Parallel Team Strategy

After Phase 2, separate developers can work on US1, US2, US3, and US5 in parallel because they mostly touch different helpers/components. Coordinate changes to `ui/src/App.tsx`, `src/types.ts`, `ui/src/types/index.ts`, and `ui/src/styles/globals.css` because those are shared integration files across stories.

## Notes

- Keep new runtime dependencies out unless implementation proves they are necessary and constitutionally justified.
- Preserve local-first behavior: no telemetry, accounts, hosted sharing, or cloud services.
- Maintain repository-relative documentation paths.
- Keep destructive actions secondary in reading surfaces.
- Run focused tests before full `npm test` to keep iteration tight.
