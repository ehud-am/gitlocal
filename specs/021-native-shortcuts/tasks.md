# Tasks: Native App Shortcuts

**Input**: Design documents from `specs/021-native-shortcuts/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/native-app-commands.md`, `quickstart.md`, `qa-findings.md`
**Tests**: Included because the feature specification defines acceptance scenarios and QA identified missing native shortcut acceptance coverage as a release blocker.
**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on an incomplete task.
- **[Story]**: Maps task to a user story from `specs/021-native-shortcuts/spec.md`.
- Every task includes an exact file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Correct planning gaps and prepare shared command surfaces before implementation.

- [x] T001 Normalize release wording from "minor patch" to "patch release" in `specs/021-native-shortcuts/spec.md`
- [x] T002 Expand release verification commands and final artifact gates in `specs/021-native-shortcuts/quickstart.md`
- [x] T003 [P] Document native shortcut manual acceptance cases in `native/macos/GitLocalTests/ShortcutCommandTests.md`
- [x] T004 [P] Add QA blocker traceability notes to `specs/021-native-shortcuts/release-review.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared native/web command bridge required before any user story can be completed.

**CRITICAL**: No user story work can be completed until this phase is done.

- [x] T005 Add native command menu construction for Edit and View commands in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [x] T006 Add command action entry points for copy, cut, paste, find, and refresh in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T007 Add a WebKit-to-React custom command event bridge in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T008 [P] Add shared native command event types in `ui/src/types/index.ts`
- [x] T009 Add global native command event listener setup and cleanup in `ui/src/App.tsx`
- [x] T010 [P] Add baseline native command bridge tests in `ui/src/App.native-shortcuts.test.tsx`

**Checkpoint**: Native app menus and React command bridge exist; user story implementation can proceed.

---

## Phase 3: User Story 1 - Use Standard Editing Shortcuts (Priority: P1) MVP

**Goal**: Copy, Cut, and Paste work from native app menus and expected shortcuts while preserving focused text-field behavior.

**Independent Test**: Select preview text and copy it, then focus an editable field and verify cut/paste behavior without leaving the native app.

### Tests for User Story 1

- [x] T011 [P] [US1] Add failing tests for native copy command dispatch and text-field precedence in `ui/src/App.native-shortcuts.test.tsx`
- [x] T012 [P] [US1] Add failing manual acceptance checklist for Command-C, Command-X, and Command-V in `native/macos/GitLocalTests/ShortcutCommandTests.md`

### Implementation for User Story 1

- [x] T013 [US1] Route Copy from native menu and Command-C to the focused WebKit selection or editable field in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T014 [US1] Route Cut from native menu and Command-X only to editable focused WebKit content in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T015 [US1] Route Paste from native menu and Command-V only to editable focused WebKit content in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T016 [US1] Preserve app behavior when Copy, Cut, or Paste has no eligible target in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T017 [US1] Verify native Edit menu labels and shortcuts in `native/macos/GitLocal/GitLocal/AppDelegate.swift`

**Checkpoint**: US1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Find Within Preview Content (Priority: P1)

**Goal**: Command-F and the native Find menu open or focus a preview-scoped find control that excludes app chrome.

**Independent Test**: Open a file with known preview text, invoke Find, verify preview matches, then search for text that exists only in navigation and verify no preview match.

### Tests for User Story 2

- [x] T018 [P] [US2] Add failing preview-only native Find tests in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [x] T019 [P] [US2] Add failing native Command-F event tests in `ui/src/App.native-shortcuts.test.tsx`
- [x] T020 [P] [US2] Add manual acceptance cases for preview-only Find in `native/macos/GitLocalTests/ShortcutCommandTests.md`

### Implementation for User Story 2

- [x] T021 [US2] Expose an imperative preview find request path from `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T022 [US2] Focus or open the existing in-file find panel when React receives the native Find command in `ui/src/App.tsx`
- [x] T023 [US2] Ensure native Find never invokes unrestricted page search in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T024 [US2] Keep preview Find results scoped to code and Markdown preview content in `ui/src/components/ContentPanel/CodeViewer.tsx`
- [x] T025 [US2] Keep preview Find results scoped to rendered Markdown preview content in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [x] T026 [US2] Preserve selected repository and file when closing native-triggered Find in `ui/src/components/ContentPanel/ContentPanel.tsx`

**Checkpoint**: US2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Refresh Current View (Priority: P2)

**Goal**: Native Refresh reloads current repository state from local filesystem/git data while preserving context when possible.

**Independent Test**: Change or delete the visible file on disk, invoke Refresh, and verify the app reflects the latest coherent state without restart.

### Tests for User Story 3

- [x] T027 [P] [US3] Add failing native Refresh event tests in `ui/src/App.native-shortcuts.test.tsx`
- [x] T028 [P] [US3] Add failing changed-file and deleted-file refresh tests in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [x] T029 [P] [US3] Add manual acceptance cases for Command-R Refresh in `native/macos/GitLocalTests/ShortcutCommandTests.md`

### Implementation for User Story 3

