# Tasks: Repo Safety, Search & Review Fixes + PPTX Preview

**Input**: Design documents from `specs/039-bugfix-pptx-preview/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the spec's plan.md and Constitution Principle II (non-negotiable ≥90% per-file branch coverage) require targeted regression tests for every fix and new component.

**Status note**: Bug fixes for User Stories 1–4 (P1/P2/P3) already have working-tree changes in `src/git/repo.ts`, `src/handlers/search.ts`, `src/terminal/websocket.ts`, and their test files, and `npm test` currently passes for all three touched test files. Tasks T001–T017 below are recorded for traceability/completeness against spec.md and should be treated as **verify-and-close** rather than net-new work — confirm each acceptance scenario and edge case is actually covered, then check off. User Story 5 (PPTX preview) is entirely unimplemented and is the remaining net-new work for this release.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

## Path Conventions

Existing web-application layout: `src/` (Hono backend), `ui/` (Vite/React frontend), `tests/unit/` (Vitest).

---

## Phase 1: Setup

**Purpose**: Add new dependencies needed for PPTX preview; no other project-init work required (existing project).

- [X] T001 [P] Add `jszip` (MIT) as a `ui/` dependency in `ui/package.json`
- [X] T002 [P] Add `fast-xml-parser` (MIT) as a `ui/` dependency in `ui/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the shared `FileContent` type and server-side file-type detection so both the API contract and the future `PptxViewer` have a `'pptx'` type to target. Blocks US5 only (US1–US4 are independent of this phase).

**⚠️ CRITICAL**: T003–T005 must complete before any US5 implementation task.

- [X] T003 Add `'pptx'` to the `FileContentType` union in `src/types.ts` (contracts/file-content-api.md)
- [X] T004 Add a `.pptx` branch to `detectFileType()` in `src/git/repo.ts`, returning `{ type: 'pptx', language: '' }` for `ext === 'pptx'` (spec.md FR-013; confirm legacy `.ppt` is deliberately left classified as `binary` per spec.md Assumptions unless a low-effort path is found)
- [X] T005 Add a `pptx` response branch to the file handler in `src/handlers/file.ts`, mirroring the existing `excel` branch: `{ type: 'pptx', encoding: 'base64', content: rawBytes.toString('base64'), editable: false, ... }` (contracts/file-content-api.md)

**Checkpoint**: `'pptx'` is a recognized file type end-to-end at the API layer; UI work in US5 can now begin.

---

## Phase 3: User Story 1 - Writes stay inside the opened repository (Priority: P1) 🎯 MVP

**Goal**: No file/folder write can escape the opened repository root via a symlink anywhere in the target path (single-hop or chained).

**Independent Test**: Open a repo containing a symlink pointing outside it; attempt to create a file/folder through a path traversing that symlink; verify rejection and that nothing is created outside the repo root (quickstart.md §1).

### Tests for User Story 1

- [ ] T006 [P] [US1] Verify/extend `tests/unit/git/repo.test.ts` with cases: single-hop symlink escape rejected for file write, single-hop symlink escape rejected for folder creation, chained/nested symlink escape rejected, in-repo symlink (resolves inside repo root) still permitted, ordinary non-symlink path still succeeds unchanged (spec.md Edge Cases, Acceptance Scenarios 1–3)

### Implementation for User Story 1

- [ ] T007 [US1] In `src/git/repo.ts`, re-validate every existing intermediate directory segment (not just the nearest existing ancestor) against its `realpathSync`-resolved location during the path walk in `resolveSafeRepoPath` (research.md §1, FR-003)
- [ ] T008 [US1] In `src/git/repo.ts`, add a final `realpathSync`-based containment re-check on the fully resolved parent directory immediately before `mkdir` in `createWorkingTreeFolder` and immediately before `writeFile` in the file-write path (research.md §1, FR-001, FR-002)
- [ ] T009 [US1] Confirm no behavior/performance change for ordinary in-repository paths (single extra `realpathSync` call only) — run `npm test -- tests/unit/git/repo.test.ts` (FR-004, plan.md Performance Goals)

