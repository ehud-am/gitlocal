# Tasks: File Preview Framework

**Input**: Design documents from `specs/036-file-preview-framework/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/file-content-api.md, quickstart.md

**Tests**: This project enforces ≥90% per-file branch coverage (Constitution Principle II, NON-NEGOTIABLE) — every new/changed source file below MUST ship with tests in the same task or the immediately following one. Existing suites (FR-010) must pass unmodified except for mechanical import/path updates during migration.

**Organization**: Tasks are grouped by user story so each story can be completed and tested independently. User Story 3 (zero-regression migration) is the foundation the other two build on and is delivered as part of Foundational, since per spec.md it "must ship alongside P1 (PDF), not after it."

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no dependency)
- **[Story]**: Which user story this task belongs to (US1 = PDF, US2 = SVG, US3 = zero-regression migration)
- File paths are exact and repository-relative

---

## Phase 1: Setup

- [ ] T001 Confirm `pdfjs-dist` license (expect Apache-2.0) and add it to `ui/package.json`; run `npm install` at repo root to update lockfiles
- [ ] T002 [P] Add checked-in test fixtures: `ui/src/test-fixtures/sample.pdf` (small 2-page PDF), `ui/src/test-fixtures/sample.svg` (valid graphic), `ui/src/test-fixtures/malformed.svg` (extension mismatch / broken XML), `ui/src/test-fixtures/broken.pdf` (truncated bytes)
- [ ] T003 [P] Locate and bundle the `pdfjs-dist` worker asset via Vite `?url` import in a small shared module (`ui/src/components/ContentPanel/pdf-worker.ts`) so `GlobalWorkerOptions.workerSrc` never falls back to a CDN URL (research.md §1)

**Checkpoint**: Dependency installed, fixtures and worker bundling path ready for all downstream work.

---

## Phase 2: Foundational — registry + type system (blocks all user stories; delivers US3)

**Purpose**: Introduce the preview-type registry and extend the type system, migrating every existing preview experience onto it with zero behavioral change, before any new renderer is added. This phase alone satisfies User Story 3 in full and must be verified before Phase 3/4 begin.

- [ ] T004 [US3] Extend `detectFileType()` in `src/git/repo.ts`: add explicit `'svg'` return (`{ type: 'svg', language: 'xml' }`, removed from `imageExts`) and `'pdf'` return (`{ type: 'pdf', language: '' }`, removed from `binaryExts`)
- [ ] T005 [US3] Extend `FileContent['type']` union and any related type aliases in `src/types.ts` to include `'svg' | 'pdf'`
- [ ] T006 [US3] (depends on T004, T005) Add `type === 'svg'` and `type === 'pdf'` branches to `fileHandler` in `src/handlers/file.ts`, per contracts/file-content-api.md — svg delivers UTF-8 text, pdf delivers base64, both force `editable: false`
- [ ] T007 [P] [US3] Extend `tests/unit/git/repo.test.ts`: `detectFileType('x.svg')` → `svg`/`xml`; `detectFileType('x.pdf')` → `pdf`/`''`; confirm no other extension's classification changed
- [ ] T008 [P] [US3] Extend `tests/unit/handlers/file.test.ts`: new svg/pdf branches return correct `encoding`/`type`/`editable`; confirm `updateFileHandler` still rejects `svg`/`pdf` (existing `type !== 'markdown' && type !== 'text'` guard, now also exercised for the two new types)
- [ ] T009 [US3] (depends on T005) Create `ui/src/components/ContentPanel/preview-registry.ts`: `PreviewRegistryEntry` type (data-model.md) and a `previewRegistry` object with entries for the five EXISTING types (`markdown`, `json`, `text`, `image`, `binary`), pointing at the existing `MarkdownRenderer`, `JSONViewer`, `CodeViewer`, and the existing inline image/binary-fallback presentation extracted into small wrapper components if needed to fit the registry's `Component` shape
- [ ] T010 [P] [US3] `ui/src/components/ContentPanel/preview-registry.test.ts`: every existing type resolves to the correct component/flags; unknown/future type is absent (falls through to `ContentPanel`'s existing default fallback)
- [ ] T011 [US3] (depends on T009) Replace the if/else dispatch chain in `ContentPanel.tsx` (current lines ~1272-1314) with a `previewRegistry[type]` lookup; preserve every existing prop threaded to each component exactly (find query, revision token, save handler, raw-toggle state, etc.)
- [ ] T012 [US3] (depends on T011) Run existing `ContentPanel.test.tsx`, `MarkdownRenderer.test.tsx`, `JSONViewer.test.tsx`, `CodeViewer.test.tsx`, `InlineFileEditor.test.tsx` unmodified (or with only mechanical import-path fixes) and confirm 100% pass — this is the FR-010/SC-003 gate for the whole feature

**Checkpoint**: Registry-driven dispatch is live; every pre-existing preview type behaves identically to before (User Story 3 delivered and independently verifiable via quickstart.md §3). Both new user stories build on this without further core-dispatch changes (SC-004).

---

## Phase 3: User Story 1 - Preview a PDF file inline (Priority: P1)

**Goal**: `.pdf` files render as pages inline instead of the binary fallback.

**Independent Test**: Open a valid `.pdf` file, confirm pages render inline; open `broken.pdf`, confirm a clear fallback message, no crash.

- [ ] T013 [US1] (depends on Phase 2, T003) Create `ui/src/components/ContentPanel/PdfViewer.tsx`: base64-decode `content`, lazy-import `pdfjs-dist`, set `workerSrc` from `pdf-worker.ts`, render pages progressively into a scrollable container (canvas-per-page)
- [ ] T014 [US1] (depends on T013) Handle corrupted/password-protected PDFs: catch `pdfjs-dist`'s load rejection (incl. `PasswordException`) and render the same "can't preview this file" fallback pattern already used elsewhere, per FR-006
- [ ] T015 [P] [US1] `ui/src/components/ContentPanel/PdfViewer.test.tsx`: renders first page for `sample.pdf` (real fixture); mocked `getDocument` rejection paths for corrupted/password-protected cases (research.md §4); large-page-count case doesn't block initial render (mocked)
- [ ] T016 [US1] (depends on T013, T009) Register `pdf` in `previewRegistry` (`Component: PdfViewer`, `supportsRawToggle: false`, `editable: false`)
- [ ] T017 [US1] (depends on T016) Extend `ContentPanel.test.tsx` with a `pdf`-type dispatch case confirming `PdfViewer` is rendered and no edit affordance is offered
- [ ] T018 [US1] Manual verification via quickstart.md §1 (incl. Network-tab check for no external worker fetch)

**Checkpoint**: User Story 1 fully functional and independently testable/shippable.

---

## Phase 4: User Story 2 - Preview an SVG file as a rendered graphic, with raw source available (Priority: P2)

**Goal**: `.svg` files render as a scaled graphic by default with a raw-XML toggle, safely inert.

**Independent Test**: Open a valid `.svg`, confirm graphic render + raw-toggle works; open one containing `<script>`, confirm no execution; open `malformed.svg`, confirm fallback.

- [ ] T019 [US2] (depends on Phase 2) Create `ui/src/components/ContentPanel/SvgViewer.tsx`: build `data:image/svg+xml;base64,...` from the UTF-8 `content` client-side (research.md §2) for the rendered `<img>`; delegate raw-view to the existing `CodeViewer` with `language="xml"` when the raw toggle is active
- [ ] T020 [US2] (depends on T019) Handle malformed/non-SVG content behind a `.svg` extension: on `<img>` load error, fall back to the "can't preview this file" message (FR-006)
- [ ] T021 [P] [US2] `ui/src/components/ContentPanel/SvgViewer.test.tsx`: renders `sample.svg` as an image; raw-toggle shows exact source via `CodeViewer`; a `<script>`-containing fixture never executes (assert no global side-effect / no `alert` call in jsdom); `malformed.svg` shows fallback, not a crash
- [ ] T022 [US2] (depends on T019, T009) Register `svg` in `previewRegistry` (`Component: SvgViewer`, `supportsRawToggle: true`, `editable: false`)
- [ ] T023 [US2] (depends on T022) Extend `ContentPanel.test.tsx` with an `svg`-type dispatch case: default renders `SvgViewer` in graphic mode, toggle reaches raw XML, no edit affordance offered
- [ ] T024 [US2] Manual verification via quickstart.md §2

**Checkpoint**: User Story 2 fully functional and independently testable/shippable, without having touched core dispatch again (only a new registry entry, confirming SC-004).

---

## Phase 5: Polish & Cross-Cutting

- [ ] T025 [P] Run `npm run lint` (tsc --noEmit) and fix any type errors surfaced by the `FileContent['type']` union extension across the codebase (e.g. any exhaustive `switch`/`if` chains outside `ContentPanel` that assumed the old 5-value union)
- [ ] T026 [P] Run `npm test` with coverage and confirm every new/changed file (`preview-registry.ts`, `PdfViewer.tsx`, `SvgViewer.tsx`, `pdf-worker.ts`, `repo.ts`, `file.ts`, `ContentPanel.tsx`) meets the ≥90% per-file branch coverage gate (Constitution Principle II)
- [ ] T027 [P] Run `npm run build` and confirm the `pdfjs-dist` worker asset resolves correctly in the production bundle (no dev-only path assumption)
- [ ] T028 Update `CLAUDE.md` "Recent Changes" section with a `036-file-preview-framework` entry, following the existing entries' style (see 032/033/034/035 entries)
- [ ] T029 Full quickstart.md walkthrough (all three sections) as a final manual pass before marking the feature ready for release-branch inclusion (Constitution VIII contrarian QA remains a separate, later release-time gate)

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** has no dependencies; T001-T003 can run in parallel.
- **Phase 2 (Foundational/US3)** depends on Phase 1 (T009's registry needs fixtures/build path settled, though strictly T004-T008 only need T001). Must complete and pass its checkpoint (T012) before Phase 3 or Phase 4 begins — this is the shared foundation both new stories register into.
- **Phase 3 (US1/PDF)** depends on Phase 2 completing, plus T003 (worker bundling) from Phase 1. Independent of Phase 4.
- **Phase 4 (US2/SVG)** depends on Phase 2 completing only. Independent of Phase 3 — **may run in parallel with Phase 3** since PDF and SVG touch disjoint files (`PdfViewer.*` vs `SvgViewer.*`) and only converge at the shared `preview-registry.ts` (already stable after Phase 2) and `ContentPanel.test.tsx` (additive, non-conflicting test cases).
- **Phase 5 (Polish)** depends on Phase 3 and Phase 4 both completing.

## Implementation Strategy

**MVP first**: Complete Phase 1 → Phase 2 (checkpoint: zero-regression migration verified) → Phase 3 (PDF, the P1 gap this feature exists to close). Stop and ship here if needed — User Story 1 is independently valuable and Story 3's safety net is already in place.

**Incremental delivery**: Add Phase 4 (SVG, P2) either in parallel with Phase 3 by a second contributor/session, or immediately after, without revisiting any Phase 2 file.

## Notes

- [P] tasks touch different files with no shared dependency in that phase and can be parallelized.
- Every task that adds/changes a source file has a paired or immediately-following test task, per this project's non-negotiable coverage gate.
- No task in Phase 3 or Phase 4 modifies `ContentPanel.tsx`'s core dispatch logic again after T011 — only registry entries and new files — directly demonstrating SC-004.
