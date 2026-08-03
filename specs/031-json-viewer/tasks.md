# Tasks: JSON Document Viewer

**Input**: Design documents from `specs/031-json-viewer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/json-viewer-ui.md, quickstart.md

**Tests**: Included because the plan and contract require regression coverage for file-type detection, tree parsing across JSON value types, pretty/raw dispatch, malformed/empty fallback, and edit/save warning behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing Markdown viewer surface and file-type detection, and scaffold the new files expected by the plan.

- [X] T001 Inspect current `detectFileType` behavior for `.json` in `src/git/repo.ts` and current dispatch/toggle behavior in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T002 [P] Create the JSON tree parser module scaffold and exported TypeScript types in `ui/src/components/ContentPanel/json-tree.ts`
- [X] T003 [P] Create the JSON tree parser test scaffold in `ui/src/components/ContentPanel/json-tree.test.ts`
- [X] T004 [P] Create the JSON viewer component scaffold in `ui/src/components/ContentPanel/JSONViewer.tsx`
- [X] T005 [P] Create the JSON viewer component test scaffold in `ui/src/components/ContentPanel/JSONViewer.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement file-type detection and the shared JSON parsing/tree-model layer that all user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Add a failing test for `.json` files resolving to `{ type: 'json', language: 'json' }` in `tests/unit/git/repo.test.ts`
- [X] T007 Extend `detectFileType` in `src/git/repo.ts` to return content type `json` for `.json` files
- [X] T008 Add `'json'` to the `FileContentType` union in `ui/src/types/index.ts`
- [X] T009 Add failing tests for parsing root objects, root arrays, root scalars (string/number/boolean/null), nested structures, empty object/array, and malformed/empty input in `ui/src/components/ContentPanel/json-tree.test.ts`
- [X] T010 Implement the `Parsed JSON Tree Node` builder in `ui/src/components/ContentPanel/json-tree.ts`, returning a parse-failure result (not a thrown error) for malformed or empty input
- [X] T011 Run the focused parser tests with `npm --prefix ui run test -- json-tree` and fix issues in `ui/src/components/ContentPanel/json-tree.ts`

**Checkpoint**: File-type detection and JSON tree parsing are ready for UI integration.

---

## Phase 3: User Story 1 - Read a JSON file in a clean, structured view (Priority: P1) 🎯 MVP

**Goal**: Render valid JSON as a pretty, structured, collapsible tree view by default, matching the Markdown pretty-view experience.

**Independent Test**: Open a well-formed `.json` file (object, array, or nested) and confirm it renders as a pretty structured view by default, with no change to any other file type's display.

### Tests for User Story 1

- [X] T012 [P] [US1] Add a renderer test for a `package.json`-style object rendering as a structured, indented key/value tree in `ui/src/components/ContentPanel/JSONViewer.test.tsx`
- [X] T013 [P] [US1] Add a renderer test for nested objects/arrays showing clear parent-child scoping and array-vs-object distinction in `ui/src/components/ContentPanel/JSONViewer.test.tsx`
- [X] T014 [P] [US1] Add a dispatch test confirming `ContentPanel` renders `JSONViewer` (not `CodeViewer`) for `type: 'json'` by default in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 1

- [X] T015 [US1] Implement `JSONViewer` to recursively render parsed tree nodes with `valueKind`-based styling, modeled on `MetadataEntryView` in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T016 [US1] Support collapse/expand per object/array node with a child-count summary when collapsed in `ui/src/components/ContentPanel/JSONViewer.tsx`
- [X] T017 [US1] Render root-level bare scalars and empty object/array as explicit minimal/empty states in `ui/src/components/ContentPanel/JSONViewer.tsx`
- [X] T018 [US1] Add dispatch branch in `ui/src/components/ContentPanel/ContentPanel.tsx` rendering `JSONViewer` for `type === 'json'` when not in raw view
- [X] T019 [US1] Add `json-tree-*` styles for structure, indentation, and value-kind distinction in `ui/src/styles/globals.css`
- [X] T020 [US1] Run `npm --prefix ui run test -- json-tree JSONViewer ContentPanel` and fix US1 regressions in `ui/src/components/ContentPanel/` and `ui/src/styles/globals.css`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Switch to raw view to see the exact file contents (Priority: P2)

**Goal**: Let users toggle to the existing raw/highlighted code view for JSON files, and fall back to raw view automatically with an inline notice when JSON can't be parsed.

**Independent Test**: With a `.json` file open in pretty view, toggle to raw and confirm exact file text with JSON highlighting; open a malformed `.json` file and confirm it opens directly in raw view with a parse notice.

### Tests for User Story 2

- [X] T021 [P] [US2] Add a dispatch test for toggling a valid `.json` file between pretty and raw view via the existing toggle control in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T022 [P] [US2] Add a dispatch test confirming `canToggleRaw` is true for `type: 'json'` in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T023 [P] [US2] Add a dispatch test confirming malformed/empty JSON renders raw view directly with an inline parse notice, without user action, in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 2

