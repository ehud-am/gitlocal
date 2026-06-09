# Tasks: README Logo and Markdown Toolbar Polish

**Input**: Design documents from `specs/024-fix-share-toolbar/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-markdown-toolbar.md`, `quickstart.md`

**Tests**: Test tasks are included because the project constitution requires 90% per-file coverage and the plan calls for focused component validation.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or does not depend on incomplete tasks
- **[Story]**: Maps to the user story: US1, US2, US3
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current affected surfaces and test entry points before implementation.

- [X] T001 Review current README logo reference and committed logo assets in `README.md` and `ui/public/gitlocal-logo.svg`
- [X] T002 Review current Markdown toolbar and share-action structure in `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/components/ContentPanel/MarkdownShareActions.tsx`, and `ui/src/styles/globals.css`
- [X] T003 [P] Review existing content-panel and share-action test coverage in `ui/src/components/ContentPanel/ContentPanel.test.tsx` and `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared expectations that all user-story changes must preserve.

**Critical**: No user story work should begin until this phase is complete.

- [X] T004 Identify the stable repository-relative README logo path and document the expected asset file in `README.md`
- [X] T005 Identify the existing file action toolbar container where Markdown share actions should move in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T006 Identify current share action labels, native-command behavior, and status messages that must be preserved in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`

**Checkpoint**: Foundation ready. README logo and Markdown toolbar implementation can proceed.

---

## Phase 3: User Story 1 - See the README Logo (Priority: P1) MVP

**Goal**: A visitor reading the project README sees the GitLocal logo at the top instead of a missing image.

**Independent Test**: View the README in hosted and local repository contexts and confirm the logo path resolves to a committed asset.

### Tests for User Story 1

- [X] T007 [P] [US1] Add a README logo path regression check in `tests/unit/readme-assets.test.ts`

### Implementation for User Story 1

- [X] T008 [US1] Update the README logo reference to the stable repository-tracked asset path in `README.md`
- [X] T009 [US1] Run the README asset checks from `specs/024-fix-share-toolbar/quickstart.md` against `README.md` and `ui/public/gitlocal-logo.svg`

**Checkpoint**: User Story 1 is complete when the README logo path resolves to an existing committed asset.

---

## Phase 4: User Story 2 - Use Markdown Share Actions Without Extra Toolbar Height (Priority: P2)

**Goal**: Rendered Markdown files expose Find in File and share actions from the same toolbar row or compact toolbar region.

**Independent Test**: Open a rendered Markdown file and confirm find/share controls are available together with no dedicated sharing-only row.

### Tests for User Story 2

- [X] T010 [P] [US2] Add a content-panel test that rendered Markdown shows Find in File and Markdown share actions in the same toolbar region in `ui/src/components/ContentPanel/ContentPanel.test.tsx`
- [X] T011 [P] [US2] Add a content-panel test that readable non-Markdown files do not show Markdown-only share actions in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 2

- [X] T012 [US2] Refactor `MarkdownShareActions` to support inline toolbar placement without changing action behavior in `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [X] T013 [US2] Render Markdown share actions inside the existing file action toolbar row with Find in File in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [X] T014 [US2] Remove or repurpose the dedicated sharing-only row styles while preserving compact wrapping behavior in `ui/src/styles/globals.css`
- [X] T015 [US2] Verify existing share outcomes and native share command behavior remain covered in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`

**Checkpoint**: User Story 2 is complete when Markdown find and share actions are visible in the same toolbar region and non-Markdown views remain unchanged.

---

## Phase 5: User Story 3 - Remove Redundant Sharing Help Text (Priority: P3)

**Goal**: Rendered Markdown files no longer display the sentence "Sharing uses the saved Markdown content."

**Independent Test**: Open a rendered Markdown file with share controls and confirm the sentence is absent while buttons remain identifiable.

### Tests for User Story 3

- [X] T016 [P] [US3] Add a share-action test asserting the saved-content helper sentence is absent in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [X] T017 [P] [US3] Add or update an accessibility-oriented assertion that share buttons keep accessible names in `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`

### Implementation for User Story 3

