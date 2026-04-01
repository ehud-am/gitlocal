# Tasks: Copy Control Polish

**Input**: Design documents from `specs/004-copy-control-polish/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include frontend tests for this feature because the plan and constitution require preserving behavior coverage for changed React and TypeScript files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- UI code lives in `ui/src/`
- UI tests live beside components in `ui/src/components/`
- Feature documentation for this work lives in `specs/004-copy-control-polish/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the feature work with the current content-panel file ownership and validation flow before story-specific implementation

- [x] T001 Confirm the implementation surface and verification flow in `specs/004-copy-control-polish/plan.md`, `specs/004-copy-control-polish/contracts/copy-controls.md`, and `specs/004-copy-control-polish/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared icon-based copy control behavior that both user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Add shared icon-based copy control states, accessible labels, and tooltip behavior in `ui/src/components/ContentPanel/CopyButton.tsx`
- [x] T003 [P] Update shared copy-control styling tokens and button presentation for icon-only affordances in `ui/src/App.css`
- [x] T004 Add or update focused shared copy-control behavior coverage in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Copy From Markdown Naturally (Priority: P1) 🎯 MVP

**Goal**: Show copy icons only on rendered markdown code blocks and keep each icon scoped to its own block content

**Independent Test**: Open a markdown file with headings, paragraphs, lists, quotes, inline code, and multiple fenced code blocks; confirm only fenced code blocks show the copy icon and each icon copies only its own block text.

### Tests for User Story 1

- [x] T005 [P] [US1] Expand markdown renderer tests for code-block-only icon rendering and non-code omission in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`
- [x] T006 [P] [US1] Add content-panel coverage for markdown copy icon accessibility and target-specific clipboard behavior in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 1

- [x] T007 [US1] Restrict rendered markdown copy controls to block code nodes and preserve relative-link navigation in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [x] T008 [P] [US1] Refine markdown code block layout for icon placement and non-code block spacing in `ui/src/App.css`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Copy Raw Files With A Familiar Control (Priority: P1)

**Goal**: Keep full-file raw copy available while switching its visible control to the same icon-based treatment used for markdown code blocks

**Independent Test**: Open a file in raw view, confirm the raw-file toolbar shows the icon-based copy control, and verify activating it copies the entire visible raw file content.

### Tests for User Story 2

- [x] T009 [P] [US2] Update raw-view copy tests for icon-based rendering and full-file clipboard output in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 2

- [x] T010 [US2] Integrate the shared icon-based raw copy control into the raw-view toolbar state in `ui/src/components/ContentPanel/ContentPanel.tsx`
- [x] T011 [P] [US2] Adjust raw-view code container and toolbar presentation for icon-based copy affordances in `ui/src/components/ContentPanel/CodeViewer.tsx` and `ui/src/App.css`

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup across both user stories

- [x] T012 [P] Reconcile shared copy-control wording and expectations across `specs/004-copy-control-polish/spec.md`, `specs/004-copy-control-polish/contracts/copy-controls.md`, and `specs/004-copy-control-polish/quickstart.md`
- [ ] T013 Run feature verification and fix regressions surfaced by `npm test`, `npm run lint`, and the manual flow in `specs/004-copy-control-polish/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-4)**: Depend on Foundational completion
- **Polish (Phase 5)**: Depends on completion of the desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P1)**: Can start after Foundational - depends on the shared copy-button behavior from Phase 2 but not on US1 completion

### Within Each User Story

- Update tests before or alongside implementation so copy-target regressions are caught immediately
- Shared copy-button behavior before story-specific renderer or toolbar integration
- Component behavior before presentation refinements
- Validate each story independently at its checkpoint before moving on

### Parallel Opportunities

- T002 and T003 can run in parallel during Foundational work
- T005 and T006 can run in parallel for User Story 1
- T008 can run in parallel with T007 once the renderer contract is settled
- T009 and T011 can run in parallel for User Story 2 after the shared copy button is complete

---

## Parallel Example: User Story 1

```bash
# Build the story coverage together:
Task: "Expand markdown renderer tests for code-block-only icon rendering and non-code omission in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"
Task: "Add content-panel coverage for markdown copy icon accessibility and target-specific clipboard behavior in ui/src/components/ContentPanel/ContentPanel.test.tsx"

# Finish behavior and presentation together once the tests describe the target:
Task: "Restrict rendered markdown copy controls to block code nodes and preserve relative-link navigation in ui/src/components/ContentPanel/MarkdownRenderer.tsx"
Task: "Refine markdown code block layout for icon placement and non-code block spacing in ui/src/App.css"
```

---

## Parallel Example: User Story 2

```bash
# Verify toolbar behavior while preparing the raw-view presentation:
Task: "Update raw-view copy tests for icon-based rendering and full-file clipboard output in ui/src/components/ContentPanel/ContentPanel.test.tsx"
Task: "Adjust raw-view code container and toolbar presentation for icon-based copy affordances in ui/src/components/ContentPanel/CodeViewer.tsx and ui/src/App.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm rendered markdown only shows copy icons on code blocks and that each icon copies only its own block
5. Demo the cleaner markdown reading and copying experience

### Incremental Delivery

1. Complete Setup + Foundational to establish the shared icon-based copy behavior
2. Deliver User Story 1 for the highest-visibility markdown usability win
3. Deliver User Story 2 to align raw-file copy with the same visual language
4. Finish with cross-cutting verification and documentation alignment

### Parallel Team Strategy

With multiple developers:

1. One developer completes Phase 2 shared copy-button behavior
2. Once Foundational is done:
   - Developer A: User Story 1 renderer and markdown tests
   - Developer B: User Story 2 raw-view integration and toolbar styling
3. Rejoin for final verification in Phase 5

---

## Notes

- [P] tasks target different files or separable test-versus-implementation layers with no unresolved prerequisite conflicts
- [US1] and [US2] labels map directly to the feature specification's two user stories
- Each story has an explicit independent test and can be validated at its checkpoint
- The suggested MVP scope is **User Story 1** after completing Setup and Foundational work
- All tasks follow the required checklist format with task ID, optional `[P]`, story label where required, and exact file paths
