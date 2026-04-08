# Tasks: Ignored Local File Visibility

**Input**: Design documents from `specs/008-ignored-files-visibility/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Tests**: Include targeted backend and frontend tests because the constitution, contracts, and quickstart require coverage-preserving validation for local-only metadata, ignored-item discoverability, and ignored-only empty-state behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g. `US1`, `US2`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared client/server types and API contracts for ignored local item metadata.

- [X] T001 Add `localOnly` support to shared browse-entry and search-result models in `src/types.ts`
- [X] T002 [P] Mirror `localOnly` browse-entry and search-result models in `ui/src/types/index.ts`
- [X] T003 [P] Update tree and search API typings for `localOnly` metadata in `ui/src/services/api.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared ignored-item detection and server-contract plumbing that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Extend ignored-path classification and browseable root-entry counting for visible local-only items in `src/git/repo.ts`
- [X] T005 Extend current-working-tree list and search helpers to emit ignored files, ignored folders, and `localOnly` metadata in `src/git/tree.ts`
- [X] T006 [P] Expose enriched tree-entry responses in `src/handlers/files.ts`
- [X] T007 [P] Expose ignored-aware repository metadata in `src/handlers/git.ts`
- [X] T008 [P] Expose `localOnly` search results for working-tree queries in `src/handlers/search.ts`
- [X] T009 [P] Add unit coverage for ignored directory entries and root-entry counting in `tests/unit/git/repo.test.ts`
- [X] T010 [P] Add unit coverage for ignored working-tree list and search helpers in `tests/unit/git/tree.test.ts`
- [X] T011 [P] Add handler coverage for ignored-aware repository info and tree responses in `tests/unit/handlers/git.test.ts`
- [X] T012 [P] Add handler coverage for local-only search responses in `tests/unit/handlers/search.test.ts`
- [X] T013 [P] Add integration coverage for ignored tree and search contracts in `tests/integration/server.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Browse ignored local items in GitLocal (Priority: P1) 🎯 MVP

**Goal**: Make ignored local files and folders discoverable through the current working-tree browser, folder view, and repository search.

**Independent Test**: Open a mixed repository and verify ignored items appear in the repository tree, current-folder listing, and working-tree search results, and can be opened through the same basic browsing flows as other visible items.

### Tests for User Story 1

- [X] T014 [P] [US1] Add frontend coverage for ignored entries in the repository tree in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T015 [P] [US1] Add frontend coverage for ignored entries in folder directory views in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T016 [P] [US1] Add frontend coverage for ignored search results and folder-result activation in `ui/src/components/Search/SearchPanel.test.tsx`
- [X] T017 [P] [US1] Add app-level coverage for browsing ignored items from tree, folder list, and search in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [X] T018 [US1] Wire ignored-aware selected item state and folder-capable search activation through the viewer flow in `ui/src/App.tsx`
- [X] T019 [US1] Update repository search result rendering and activation for ignored files and folders in `ui/src/components/Search/SearchResults.tsx`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Understand that ignored items stay local (Priority: P1)

**Goal**: Apply a consistent local-only cue so ignored items are clearly visible as local content rather than tracked remote-facing repository content.

**Independent Test**: View ignored items in a mixed repository and confirm the tree, folder list, search results, and active item context all make the local-only status understandable without extra explanation.

### Tests for User Story 2

- [X] T020 [P] [US2] Add frontend coverage for local-only tree cues in `ui/src/components/FileTree/FileTree.test.tsx`
- [X] T021 [P] [US2] Add frontend coverage for local-only directory and active-context cues in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T022 [P] [US2] Add frontend coverage for local-only search-result cues in `ui/src/components/Search/SearchPanel.test.tsx`
- [X] T023 [P] [US2] Add app-level coverage for preserving local-only context after opening ignored items in `ui/src/App.test.tsx`

### Implementation for User Story 2

- [X] T024 [US2] Render a local-only cue for ignored tree entries in `ui/src/components/FileTree/FileTreeNode.tsx`
- [X] T025 [US2] Render local-only cues in directory rows and active file or folder context in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T026 [US2] Render local-only cues in repository search results in `ui/src/components/Search/SearchResults.tsx`
- [X] T027 [P] [US2] Add shared local-only presentation styles in `ui/src/App.css`

**Checkpoint**: User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Avoid false empty states for ignored-only content (Priority: P2)

**Goal**: Treat ignored-only roots and folders as real visible content so GitLocal does not present them as empty or broken, and handle disappeared ignored items gracefully.

**Independent Test**: Open a repository root or folder that contains only ignored local items and verify GitLocal shows those items instead of an empty state; then remove an ignored item and confirm the UI falls back to a clear unavailable outcome.

### Tests for User Story 3

- [X] T028 [P] [US3] Add app-level coverage for ignored-only repository landing states and non-current-branch fallback in `ui/src/App.test.tsx`
- [X] T029 [P] [US3] Add content-panel coverage for ignored-only folders and unavailable ignored items in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 3

- [X] T030 [US3] Update repository landing-state classification to treat ignored-only root content as browseable in `ui/src/App.tsx`
- [X] T031 [US3] Adjust directory empty-state and unavailable-item handling for ignored-only content in `ui/src/components/ContentPanel/ContentPanel.tsx`

**Checkpoint**: User Story 3 should be fully functional and testable independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish copy consistency, manual validation, and full verification across the feature.

- [X] T032 Review local-only copy and result labels for consistency across `ui/src/App.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`, and `ui/src/components/Search/SearchResults.tsx`
- [ ] T033 [P] Run the manual validation flow in `specs/008-ignored-files-visibility/quickstart.md` and capture any follow-up notes in `specs/008-ignored-files-visibility/quickstart.md`
- [X] T034 [P] Run full verification with `npm test`, `npm run lint`, and `npm run build` from `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 because the local-only cue builds on ignored-item visibility and selection flow
- **User Story 3 (Phase 5)**: Depends on User Story 1 and the ignored-aware repository metadata from Foundational
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on later stories
- **User Story 2 (P1)**: Depends on US1's visible ignored-item flows so the cue can be applied consistently
- **User Story 3 (P2)**: Depends on the shared ignored-item metadata and browse surfaces from Foundational + US1

