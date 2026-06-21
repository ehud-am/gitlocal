# Tasks: Markdown YAML Visualization

**Input**: Design documents from `specs/027-markdown-yaml-visualization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/markdown-frontmatter-ui.md, quickstart.md

**Tests**: Included because the plan and contract require regression coverage for front matter parsing, rendering boundaries, ordinary Markdown, malformed metadata, and existing Markdown workflows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing Markdown viewer surface and add the new helper files expected by the plan.

- [X] T001 Inspect the current Markdown renderer and output helper behavior in `ui/src/components/ContentPanel/MarkdownRenderer.tsx` and `ui/src/components/ContentPanel/markdown-output.ts`
- [X] T002 [P] Create the front matter helper module scaffold and exported TypeScript types in `ui/src/components/ContentPanel/markdown-frontmatter.ts`
- [X] T003 [P] Create the front matter helper test scaffold in `ui/src/components/ContentPanel/markdown-frontmatter.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared front matter detection/model layer that all user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Add failing tests for bounded start-of-file front matter detection, body splitting, empty front matter, missing closing delimiter, and ordinary Markdown fallback in `ui/src/components/ContentPanel/markdown-frontmatter.test.ts`
- [X] T005 Implement `parseMarkdownFrontMatter` in `ui/src/components/ContentPanel/markdown-frontmatter.ts` to return original content as body when no recognized bounded front matter exists
- [X] T006 Extend `parseMarkdownFrontMatter` in `ui/src/components/ContentPanel/markdown-frontmatter.ts` to return recognized front matter raw text, body content, line boundaries, status, and an initial display model
- [X] T007 Run the focused helper tests with `npm --prefix ui run test -- markdown-frontmatter` and fix issues in `ui/src/components/ContentPanel/markdown-frontmatter.ts`

**Checkpoint**: Front matter classification and body splitting are ready for UI integration.

---

## Phase 3: User Story 1 - Read Markdown Files With Front Matter Clearly (Priority: P1) MVP

**Goal**: Render valid front matter as a distinct metadata area before the Markdown body so metadata no longer appears as a large bold Markdown block.

**Independent Test**: Open or render a skill-style Markdown sample with front matter and confirm metadata is visually separated while the Markdown body starts after the closing delimiter.

### Tests for User Story 1

- [X] T008 [P] [US1] Add a renderer test for skill-style front matter appearing in a distinct metadata region in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`
- [X] T009 [P] [US1] Add a renderer test proving the Markdown body renders after front matter with normal headings, lists, emphasis, and code blocks in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`

### Implementation for User Story 1

- [X] T010 [US1] Import and apply `parseMarkdownFrontMatter` inside `ui/src/components/ContentPanel/MarkdownRenderer.tsx` before `stripHiddenMarkdownComments`, `normalizeHtmlImages`, and `ReactMarkdown`
- [X] T011 [US1] Render a labeled metadata container before the Markdown body when front matter is recognized in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T012 [US1] Ensure heading IDs, relative links, local images, find highlighting, and code block copy buttons operate on the body content after front matter in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T013 [US1] Add base metadata visualization styles for spacing, label, field rows, fallback text, and body separation in `ui/src/styles/globals.css`
- [X] T014 [US1] Run `npm --prefix ui run test -- MarkdownRenderer markdown-frontmatter` and fix US1 regressions in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`, `ui/src/components/ContentPanel/markdown-frontmatter.ts`, and `ui/src/styles/globals.css`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Inspect Metadata Without Losing Raw Meaning (Priority: P2)

**Goal**: Preserve readable field names, scalar values, nested groups, lists, and raw source semantics for front matter metadata.

**Independent Test**: Render flat and nested front matter samples and verify labels, values, and grouping are understandable while source/copy/share still expose original Markdown.

### Tests for User Story 2

- [X] T015 [P] [US2] Add helper tests for nested metadata groups, arrays, booleans, numbers, quoted strings, and empty values in `ui/src/components/ContentPanel/markdown-frontmatter.test.ts`
- [X] T016 [P] [US2] Add renderer tests for nested metadata and list display in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`
- [X] T017 [P] [US2] Add output helper regression tests proving original Markdown with front matter remains available to source-oriented copy/share helpers in `ui/src/components/ContentPanel/markdown-output.test.ts`

### Implementation for User Story 2

- [X] T018 [US2] Extend metadata entry parsing for nested maps, list items, quoted values, booleans, numbers, and empty values in `ui/src/components/ContentPanel/markdown-frontmatter.ts`
- [X] T019 [US2] Render nested metadata entries recursively with stable labels and values in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T020 [US2] Refine metadata styling for nested groups, list values, long descriptions, and narrow layouts in `ui/src/styles/globals.css`
- [X] T021 [US2] Preserve raw Markdown behavior for title, plain text, markdown, and PDF output helpers in `ui/src/components/ContentPanel/markdown-output.ts`
- [X] T022 [US2] Run `npm --prefix ui run test -- MarkdownRenderer markdown-frontmatter markdown-output` and fix US2 regressions in `ui/src/components/ContentPanel/`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Handle Non-Front-Matter Markdown Normally (Priority: P3)

**Goal**: Ensure ordinary Markdown, horizontal rules, delimiter-like code fences, incomplete delimiters, and malformed metadata remain readable without false metadata panels.

**Independent Test**: Render Markdown files with no front matter, leading horizontal rules, delimiter-like code fences, incomplete delimiters, and malformed bounded metadata and confirm each case matches the contract.

