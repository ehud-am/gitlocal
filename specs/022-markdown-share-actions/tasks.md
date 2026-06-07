# Tasks: Markdown Share Actions

**Input**: Design documents from `specs/022-markdown-share-actions/`
**Prerequisites**: `specs/022-markdown-share-actions/plan.md`, `specs/022-markdown-share-actions/spec.md`, `specs/022-markdown-share-actions/research.md`, `specs/022-markdown-share-actions/data-model.md`, `specs/022-markdown-share-actions/contracts/`

**Tests**: Test tasks are included because the constitution requires ≥90% per-file coverage and the spec defines independently testable acceptance scenarios.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup

**Purpose**: Confirm project baseline and shared files before feature work.

- [x] T001 Review existing UI/server feature entry points in `ui/src/App.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/components/ContentPanel/InlineFileEditor.tsx`, `src/cli.ts`, and `src/server.ts`
- [x] T002 [P] Review current native command bridge files in `native/macos/GitLocal/GitLocal/AppDelegate.swift` and `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T003 [P] Review existing test coverage patterns in `ui/src/App.test.tsx`, `ui/src/App.native-shortcuts.test.tsx`, `ui/src/components/ContentPanel/ContentPanel.test.tsx`, and `tests/unit/handlers/repo.test.ts`
- [x] T004 [P] Confirm dependency baseline requires no new runtime package in `package.json` and `ui/package.json`

---

## Phase 2: Foundational

**Purpose**: Shared types, helper surfaces, and contracts that block multiple user stories.

**Critical**: Complete this phase before implementing user stories.

- [x] T005 Add shared native command and startup folder types in `ui/src/types/index.ts` and `src/types.ts`
- [x] T006 [P] Create rendered Markdown output helper skeleton in `ui/src/components/ContentPanel/markdown-output.ts`
- [x] T007 [P] Create editor history helper skeleton in `ui/src/components/ContentPanel/editor-history.ts`
- [x] T008 [P] Create content-panel selection helper skeleton in `ui/src/components/ContentPanel/content-panel-selection.ts`
- [x] T009 Create startup preference service skeleton in `src/services/startup-preferences.ts`
- [x] T010 [P] Add print-selection and Markdown output CSS anchors in `ui/src/styles/globals.css`
- [x] T011 [P] Add shared API client type placeholders for startup preference endpoints in `ui/src/services/api.ts`
- [x] T012 Validate foundational TypeScript compile scope with `npm run lint` using `package.json`

**Checkpoint**: Foundation ready for user story work.

---

## Phase 3: User Story 1 - Share Rendered Markdown (Priority: P1) MVP

**Goal**: Users can print, save, email, Slack-share, system-share, copy, or download rendered Markdown output without losing GitLocal context.

**Independent Test**: Open a Markdown file, use Markdown actions to print rendered content, save as PDF or route through print/save-to-PDF, start email/Slack/system share flows where available, and confirm fallbacks preserve current repository/file context.

### Tests for User Story 1

- [x] T013 [P] [US1] Add Markdown action visibility tests for Markdown and non-Markdown files in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [x] T014 [P] [US1] Add rendered output extraction tests for headings, lists, tables, code blocks, links, and app chrome exclusion in `ui/src/components/ContentPanel/markdown-output.test.ts`
- [x] T015 [P] [US1] Add print, Save PDF, email, Slack, system share, copy, and download fallback tests in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [x] T016 [P] [US1] Add native Markdown print/share event tests in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [x] T017 [US1] Add unsaved Markdown content disclosure tests in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 1

- [x] T018 [P] [US1] Implement rendered Markdown text/title extraction in `ui/src/components/ContentPanel/markdown-output.ts`
- [x] T019 [US1] Create Markdown share action UI in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T020 [US1] Implement Print and Save PDF flows with print/save-to-PDF fallback messaging in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T021 [US1] Implement Email, Slack, system share, copy rendered, and download artifact fallbacks in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T022 [US1] Integrate Markdown share actions into rendered Markdown views in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T023 [US1] Exclude app chrome from print/share output with print-specific classes in `ui/src/components/ContentPanel/ContentPanel.tsx` and `ui/src/styles/globals.css`
- [x] T024 [US1] Wire native `print-markdown` and `share-markdown` commands through `ui/src/types/index.ts` and `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [x] T025 [US1] Add macOS menu entries for Markdown print/share in `native/macos/GitLocal/GitLocal/AppDelegate.swift` and dispatch handlers in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T026 [US1] Update native Markdown print/share validation notes in `native/macos/GitLocalTests/ShortcutCommandTests.md`
- [ ] T027 [US1] Verify User Story 1 manually with Markdown share checks in `specs/022-markdown-share-actions/quickstart.md`

