# Phase 0 Research: CSV and Excel File Preview

## 1. CSV parsing library

**Decision**: `papaparse` (MIT), lazy-loaded on first CSV open.

**Rationale**:
- MIT-licensed, actively maintained (v5.7.0, 13.5k★, latest release within the last week as of this research), ~7.6 kB min+gzip — smaller than any alternative under serious consideration.
- Correctly handles quoted fields, embedded delimiters, and embedded newlines within quoted cells (FR-002) — a naive `split(',')`/`split('\n')` does not.
- Runs entirely against bytes already delivered by `/api/file` (UTF-8 text mode, same as markdown/json/text today); its optional network-fetch mode (`download: true` against a remote URL) is never used here, satisfying Local-First (Principle III/FR-010) by simply not invoking that code path.

**Alternatives considered**:
- Hand-rolled comma/newline splitting: rejected — fails on quoted fields containing commas or newlines (FR-002), a common real-world CSV shape (e.g. addresses, descriptions).
- `csv-parse` / `fast-csv`: rejected — both are Node-stream-oriented packages designed for server-side/CLI use; PapaParse is the standard purpose-built browser CSV parser with Web Worker support for large files.

## 2. Excel cell-data parsing library

**Decision**: `xlsx` (SheetJS Community Edition, Apache-2.0), lazy-loaded on first Excel open, installed from SheetJS's own CDN tarball (the npm registry copy is a stale 0.18.5; the maintained Community build is distributed outside npm) — this install-source detail is tracked as an implementation task, not a spec requirement.

**Rationale**:
- Apache-2.0, MIT-compatible per Constitution VI, matching the same license family already accepted for `pdfjs-dist` in spec 036.
- Confirmed to be a pure parser/serializer with no execution model: VBA macros are preserved only as an opaque, never-parsed byte blob; formulas are read as their last cached value with no recalculation engine; there is no network-fetch capability at all. This makes FR-006 (no macro execution, no recalculation, no external refresh) true by construction rather than something the integration has to separately enforce.
- Reads worksheet names and order directly, covering FR-004/FR-005 (workbook cell data + sheet tabs) without any additional library.

**Alternatives considered**:
- `ExcelJS` (MIT): rejected — effectively dormant (latest release 4.4.0, October 2023; no meaningful commits since January 2024), and has no working chart-read support (long-open upstream issues), so it offers no advantage over SheetJS CE for this feature while being less actively maintained.
- A full spreadsheet-UI library (Univer, Luckysheet, x-data-spreadsheet, jspreadsheet/jexcel): rejected for v1 — these are grid *editors* built around a live formula-recalculation engine, which is more surface area than a read-only preview needs and works against FR-006's "nothing dynamic" requirement (would require actively disabling engine features rather than simply not having them). Luckysheet is also archived (October 2025, successor is Univer); x-data-spreadsheet is stalled since 2024. Univer is the most credible OSS candidate for a future richer editor but is not justified for a read-only preview.

## 3. Chart rendering — why this spec scopes it down to cached data only

**Decision**: Do not render native Excel chart graphics in v1. Instead, detect embedded charts and expose each one's title (if present) and cached series data as a plain data table (spec FR-007, User Story 3).

**Rationale**:
- SheetJS Community Edition reads a chart's cached series data (the numeric values Excel last computed and stored), but genuine chart-graphic rendering (reproducing the bar/line/pie visual as embedded in `xl/charts/chartN.xml`) is explicitly a **paid-tier-only** feature — a SheetJS maintainer states the Community build "reflects the data cached in charts as worksheets," while chart read/write metadata is part of the separately-sold Pro compendium.
- Constitution VI is unambiguous: "All dependencies MUST be compatible with MIT. No proprietary components, no paid tiers, no feature gating." A paid SheetJS Pro tier is disqualified outright, regardless of how well it would satisfy the original request's "show charts" wording.
- The only other library found capable of rendering native OOXML chart graphics with real fidelity is ONLYOFFICE Document Server — AGPL-3.0 (incompatible with Constitution VI) and architected as a self-hosted server process, not a client-side npm dependency, which would also conflict with GitLocal's single local-process, local-first design.
- Exposing the chart's cached data as a table is the closest license-compliant approximation of "show the chart" available today: it surfaces the same underlying numbers the chart was built from, with zero execution/recalculation/network risk, satisfying the "not refresh data from external links and other more dynamic or content changing functions" half of the original request exactly, while being transparent that a rendered chart *graphic* is not being delivered in v1.
- This tradeoff should be confirmed with the feature requester before implementation begins (see spec.md Assumptions) — it is a scope decision driven by the project's own license policy, not a technical limitation this team could code around.

## 4. Registry and delivery integration

**Decision**: Follow the exact pattern established in `specs/036-file-preview-framework/`: two new `FileContentType` values (`csv`, `excel`) in `detectFileType` and `previewRegistry`, both `editable: false`; CSV delivered as `utf-8` text (like markdown/json/text today) and Excel delivered as `base64` (like PDF today, since `.xlsx`/`.xls` are binary container formats — `xlsx.read()` accepts a `Uint8Array`/array-buffer directly, so the client decodes the same way `PdfViewer.tsx` already does via `base64ToUint8Array`).

**Rationale**: Reuses existing, tested encoding modes and the existing `PreviewRegistryEntry`/`PreviewComponentProps` shapes (`ui/src/components/ContentPanel/preview-registry.tsx`) with zero framework changes, satisfying FR-011/SC-006 exactly as PDF and SVG did for spec 036.

## 5. Testability / coverage strategy (Principle II, ≥90% per-file branch coverage)

**Decision**: Check in small, fixed, deterministic fixture files (`ui/src/test-fixtures/sample.csv`, `quoted-fields.csv`, `sample.xlsx` with 2+ sheets, `chart.xlsx` with an embedded chart, and a byte-corrupted `broken.xlsx`) for happy-path parsing tests, and mock `papaparse`/`xlsx` for hard-to-construct error branches (corrupted-file parsing exceptions), matching the fixture-plus-mock pattern already used for `PdfViewer.test.tsx`/`SvgViewer.test.tsx`.

**Rationale**: Matches the existing test style in the codebase and keeps error-branch coverage deterministic rather than depending on parsing real corrupted binary data.