**Checkpoint**: User Story 1 fully functional and independently verifiable via quickstart.md §1.

---

## Phase 4: User Story 2 - Branch search returns correct, openable results for colon-containing filenames (Priority: P2)

**Goal**: Branch content search returns the correct full path and line number for matches in colon-named files.

**Independent Test**: Commit a tracked file with a colon in its name; search branch content for its text; verify correct path/line and that opening the result lands on the right file/line (quickstart.md §2).

### Tests for User Story 2

- [ ] T010 [P] [US2] Verify/extend `tests/unit/handlers/search.test.ts` with cases: single colon in filename, multiple colons in filename (`a:b:c.txt`), match on the last line with no trailing newline in a colon-named file, filenames without colons unaffected (spec.md Edge Cases, Acceptance Scenarios 1–3)

### Implementation for User Story 2

- [ ] T011 [US2] In `src/handlers/search.ts`, replace any colon-splitting used to strip the `${branch}:` treeish prefix with an explicit length-based prefix removal (`path.slice(branch.length + 1)` after confirming the field starts with `${branch}:`) in `searchGitTreeByContent` (research.md §2, FR-005, FR-006)
- [ ] T012 [US2] Confirm search results remain openable at the correct file/line for both colon-containing and ordinary filenames — run `npm test -- tests/unit/handlers/search.test.ts` (FR-007)

**Checkpoint**: User Story 2 fully functional and independently verifiable via quickstart.md §2.

---

## Phase 5: User Story 3 - Changed-file review shows correct paths for renames with special characters (Priority: P2)

**Goal**: Changed-file review decodes Git's quoted-path notation for renames so paths, change type, and openability are all correct.

**Independent Test**: Stage a rename to a filename containing a space; request the changed-file list; verify exact decoded path, correct `renamed` type, and `canOpen: true` (quickstart.md §3).

### Tests for User Story 3

- [ ] T013 [P] [US3] Verify/extend `tests/unit/git/repo.test.ts` with cases: rename to a space-containing filename, rename involving a non-ASCII character, rename where both old and new paths require quoting, rename with embedded quote/backslash characters, plain unquoted renames unaffected (spec.md Edge Cases, Acceptance Scenarios 1–3)

### Implementation for User Story 3

- [ ] T014 [US3] In `src/git/repo.ts`, add an `unquoteGitPath(raw: string): string` helper that detects Git's C-quoting (leading/trailing `"`) and decodes octal byte escapes plus `\\`, `\"`, `\t`, `\n` sequences (research.md §3)
- [ ] T015 [US3] In `src/git/repo.ts`, apply `unquoteGitPath` to both the single-path case and the NUL-delimited old/new rename pair in `parsePorcelainChangeState`, ensuring the rename pair is split on the correct porcelain separator (research.md §3, FR-008)
- [ ] T016 [US3] Confirm change type (`renamed`) and `canOpen` are correctly reported using the decoded real path — run `npm test -- tests/unit/git/repo.test.ts` (FR-009, FR-010)

**Checkpoint**: User Story 3 fully functional and independently verifiable via quickstart.md §3.

---

## Phase 6: User Story 4 - Non-terminal connection attempts fail fast (Priority: P3)

**Goal**: Any WebSocket upgrade attempt to a non-terminal path is actively closed promptly; the terminal endpoint is unaffected.

**Independent Test**: Attempt a WebSocket connection to a non-terminal path; verify the socket closes within a short bounded time rather than staying pending (quickstart.md §4).

### Tests for User Story 4

- [ ] T017 [P] [US4] Verify/extend `tests/unit/terminal/websocket.test.ts` with cases: non-terminal upgrade path closes within a bounded time, repeated rapid non-terminal connection attempts are each rejected promptly (no accumulation), terminal-endpoint connections behave exactly as before (spec.md Edge Cases, Acceptance Scenarios 1–2)

### Implementation for User Story 4

