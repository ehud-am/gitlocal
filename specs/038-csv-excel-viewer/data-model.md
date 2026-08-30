# Phase 1 Data Model: CSV and Excel File Preview

No persistent storage is introduced. "Entities" here are in-memory/type-level shapes shared between server and client, extending the shapes `specs/036-file-preview-framework/data-model.md` already established.

## PreviewType

Extends the existing `detectFileType()` classification (as extended by spec 036). Mutually exclusive; one value per file.

| Value | Today | This feature |
|---|---|---|
| `markdown` | existing | unchanged |
| `json` | existing | unchanged |
| `text` | existing (includes csv) | unchanged, **minus** `csv`, which becomes its own value |
| `image` | existing | unchanged |
| `binary` | existing (includes xlsx/xls) | unchanged, **minus** `xlsx`/`xls`, which become the `excel` value |
| `svg` | existing (036) | unchanged |
| `pdf` | existing (036) | unchanged |
| `csv` | — | **NEW** |
| `excel` | — | **NEW** |

Source of truth: `detectFileType(filename)` in `src/git/repo.ts`. Change: move `.csv` out of the plain-text/no-special-classification path into its own check returning `{ type: 'csv', language: '' }`; move `.xlsx`/`.xls` out of `binaryExts` into their own check returning `{ type: 'excel', language: '' }`.

## FileContent (existing type, extended)

`src/types.ts` — the wire shape returned by `GET /api/file` and consumed by `ContentPanel`.

| Field | Type (after change) | Notes |
|---|---|---|
| `path` | `string` | unchanged |
| `content` | `string` | unchanged in shape; for `csv` carries UTF-8 text (like `text`/`markdown` today); for `excel` carries base64 (like `pdf` today) — see contracts/file-content-api.md |
| `encoding` | `'utf-8' \| 'base64' \| 'none'` | unchanged set of values; `csv` uses `'utf-8'`, `excel` uses `'base64'` |
| `type` | `'markdown' \| 'json' \| 'text' \| 'image' \| 'binary' \| 'svg' \| 'pdf' \| 'csv' \| 'excel'` | **union extended** with the two new values |
| `language` | `string` | `csv` reports `''` (no raw-view syntax highlighting needed beyond plain text — the existing `CodeViewer` renders it unhighlighted); `excel` reports `''` (no raw/code view offered, matching `pdf`) |
| `editable` | `boolean` | `csv` and `excel` always `false`, enforced server-side regardless of working-tree branch state (FR-009) |
| `revisionToken` | `string` | unchanged |

## CsvTable (new, client-only, derived from parsing)

Produced by `CsvViewer.tsx` from `papaparse`'s output; not persisted or sent over the wire.

| Field | Type | Description |
|---|---|---|
| `headers` | `string[]` | First row's cell values, used as column headers (spec FR-001) |
| `rows` | `string[][]` | Remaining rows; short rows pad with empty cells for ragged CSVs (Edge Cases) |
| `parseError` | `string \| null` | Set when `papaparse` cannot produce any rows at all (e.g. binary content misnamed `.csv`); drives the fallback message (FR-008) |

## ExcelWorkbook (new, client-only, derived from parsing)

Produced by `ExcelViewer.tsx` from `xlsx`'s output; not persisted or sent over the wire.

| Field | Type | Description |
|---|---|---|
| `sheets` | `Worksheet[]` | One per worksheet, in workbook order (FR-005) |
| `activeSheetIndex` | `number` | Index into `sheets` for the currently displayed tab; defaults to `0` |
| `parseError` | `string \| null` | Set when `xlsx.read()` throws (corrupted/password-protected/unsupported file); drives the fallback message (FR-008, User Story 2 Scenario 4) |

### Worksheet

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Sheet name, used as the tab label (FR-005) |
| `rows` | `string[][]` | Cell values as displayed by Excel (cached formula results, not formulas — FR-006), read via `xlsx`'s formatted-cell API |
| `hasChart` | `boolean` | **Revised from the original `charts: ChartIndicator[]` shape during Phase 5 implementation.** `true` when SheetJS CE flags this sheet's parsed object with `!type === 'chart'` (i.e. this sheet is itself a dedicated chart tab, not a normal data worksheet). Verified empirically: CE gives **no signal whatsoever** for a chart embedded inside a normal data worksheet (the parsed sheet object is indistinguishable from one with no chart), and even a flagged chartsheet exposes only `!type`/`!drawel`/`!rel` — no title, no series data. |

### ChartIndicator

Originally specified as a `{ title, seriesData }` record per detected chart. **Descoped during Phase 5 implementation**: neither field is obtainable from SheetJS Community Edition for any chart shape actually encountered (embedded or chartsheet), so no such record is constructed. The UI instead renders a single static label wherever `Worksheet.hasChart` is `true` — see `ExcelViewer.tsx` and `research.md` §3.

## Relationships

```text
detectFileType(filename) -> PreviewType
                                  │
                                  ▼
              fileHandler (src/handlers/file.ts) -> FileContent { type: PreviewType, ... }
                                  │
                                  ▼
     ContentPanel.tsx  looks up  previewRegistry[fileContent.type]  -> PreviewRegistryEntry (from spec 036)
                                  │
                     ┌────────────┴────────────┐
                     ▼                          ▼
        <CsvViewer content={...}/>   <ExcelViewer content={...}/>
                     │                          │
                     ▼                          ▼
        papaparse.parse(content)     xlsx.read(base64-decoded content)
                     │                          │
                     ▼                          ▼
              CsvTable (in-memory)    ExcelWorkbook { sheets: Worksheet[] } (in-memory)
                                                 │
                                                 ▼
                                      Worksheet.charts: ChartIndicator[]
```

No new database, cache, or file-format entity is introduced; `CsvTable`/`ExcelWorkbook`/`Worksheet`/`ChartIndicator` are transient client-side parse results, recomputed on each file open exactly like `pdfjs-dist`'s in-memory `PDFDocumentProxy` in spec 036 — nothing here is written back to the server.