- [x] T030 [US3] Route native Refresh menu and Command-R into the React command bridge in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T031 [US3] Trigger repository tree and content refresh from the native Refresh command in `ui/src/App.tsx`
- [x] T032 [US3] Preserve current repository, branch, and selected file when still available after refresh in `ui/src/App.tsx`
- [x] T033 [US3] Show a coherent non-stale state when the selected file no longer exists after refresh in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T034 [US3] Coalesce repeated Refresh commands while loading so the UI resolves to one current state in `ui/src/App.tsx`

**Checkpoint**: US3 is fully functional and testable independently.

---

## Phase 6: Polish & Cross-Cutting Release Work

**Purpose**: Complete release readiness, documentation, and validation gates.

- [x] T035 [P] Update native wrapper documentation for supported app commands in `native/macos/README.md`
- [x] T036 [P] Re-review user-facing native app docs and apply any needed README correction in `README.md`
- [x] T037 Update `CHANGELOG.md` with a dated patch entry for native app shortcut fixes
- [x] T038 Bump root package version for the patch release in `package.json`
- [x] T039 Update lockfile version metadata for the patch release in `package-lock.json`
- [x] T040 Run `npm run verify` and record results in `specs/021-native-shortcuts/release-review.md`
- [x] T041 Run `xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal -configuration Release build` and record results in `specs/021-native-shortcuts/release-review.md`
- [x] T042 Run `packaging/macos/release/package-app.sh` to build the final local macOS artifact and record the artifact path in `specs/021-native-shortcuts/release-review.md`
- [x] T043 Run `packaging/macos/release/test-package.sh` against the final artifact and record results in `specs/021-native-shortcuts/release-review.md`
- [x] T044 Run `packaging/macos/cask/validate-cask.sh` and record results in `specs/021-native-shortcuts/release-review.md`
- [x] T045 Run `packaging/macos/cask/test-install-cask.sh` and record results in `specs/021-native-shortcuts/release-review.md`
- [x] T046 Run `packaging/macos/release/validate-version-alignment.sh` and record results in `specs/021-native-shortcuts/release-review.md`
- [x] T047 Run `npm pack --dry-run` and record package contents in `specs/021-native-shortcuts/release-review.md`
- [x] T048 Update `specs/021-native-shortcuts/qa-findings.md` with resolved blocker status and any remaining findings
- [x] T049 Complete final contrarian QA release decision in `specs/021-native-shortcuts/release-review.md`
- [x] T050 Update `packaging/macos/cask/gitlocal.rb` from the final GitHub Release archive and SHA-256 checksum after the immutable release artifact exists

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; suggested MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and can proceed in parallel with US1 after the command bridge exists.
- **User Story 3 (Phase 5)**: Depends on Foundational and can proceed in parallel with US1/US2 after the command bridge exists.
- **Polish & Release (Phase 6)**: Depends on all selected user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories after Foundational.
- **US2 (P1)**: No dependency on US1 after Foundational, but shares `ui/src/App.tsx` and `ViewerWindowController.swift`, so coordinate edits if done in parallel.
- **US3 (P2)**: No dependency on US1/US2 after Foundational, but shares `ui/src/App.tsx` and `ViewerWindowController.swift`, so coordinate edits if done in parallel.

### Within Each User Story

- Write story-specific tests before implementation and confirm they fail.
- Implement native command routing before manual native acceptance.
- Implement React command handling before final native package validation.
- Complete each story checkpoint before marking release work complete.

## Parallel Opportunities

- T003 and T004 can run in parallel with T001/T002.
- T008 and T010 can run in parallel with native wrapper foundational tasks T005-T007.
- US1 test tasks T011-T012 can run in parallel.
- US2 test tasks T018-T020 can run in parallel.
- US3 test tasks T027-T029 can run in parallel.
- Documentation tasks T035-T036 can run in parallel after implementation behavior is settled.
- Release command result tasks T040-T047 are mostly sequential in practice, but documentation updates can be prepared while commands run.

## Parallel Example: User Story 2

```text
Task: "T018 [P] [US2] Add failing preview-only native Find tests in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T019 [P] [US2] Add failing native Command-F event tests in ui/src/App.native-shortcuts.test.tsx"
Task: "T020 [P] [US2] Add manual acceptance cases for preview-only Find in native/macos/GitLocalTests/ShortcutCommandTests.md"
```

## Parallel Example: User Story 3

```text
Task: "T027 [P] [US3] Add failing native Refresh event tests in ui/src/App.native-shortcuts.test.tsx"
Task: "T028 [P] [US3] Add failing changed-file and deleted-file refresh tests in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T029 [P] [US3] Add manual acceptance cases for Command-R Refresh in native/macos/GitLocalTests/ShortcutCommandTests.md"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup and Phase 2 command bridge.
2. Complete US1 tests and native Edit menu routing.
3. Stop and validate Copy, Cut, and Paste independently in the native app.
4. Do not start release metadata work until US1, US2, and US3 are complete.

### Incremental Delivery

1. Deliver US1 for standard editing shortcuts.
2. Deliver US2 for preview-only Find.
3. Deliver US3 for Refresh.
4. Complete release documentation, versioning, final artifact, cask checksum, and QA review.

### Release Gate

The branch is not release-ready until T040-T050 are complete and `specs/021-native-shortcuts/release-review.md` changes from "Not release-ready" to an approved release decision.