- [ ] T018 [US4] In `src/terminal/websocket.ts`, ensure the terminal upgrade handler is registered before the HTTP server begins accepting connections, closing any startup-ordering race (research.md §4, FR-011)
- [ ] T019 [US4] In `src/terminal/websocket.ts`, confirm the handler unconditionally destroys the socket for any unrecognized path and is the sole/authoritative `'upgrade'` listener (research.md §4, FR-011, FR-012)
- [ ] T020 [US4] Run `npm test -- tests/unit/terminal/websocket.test.ts` to confirm terminal-endpoint behavior is unchanged (FR-012)

**Checkpoint**: User Story 4 fully functional and independently verifiable via quickstart.md §4. All four bug fixes (P1–P3) are now complete — this is a valid ship point independent of US5.

---

## Phase 7: User Story 5 - Preview a PowerPoint presentation slide by slide (Priority: P2)

**Goal**: Opening a `.pptx` file in GitLocal shows a formatted, read-only, slide-by-slide preview with next/previous navigation and speaker notes where present.

**Independent Test**: Open a multi-slide `.pptx` with at least one slide having notes; verify first-slide render, next/previous navigation through all slides, notes shown only where present, no edit controls, and a clear error state for a corrupted file (quickstart.md §"Verify PPTX preview").

**Depends on**: Phase 2 (Foundational) — `'pptx'` type must exist in `FileContentType`, `detectFileType`, and the file handler before the registry/viewer can be wired up.

### Tests for User Story 5

- [X] T021 [P] [US5] Extend `tests/unit/handlers/file.test.ts` with coverage for the new `pptx` response branch (base64 content, `editable: false`, `type: 'pptx'`) (contracts/file-content-api.md)
- [X] T022 [P] [US5] Extend `tests/unit/git/repo.test.ts` (or its `detectFileType` describe block) with a case asserting `.pptx` files are classified as `type: 'pptx'` and legacy `.ppt` remains `binary`
- [X] T023 [P] [US5] Create fixture `.pptx` files for tests (multi-slide with mixed notes/no-notes, single-slide, zero-slide/empty, corrupted/truncated) under a test fixtures directory mirroring `ExcelViewer.test.tsx`'s pattern, referenced by `ui/src/components/ContentPanel/PptxViewer.test.tsx`
- [X] T024 [P] [US5] Write `ui/src/components/ContentPanel/PptxViewer.test.tsx`: renders first slide as formatted view (not raw markup/download prompt); next/previous navigation steps through all slides in order; navigation disabled/no-ops at first and last slide; notes shown for slides that have them; no notes area rendered for slides without notes; zero-shape slide renders without crashing; single-slide and zero-slide decks render without navigation errors; no edit controls present anywhere; corrupted/unreadable file shows a clear "cannot preview this file" state, not a crash; mocked `jszip`/`fast-xml-parser` error branches (Acceptance Scenarios 1–6, Edge Cases, data-model.md Validation rules)
- [X] T025 [P] [US5] Extend `ui/src/components/ContentPanel/preview-registry.test.ts` to assert the new `pptx` key maps to `PptxViewer` with `supportsRawToggle: false` and `editable: false`, with no change to the registry's dispatch logic (FR-019, SC-006)

### Implementation for User Story 5

