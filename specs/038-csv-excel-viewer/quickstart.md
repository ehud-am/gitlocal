# Quickstart: CSV and Excel File Preview

## Install note (`xlsx` source)

`xlsx` (SheetJS Community Edition) must be installed from SheetJS's published CDN tarball, not the stale npm-registry copy — see `research.md` §2 and `plan.md` Complexity Tracking. Confirm `package.json`'s `xlsx` entry points at the pinned tarball URL, not a bare `^0.18.x` npm version, before running `npm install`.

## Verify CSV preview

1. `npm run dev` (or the project's existing dev script) and open a repo containing a `.csv` file (or copy any small CSV into a test repo).
2. Select the `.csv` file in the file tree.
3. Expected: the content panel renders a table with the first row as column headers, not the old unhighlighted plain-text view.
4. Open (or create) a CSV with a quoted field containing a comma and an embedded newline (e.g. `"Smith, John","multi\nline"`) — expected: those render as single cells, not split into extra columns/rows.
5. Use the existing raw/pretty toggle → confirm the unmodified raw CSV text appears.
6. Open browser DevTools → Network tab, confirm no request beyond the local `/api/file` fetch occurs while the file is open (Principle III / FR-010).

## Verify Excel preview

1. Select a multi-sheet `.xlsx` file in the file tree.
2. Expected: the content panel renders the first worksheet's cell values as a table instead of "Binary file — preview not available."
3. Confirm a tab strip lists every worksheet by name, in workbook order; click a non-active tab → the table switches to that sheet's data.
4. Open a workbook containing a formula cell → confirm it shows the last-saved calculated value, not `#REF!`/live recalculation, and confirm no visible "recalculating" state ever appears.
5. Open `chart.xlsx` (a data sheet plus a dedicated chart-only tab) → switch to the chart tab, confirm it shows a static "this sheet contains a chart" label rather than a rendered chart image. **Scope note**: SheetJS Community Edition exposes no chart title and no cached series data for any chart shape (embedded or dedicated tab), so no title and no data-reveal interaction is offered — see research.md §3.
6. Open a workbook with no charts (e.g. `sample.xlsx`) → confirm no chart indicator appears on any sheet.
7. Open a corrupted or password-protected `.xlsx` file → confirm a clear non-preview fallback message appears instead of a crash, blank panel, or hang.
8. Open browser DevTools → Network tab, confirm no request beyond the local `/api/file` fetch occurs while the file is open, including for workbooks that reference external data connections (FR-010, FR-006).

## Verify zero regression on existing types

1. Open a `.md`/`.json`/`.svg`/`.pdf`/`.png` file → each behaves exactly as before this feature (spec 036 behavior unchanged).
2. Open a `.ts`/`.py`/etc. code file → syntax-highlighted `CodeViewer` as before.
3. Open a non-CSV/Excel file that previously fell into `text` or `binary` → still classified and rendered the same as before; only `.csv`/`.xlsx`/`.xls` reclassify.

## Run automated checks

```sh
npm test       # full suite incl. new CsvViewer/ExcelViewer tests; existing suites must pass unmodified
npm run lint   # tsc --noEmit
npm run build  # server + UI bundle, confirms papaparse/xlsx resolve and lazy-load correctly at build time
```
