# Contract: `GET /api/file` — FileContent response changes

No new endpoint is introduced. This documents the additive changes to the existing `GET /api/file?path=...&branch=...` response consumed by `ui/src/components/ContentPanel/ContentPanel.tsx`, extending the contract `specs/036-file-preview-framework/contracts/file-content-api.md` already established.

## Request

Unchanged: `GET /api/file?path=<repo-relative-path>&branch=<branch-or-HEAD>`

## Response: `FileContent`

```ts
interface FileContent {
  path: string
  content: string
  encoding: 'utf-8' | 'base64' | 'none'
  type: 'markdown' | 'json' | 'text' | 'image' | 'binary' | 'svg' | 'pdf' | 'csv' | 'excel' // 'csv' and 'excel' are NEW
  language: string
  editable: boolean
  revisionToken: string
}
```

### New branch: `type === 'csv'`

```ts
{
  path,
  content: rawBytes.toString('utf-8'),  // raw CSV text, NOT base64
  encoding: 'utf-8',
  type: 'csv',
  language: '',
  editable: false,                       // forced false regardless of working-tree/branch editable state
  revisionToken: editableState.revisionToken,
}
```

Client responsibility: pass `content` to `papaparse.parse()` client-side to build the table; pass the same `content` string directly to the existing `CodeViewer` for the raw-view toggle. No second request.

### New branch: `type === 'excel'`

```ts
{
  path,
  content: rawBytes.toString('base64'),
  encoding: 'base64',
  type: 'excel',
  language: '',
  editable: false,                       // forced false regardless of working-tree/branch editable state
  revisionToken: editableState.revisionToken,
}
```

Client responsibility: base64-decode into a `Uint8Array`/`ArrayBuffer` and pass to `xlsx.read(data, { type: 'array' })`. `ExcelViewer.tsx` then reads `workbook.SheetNames` (tab order/labels) and each sheet's formatted cell grid; VBA project streams and external-link definitions present in the file are never parsed further than SheetJS CE's default (opaque/ignored) handling — no code path in this feature invokes macro execution or link refresh.

## Backward compatibility

- Existing `type` values (`markdown`, `json`, `text`, `image`, `binary`, `svg`, `pdf`) and their response shapes are **unchanged**.
- Files previously classified as `text` (`.csv`) or `binary` (`.xlsx`/`.xls`) will now be classified as `csv`/`excel` respectively — this is the intended reclassification (spec FR-001/FR-004), not a regression; any client code keyed on the old classification for these extensions must be updated as part of this feature (tracked in tasks.md), but no other extension's classification changes.
- `PUT /api/file` (update) and `DELETE /api/file`: no contract change. Both already reject non-`markdown`/`text` types (see `src/handlers/file.ts` `updateFileHandler`, `type !== 'markdown' && type !== 'text'` check) — `csv` and `excel` fall through that existing guard automatically, so FR-009 (read-only) requires no new server-side check beyond ensuring `editable: false` is always set in the two new response branches above.
