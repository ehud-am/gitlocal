# Implementation Plan: CSV and Excel File Preview

**Branch**: `038-csv-excel-viewer` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/038-csv-excel-viewer/spec.md`

## Summary

Add two new read-only preview types to the existing framework from `specs/036-file-preview-framework/`: `csv` (split out of the current `text` bucket) and `excel` (split out of the current `binary` bucket). CSV parses via `papaparse` (MIT) and renders as a scrollable table with a raw-source toggle, reusing the same registry/raw-toggle mechanism already used by Markdown/JSON/SVG. Excel parses via `xlsx` (SheetJS Community Edition, Apache-2.0) and renders the active worksheet as a table with a tab strip for switching sheets; formulas show their cached last-saved value with no recalculation, and no macro execution or external-link refresh ever occurs — both are structurally impossible with this library, not something the integration must separately guard against. Embedded charts are represented as a labeled indicator plus their cached series data as a small table (User Story 3 / FR-007), not a rendered chart graphic — a deliberate scope decision required by Constitution VI's no-paid-tier/no-feature-gating rule, since every library capable of native chart-graphic rendering is either paid (SheetJS Pro) or AGPL+server-based (ONLYOFFICE); see `research.md` §3. Both new types are added purely as new registry entries plus new renderer components, touching zero conditional dispatch logic in `ContentPanel`, matching the extensibility contract spec 036 established (FR-011/SC-006).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+ (existing project baseline; unchanged)
**Primary Dependencies**: Existing — Hono ^4.x, React 18, Vite, the `specs/036-file-preview-framework/` preview registry. New — `papaparse` (MIT) for CSV parsing; `xlsx` (SheetJS Community Edition, Apache-2.0) for Excel cell/chart-data parsing. No chart-graphic-rendering library is introduced (see research.md §3 — none is license-compatible).
**Storage**: N/A — files are read from the filesystem/git blob at request time, same as today; no persistence layer added
**Testing**: Vitest for both server and UI (existing), `@testing-library/react` + `jest-axe` for new UI components, matching `PdfViewer.test.tsx`/`SvgViewer.test.tsx` patterns (fixture files for happy paths, mocked `papaparse`/`xlsx` for corrupted-file error branches)
**Target Platform**: Cross-platform — npm package and the macOS Homebrew native app wrapper; both share this code per Constitution Principle I
**Project Type**: Web application — existing single-repo layout with `src/` (Hono backend) and `ui/` (Vite/React frontend)
**Performance Goals**: Active worksheet/CSV table visible without noticeably degrading responsiveness, consistent with existing large-Markdown/JSON-file expectations (no new numeric SLA introduced by the spec)
**Constraints**: All CSV/Excel parsing and rendering client-side/local only, no new network calls (Principle III, FR-010); zero formula recalculation, macro execution, or external-link refresh under any circumstance (FR-006, SC-004); must not regress existing preview test suites or per-file coverage (Principle II); `xlsx` must be sourced as the maintained Community Edition build, not the stale 0.18.5 npm registry copy (tracked below, not a spec requirement)
**Scale/Scope**: Single local user; workbooks of ordinary size (tens of sheets, thousands of rows), not exhaustively large data-warehouse exports

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TypeScript-First Product Core | PASS | All new code (registry entries, `CsvViewer.tsx`, `ExcelViewer.tsx`, `detectFileType` changes) is TypeScript in the existing server/UI stack. `papaparse` and `xlsx` are pure-JS client libraries, not a new language or native addon. |
| II. Test Coverage (NON-NEGOTIABLE) | PASS (design accounts for it) | New components are tested with fixture CSV/XLSX files (small, checked-in) and `papaparse`/`xlsx` mocked for error branches (corrupted files), mirroring `PdfViewer.test.tsx`/`SvgViewer.test.tsx`; registry additions must keep existing suites green (FR-011). |
| III. Local-First with Git Remote Exception | PASS | Both libraries parse bytes already fetched from the local `/api/file` endpoint; neither has a network-fetch code path that this feature invokes (FR-010). No external CDN, telemetry, or remote data-link resolution is triggered. |
| IV. Node.js-Served React UI | PASS | No change to the serving model; new components are additional React UI served the same way. |
| V. Clean & Useful UI | PASS | CSV/Excel previews follow the same minimal, GitHub-inspired table presentation as existing viewers (GitHub itself renders CSV as a table); worksheet tabs follow the existing tab-control visual language already used elsewhere in the app. |
| VI. Free & Open Source | PASS, with an explicit scope tradeoff | `papaparse` (MIT) and `xlsx` Community Edition (Apache-2.0) are both fully free and MIT-compatible with no feature gating. Native chart-*graphic* rendering is explicitly **not implemented** because the only libraries capable of it are paid-tier (SheetJS Pro) or AGPL (ONLYOFFICE) — implementing it would violate this principle, so User Story 3 is scoped to a cached-data indicator instead (research.md §3, spec.md Assumptions). This is a feature-scope reduction driven by the constitution, not a violation of it. |
| VII. Repository-Relative Paths | PASS | All new spec-kit artifacts and source paths are repository-relative. |
| VIII. Release Branches / Pre-GA / Contrarian QA | DEFERRED (not a plan-time gate) | Required before this feature ships in a release branch, per existing project practice. |

No violations requiring justification; Complexity Tracking below documents the `xlsx` install-source and bundle-size risks, not a constitution exception.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`).*