### Tests for User Story 3

- [X] T023 [P] [US3] Add helper tests for leading horizontal rules, delimiter-like text after body content, fenced code containing delimiters, and incomplete front matter in `ui/src/components/ContentPanel/markdown-frontmatter.test.ts`
- [X] T024 [P] [US3] Add renderer tests confirming ordinary Markdown shows no metadata visualization in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`
- [X] T025 [P] [US3] Add renderer tests confirming malformed or incomplete leading metadata does not hide body content or render as one broken bold block in `ui/src/components/ContentPanel/MarkdownRenderer.test.tsx`

### Implementation for User Story 3

- [X] T026 [US3] Harden front matter recognition against horizontal-rule false positives, delimiter-like body text, and fenced-code delimiter text in `ui/src/components/ContentPanel/markdown-frontmatter.ts`
- [X] T027 [US3] Add malformed and incomplete metadata fallback rendering that keeps content readable in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T028 [US3] Add responsive style coverage for the metadata visualization selectors in `ui/src/styles/globals.test.ts`
- [X] T029 [US3] Run `npm --prefix ui run test -- MarkdownRenderer markdown-frontmatter globals` and fix US3 regressions in `ui/src/components/ContentPanel/` and `ui/src/styles/`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across the Markdown rendering workflow.

- [X] T030 [P] Review metadata UI copy, accessible labeling, and DOM structure against `specs/027-markdown-yaml-visualization/contracts/markdown-frontmatter-ui.md` in `ui/src/components/ContentPanel/MarkdownRenderer.tsx`
- [X] T031 [P] Review CSS for text wrapping, spacing stability, and non-overlap at narrow and wide widths in `ui/src/styles/globals.css`
- [X] T032 Run focused verification from `specs/027-markdown-yaml-visualization/quickstart.md` with `npm --prefix ui run test -- MarkdownRenderer markdown-frontmatter markdown-output`
- [X] T033 Run UI coverage validation with `npm --prefix ui run test:ci`
- [X] T034 Run full project validation with `npm test`, `npm run lint`, and `npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002 and T003 can run in parallel after T001 starts.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; can be developed after or alongside US1, but final renderer integration should account for US1 metadata container behavior.
- **User Story 3 (Phase 5)**: Depends on Foundational; can be developed after or alongside US1/US2, but final fallback behavior should not regress valid metadata display.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2; no dependency on US2 or US3.
- **User Story 2 (P2)**: Can start after Phase 2; uses the same metadata model and renderer container from US1 if US1 is already complete.
- **User Story 3 (P3)**: Can start after Phase 2; validates false-positive and malformed cases against the shared parser and renderer.

### Within Each User Story

- Write story-specific tests first and confirm they fail for the missing behavior.
- Implement helper/model behavior before renderer integration when both are needed.
- Update renderer before CSS polish when the DOM shape is required for selectors.
- Run the story checkpoint command before moving to the next priority.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T008 and T009 can run in parallel once Phase 2 is complete.
- T015, T016, and T017 can run in parallel once Phase 2 is complete.
- T023, T024, and T025 can run in parallel once Phase 2 is complete.
- T030 and T031 can run in parallel after all selected user stories are implemented.

---

## Parallel Example: User Story 1

```bash
Task: "T008 [P] [US1] Add a renderer test for skill-style front matter appearing in a distinct metadata region in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"
Task: "T009 [P] [US1] Add a renderer test proving the Markdown body renders after front matter with normal headings, lists, emphasis, and code blocks in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T015 [P] [US2] Add helper tests for nested metadata groups, arrays, booleans, numbers, quoted strings, and empty values in ui/src/components/ContentPanel/markdown-frontmatter.test.ts"
Task: "T016 [P] [US2] Add renderer tests for nested metadata and list display in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"
Task: "T017 [P] [US2] Add output helper regression tests proving original Markdown with front matter remains available to source-oriented copy/share helpers in ui/src/components/ContentPanel/markdown-output.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T023 [P] [US3] Add helper tests for leading horizontal rules, delimiter-like text after body content, fenced code containing delimiters, and incomplete front matter in ui/src/components/ContentPanel/markdown-frontmatter.test.ts"
Task: "T024 [P] [US3] Add renderer tests confirming ordinary Markdown shows no metadata visualization in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"
Task: "T025 [P] [US3] Add renderer tests confirming malformed or incomplete leading metadata does not hide body content or render as one broken bold block in ui/src/components/ContentPanel/MarkdownRenderer.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 parser/model foundation.
3. Complete Phase 3 User Story 1.
4. Stop and validate with `npm --prefix ui run test -- MarkdownRenderer markdown-frontmatter`.
5. Demo with a skill-style Markdown file containing front matter.

### Incremental Delivery

1. Add US1 to fix the visibly broken front matter rendering.
2. Add US2 to improve metadata structure, nesting, and raw/source preservation coverage.
3. Add US3 to harden false-positive and malformed cases.
4. Finish polish and full validation.

### Parallel Team Strategy

After Phase 2, one developer can focus on renderer UI for US1, another on metadata model depth for US2, and another on false-positive/malformed regression coverage for US3. Coordinate edits to `MarkdownRenderer.tsx` and `markdown-frontmatter.ts` because they are shared files.

## Notes

- [P] tasks use different files or independent test additions and can run without waiting on non-parallel tasks in the same phase.
- Every user story has an independent test criterion and checkpoint.
- No backend, API, storage, native wrapper, or dependency changes are planned.
- Keep all paths repository-relative in committed docs.
