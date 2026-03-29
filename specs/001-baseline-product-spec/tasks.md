# Tasks: Current Product Baseline

**Input**: Design documents from `/specs/001-baseline-product-spec/`
**Prerequisites**: [plan.md](/Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/plan.md), [spec.md](/Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/spec.md), [research.md](/Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/research.md), [data-model.md](/Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md), [contracts/](/Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts)

**Tests**: The feature specification does not request TDD-only execution, so tasks focus on documentation and validation work. Validation is captured through contract review and quickstart verification tasks rather than dedicated first-failing test tasks.

**Organization**: Tasks are grouped by user story so each documented product capability can be completed and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the baseline documentation workspace and planning context

- [ ] T001 Confirm baseline feature scope and planning metadata in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/plan.md
- [ ] T002 Create the baseline feature specification shell in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/spec.md
- [ ] T003 [P] Capture planning decisions and constraints in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/research.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared runtime model and interface surfaces that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Define shared runtime entities and relationships in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md
- [ ] T005 [P] Document the baseline CLI contract in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/cli.md
- [ ] T006 [P] Document the baseline local HTTP API contract in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/http-api.yaml
- [ ] T007 [P] Document the baseline UI navigation contract in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/ui-navigation.md

**Checkpoint**: Foundation ready - user story documentation can now proceed in priority order

---

## Phase 3: User Story 1 - Open and Understand a Repository (Priority: P1) 🎯 MVP

**Goal**: Document the repository entry flow, picker flow, and initial repository session behavior for first-time orientation

**Independent Test**: Launch GitLocal with and without a repository path and verify the spec, contracts, and quickstart together describe the header, branch context, README auto-open, picker behavior, and invalid-repository handling without relying on unstated assumptions.

### Implementation for User Story 1

- [ ] T008 [US1] Refine User Story 1 acceptance criteria and feature inventory in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/spec.md
- [ ] T009 [P] [US1] Map Repository Session and Picker Submission behavior to User Story 1 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md
- [ ] T010 [P] [US1] Align initial-load and picker navigation flows with User Story 1 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/ui-navigation.md
- [ ] T011 [US1] Align CLI startup, browser launch, and picker-mode behavior with User Story 1 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/cli.md
- [ ] T012 [US1] Add repository-entry verification steps for User Story 1 to /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/quickstart.md

**Checkpoint**: User Story 1 is fully documented and can be validated independently as the MVP baseline

---

## Phase 4: User Story 2 - Browse and Read Repository Contents (Priority: P1)

**Goal**: Document lazy tree navigation and file-type-aware reading behavior across Markdown, text, image, and binary content

**Independent Test**: Use the quickstart to browse a loaded repository and confirm the documentation fully covers folder expansion, file selection, Markdown rendering, raw view toggling, breadcrumbs, relative-link navigation, and content-type-specific display states.

### Implementation for User Story 2

- [ ] T013 [US2] Refine User Story 2 acceptance criteria and feature inventory in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/spec.md
- [ ] T014 [P] [US2] Map Repository Tree Node and File View behavior to User Story 2 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md
- [ ] T015 [P] [US2] Align tree and file retrieval behavior with User Story 2 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/http-api.yaml
- [ ] T016 [P] [US2] Align file tree, breadcrumb, and content navigation flows with User Story 2 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/ui-navigation.md
- [ ] T017 [US2] Add repository-browsing and file-view verification steps for User Story 2 to /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/quickstart.md

**Checkpoint**: User Stories 1 and 2 now describe the full repository-opening and file-browsing baseline independently

---

## Phase 5: User Story 3 - Review Git Context Without Changing the Repository (Priority: P2)

**Goal**: Document branch context, recent-commit visibility, and the read-only nature of repository browsing

**Independent Test**: Switch between branches in a repository with history and confirm the documentation describes branch listing, commit summaries, refresh behavior, and read-only boundaries without requiring external interpretation.

### Implementation for User Story 3

- [ ] T018 [US3] Refine User Story 3 acceptance criteria and read-only requirements in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/spec.md
- [ ] T019 [P] [US3] Map Branch View and Commit Summary behavior to User Story 3 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md
- [ ] T020 [P] [US3] Align branch and commit endpoint behavior with User Story 3 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/http-api.yaml
- [ ] T021 [P] [US3] Align branch-selection navigation flow with User Story 3 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/ui-navigation.md
- [ ] T022 [US3] Add branch-switching and history verification steps for User Story 3 to /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/quickstart.md

**Checkpoint**: User Stories 1 through 3 now cover repository access, browsing, and git context as an independently reviewable baseline