### Within Each User Story

- Coverage tasks should be written before or alongside implementation for the same story
- Viewer-state wiring before surface-specific cue rendering
- Core story behavior before polish or wording cleanup

### Parallel Opportunities

- `T002` and `T003` can run in parallel after `T001`
- `T006`, `T007`, and `T008` can run in parallel after `T004` and `T005`
- `T009` through `T013` can run in parallel after the foundational handlers and helpers are in place
- `T014` through `T017` can run in parallel inside US1 before the final implementation pass in `T018` and `T019`
- `T020` through `T023` and `T027` can run in parallel inside US2 after US1 is complete
- `T028` and `T029` can run in parallel inside US3 before `T030` and `T031`
- `T033` and `T034` can run in parallel during polish after implementation is complete

---

## Parallel Example: User Story 1

```bash
Task: "Add frontend coverage for ignored entries in the repository tree in ui/src/components/FileTree/FileTree.test.tsx"
Task: "Add frontend coverage for ignored entries in folder directory views in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "Add frontend coverage for ignored search results and folder-result activation in ui/src/components/Search/SearchPanel.test.tsx"
Task: "Add app-level coverage for browsing ignored items from tree, folder list, and search in ui/src/App.test.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Add frontend coverage for local-only tree cues in ui/src/components/FileTree/FileTree.test.tsx"
Task: "Add frontend coverage for local-only directory and active-context cues in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "Add frontend coverage for local-only search-result cues in ui/src/components/Search/SearchPanel.test.tsx"
Task: "Add shared local-only presentation styles in ui/src/App.css"
```

## Parallel Example: User Story 3

```bash
Task: "Add app-level coverage for ignored-only repository landing states and non-current-branch fallback in ui/src/App.test.tsx"
Task: "Add content-panel coverage for ignored-only folders and unavailable ignored items in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate ignored-item discoverability independently before adding cue work

### Incremental Delivery

1. Complete Setup + Foundational to establish ignored-item metadata and contracts
2. Deliver User Story 1 so ignored files and folders become discoverable across browsing and search
3. Add User Story 2 so ignored items are clearly marked as local-only
4. Add User Story 3 so ignored-only roots and folders no longer feel empty or broken
5. Finish with copy cleanup, quickstart validation, and full verification

### Parallel Team Strategy

1. One developer handles server helpers and handlers in Phase 2 while another prepares shared UI type and API updates from Phase 1
2. Once Foundational is complete:
   - Developer A: User Story 1 visibility and search activation
   - Developer B: User Story 2 local-only cue presentation
   - Developer C: User Story 3 empty-state behavior
3. Rejoin for polish and full verification after story-specific work stabilizes

---

## Notes

- [P] tasks are safe parallel opportunities because they touch different files or depend only on completed shared work
- Each user story is scoped to remain independently testable
- The suggested MVP scope is User Story 1 only
- All tasks follow the required checklist format with task ID, optional parallel marker, story label where needed, and exact file paths