- [X] T024 [US2] Extend `canToggleRaw` in `ui/src/components/ContentPanel/ContentPanel.tsx` to include `type === 'json'`
- [X] T025 [US2] Force raw view and surface a brief inline parse notice when the JSON parse result is a failure in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T026 [US2] Recompute parse state and re-offer pretty view automatically once content becomes valid (e.g. after a save) in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T027 [US2] Run `npm --prefix ui run test -- ContentPanel json-tree` and fix US2 regressions in `ui/src/components/ContentPanel/ContentPanel.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Edit a JSON file's contents (Priority: P3)

**Goal**: Let users edit JSON files via the existing inline editor, with a non-blocking warning when saved content is not valid JSON.

**Independent Test**: Edit a `.json` file, save valid changes, and confirm the pretty view updates; edit a `.json` file into invalid JSON and confirm a warning appears before the save completes, without blocking the save.

### Tests for User Story 3

- [X] T028 [P] [US3] Add a test for editing and saving valid JSON updating the pretty view with no warning in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T029 [P] [US3] Add a test for attempting to save invalid JSON showing a warning before save completes, without blocking the save, in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T030 [P] [US3] Add a test confirming the existing unsaved-changes-on-navigate confirmation still applies to `.json` files in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 3

- [X] T031 [US3] Add a soft JSON-validity check in `handleSaveEdit` in `ui/src/components/ContentPanel/ContentPanel.tsx`, using the existing `window.confirm` pattern from `confirmDiscardIfNeeded`, only for `type === 'json'`
- [X] T032 [US3] Confirm `confirmDiscardIfNeeded` and existing revision-conflict/file-switch handling apply unchanged to `.json` files in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T033 [US3] Run `npm --prefix ui run test -- ContentPanel` and fix US3 regressions in `ui/src/components/ContentPanel/ContentPanel.tsx`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across the JSON viewer workflow.

- [X] T034 [P] Review `JSONViewer` accessible naming, keyboard collapse/expand, and DOM structure against `specs/031-json-viewer/contracts/json-viewer-ui.md` in `ui/src/components/ContentPanel/JSONViewer.tsx`
- [X] T035 [P] Review CSS for text wrapping, spacing stability, and non-overlap at narrow and wide widths in `ui/src/styles/globals.css`
- [X] T036 Confirm no regression in Markdown, plain text, image, or binary file rendering/editing by running the existing `ContentPanel` and `MarkdownRenderer` suites in `ui/src/components/ContentPanel/`
- [X] T037 Run focused verification from `specs/031-json-viewer/quickstart.md` with `npm --prefix ui run test -- json-tree JSONViewer ContentPanel` and `npm test -- repo.test`
- [X] T038 Run UI coverage validation with `npm --prefix ui run test:ci`
- [X] T039 Run full project validation with `npm test`, `npm run lint`, and `npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002-T005 can run in parallel after T001 starts.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; builds on the dispatch branch US1 adds to `ContentPanel.tsx`.
- **User Story 3 (Phase 5)**: Depends on Foundational; builds on the same `ContentPanel.tsx` save path, independent of US2's toggle logic.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2; no dependency on US2 or US3.
- **User Story 2 (P2)**: Can start after Phase 2; shares `ContentPanel.tsx` dispatch code introduced by US1, so finish US1's dispatch branch first to avoid rework.
- **User Story 3 (P3)**: Can start after Phase 2; touches `handleSaveEdit`, independent of the pretty/raw dispatch logic US1/US2 add.

### Within Each User Story

- Write story-specific tests first and confirm they fail for the missing behavior.
- Implement parser/model behavior before renderer integration when both are needed.
- Update `ContentPanel.tsx` dispatch before CSS polish when the DOM shape is required for selectors.
- Run the story checkpoint command before moving to the next priority.

### Parallel Opportunities

- T002, T003, T004, T005 can run in parallel.
- T012, T013, T014 can run in parallel once Phase 2 is complete.
- T021, T022, T023 can run in parallel once US1's dispatch branch exists.
- T028, T029, T030 can run in parallel once Phase 2 is complete.
- T034 and T035 can run in parallel after all selected user stories are implemented.

---

## Parallel Example: User Story 1

```bash
Task: "T012 [P] [US1] Add a renderer test for a package.json-style object rendering as a structured, indented key/value tree in ui/src/components/ContentPanel/JSONViewer.test.tsx"
Task: "T013 [P] [US1] Add a renderer test for nested objects/arrays showing clear parent-child scoping and array-vs-object distinction in ui/src/components/ContentPanel/JSONViewer.test.tsx"
Task: "T014 [P] [US1] Add a dispatch test confirming ContentPanel renders JSONViewer (not CodeViewer) for type: 'json' by default in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T021 [P] [US2] Add a dispatch test for toggling a valid .json file between pretty and raw view via the existing toggle control in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T022 [P] [US2] Add a dispatch test confirming canToggleRaw is true for type: 'json' in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T023 [P] [US2] Add a dispatch test confirming malformed/empty JSON renders raw view directly with an inline parse notice, without user action, in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T028 [P] [US3] Add a test for editing and saving valid JSON updating the pretty view with no warning in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T029 [P] [US3] Add a test for attempting to save invalid JSON showing a warning before save completes, without blocking the save, in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "T030 [P] [US3] Add a test confirming the existing unsaved-changes-on-navigate confirmation still applies to .json files in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 detection/parser foundation.
3. Complete Phase 3 User Story 1.
4. Stop and validate with `npm --prefix ui run test -- json-tree JSONViewer ContentPanel`.
5. Demo with a `package.json`-style file and a deeply nested sample.

### Incremental Delivery

1. Add US1 for the core pretty-view experience.
2. Add US2 for raw-view toggle and malformed/empty fallback.
3. Add US3 for edit/save with the soft validity warning.
4. Finish polish and full validation.

### Parallel Team Strategy

After Phase 2, one developer can focus on `JSONViewer.tsx` rendering for US1, another on raw-toggle/fallback logic for US2, and another on edit/save warning behavior for US3. Coordinate edits to `ContentPanel.tsx` because it is shared across all three stories.

## Notes

- [P] tasks use different files or independent test additions and can run without waiting on non-parallel tasks in the same phase.
- Every user story has an independent test criterion and checkpoint.
- No new npm dependency, database, or persisted-state changes are planned.
- Keep all paths repository-relative in committed docs.
