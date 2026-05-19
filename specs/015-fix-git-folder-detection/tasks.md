# Tasks: Fix Git Folder Detection

**Input**: Design documents from `specs/015-fix-git-folder-detection/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/local-api.md`, `quickstart.md`

**Tests**: Required by the feature success criteria and the project constitution. Tests are listed before implementation work in each user story where practical.

**Organization**: Tasks are grouped by user story to keep each behavior slice independently implementable and testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel because it touches different files or depends only on completed foundational work.
- **[Story]**: Applies only to user-story phases.

## Phase 1: Setup

**Purpose**: Confirm current behavior and align shared contracts before changing routing.

- [X] T001 Inspect current repository/folder detection call sites in `src/git/repo.ts`, `src/handlers/folder.ts`, `src/handlers/repo.ts`, `src/server.ts`, and `ui/src/components/Picker/PickerPage.tsx`
- [X] T002 Inspect existing test helpers for git repos, nested folders, worktrees, and picker interactions in `tests/unit/git/repo.test.ts`, `tests/unit/handlers/folder.test.ts`, `tests/unit/handlers/repo.test.ts`, `tests/integration/server.test.ts`, and `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T003 Update shared classification/open-mode types in `src/types.ts` and `ui/src/types/index.ts` to include `gitState`, `openMode`, and optional `repositoryRootPath`

---

## Phase 2: Foundational

**Purpose**: Add one authoritative classification model that all user stories consume.

**Critical**: Complete this phase before user-story implementation so picker, server startup, and handlers do not diverge.

- [X] T004 Add path classification tests for repository root, nested folder inside repository, outside folder, missing path, file path, symlinked path, and `.git` file worktree/submodule roots in `tests/unit/git/repo.test.ts`
- [X] T005 Implement shared local path classification helpers in `src/git/repo.ts` using Git top-level resolution plus canonical path comparison
- [X] T006 Update `validateRepo` or add a root-specific repository predicate in `src/git/repo.ts` so repository-root checks no longer mean merely inside a worktree
- [X] T007 Update existing git helper tests in `tests/unit/git/repo.test.ts` to assert the distinction between repository root and inside-repository folder
- [X] T008 Run focused git helper tests with `npm test -- tests/unit/git/repo.test.ts`

**Checkpoint**: Shared classification is available and covered before any UI or handler routing changes.

---

## Phase 3: User Story 1 - Open Git Repository Folders as Repositories (Priority: P1)

**Goal**: Repository folders opened from the picker, typed paths, and startup paths enter repository mode immediately.

**Independent Test**: Browse to a parent folder containing a git repository, open that repository folder, and verify the main viewer reports repository mode with branch/git context availability or repository empty states.

- [X] T009 [P] [US1] Add folder browse handler tests for repository-root `gitState`, `openMode`, and `isGitRepo` metadata in `tests/unit/handlers/folder.test.ts`
- [X] T010 [P] [US1] Add repository open handler tests for typed repository-root paths returning repository open metadata in `tests/unit/handlers/repo.test.ts`
- [X] T011 [P] [US1] Add integration tests proving `createApp` startup opens explicit repository-root paths and current-working-directory repository roots in repository mode in `tests/integration/server.test.ts`
- [X] T012 [P] [US1] Update picker UI tests so double-clicking a repository row opens it instead of browsing into it in `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T013 [US1] Update folder browse metadata in `src/handlers/folder.ts` to derive repository labels and open modes from the shared classification
- [X] T014 [US1] Update repository open handling in `src/handlers/repo.ts` so repository-root paths set the active root as a repository and return `openMode: repository`
- [X] T015 [US1] Update startup active-root initialization in `src/server.ts` so repository-root detection uses the root-specific classifier
- [X] T016 [US1] Update picker double-click and Open behavior in `ui/src/components/Picker/PickerPage.tsx` so repository-root entries open through the repository route
- [X] T017 [US1] Run focused handler and picker tests with `npm test -- tests/unit/handlers/folder.test.ts tests/unit/handlers/repo.test.ts tests/integration/server.test.ts ui/src/components/Picker/PickerPage.test.tsx`

**Checkpoint**: MVP complete. Repository folders open as repositories from first action.

---

## Phase 4: User Story 2 - Preserve Plain Folder Browsing (Priority: P2)

**Goal**: Plain folders outside git remain regular-folder roots and keep existing folder browsing/editing behavior.

**Independent Test**: Open a plain folder beside a repository folder and verify the active viewer reports folder mode, repository controls are absent, and folder file operations remain available.

