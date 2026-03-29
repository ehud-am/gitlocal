# Tasks: Release Quality and Automation

**Input**: Design documents from `/specs/002-release-quality-automation/`
**Prerequisites**: [plan.md](specs/002-release-quality-automation/plan.md), [spec.md](specs/002-release-quality-automation/spec.md), [research.md](specs/002-release-quality-automation/research.md), [data-model.md](specs/002-release-quality-automation/data-model.md), [contracts/](specs/002-release-quality-automation/contracts)

**Tests**: This feature explicitly requires automated verification and release gating, so test and workflow-validation tasks are included where they provide direct acceptance coverage.

**Organization**: Tasks are grouped by user story so each release slice can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare repository automation files, validation commands, and shared release plumbing

- [X] T001 Create workflow directory scaffolding in .github/workflows/ci.yml and .github/workflows/publish.yml
- [X] T002 Update root release and verification commands in package.json
- [X] T003 [P] Update frontend build and verification commands in ui/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared build-health and automation prerequisites that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Define the release-quality workflow inputs and shared constraints in specs/002-release-quality-automation/plan.md
- [X] T005 [P] Add or refresh locked dependency metadata in package-lock.json
- [X] T006 [P] Add or refresh locked dependency metadata in ui/package-lock.json
- [X] T007 [P] Add shared build-size and bundling configuration in ui/vite.config.ts
- [X] T008 Add repository-level workflow documentation context in AGENTS.md

**Checkpoint**: Foundation ready - user story work can now proceed in priority order

---

## Phase 3: User Story 1 - Choose a Repository Confidently (Priority: P1) 🎯 MVP

**Goal**: Replace the basic no-path page with a polished GitLocal-styled repository selector that explains why selection is required and supports finder-style browsing

**Independent Test**: Launch GitLocal without a repository path and confirm the new selector explains the missing launch path, matches the main UI, supports folder browsing/selection, and still opens a valid repository correctly.

### Tests for User Story 1

- [X] T009 [P] [US1] Expand picker interaction coverage in ui/src/components/Picker/PickerPage.test.tsx
- [X] T010 [P] [US1] Add integration coverage for picker-mode entry flow in tests/integration/server.test.ts

### Implementation for User Story 1

- [X] T011 [P] [US1] Redesign picker page layout and messaging in ui/src/components/Picker/PickerPage.tsx
- [X] T012 [P] [US1] Add shared picker visual styling to match the main app in ui/src/App.css
- [X] T013 [US1] Update picker-mode composition in ui/src/App.tsx
- [X] T014 [US1] Extend picker request and validation types in src/types.ts
- [X] T015 [US1] Enhance repository selection behavior for browse-style interactions in src/handlers/pick.ts
- [X] T039 [US1] Preserve picker launch context for empty-path and non-git-path startup flows in src/server.ts and src/handlers/git.ts
- [X] T040 [P] [US1] Add API and handler coverage for parent-folder picker transitions in src/handlers/pick.ts and tests/unit/handlers/pick.test.ts
- [X] T041 [US1] Add integration coverage for startup picker context and viewer-to-picker transitions in tests/integration/server.test.ts
- [X] T042 [US1] Add a repository-view control that opens the parent-folder picker in ui/src/App.tsx and ui/src/App.css
- [X] T043 [US1] Update frontend picker-mode API integration for parent-folder browsing in ui/src/services/api.ts

**Checkpoint**: User Story 1 delivers a usable, branded folder-selection experience and can be validated independently

---

## Phase 4: User Story 2 - Trust Pull Request Quality Gates (Priority: P1)

**Goal**: Ensure every pull request runs the required verification workflow and fails closed when checks do not pass

**Independent Test**: Open or update a pull request and verify that the CI workflow runs automatically, executes the project verification suite, and blocks acceptance when the run fails.

### Tests for User Story 2

- [X] T016 [P] [US2] Add workflow validation coverage for CI expectations in .github/workflows/ci.yml
- [X] T017 [P] [US2] Document pull-request verification steps in specs/002-release-quality-automation/quickstart.md

### Implementation for User Story 2

- [X] T018 [US2] Implement required pull-request verification workflow in .github/workflows/ci.yml
- [X] T019 [P] [US2] Align repository verification entrypoints with CI in package.json
- [X] T020 [P] [US2] Align frontend verification entrypoints with CI in ui/package.json
- [X] T021 [US2] Document branch-protection and required-check expectations in specs/002-release-quality-automation/contracts/ci-release-workflows.md
- [X] T044 [US2] Add automated accessibility assertions to the UI test harness in ui/src/test-setup.ts and ui/package.json
- [X] T045 [P] [US2] Add accessibility coverage to UI component tests in ui/src/components/Breadcrumb/Breadcrumb.test.tsx, ui/src/components/FileTree/FileTree.test.tsx, ui/src/components/GitInfo/GitInfo.test.tsx, ui/src/components/Picker/PickerPage.test.tsx, and ui/src/components/ContentPanel/ContentPanel.test.tsx
- [X] T046 [US2] Fix accessibility violations surfaced by the automated checks in ui/src/components/Picker/PickerPage.tsx

**Checkpoint**: User Story 2 delivers enforceable pull-request verification independent of the other release slices

---

## Phase 5: User Story 3 - Build Releases Without Health Warnings (Priority: P2)

**Goal**: Remove the currently targeted build and dependency health warnings from the release path

**Independent Test**: Run the standard dependency install, test, and build flow and confirm the targeted chunk-size warning, deprecated dependency warning, and moderate dependency issues are removed or reduced below the release threshold.

### Tests for User Story 3

