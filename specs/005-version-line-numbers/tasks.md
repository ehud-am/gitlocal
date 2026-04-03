# Tasks: Accurate Version Display and Code Line Numbers

**Input**: Design documents from `specs/005-version-line-numbers/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include backend and frontend tests for this feature because the plan and constitution require preserving behavior coverage for changed TypeScript and React files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g., [US1], [US2])
- Include exact file paths in descriptions

## Path Conventions

- Server code lives in `src/`
- Server tests live in `tests/`
- UI code lives in `ui/src/`
- UI tests live beside components or in `ui/src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the shared metadata and viewer files touched by both fixes

- [x] T001 Review and align the version-display and code-presentation touchpoints in `src/git/repo.ts`, `src/handlers/git.ts`, `ui/src/App.tsx`, `ui/src/components/AppFooter.tsx`, `ui/src/components/ContentPanel/CodeViewer.tsx`, and `ui/src/components/ContentPanel/MarkdownRenderer.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared plumbing that MUST be correct before either user story is complete

**⚠️ CRITICAL**: No user story work can be considered complete until this phase is complete

- [x] T002 [P] Add or update shared metadata typing for the running application version in `src/types.ts` and `ui/src/types/index.ts`
- [x] T003 [P] Add regression coverage for server-provided version metadata in `tests/unit/handlers/git.test.ts` and `tests/integration/server.test.ts`
- [x] T004 Remove or replace hardcoded footer-version fallbacks with a single server-driven source of truth in `src/git/repo.ts`, `src/handlers/git.ts`, and `ui/src/App.tsx`

**Checkpoint**: Shared version metadata is reliable and ready for story-level UI work

---

## Phase 3: User Story 1 - Show the Real Running Version (Priority: P1) 🎯 MVP

**Goal**: Ensure every screen shows the actual running release version instead of `v0.0.0` or other static fallback text

**Independent Test**: Open picker and repository screens and confirm the footer version matches the current running release consistently.

### Tests for User Story 1

- [x] T005 [P] [US1] Add footer-version UI regression tests in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [x] T006 [US1] Update footer rendering to always display the resolved running version in `ui/src/components/AppFooter.tsx` and `ui/src/App.tsx`
- [x] T007 [US1] Document the accurate-version behavior in `README.md` and `CHANGELOG.md`

**Checkpoint**: User Story 1 should now be fully functional and independently verifiable

---

## Phase 4: User Story 2 - Read Code With Line Numbers (Priority: P2)

**Goal**: Add readable left-side line numbers to code-oriented presentations without polluting non-code content

**Independent Test**: Open syntax-highlighted and raw code views and confirm a left gutter shows aligned line numbers while non-code presentations remain unchanged.

### Tests for User Story 2

- [x] T008 [P] [US2] Add numbered-code rendering tests in `ui/src/components/ContentPanel/CodeViewer.test.tsx` and `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`
- [x] T009 [P] [US2] Add content-panel integration coverage for numbered raw/code presentations in `ui/src/components/ContentPanel/ContentPanel.test.tsx`

### Implementation for User Story 2

- [x] T010 [US2] Implement reusable line-number gutter rendering for code-oriented content in `ui/src/components/ContentPanel/CodeViewer.tsx`
- [x] T011 [US2] Apply numbered code presentation where appropriate in `ui/src/components/ContentPanel/ContentPanel.tsx` and `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [x] T012 [US2] Add styling for aligned code gutters and preserve non-code presentation behavior in `ui/src/App.css`

**Checkpoint**: User Stories 1 and 2 should now both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and feature-level cleanup

- [x] T013 [P] Refresh the feature docs to reflect implementation outcomes in `specs/005-version-line-numbers/quickstart.md` and `specs/005-version-line-numbers/tasks.md`
- [x] T014 Run full verification with `npm test`, `npm run lint`, and `npm run build`
- [ ] T015 Validate the end-to-end footer-version and numbered-code flow from `specs/005-version-line-numbers/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks story completion
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion
- **Polish (Phase 5)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Foundational; no dependency on User Story 2
- **User Story 2 (P2)**: Can start after Foundational; it is independently testable once shared metadata plumbing is stable

### Within Each User Story

- Add or update tests before implementation when practical
- Keep metadata/type changes ahead of footer rendering changes
- Keep numbered-rendering component work ahead of final styling polish
- Validate each story independently at its checkpoint before moving on

### Parallel Opportunities

- T002 and T003 can run in parallel during the Foundational phase
- T005 can run while T006 is being prepared because it targets the same user-visible behavior but different files
- T008 and T009 can run in parallel for User Story 2
- Once Foundational is complete, User Story 1 and User Story 2 can proceed independently if needed

---

## Parallel Example: User Story 2

```bash
# Cover the numbered-code behavior in parallel:
Task: "Add numbered-code rendering tests in ui/src/components/ContentPanel/CodeViewer.test.tsx and ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"
Task: "Add content-panel integration coverage for numbered raw/code presentations in ui/src/components/ContentPanel/ContentPanel.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the real version display on both screens

### Incremental Delivery

1. Land the version-source-of-truth fix first so release identification is trustworthy
2. Add numbered code presentation as a second independently testable increment
3. Finish with full verification and quickstart validation

### Parallel Team Strategy

1. One contributor completes T002-T004 to stabilize shared metadata
2. One contributor handles the footer test and UI tasks for US1
3. Another contributor handles numbered-code tests and rendering/styling for US2 after Foundational is done

---

## Notes

- [P] tasks target different files and can be worked on concurrently
- [US1] and [US2] labels map directly to the feature spec user stories
- T015 is the only explicit manual validation task; automated verification is covered by T014