- [X] T018 [P] [US2] Add repository open handler tests for outside-repository folders returning folder open metadata in `tests/unit/handlers/repo.test.ts`
- [X] T019 [P] [US2] Add info handler tests proving plain folder roots return `isGitRepo: false`, no branch, no commits, and null git context in `tests/unit/handlers/repo.test.ts`
- [X] T020 [P] [US2] Add picker UI tests proving plain folder rows still browse on double-click and open as folder roots from the Open action in `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T021 [US2] Update folder capability derivation in `src/handlers/folder.ts` so plain folders retain create/init/clone/open behavior according to existing rules
- [X] T022 [US2] Update `getInfo` and related active-root metadata in `src/git/repo.ts` so outside-repository folders never expose repository-only fields
- [X] T023 [US2] Verify existing regular-folder tree, file, create, update, and delete behavior still routes through folder mode in `src/handlers/file.ts`
- [X] T024 [US2] Run focused plain-folder regression tests with `npm test -- tests/unit/handlers/repo.test.ts tests/unit/handlers/folder.test.ts ui/src/components/Picker/PickerPage.test.tsx`

**Checkpoint**: Plain folders are not regressed by repository-root routing.

---

## Phase 5: User Story 3 - Distinguish Repository Roots from Nested Folders (Priority: P3)

**Goal**: Nested folders inside a repository are detectable as inside-repository folders but are not labeled or opened as repositories unless they are independent repository roots.

**Independent Test**: Browse inside a repository, select a normal nested folder, and verify it is labeled/opened as a folder; then verify a nested independent repository root is labeled/opened as a repository.

- [X] T025 [P] [US3] Add folder browse handler tests for nested inside-repository folders showing `gitState: inside-repository`, `openMode: folder`, and `isGitRepo: false` in `tests/unit/handlers/folder.test.ts`
- [X] T026 [P] [US3] Add repository open handler tests for opening an inside-repository folder as a folder root with `repositoryRootPath` metadata in `tests/unit/handlers/repo.test.ts`
- [X] T027 [P] [US3] Add tests for nested independent repository roots or submodule-style roots showing `gitState: repository-root` in `tests/unit/git/repo.test.ts`
- [X] T028 [P] [US3] Add picker UI tests proving nested non-repository folders do not show repository badges in `ui/src/components/Picker/PickerPage.test.tsx`
- [X] T029 [US3] Update folder entry mapping in `src/handlers/folder.ts` to expose inside-repository metadata without repository badges
- [X] T030 [US3] Update repository open responses in `src/handlers/repo.ts` to include `repositoryRootPath` when a selected folder is inside a repository but opens as a folder
- [X] T031 [US3] Update UI type usage and rendering in `ui/src/components/Picker/PickerPage.tsx` so only `repository-root` entries show repository labels or badges
- [X] T032 [US3] Run focused nested-folder tests with `npm test -- tests/unit/git/repo.test.ts tests/unit/handlers/folder.test.ts tests/unit/handlers/repo.test.ts ui/src/components/Picker/PickerPage.test.tsx`

**Checkpoint**: Repository-root, inside-repository folder, and outside-repository folder states are visibly and behaviorally distinct.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full patch release scope and update release-facing documentation if needed.

- [X] T033 Run the quickstart scenarios from `specs/015-fix-git-folder-detection/quickstart.md`
- [X] T034 Run full verification with `npm test`, `npm run lint`, and `npm run build` using scripts defined in `package.json`
- [X] T035 Review `CHANGELOG.md` and add a patch-release entry for fixed repository-folder detection if this branch is being prepared for release
- [X] T036 Review `README.md` for any stale folder/repository opening behavior and update it only if the documented user workflow changed
- [X] T037 Confirm no committed documentation introduces contributor-local absolute paths in `specs/015-fix-git-folder-detection/`, `AGENTS.md`, `README.md`, or `CHANGELOG.md`

---

## Dependencies

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; delivers MVP.
- **US2 (Phase 4)**: Depends on Foundational; can run after or in parallel with US1 once shared classification exists, but must be regression-checked after US1 routing changes.
- **US3 (Phase 5)**: Depends on Foundational; can run after or in parallel with US2, but final picker behavior should be checked after US1 routing changes.
- **Polish (Phase 6)**: Depends on all user stories.

### User Story Dependencies

- **US1** has no dependency on US2 or US3 after Foundational work.
- **US2** has no dependency on US1 for tests, but final implementation must coexist with US1 repository routing.
- **US3** has no dependency on US2 for tests, but final implementation must coexist with both repository-root and plain-folder flows.

### MVP Scope

Complete Phase 1, Phase 2, and Phase 3 only. This fixes the reported bug: repository folders open as repositories with git-specific functionality enabled.

---

## Parallel Execution Examples

### Foundational

```text
T004 can be written before T005.
T003 can run in parallel with T004 because shared transport types and git helper tests are separate files.
```

### User Story 1

```text
T009, T010, T011, and T012 can run in parallel after T005-T007 are complete.
T013, T014, T015, and T016 touch separate handler/server/UI files and can be split after the tests define expected behavior.
```

### User Story 2

```text
T018, T019, and T020 can run in parallel.
T021 and T022 can run in parallel after the story tests are written.
```

### User Story 3

```text
T025, T026, T027, and T028 can run in parallel.
T029, T030, and T031 touch separate handler/UI files and can be split after classification helpers are complete.
```

---

## Implementation Strategy

1. **Classify first**: Implement and test the shared local path classifier before changing visible behavior.
2. **MVP next**: Deliver US1 so repository folders open as repositories from the picker, typed paths, and startup routing.
3. **Protect regular folders**: Complete US2 to ensure plain-folder workflows keep working.
4. **Lock down nested folders**: Complete US3 to prevent inside-worktree folders from being mislabeled as repositories.
5. **Verify release quality**: Run focused tests during each story and full verification before release preparation.