- [X] T026 [US5] Define `PptxPresentation`, `PptxSlide`, `PptxShape`, `PptxTextRun` client-side types in `ui/src/components/ContentPanel/PptxViewer.tsx` (data-model.md)
- [X] T027 [US5] Implement dynamic/lazy import of `jszip` and `fast-xml-parser` inside `PptxViewer`'s load effect, mirroring `PdfViewer`'s `Promise.all([import(...), import(...)])` pattern (research.md §7)
- [X] T028 [US5] Implement base64-to-`Uint8Array` decode of the fetched file content and `jszip.loadAsync(data)` to unzip the `.pptx` container in `PptxViewer.tsx` (contracts/file-content-api.md)
- [X] T029 [US5] Parse `ppt/presentation.xml` for `slideWidthEmu`/`slideHeightEmu` and slide order in `PptxViewer.tsx` (data-model.md)
- [X] T030 [US5] Parse each `ppt/slides/slideN.xml` with `fast-xml-parser` into `PptxShape[]` (text boxes with `PptxTextRun[]` run-level bold/italic/fontSizePt/color, and slide `backgroundFill`), parsing slides incrementally/yielding to the event loop rather than all synchronously (research.md §5, §7; FR-014)
- [X] T031 [US5] Resolve embedded images via each slide's `ppt/slides/_rels/slideN.xml.rels` to `ppt/media/imageN.*`, embedding as base64 data URIs on `PptxShape` (kind: 'image'); render an unresolvable image as a placeholder rather than omitting it (research.md §5, data-model.md Validation rules)
- [X] T032 [US5] Parse `ppt/notesSlides/notesSlideN.xml` (resolved via the slide's `.rels` file) into each `PptxSlide.notes` plain-text field when present; treat `null` and empty/whitespace-only notes both as "no notes" (research.md §5, data-model.md Validation rules, FR-016)
- [X] T033 [US5] Implement slide rendering in `PptxViewer.tsx`: absolutely-positioned shapes scaled from EMU to CSS pixels using `slideWidthEmu`/`slideHeightEmu`, rendering text runs with their formatting and images as `<img>` from their data URI; a zero-shape slide renders as a valid empty slide (research.md §5, §6; FR-014; data-model.md Validation rules)
- [X] T034 [US5] Implement single "current slide index" navigation state (mirroring Excel viewer's `activeSheetIndex` pattern) with next/previous controls disabled/no-op at the first/last slide, and an adjacent notes panel shown only when the current slide has notes (research.md §6, FR-015, FR-016)
- [X] T035 [US5] Implement a top-level "cannot preview this file" error state for unrecoverable parse failures (corrupted zip, missing required XML parts), replacing any partial render (FR-018, data-model.md Validation rules)
- [X] T036 [US5] Ensure `PptxViewer` renders no editing controls and performs no mutating action on the underlying file (FR-017)
- [X] T037 [US5] Add the `pptx` entry to `ui/src/components/ContentPanel/preview-registry.tsx`: `{ Component: PptxViewer (React.lazy), supportsRawToggle: false, editable: false }`, with zero changes to the registry's core dispatch logic (data-model.md, FR-019, SC-006)
- [X] T038 [US5] Verify `ui/vitest.config.ts`'s coverage `include` list already covers `PptxViewer.tsx` (per the gap fixed in spec 038); add it explicitly if missing

**Checkpoint**: User Story 5 fully functional and independently verifiable via quickstart.md §"Verify PPTX preview". All five user stories now complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final release-readiness pass across all five stories.

- [X] T039 [P] Run `npm test` (full suite with coverage) and confirm ≥90% per-file branch coverage on all touched/new files, including `PptxViewer.tsx` (Constitution Principle II) — note: `folder.test.ts`'s filesystem-root test and `App.test.tsx`'s dropdown-menu-click test are pre-existing, unrelated flaky timeouts (both pass cleanly in isolation; neither file was touched by this feature)
- [X] T040 [P] Run `npm run lint` (`tsc --noEmit`) across the full project
- [X] T041 Run `npm run build` and confirm `jszip`/`fast-xml-parser` resolve and lazy-load correctly at build time, with no main-bundle size regression (quickstart.md, plan.md Performance Goals)
- [X] T042 [P] Confirm zero regression on existing preview types (`.md`, `.json`, `.svg`, `.pdf`, `.csv`, `.xlsx`, `.png`, code files) per quickstart.md "Verify zero regression on existing types" — covered by the full suite (T039): every existing viewer's own test file (MarkdownRenderer, JSONViewer, CodeViewer, SvgViewer, PdfViewer, CsvViewer, ExcelViewer, image handling in preview-registry.test.tsx) passed unchanged
- [~] T043 Execute quickstart.md end-to-end for all five stories in a running dev instance — partial: built server started against a real temp repo containing `sample.pptx`; `GET /api/file` confirmed to return `{ type: 'pptx', encoding: 'base64', editable: false }` end-to-end. Full in-browser render/navigation/notes/DevTools-Network check was NOT performed — no browser automation tool (`chromium-cli`/Playwright) was available in this environment without a network install. The same render/navigation/notes logic is exercised against real fixture bytes by the 38 PptxViewer tests (T024) and the registry test (T025), which is the strongest verification available here; a human or CI run with browser tooling should complete the visual pass before release.
- [X] T044 Update `specs/039-bugfix-pptx-preview/checklists/requirements.md` / CLAUDE.md "Recent Changes" entry once implementation is complete (matches existing project convention for prior specs)
- [X] T045 Perform the release-branch contrarian QA pass required by Constitution Principle VIII before this feature ships in a release branch — three independent contrarian-QA sub-agents (bugs/security, performance/dead-code, accessibility) reviewed the full diff; two real findings fixed (a `CLAUDE.md` documentation inaccuracy plus an untested edge case in `tests/unit/git/repo.test.ts`, and a missing `jest-axe`/`role="alert"` accessibility gap in `PptxViewer.tsx`), four minor findings disclosed and deferred as non-blocking (matching existing patterns in sibling viewers/code). Consolidated into `releases/0.13.0-release-review.md`; version bumped to 0.13.0 in `package.json`/`package-lock.json`, `CHANGELOG.md` and `README.md` updated. T043's in-browser visual pass remains explicitly deferred to manual user verification (no browser automation tool available this session).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. Only relevant to US5.
- **Foundational (Phase 2)**: Depends on Setup for `jszip`/`fast-xml-parser` being available to `ui/`, though T003–T005 themselves only touch server-side files and have no runtime dependency on Phase 1. BLOCKS US5 only.
- **User Story 1 (Phase 3)**: No dependency on Phase 1/2 — independent, already implemented, verify-and-close.
- **User Story 2 (Phase 4)**: No dependency on Phase 1/2 — independent, already implemented, verify-and-close.
- **User Story 3 (Phase 5)**: No dependency on Phase 1/2 — independent, already implemented, verify-and-close.
- **User Story 4 (Phase 6)**: No dependency on Phase 1/2 — independent, already implemented, verify-and-close.
- **User Story 5 (Phase 7)**: Depends on Phase 2 (Foundational) completion. Fully independent of US1–US4.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- US1, US2, US3, US4: fully independent of each other and of US5.
- US5: depends only on Phase 2 Foundational tasks (T003–T005), not on US1–US4.

### Parallel Opportunities

- T001/T002 (Setup) can run in parallel.
- T006, T010, T013, T017 (test-verification tasks for US1–US4) can all run in parallel with each other and with Phase 2/Setup, since they touch already-existing, independent test files.
- Within Phase 7, T021–T025 (all test-writing tasks, different files) can run in parallel; T026 must precede T027–T037 (sequential build-out of the same `PptxViewer.tsx` file, so most are not [P] against each other despite being in the same phase).
- T039, T040, T042 (Polish) can run in parallel.

---

## Parallel Example: User Story 5 test phase

```bash
Task: "Extend tests/unit/handlers/file.test.ts with pptx response branch coverage"
Task: "Extend detectFileType tests in tests/unit/git/repo.test.ts for .pptx classification"
Task: "Create fixture .pptx files for PptxViewer tests"
Task: "Write ui/src/components/ContentPanel/PptxViewer.test.tsx"
Task: "Extend ui/src/components/ContentPanel/preview-registry.test.ts for the pptx entry"
```

---

## Implementation Strategy

### Current State → Ship Point 1 (bug fixes only)

1. Verify-and-close Phases 3–6 (US1–US4) — already implemented in the working tree; confirm each acceptance scenario/edge case has a passing test, then this is independently shippable (SC-001–SC-004, SC-007).

### Ship Point 2 (full release, adds PPTX)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational).
2. Complete Phase 7 (US5) — the only remaining net-new work.
3. Complete Phase 8 (Polish), including the release-branch contrarian QA pass (Constitution Principle VIII).
4. Ship.

### MVP Framing

Given US1–US4 are already implemented, the "MVP" framing from the template is inverted for this feature: the bug fixes are the already-complete baseline, and User Story 5 (PPTX preview) is the single remaining increment gating the full release.