- [X] T022 [P] [US3] Add release-health verification steps to specs/002-release-quality-automation/quickstart.md
- [X] T023 [P] [US3] Add dependency-health command coverage in package.json

### Implementation for User Story 3

- [X] T024 [US3] Reduce frontend bundle warning risk in ui/vite.config.ts
- [X] T025 [P] [US3] Update root dependencies to remove targeted deprecations and vulnerabilities in package.json
- [X] T026 [P] [US3] Update frontend dependencies to remove targeted deprecations and vulnerabilities in ui/package.json
- [X] T027 [US3] Refresh root lockfile after dependency remediation in package-lock.json
- [X] T028 [US3] Refresh frontend lockfile after dependency remediation in ui/package-lock.json
- [X] T029 [US3] Record release-health acceptance expectations in specs/002-release-quality-automation/contracts/release-health.md

**Checkpoint**: User Story 3 delivers a clean release build path without depending on release publishing work

---

## Phase 6: User Story 4 - Publish Automatically on Release (Priority: P2)

**Goal**: Publish the npm package automatically from repository release events with safe precondition checks and visible failure handling

**Independent Test**: Create a repository release and confirm the publish workflow starts automatically, checks prerequisites, publishes when valid, and fails clearly when credentials or metadata are not acceptable.

### Tests for User Story 4

- [X] T030 [P] [US4] Add release-publish validation steps to specs/002-release-quality-automation/quickstart.md
- [X] T031 [P] [US4] Add workflow contract coverage for release publishing in specs/002-release-quality-automation/contracts/ci-release-workflows.md

### Implementation for User Story 4

- [X] T032 [US4] Implement release-triggered publish workflow in .github/workflows/publish.yml
- [X] T033 [P] [US4] Add publish-ready package metadata checks in package.json
- [X] T034 [P] [US4] Add publish-safe release health prerequisites in specs/002-release-quality-automation/contracts/release-health.md
- [X] T035 [US4] Document release publication expectations and failure handling in specs/002-release-quality-automation/quickstart.md

**Checkpoint**: User Story 4 delivers release-triggered publication independently of the picker UX work

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final reconciliation across UI, workflows, and release documentation

- [X] T036 [P] Reconcile story-to-requirement coverage in specs/002-release-quality-automation/spec.md and specs/002-release-quality-automation/plan.md
- [X] T037 [P] Sync contributor guidance for picker, CI, and publishing changes in AGENTS.md
- [X] T038 Run end-to-end release validation from specs/002-release-quality-automation/quickstart.md and capture follow-up decisions in specs/002-release-quality-automation/research.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational completion and does not depend on the workflow automation stories
- **User Story 2 (P1)**: Can start after Foundational completion and is independent from the picker redesign
- **User Story 3 (P2)**: Can start after Foundational completion; it supports US4 but remains independently testable as build-health cleanup
- **User Story 4 (P2)**: Can start after Foundational completion, but should consume the release-health decisions established in US3 for safest delivery

### Within Each User Story

- Tests and validation steps should be updated before finalizing the story implementation
- UI behavior changes should land before story-specific quickstart validation for US1
- Workflow definitions should be aligned with package scripts before story completion for US2 and US4
- Dependency manifest updates should be followed by lockfile refreshes before story completion for US3

### Parallel Opportunities

- T005, T006, and T007 can run in parallel after T004
- Within US1, T009, T010, T011, and T012 can run in parallel before T013-T015 integration work
- Within US2, T016, T017, T019, and T020 can run in parallel before T018/T021 closeout
- Within US3, T022, T023, T025, and T026 can run in parallel before T024 and the lockfile refresh tasks
- Within US4, T030, T031, T033, and T034 can run in parallel before T032/T035
- T036 and T037 can run in parallel before the final T038 validation task

---

## Parallel Example: User Story 1

```bash
Task: "Expand picker interaction coverage in ui/src/components/Picker/PickerPage.test.tsx"
Task: "Redesign picker page layout and messaging in ui/src/components/Picker/PickerPage.tsx"
Task: "Add shared picker visual styling to match the main app in ui/src/App.css"
```

---

## Parallel Example: User Story 3

```bash
Task: "Update root dependencies to remove targeted deprecations and vulnerabilities in package.json"
Task: "Update frontend dependencies to remove targeted deprecations and vulnerabilities in ui/package.json"
Task: "Add release-health verification steps to specs/002-release-quality-automation/quickstart.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the new folder selector before expanding into release automation

### Incremental Delivery

1. Complete Setup + Foundational to establish scripts, build configuration, and workflow scaffolding
2. Deliver User Story 1 for the no-path picker experience
3. Deliver User Story 2 for pull-request gating
4. Deliver User Story 3 for build and dependency cleanup
5. Deliver User Story 4 for release-triggered publishing
6. Finish with cross-cutting reconciliation and full quickstart validation

### Parallel Team Strategy

1. One contributor completes Setup and Foundational phases
2. After Foundational completion:
   - Contributor A: User Story 1
   - Contributor B: User Story 2
   - Contributor C: User Story 3
3. Contributor C or another maintainer can follow with User Story 4 once release-health expectations are stable

---

## Notes

- All tasks follow the required checklist format with checkbox, task ID, optional `[P]`, required story label for user-story tasks, and exact file paths
- Suggested MVP scope: **User Story 1**
- Total tasks: **46**
- Task count per user story:
  - **US1**: 12 tasks
  - **US2**: 9 tasks
  - **US3**: 8 tasks
  - **US4**: 6 tasks
- Shared tasks:
  - **Setup**: 3 tasks
  - **Foundational**: 5 tasks
  - **Polish**: 3 tasks