Design choices (registry-only integration with no new server round-trips, chart data surfaced as a plain table rather than any chart-rendering dependency, `xlsx` Community Edition sourced explicitly to avoid any accidental Pro-tier feature) introduce no new constitution risk beyond the items already tracked in Complexity Tracking. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/038-csv-excel-viewer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── file-content-api.md  # Phase 1 output — FileContent type/API changes
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this plan)
```

### Source Code (repository root)

This feature extends GitLocal's existing web-application layout (backend `src/` + frontend `ui/`) and the `specs/036-file-preview-framework/` registry; no new top-level projects are introduced.

```text
src/
├── git/repo.ts                    # EXISTING — detectFileType() gains 'csv' and 'excel' return values
├── handlers/file.ts               # EXISTING — fileHandler gains explicit csv/excel response branches (utf-8/base64 content modes)
└── types.ts                       # EXISTING — FileContent['type'] union extended with 'csv' | 'excel'

tests/unit/
├── git/repo.test.ts                # EXISTING — extend detectFileType coverage for csv/excel
└── handlers/file.test.ts           # EXISTING — extend fileHandler coverage for csv/excel branches

ui/src/components/ContentPanel/
├── preview-registry.tsx           # EXISTING — gains 'csv' and 'excel' entries, no changes to its dispatch logic
├── preview-registry.test.ts       # EXISTING — extend for the two new entries
├── CsvViewer.tsx                  # NEW — papaparse table rendering + raw-toggle
├── CsvViewer.test.tsx             # NEW
├── ExcelViewer.tsx                # NEW — xlsx workbook parsing, worksheet tab strip, chart indicator + cached-data table
├── ExcelViewer.test.tsx           # NEW
├── ContentPanel.tsx               # EXISTING — zero new conditional branches (FR-011/SC-006); registry lookup already generic
└── ContentPanel.test.tsx          # EXISTING — extend for csv/excel dispatch, keep all existing cases green

ui/src/test-fixtures/               # EXISTING dir, new files — sample.csv, quoted-fields.csv, sample.xlsx (2+ sheets), chart.xlsx (embedded chart), broken.xlsx (corrupted)

ui/package.json                    # EXISTING — add `papaparse`, `@types/papaparse`, `xlsx` (Community Edition build)
```

**Structure Decision**: Follow the existing single-repo web-application layout exactly, extending the same `ContentPanel/` directory and registry spec 036 introduced rather than creating a new module. Server-side changes are confined to the existing `detectFileType()`/`fileHandler` functions already responsible for file-type classification and content delivery. No new top-level directories or build tooling.

## Complexity Tracking

> Constitution Check above shows no violations requiring justification. Execution-level risks tracked here for visibility, not as constitution exceptions.

| Risk | Why Needed | Mitigation |
|---|---|---|
| `xlsx` install source | The maintained SheetJS Community Edition (0.20.x) is distributed via SheetJS's own CDN tarball, not the npm registry, whose `xlsx` package is a stale 0.18.5 | Install from the SheetJS-published tarball URL pinned in `package.json` (documented in quickstart.md), verified at `npm install` time; never silently fall back to the stale registry version |
| `papaparse`/`xlsx` bundle size | Table rendering for arbitrary CSV/Excel files requires a real parser; hand-rolled parsing fails on quoted CSV fields (FR-002) and binary XLSX container format entirely | Lazy-load both libraries as async imports on first CSV/Excel file open (consistent with the existing `pdfjs-dist` lazy-load pattern from spec 036), so neither enters the initial app bundle |
| Chart cached-data extraction via a Community-Edition-only API | SheetJS CE does not expose a documented "chart object" API; cached series data must be read via its worksheet-shaped representation of chart data | Treat any workbook where chart data cannot be reliably extracted as "no chart indicator shown" rather than guessing/fabricating data — covered by spec Edge Cases ("no embedded charts" == no indicator) and verified against the `chart.xlsx` fixture in tests |