- [X] T018 [US3] Remove the saved-content helper sentence rendering from `ui/src/components/ContentPanel/MarkdownShareActions.tsx`
- [X] T019 [US3] Remove obsolete helper-note styling only if it is no longer used in `ui/src/styles/globals.css`
- [X] T020 [US3] Confirm no rendered Markdown viewer test expects "Sharing uses the saved Markdown content." in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: User Story 3 is complete when the redundant sentence is absent and share controls remain understandable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate responsive behavior, coverage, and documentation consistency across all stories.

- [X] T021 [P] Run focused UI tests from `specs/024-fix-share-toolbar/quickstart.md` for `ui/src/components/ContentPanel/ContentPanel.test.tsx` and `ui/src/components/ContentPanel/MarkdownShareActions.test.tsx`
- [X] T022 [P] Run the project type check from `package.json` for changed TypeScript files under `ui/src/components/ContentPanel/`
- [X] T023 Validate toolbar layout manually at representative desktop and narrow widths using `specs/024-fix-share-toolbar/quickstart.md` and `ui/src/styles/globals.css`
- [X] T024 Run full verification from `package.json` and `ui/package.json` with `npm test` and `npm run build` before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks user-story work.
- **User Story 1 (Phase 3)**: Depends on Foundational completion; MVP scope.
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can start after or alongside US1 because it touches different runtime files.
- **User Story 3 (Phase 5)**: Depends on US2 task T012 if `MarkdownShareActions.tsx` is being refactored for inline placement first.
- **Polish (Phase 6)**: Depends on completed desired user stories.

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational; no dependency on US2 or US3.
- **US2 (P2)**: Independent after Foundational; no dependency on US1.
- **US3 (P3)**: Functionally independent, but implementation should follow US2 if both are in progress because both modify `MarkdownShareActions.tsx` and `globals.css`.

### Within Each User Story

- Write or update tests before implementation tasks.
- Complete implementation before running checkpoint verification.
- Keep README-only work separate from UI toolbar work to reduce merge conflicts.

### Parallel Opportunities

- T003 can run in parallel with T001 and T002.
- T007 can run in parallel with UI test planning tasks T010 and T011.
- T010 and T011 can be authored together before US2 implementation.
- T016 and T017 can be authored together before US3 implementation.
- T021 and T022 can run in parallel after implementation is complete.

---

## Parallel Example: User Story 1

```text
Task: "Add a README logo path regression check in tests/unit/readme-assets.test.ts"
Task: "Review current Markdown toolbar and share-action structure in ui/src/components/ContentPanel/ContentPanel.tsx, ui/src/components/ContentPanel/MarkdownShareActions.tsx, and ui/src/styles/globals.css"
```

## Parallel Example: User Story 2

```text
Task: "Add a content-panel test that rendered Markdown shows Find in File and Markdown share actions in the same toolbar region in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "Verify existing share outcomes and native share command behavior remain covered in ui/src/components/ContentPanel/MarkdownShareActions.test.tsx"
```

## Parallel Example: User Story 3

```text
Task: "Add a share-action test asserting the saved-content helper sentence is absent in ui/src/components/ContentPanel/MarkdownShareActions.test.tsx"
Task: "Confirm no rendered Markdown viewer test expects 'Sharing uses the saved Markdown content.' in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 tasks T007 through T009.
3. Validate the README logo path resolves to a committed asset.
4. Stop if the immediate public README regression is the only urgent fix.

### Incremental Delivery

1. Deliver US1 to restore README presentation.
2. Deliver US2 to reclaim Markdown viewer vertical space.
3. Deliver US3 to remove redundant share helper text.
4. Run focused tests and quickstart validation after each story.

### Parallel Team Strategy

1. One developer can complete US1 in `README.md` and `tests/unit/readme-assets.test.ts`.
2. Another developer can prepare US2 tests in `ContentPanel.test.tsx`.
3. A third developer can prepare US3 tests in `MarkdownShareActions.test.tsx`.
4. Coordinate final edits to `MarkdownShareActions.tsx` and `globals.css` because US2 and US3 both touch those files.

## Notes

- Keep all paths repository-relative.
- Do not add a new share provider, hosted share link, account feature, telemetry, or dependency.
- Preserve existing share action outcomes while changing placement and copy.
- Keep non-Markdown file views out of scope except for regression checks.