---

## Phase 6: User Story 4 - Recover Gracefully from Missing Content and Loading Failures (Priority: P3)

**Goal**: Document non-happy-path behavior so missing README, invalid repository, missing file, and load failures are part of the supported baseline

**Independent Test**: Exercise invalid and missing-content scenarios and confirm the spec, contracts, and quickstart consistently describe the expected user-facing failure states.

### Implementation for User Story 4

- [ ] T023 [US4] Refine User Story 4 acceptance criteria and edge-case coverage in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/spec.md
- [ ] T024 [P] [US4] Map failure-oriented Repository Session, File View, and Picker Submission behavior to User Story 4 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md
- [ ] T025 [P] [US4] Align error responses and empty-result behavior with User Story 4 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/http-api.yaml
- [ ] T026 [P] [US4] Align error-state navigation and empty-state flows with User Story 4 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/ui-navigation.md
- [ ] T027 [US4] Add invalid-path and missing-content verification steps for User Story 4 to /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/quickstart.md

**Checkpoint**: All four user stories are fully documented and independently reviewable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency and contributor-facing alignment across the whole baseline package

- [ ] T028 [P] Reconcile cross-story terminology and requirement coverage in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/spec.md and /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/plan.md
- [ ] T029 [P] Sync contributor-facing agent guidance with the finalized baseline in /Users/ehudamiri/Documents/projects/gitlocal/AGENTS.md
- [ ] T030 Run end-to-end baseline validation using /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/quickstart.md and record any follow-up updates in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/research.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational completion - no dependency on other user stories
- **User Story 2 (P1)**: Can start after Foundational completion - depends only on shared contracts and model definitions, not on US1 deliverables
- **User Story 3 (P2)**: Can start after Foundational completion - builds on shared repository and branch contracts, but remains independently reviewable
- **User Story 4 (P3)**: Can start after Foundational completion - depends on shared session and API contracts, but remains independently reviewable

### Within Each User Story

- Update story-specific acceptance criteria in `spec.md` before polishing dependent contracts
- Update the relevant data-model and contract artifacts before expanding quickstart verification
- Complete story quickstart coverage before marking the story done

### Parallel Opportunities

- T005, T006, and T007 can run in parallel once T004 establishes the shared model
- Within US1, T009 and T010 can run in parallel before T011 and T012
- Within US2, T014, T015, and T016 can run in parallel before T017
- Within US3, T019, T020, and T021 can run in parallel before T022
- Within US4, T024, T025, and T026 can run in parallel before T027
- T028 and T029 can run in parallel before the final T030 validation task

---

## Parallel Example: User Story 2

```bash
Task: "Map Repository Tree Node and File View behavior to User Story 2 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md"
Task: "Align tree and file retrieval behavior with User Story 2 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/http-api.yaml"
Task: "Align file tree, breadcrumb, and content navigation flows with User Story 2 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/ui-navigation.md"
```

---

## Parallel Example: User Story 3

```bash
Task: "Map Branch View and Commit Summary behavior to User Story 3 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/data-model.md"
Task: "Align branch and commit endpoint behavior with User Story 3 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/http-api.yaml"
Task: "Align branch-selection navigation flow with User Story 3 in /Users/ehudamiri/Documents/projects/gitlocal/specs/001-baseline-product-spec/contracts/ui-navigation.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate repository entry, picker flow, and README-first behavior using `quickstart.md`

### Incremental Delivery

1. Complete Setup + Foundational to define the shared baseline artifacts
2. Deliver User Story 1 for repository entry and orientation
3. Deliver User Story 2 for tree browsing and file reading
4. Deliver User Story 3 for branch and commit context
5. Deliver User Story 4 for failure-mode coverage
6. Finish with cross-cutting reconciliation and full quickstart validation

### Parallel Team Strategy

1. One contributor completes Setup and Foundational phases
2. After Foundational completion:
   - Contributor A: User Story 1 or User Story 2
   - Contributor B: User Story 3
   - Contributor C: User Story 4
3. Finish with shared polish and validation

---

## Notes

- All tasks follow the required checklist format: checkbox, task ID, optional `[P]`, required story label for user-story tasks, and exact file paths
- Suggested MVP scope: **User Story 1** only
- Total tasks: **30**
- Task counts by story:
  - **US1**: 5 tasks
  - **US2**: 5 tasks
  - **US3**: 5 tasks
  - **US4**: 5 tasks
- Shared tasks:
  - **Setup**: 3 tasks
  - **Foundational**: 4 tasks
  - **Polish**: 3 tasks
