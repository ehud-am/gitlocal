# Feature Specification: CSV and Excel File Preview

**Feature Branch**: `038-csv-excel-viewer`
**Created**: 2026-08-29
**Status**: Draft
**Input**: User description: "Add read-only CSV and Excel file viewers to the preview registry; the Excel viewer must render worksheet tabs and embedded charts but must not refresh external data links or execute macros/dynamic content"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview a CSV file as a table (Priority: P1)

A user browsing a repo opens a `.csv` file (an export, a data fixture, a report). Today it falls back to plain, unhighlighted text. Instead, they see it rendered as a scrollable table with the first row treated as a header, the same way GitHub renders CSV files, without downloading it or leaving the app.

**Why this priority**: CSV is the simplest, most common tabular format in a repo and today gets no structured preview at all — it is the lowest-effort, highest-clarity win in this feature.

**Independent Test**: Open any valid `.csv` file in the repo browser and confirm it renders as a table with a header row, with no change to how any other file type is displayed.

**Acceptance Scenarios**:

1. **Given** a repo containing a valid `.csv` file, **When** the user selects that file, **Then** the content panel renders it as a table with the first row shown as column headers.
2. **Given** a CSV with many rows, **When** it is open, **Then** the table scrolls within the content panel without degrading responsiveness (consistent with existing large-file performance expectations).
3. **Given** a CSV using quoted fields, embedded commas, or embedded newlines within quoted cells, **When** it is rendered, **Then** cell boundaries are parsed correctly rather than splitting naively on every comma or newline.
4. **Given** a CSV file, **When** the user wants the underlying text, **Then** they can switch to a raw view showing the unmodified file content, using the same toggle already used for Markdown/JSON/SVG.
5. **Given** a malformed or empty CSV file, **When** the user opens it, **Then** the system shows a clear "can't preview this file" fallback (or an empty-table state for a genuinely empty file) instead of crashing.

---

### User Story 2 - Preview an Excel workbook's sheets and cell data (Priority: P1)

A user opens a `.xlsx` file (a data export, a budget, a tracking sheet). Today this shows "Binary file — preview not available." Instead, they see the workbook rendered as a table of the active sheet's cell values, with tabs for every other worksheet in the file so they can switch between sheets, without downloading it or opening Excel.

**Why this priority**: Excel is the most common structured-data format GitLocal currently cannot preview at all (explicitly deferred out of scope in `specs/036-file-preview-framework/`), and multi-sheet navigation is the core of what makes a workbook usable versus a flat table.

**Independent Test**: Open a multi-sheet `.xlsx` file, confirm the active sheet's data renders as a table, and confirm clicking another sheet's tab switches the visible table to that sheet's data.

**Acceptance Scenarios**:

1. **Given** a repo containing a valid `.xlsx` file, **When** the user selects that file, **Then** the content panel renders the first worksheet's cell values as a table instead of the binary fallback message.
2. **Given** a workbook with multiple worksheets, **When** it is open, **Then** a row of tabs (one per worksheet, in workbook order, using each sheet's name) lets the user switch the visible table between sheets.
3. **Given** a worksheet with formulas, **When** it is rendered, **Then** each cell shows its last-saved calculated value from the file, not a live recalculation.
4. **Given** a corrupted, password-protected, or non-Excel file with a `.xlsx`/`.xls` extension, **When** the user opens it, **Then** the system falls back to a clear "can't preview this file" message instead of crashing or hanging.
5. **Given** a very large workbook (many rows or sheets), **When** it is opened, **Then** the active sheet becomes visible without noticeably degrading responsiveness, consistent with existing performance expectations for large files.

---

### User Story 3 - See that a worksheet contains a chart, without live/interactive rendering (Priority: P3)

A user opens a workbook that includes an embedded chart (e.g., a bar chart summarizing the data on that sheet). GitLocal does not silently drop this information: the sheet view indicates a chart is present and shows the chart's own cached summary data as a small table, so the user knows a chart existed and can see the numbers behind it, without GitLocal rendering an interactive/live chart graphic.

**Why this priority**: Fully rendering native Excel chart graphics turns out to require either a paid library tier or an AGPL-licensed server component (see Assumptions and `research.md`), both disallowed by this project's MIT-only, no-paid-tier dependency policy (Constitution VI). Surfacing that a chart exists, with its underlying cached data, is the honest, license-compliant middle ground — valuable but clearly lower priority than making the raw sheet data itself viewable (User Story 2).

**Independent Test**: Open a workbook containing at least one embedded chart, confirm the affected worksheet shows a visible chart indicator, and confirm the chart's cached series data is viewable as a small table on request.

**Acceptance Scenarios**:

1. **Given** a worksheet with one or more embedded charts, **When** the user views that sheet, **Then** each chart is represented by a labeled indicator (not a rendered chart graphic) showing at least the chart's title if the file provides one.
2. **Given** a chart indicator, **When** the user interacts with it, **Then** they can view the chart's cached series data as a plain table.
3. **Given** a worksheet with no embedded charts, **When** the user views that sheet, **Then** no chart indicator is shown.
4. **Given** any chart present in the file, **When** it is shown to the user in any form, **Then** GitLocal never re-fetches, recalculates, or re-renders it as a live/interactive chart, and never contacts an external data source on its behalf.

---

### Edge Cases

- What happens when a `.csv` file is not actually comma-delimited (e.g., tab- or semicolon-delimited) or has inconsistent column counts per row? → Renders on a best-effort basis (short rows show empty trailing cells); does not crash.
- What happens when an `.xlsx`/`.xls` file is corrupted, truncated, or password-protected? → Clear non-preview fallback message, no crash (User Story 2, Scenario 4).
- What happens when a workbook contains an external data connection (e.g., a Power Query link, a linked workbook reference) or embedded VBA macros? → Neither is executed or refreshed under any circumstance; GitLocal only reads the static values already saved in the file, exactly as it does for formulas (User Story 2, Scenario 3).
- What happens when a worksheet is very wide (hundreds of columns) or has merged cells? → Renders on a best-effort basis; merged-cell layout may simplify to repeated/blank cells rather than a pixel-perfect Excel layout, since this is a preview, not a spreadsheet editor.
- What happens when a workbook has zero worksheets, or a worksheet is entirely empty? → Shows an empty-table state per sheet rather than an error.
- Are CSV and Excel files editable in this version? → No. Both are read-only preview, consistent with how PDF and SVG are handled today (`specs/036-file-preview-framework/spec.md`).
- What happens to `.numbers` (Apple) or `.ods` (OpenDocument) spreadsheet files? → Out of scope for this version; continue to fall back to the existing binary "preview not available" message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST classify `.csv` files as their own distinct preview type (no longer grouped under generic `text`) and render them as a scrollable table with the first row treated as a header.
- **FR-002**: CSV parsing MUST correctly handle quoted fields, embedded delimiters, and embedded newlines within quoted cells rather than a naive split on every comma/newline.
- **FR-003**: CSV preview MUST offer a raw-source view of the unmodified file content via the same toggle mechanism already used for Markdown/JSON/SVG.
- **FR-004**: The system MUST classify `.xlsx` and `.xls` files as their own distinct preview type (no longer grouped under `binary`) and render the workbook's cell data as a table.
- **FR-005**: When a workbook has more than one worksheet, the system MUST display a tab per worksheet, in workbook order, labeled with each sheet's name, and switch the visible table when a different tab is selected.
- **FR-006**: Cell values MUST reflect the last-saved values stored in the file (including cached formula results). The system MUST NOT recalculate formulas, MUST NOT execute VBA macros, and MUST NOT fetch or refresh data from any external link, connection, or URL referenced by the workbook.
- **FR-007**: When a worksheet contains one or more embedded charts, the system MUST indicate their presence and MUST make each chart's cached series data viewable as a plain table. The system MUST NOT render an interactive or live chart graphic, and MUST NOT re-fetch or recalculate chart data.
- **FR-008**: The system MUST show a clear, non-crashing fallback message when a CSV or Excel file cannot be parsed/rendered (corrupted, encrypted, extension/content mismatch, or an unsupported legacy binary `.xls` variant), rather than a blank panel or unhandled error.
- **FR-009**: CSV and Excel previews MUST be read-only in this version; the file-edit affordance MUST NOT be offered for these types (matching current PDF/SVG/image behavior).
- **FR-010**: All CSV and Excel parsing and rendering MUST happen entirely client-side/locally, with no data sent to or fetched from any remote service, per the project's local-first principle.
- **FR-011**: Both new preview types MUST be added as registry entries in the existing preview framework (`specs/036-file-preview-framework/`) without modifying its core dispatch logic, consistent with that framework's extensibility requirement (FR-009 of spec 036).
- **FR-012**: Any new dependency introduced for CSV or Excel parsing/rendering MUST be MIT-compatible, free, and not feature-gated behind a paid tier, per Constitution VI. A dependency that only exposes chart-rendering capability through a paid tier MUST NOT be adopted for that purpose.

### Key Entities *(include if feature involves data)*

- **CSV Preview Type**: A new preview-type classification for `.csv` files, extending `detectFileType`'s output alongside the existing `markdown`/`json`/`text`/`image`/`binary`/`svg`/`pdf` types.
- **Excel Preview Type**: A new preview-type classification for `.xlsx`/`.xls` files, split out of the current `binary` bucket.
- **Worksheet**: A named, ordered sheet within a workbook; has a display name (the tab label) and a grid of cell values. A workbook has one or more worksheets.
- **Chart Indicator**: A record, derived from a worksheet's embedded chart metadata, carrying an optional chart title and its cached series data (categories/values), used only to display the "a chart exists here, and here is its data" affordance from User Story 3 — not a renderable chart object.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open any valid CSV file in a repo and see it rendered as a table, with 0 CSV files that previously showed as plain unhighlighted text now requiring that fallback.
- **SC-002**: A user can open any valid single- or multi-sheet Excel workbook and see its cell data rendered as a table, with 0 `.xlsx`/`.xls` files that previously showed "Binary file — preview not available" still requiring a download to see their sheet contents.
- **SC-003**: 100% of worksheets in an opened workbook are reachable via a tab within one interaction (one click) of opening the file.
- **SC-004**: 0 formula recalculations, macro executions, or external network requests occur as a result of opening any CSV or Excel file, verified by automated tests that assert no execution/fetch APIs are invoked during preview.
- **SC-005**: Opening a corrupted or unsupported CSV/Excel file never crashes the content panel or leaves it in a blank/stuck state — it always resolves to a visible fallback message.
- **SC-006**: Adding CSV and Excel preview support requires zero new conditional branches added to the pre-existing dispatch code path in `ContentPanel` — both are added purely as new registry entries plus new renderer components, matching `specs/036-file-preview-framework/` SC-004.

## Assumptions

- **Chart rendering is scoped to a static data indicator, not a live/interactive chart graphic, and this is a licensing constraint, not a preference.** Research (`research.md`) found that every JS library capable of rendering native Excel chart *graphics* (matching the visual chart embedded in the file) is either paid/feature-gated (e.g. SheetJS's chart support is Pro-tier only) or AGPL-licensed and server-based (e.g. ONLYOFFICE Document Server) — both disallowed by Constitution VI ("No proprietary components, no paid tiers, no feature gating"). This spec instead requires exposing the chart's *cached data* (FR-007), which is achievable with a free, MIT-compatible parser, satisfying the "no live/dynamic content" half of the original request while being transparent that "rendered as a visual chart" is not achievable within the project's license policy today. This should be confirmed with the requester before implementation begins.
- CSV parsing and Excel cell-data parsing/rendering reuse well-established, MIT/Apache-licensed, purely client-side parsing libraries with no formula-execution or network-fetch engine of their own — the specific libraries are a planning-phase decision (see `research.md`), not a spec-level requirement beyond FR-012.
- Legacy binary `.xls` (pre-2007 format) support is best-effort: if the chosen library cannot parse a given legacy file, it falls back to the standard "can't preview this file" message (FR-008) rather than being treated as a bug.
- `.numbers` and `.ods` spreadsheet formats are out of scope for this version, matching how `specs/036-file-preview-framework/` scoped out Office formats generally; they continue to use the existing binary fallback.
- No changes to the server-side file-fetch/edit permission model are required beyond ensuring CSV and Excel are not marked editable, consistent with how PDF/SVG were handled.
- The existing `detectFileType` binary-extension list already includes `.xls`/`.xlsx`; this version removes them from that list and gives them their own explicit preview-type classification, the same migration pattern used for `.pdf` and `.svg` in spec 036.