**Checkpoint**: User Story 1 is independently functional as the MVP.

---

## Phase 4: User Story 2 - Refresh Current Page from a Prominent Action (Priority: P2)

**Goal**: Users have a visible top-right Refresh button that reloads current local state while preserving restorable context.

**Independent Test**: Open a repository page, change a file outside GitLocal, select the top-right Refresh button, and confirm the latest local state appears without losing the current file when it still exists.

### Tests for User Story 2

- [x] T028 [P] [US2] Add Refresh button rendering and accessible-name tests in `ui/src/App.test.tsx`
- [x] T029 [P] [US2] Add visible refresh query invalidation and duplicate-request tests in `ui/src/App.native-shortcuts.test.tsx`
- [x] T030 [US2] Add refresh context preservation tests for existing and missing selected files in `ui/src/App.test.tsx`

### Implementation for User Story 2

- [x] T031 [US2] Add top-right Refresh button in `ui/src/App.tsx`
- [x] T032 [US2] Wire visible Refresh button to the existing current-view refresh invalidation flow in `ui/src/App.tsx`
- [x] T033 [US2] Add loading and duplicate-request guard behavior for visible and native refresh in `ui/src/App.tsx`
- [x] T034 [US2] Style Refresh consistently with existing top-right app actions in `ui/src/App.tsx` and `ui/src/styles/globals.css`
- [ ] T035 [US2] Verify User Story 2 manually with refresh checks in `specs/022-markdown-share-actions/quickstart.md`

**Checkpoint**: User Story 2 works independently and remains compatible with User Story 1.

---

## Phase 5: User Story 3 - Undo, Redo, and Content-Panel Select All (Priority: P2)

**Goal**: Users can use normal editing undo/redo shortcuts and Command-A/select-all to collect only the current content panel without affecting unrelated app state.

**Independent Test**: Edit a file and verify undo/redo history, then activate the content panel and verify Command-A selects only current panel content while search fields, dialogs, and textareas retain native select-all behavior.

### Tests for User Story 3

- [x] T036 [P] [US3] Add editor history reducer tests for undo, redo, history limits, and reset behavior in `ui/src/components/ContentPanel/editor-history.test.ts`
- [x] T037 [P] [US3] Add InlineFileEditor shortcut tests for Command-Z, Command-Shift-Z, Control-Z, Control-Y, and native undo/redo commands in `ui/src/components/ContentPanel/InlineFileEditor.test.tsx`
- [x] T038 [P] [US3] Add focused-context tests proving undo/redo do not mutate search fields or dialogs in `ui/src/components/ContentPanel/InlineFileEditor.test.tsx`
- [x] T039 [P] [US3] Add content-panel selection helper tests for rendered Markdown, raw text, README preview, editable draft, empty, binary, and image panel scopes in `ui/src/components/ContentPanel/content-panel-selection.test.ts`
- [x] T040 [P] [US3] Add ContentPanel Command-A tests proving selection excludes header, sidebar, footer, actions, dialogs, and unrelated controls in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [x] T041 [P] [US3] Add native `select-all-panel` command forwarding tests in `ui/src/App.native-shortcuts.test.tsx`
- [x] T042 [US3] Add accessibility regression tests for keyboard shortcut behavior and focus preservation in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 3

