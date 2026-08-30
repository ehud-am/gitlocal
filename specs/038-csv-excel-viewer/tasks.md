# Tasks: CSV and Excel File Preview

**Input**: Design documents from `specs/038-csv-excel-viewer/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/file-content-api.md, quickstart.md

**Tests**: This project enforces ≥90% per-file branch coverage (Constitution Principle II, NON-NEGOTIABLE) — every new/changed source file below MUST ship with tests in the same task or the immediately following one. Existing suites must pass unmodified except for mechanical import/path updates.

**Organization**: Tasks are grouped by user story so each story can be completed and tested independently. Unlike spec 036, the preview-registry framework already exists — this feature only adds two new registry entries and two new renderer components, touching zero core dispatch logic (SC-006).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no dependency)
- **[Story]**: Which user story this task belongs to (US1 = CSV, US2 = Excel cell data/tabs, US3 = chart indicator)
- File paths are exact and repository-relative

---

## Phase 1: Setup

- [ ] T001 Add `papaparse` + `@types/papaparse` (MIT) to `ui/package.json`; run `npm install` at repo root to update lockfiles
- [ ] T002 Add `xlsx` (SheetJS Community Edition, Apache-2.0) to `ui/package.json`, pinned to the SheetJS-published CDN tarball URL rather than the stale npm registry copy (research.md §2, quickstart.md install note); run `npm install` and confirm the resolved version is the maintained 0.20.x line, not 0.18.5
- [ ] T003 [P] Add checked-in test fixtures: `ui/src/test-fixtures/sample.csv` (simple valid CSV), `ui/src/test-fixtures/quoted-fields.csv` (quoted field containing a comma and an embedded newline), `ui/src/test-fixtures/sample.xlsx` (2+ sheets, at least one formula cell), `ui/src/test-fixtures/chart.xlsx` (embedded chart with a title), `ui/src/test-fixtures/broken.xlsx` (corrupted/truncated bytes)

**Checkpoint**: Dependencies installed from the correct sources, fixtures ready for all downstream work.

---

## Phase 2: Foundational — type system extension (blocks both user stories)

**Purpose**: Extend `detectFileType()` and the `FileContent` type union to recognize `csv` and `excel` as their own preview types, per contracts/file-content-api.md. No registry or UI work yet — this only makes the two new types addressable.

- [ ] T004 [US1] Extend `detectFileType()` in `src/git/repo.ts`: add explicit `'csv'` return (`{ type: 'csv', language: '' }`), removed from the plain-text fallback path
- [ ] T005 [US2] Extend `detectFileType()` in `src/git/repo.ts`: add explicit `'excel'` return (`{ type: 'excel', language: '' }`) for `.xlsx`/`.xls`, removed from `binaryExts`
- [ ] T006 (depends on T004, T005) Extend `FileContent['type']` union in `src/types.ts` to include `'csv' | 'excel'`
- [ ] T007 (depends on T004, T005, T006) Add `type === 'csv'` and `type === 'excel'` branches to `fileHandler` in `src/handlers/file.ts`, per contracts/file-content-api.md — csv delivers UTF-8 text, excel delivers base64, both force `editable: false`
- [ ] T008 [P] Extend `tests/unit/git/repo.test.ts`: `detectFileType('x.csv')` → `csv`/`''`; `detectFileType('x.xlsx')` and `detectFileType('x.xls')` → `excel`/`''`; confirm no other extension's classification changed
- [ ] T009 [P] (depends on T007) Extend `tests/unit/handlers/file.test.ts`: new csv/excel branches return correct `encoding`/`type`/`editable`; confirm `updateFileHandler` still rejects `csv`/`excel` (existing `type !== 'markdown' && type !== 'text'` guard)

**Checkpoint**: Both new types are classified and delivered correctly over `/api/file`, independently verifiable via `curl`/integration test even before any UI renders them.

---

## Phase 3: User Story 1 - Preview a CSV file as a table (Priority: P1)

**Goal**: `.csv` files render as a scrollable table with a header row instead of plain unhighlighted text.

**Independent Test**: Open a valid `.csv`, confirm table render with header row; open `quoted-fields.csv`, confirm correct cell boundaries; open a malformed/empty CSV, confirm a clear fallback, no crash.

- [ ] T010 [US1] (depends on Phase 2) Create `ui/src/components/ContentPanel/CsvViewer.tsx`: lazy-import `papaparse`, parse `content` into `CsvTable` (data-model.md), render as a scrollable `<table>` with the first row as `<th>` headers, short/ragged rows padded with empty cells
- [ ] T011 [US1] (depends on T010) Handle unparseable CSV content (e.g. binary content misnamed `.csv`): render the standard "can't preview this file" fallback per FR-008; genuinely empty file renders an empty-table state, not an error
- [ ] T012 [US1] (depends on T010) Wire the existing raw/pretty toggle to pass `content` directly to `CodeViewer` for the raw view (FR-003) — no second request, no re-parse
- [ ] T013 [P] [US1] `ui/src/components/ContentPanel/CsvViewer.test.tsx`: renders `sample.csv` as a table with correct headers; `quoted-fields.csv` parses the comma/newline-containing cell as one cell; malformed/binary-as-csv fixture shows fallback; empty CSV shows empty-table state; raw-toggle shows exact unmodified source
- [ ] T014 [US1] (depends on T010) Register `csv` in `previewRegistry` (`Component: CsvViewer`, `supportsRawToggle: true`, `editable: false`) — the only change to `preview-registry.tsx` itself, zero changes to `ContentPanel.tsx` dispatch logic (SC-006)
- [ ] T015 [US1] (depends on T014) Extend `ContentPanel.test.tsx` with a `csv`-type dispatch case confirming `CsvViewer` renders and no edit affordance is offered
- [ ] T016 [US1] Manual verification via quickstart.md "Verify CSV preview" (incl. Network-tab check for zero external requests)

**Checkpoint**: User Story 1 fully functional and independently testable/shippable.

---

## Phase 4: User Story 2 - Preview an Excel workbook's sheets and cell data (Priority: P1)

**Goal**: `.xlsx`/`.xls` files render the active worksheet as a table, with tabs to switch between all worksheets, instead of the binary fallback.

**Independent Test**: Open a multi-sheet `.xlsx`, confirm the active sheet renders as a table and clicking another tab switches the visible data; open `broken.xlsx`, confirm a clear fallback, no crash/hang.

- [ ] T017 [US2] (depends on Phase 2) Create `ui/src/components/ContentPanel/ExcelViewer.tsx`: base64-decode `content`, lazy-import `xlsx`, call `xlsx.read(data, { type: 'array' })`, build an `ExcelWorkbook` (data-model.md) from `workbook.SheetNames` and each sheet's formatted-cell grid (cached values only — never `cellFormula`/recalculation, per FR-006)
- [ ] T018 [US2] (depends on T017) Render a tab strip (one tab per `workbook.SheetNames` entry, in order) above the active sheet's table; clicking a tab updates `activeSheetIndex` and swaps the visible table (FR-005)
- [ ] T019 [US2] (depends on T017) Handle `xlsx.read()` throwing (corrupted, password-protected, or unsupported legacy `.xls` variant): render the standard "can't preview this file" fallback per FR-008, never a crash or indefinite loading state
- [ ] T020 [P] [US2] `ui/src/components/ContentPanel/ExcelViewer.test.tsx`: renders `sample.xlsx`'s first sheet as a table; tab strip lists all sheet names in order and switching tabs swaps the table; a formula cell shows its cached value (assert no recalculation API is invoked); `broken.xlsx` shows fallback, not a crash; asserts no network/fetch API is called during parse (SC-004)
- [ ] T021 [US2] (depends on T017, T018) Register `excel` in `previewRegistry` (`Component: ExcelViewer`, `supportsRawToggle: false`, `editable: false`) — the only change to `preview-registry.tsx` itself, zero changes to `ContentPanel.tsx` dispatch logic (SC-006)
- [ ] T022 [US2] (depends on T021) Extend `ContentPanel.test.tsx` with an `excel`-type dispatch case confirming `ExcelViewer` renders and no edit affordance is offered
- [ ] T023 [US2] Manual verification via quickstart.md "Verify Excel preview" steps 1-4, 7-8 (chart steps covered in Phase 5)

**Checkpoint**: User Story 2 fully functional and independently testable/shippable, without having touched core dispatch again (only a new registry entry, confirming SC-006).

---

## Phase 5: User Story 3 - See that a worksheet contains a chart, without live/interactive rendering (Priority: P3)

**Goal**: Worksheets with embedded charts show a labeled indicator plus the chart's cached series data as a plain table; worksheets without charts show nothing extra.

**Independent Test**: Open `chart.xlsx`, confirm a chart indicator appears with its title and cached data on request; open a chart-free workbook, confirm no indicator appears.

- [ ] T024 [US3] (depends on Phase 4 / T017) Extend `ExcelViewer.tsx`'s workbook parsing to extract each sheet's `ChartIndicator[]` (data-model.md) from `xlsx`'s chart-adjacent data where available (research.md Complexity Tracking — CE has no documented chart-object API; treat extraction failure as "no chart" rather than guessing)
- [ ] T025 [US3] (depends on T024) Render a labeled chart indicator per detected chart on its worksheet (title if present, per Acceptance Scenario 1), with an interaction (click/expand) that reveals the chart's cached series data as a plain table (Acceptance Scenario 2); no indicator when a sheet has zero charts (Acceptance Scenario 3)
- [ ] T026 [P] [US3] Extend `ExcelViewer.test.tsx`: `chart.xlsx` shows a chart indicator with the expected title; interacting with it reveals the cached series data table; a chart-free fixture (`sample.xlsx`) shows no indicator on any sheet; assert no chart re-fetch/recalculation/external request occurs (Acceptance Scenario 4, SC-004)
- [ ] T027 [US3] Manual verification via quickstart.md "Verify Excel preview" steps 5-6

**Checkpoint**: User Story 3 fully functional and independently testable/shippable; the "charts" half of the original request is now honestly represented within the project's license constraints (Constitution VI).

---

## Phase 6: Polish & Cross-Cutting

- [ ] T028 [P] Run `npm run lint` (tsc --noEmit) and fix any type errors surfaced by the `FileContent['type']` union extension across the codebase (e.g. any exhaustive `switch`/`if` chains outside `ContentPanel` that assumed the prior union)
- [ ] T029 [P] Run `npm test` with coverage and confirm every new/changed file (`CsvViewer.tsx`, `ExcelViewer.tsx`, `repo.ts`, `file.ts`, `preview-registry.tsx`, `ContentPanel.tsx`) meets the ≥90% per-file branch coverage gate (Constitution Principle II)
- [ ] T030 [P] Run `npm run build` and confirm `papaparse`/`xlsx` are lazy-loaded (not in the initial bundle) and resolve correctly in the production build
- [ ] T031 Update `CLAUDE.md` "Recent Changes" section with a `038-csv-excel-viewer` entry, following the existing entries' style
- [ ] T032 Full quickstart.md walkthrough (all sections) as a final manual pass before marking the feature ready for release-branch inclusion (Constitution VIII contrarian QA remains a separate, later release-time gate)

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** has no dependencies; T001-T003 can run in parallel once T001/T002 land (T003 fixtures are independent of the install tasks).
- **Phase 2 (Foundational)** depends on Phase 1. T004 (csv classification) and T005 (excel classification) touch the same file (`src/git/repo.ts`) but disjoint code paths — sequence them rather than marking [P]. Must complete before Phase 3 or Phase 4 begins.
- **Phase 3 (US1/CSV)** depends on Phase 2 completing. Independent of Phase 4 — touches only `CsvViewer.*` plus one line in `preview-registry.tsx`.
- **Phase 4 (US2/Excel)** depends on Phase 2 completing only. Independent of Phase 3 — **may run in parallel with Phase 3** since CSV and Excel touch disjoint files (`CsvViewer.*` vs `ExcelViewer.*`) and only converge at the shared `preview-registry.tsx` (additive entries) and `ContentPanel.test.tsx` (additive, non-conflicting test cases).
- **Phase 5 (US3/Charts)** depends on Phase 4 completing (charts are rendered inside `ExcelViewer.tsx`, built in Phase 4) — not parallelizable with Phase 4, but independent of Phase 3.
- **Phase 6 (Polish)** depends on Phases 3, 4, and 5 all completing.

## Implementation Strategy

**MVP first**: Complete Phase 1 → Phase 2 (checkpoint: both types classified and delivered correctly) → Phase 3 (CSV) and/or Phase 4 (Excel cell data/tabs) — both P1, either order or in parallel. Stop and ship here if needed; both are independently valuable and match GitHub's own CSV/Excel-preview baseline.

**Incremental delivery**: Add Phase 5 (chart indicator, P3) after Phase 4, as a strictly additive extension of `ExcelViewer.tsx` — the lowest-priority story, and the one carrying the license-driven scope reduction documented in spec.md Assumptions.

## Notes

- [P] tasks touch different files with no shared dependency in that phase and can be parallelized.
- Every task that adds/changes a source file has a paired or immediately-following test task, per this project's non-negotiable coverage gate.
- No task in Phase 3, 4, or 5 modifies `ContentPanel.tsx`'s core dispatch logic — only registry entries and new files — directly demonstrating SC-006.