- [x] T043 [P] [US3] Implement editor history reducer in `ui/src/components/ContentPanel/editor-history.ts`
- [x] T044 [US3] Integrate editor history into `ui/src/components/ContentPanel/InlineFileEditor.tsx`
- [x] T045 [US3] Add keyboard handling for focused editor undo/redo shortcuts in `ui/src/components/ContentPanel/InlineFileEditor.tsx`
- [x] T046 [US3] Add native undo/redo command handling scoped to focused editor state in `ui/src/components/ContentPanel/InlineFileEditor.tsx`
- [x] T047 [US3] Reset or finalize editor history on selected file changes, cancel, save, and external content reload in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T048 [P] [US3] Implement content-panel selection scope helper in `ui/src/components/ContentPanel/content-panel-selection.ts`
- [x] T049 [US3] Mark selectable panel roots for rendered Markdown, README preview, raw text, source preview, editable drafts, folder views, empty states, binary placeholders, and image views in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T050 [US3] Handle Command-A and Control-A at the content-panel boundary without overriding native input, textarea, search, or dialog selection in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T051 [US3] Add `select-all-panel` to native command types and app-level forwarding in `ui/src/types/index.ts` and `ui/src/App.tsx`
- [x] T052 [US3] Add macOS Select All menu dispatch for the content panel in `native/macos/GitLocal/GitLocal/AppDelegate.swift` and `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [x] T053 [US3] Update native shortcut validation notes for undo/redo and content-panel select-all in `native/macos/GitLocalTests/ShortcutCommandTests.md`
- [ ] T054 [US3] Verify User Story 3 manually with undo/redo and select-all checks in `specs/022-markdown-share-actions/quickstart.md`

**Checkpoint**: User Story 3 works independently without regressing non-editor controls or app-wide selection behavior.

---

## Phase 6: User Story 4 - Start in the Right Folder (Priority: P3)

**Goal**: Launch without an explicit folder reopens the last used folder when possible, otherwise starts from platform Documents and falls back to home.

**Independent Test**: Launch with no explicit folder, confirm first-launch default, open a different folder, relaunch without a folder, confirm the last used folder reopens, then remove the remembered folder and confirm fallback behavior.

### Tests for User Story 4

- [x] T055 [P] [US4] Add startup preference service tests for explicit path, last used folder, platform Documents defaults, home fallback, invalid preferences, and unavailable folders in `tests/unit/services/startup-preferences.test.ts`
- [x] T056 [P] [US4] Add CLI startup precedence tests for explicit folder, last used folder, Documents default, and home fallback in `tests/unit/cli.test.ts`
- [x] T057 [P] [US4] Add startup folder API tests for resolved folder and preference update behavior in `tests/unit/handlers/repo.test.ts`
- [x] T058 [P] [US4] Add folder open preference update tests for repository and picker flows in `tests/unit/handlers/folder.test.ts` and `tests/unit/handlers/repo.test.ts`
- [x] T059 [P] [US4] Add PickerPage startup message and fallback tests in `ui/src/components/Picker/PickerPage.test.tsx`

### Implementation for User Story 4

- [x] T060 [US4] Implement startup folder preference resolution and persistence in `src/services/startup-preferences.ts`
- [x] T061 [US4] Use startup preference resolution for empty launch handling in `src/cli.ts`
- [x] T062 [US4] Register startup folder HTTP endpoints in `src/server.ts` and handlers in `src/handlers/repo.ts`
- [x] T063 [US4] Persist last used folders after successful repository open and parent-folder navigation in `src/handlers/repo.ts`
- [x] T064 [US4] Persist last used folders after successful picker browse/open/create/init/clone flows in `src/handlers/folder.ts`
- [x] T065 [US4] Add startup folder API client methods in `ui/src/services/api.ts` and response types in `ui/src/types/index.ts`
- [x] T066 [US4] Update PickerPage default-folder display and fallback messaging in `ui/src/components/Picker/PickerPage.tsx`
- [x] T067 [US4] Update macOS native lifecycle validation notes for remembered folder and Documents fallback in `native/macos/GitLocalTests/LifecycleTests.md`
- [ ] T068 [US4] Verify User Story 4 manually with startup folder checks in `specs/022-markdown-share-actions/quickstart.md`

**Checkpoint**: User Story 4 works independently and preserves explicit launch folder precedence.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Release readiness, documentation, accessibility, coverage, and full verification.

- [x] T069 [P] Update user-facing documentation for Markdown share, Refresh, undo/redo, select-all, and startup folder behavior in `README.md` and `packaging/npm/README.md`
- [x] T070 [P] Update native packaging/wrapper documentation for native share, select-all, and startup behavior in `native/macos/README.md` and `packaging/macos/README.md`
- [x] T071 [P] Add release notes for Markdown share, Refresh, undo/redo, select-all, startup folder behavior, and dependency audit updates in `CHANGELOG.md`
- [x] T072 Run accessibility checks for new buttons, menus, print/share dialogs, keyboard shortcuts, and select-all focus behavior in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/App.tsx`, and `ui/src/components/ContentPanel/InlineFileEditor.tsx`
- [x] T073 Run `npm test` and address coverage regressions in `tests/` and `ui/src/`
- [x] T074 Run `npm run lint` and address TypeScript issues in `src/` and `ui/src/`
- [x] T075 Run `npm run build` and address packaging/build issues in `dist/` and `ui/dist/`
- [x] T076 Run `npm run verify` before release handoff using `package.json`
- [x] T077 Produce contrarian QA release-review artifact in `specs/022-markdown-share-actions/release-review.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP and highest priority.
- **User Story 2 (Phase 4)**: Depends on Foundational; can proceed independently after Phase 2.
- **User Story 3 (Phase 5)**: Depends on Foundational; can proceed independently after Phase 2 but touches shared shortcut handling.
- **User Story 4 (Phase 6)**: Depends on Foundational; can proceed independently after Phase 2.
- **Polish (Phase 7)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1 Share Rendered Markdown**: No dependency on other user stories after Foundational.
- **US2 Visible Refresh**: No dependency on US1; shares app-level refresh state with native refresh.
- **US3 Undo/Redo/Select All**: No dependency on US1 or US2; shares content-panel and native command surfaces.
- **US4 Startup Folder**: No dependency on US1-US3; uses server/CLI/picker flow only.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel during Setup.
- T006, T007, T008, T010, and T011 can run in parallel during Foundational work.
- US1 test tasks T013-T016 can run in parallel before US1 implementation.
- US2 test tasks T028-T030 can run in parallel before US2 implementation.
- US3 test tasks T036-T041 can run in parallel before US3 implementation.
- US4 test tasks T055-T059 can run in parallel before US4 implementation.
- Documentation tasks T069-T071 can run in parallel during Polish.

---

## Parallel Examples

### User Story 1

```text
Task: "Add Markdown action visibility tests for Markdown and non-Markdown files in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "Add rendered output extraction tests for headings, lists, tables, code blocks, links, and app chrome exclusion in ui/src/components/ContentPanel/markdown-output.test.ts"
Task: "Add print, Save PDF, email, Slack, system share, copy, and download fallback tests in ui/src/components/ContentPanel/MarkdownShareActions.test.tsx"
```

### User Story 2

```text
Task: "Add Refresh button rendering and accessible-name tests in ui/src/App.test.tsx"
Task: "Add visible refresh query invalidation and duplicate-request tests in ui/src/App.native-shortcuts.test.tsx"
Task: "Add refresh context preservation tests for existing and missing selected files in ui/src/App.test.tsx"
```

### User Story 3

```text
Task: "Add editor history reducer tests for undo, redo, history limits, and reset behavior in ui/src/components/ContentPanel/editor-history.test.ts"
Task: "Add content-panel selection helper tests for rendered Markdown, raw text, README preview, editable draft, empty, binary, and image panel scopes in ui/src/components/ContentPanel/content-panel-selection.test.ts"
Task: "Add native select-all-panel command forwarding tests in ui/src/App.native-shortcuts.test.tsx"
```

### User Story 4

```text
Task: "Add startup preference service tests for explicit path, last used folder, platform Documents defaults, home fallback, invalid preferences, and unavailable folders in tests/unit/services/startup-preferences.test.ts"
Task: "Add startup folder API tests for resolved folder and preference update behavior in tests/unit/handlers/repo.test.ts"
Task: "Add PickerPage startup message and fallback tests in ui/src/components/Picker/PickerPage.test.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1 Share Rendered Markdown).
3. Validate US1 independently with targeted UI tests and quickstart Markdown share checks.
4. Stop for demo/review if only MVP is desired.

### Incremental Delivery

1. Deliver US1 for Markdown share value.
2. Add US2 visible refresh for local repository ergonomics.
3. Add US3 undo/redo and content-panel select-all for keyboard workflow polish.
4. Add US4 startup folder behavior for launch ergonomics.
5. Complete Polish with docs, accessibility, full tests, build, verify, and release review.

### Validation Gates

1. Each story must pass its targeted tests before moving to the next story.
2. Run `npm test`, `npm run lint`, `npm run build`, and `npm run verify` before release handoff.
3. Keep all TypeScript source files at or above 90% per-file coverage.
