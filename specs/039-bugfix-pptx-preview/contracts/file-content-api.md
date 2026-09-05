# Contract: `GET /api/file` — FileContent response changes

No new endpoint is introduced. This documents the additive change to the existing `GET /api/file?path=...&branch=...` response, extending the contract chain from `specs/036-file-preview-framework/contracts/file-content-api.md` and `specs/038-csv-excel-viewer/contracts/file-content-api.md`.

## Request

Unchanged: `GET /api/file?path=<repo-relative-path>&branch=<branch-or-HEAD>`

## Response: `FileContent`

```ts
interface FileContent {
  path: string
  content: string
  encoding: 'utf-8' | 'base64' | 'none'
  type: 'markdown' | 'json' | 'text' | 'image' | 'binary' | 'svg' | 'pdf' | 'csv' | 'excel' | 'pptx' // 'pptx' is NEW
  language: string
  editable: boolean
  revisionToken: string
}
```

### New branch: `type === 'pptx'`

```ts
{
  path,
  content: rawBytes.toString('base64'),
  encoding: 'base64',
  type: 'pptx',
  language: '',
  editable: false,                       // forced false regardless of working-tree/branch editable state
  revisionToken: editableState.revisionToken,
}
```

Client responsibility: base64-decode into an `ArrayBuffer`/`Uint8Array` and pass to `jszip.loadAsync(data)`. `PptxViewer.tsx` then reads `ppt/presentation.xml` for slide dimensions and slide order, parses each `ppt/slides/slideN.xml` (and matching `ppt/notesSlides/notesSlideN.xml` when present, resolved via `ppt/slides/_rels/slideN.xml.rels`) with `fast-xml-parser`, and resolves embedded images via each slide's relationship file to `ppt/media/imageN.*`. No server round-trip beyond the single existing `GET /api/file` request.

## Backward compatibility

- Existing `type` values (`markdown`, `json`, `text`, `image`, `binary`, `svg`, `pdf`, `csv`, `excel`) and their response shapes are **unchanged**.
- Files previously classified as `binary` (`.pptx`) will now be classified as `pptx` — this is the intended reclassification (FR-013), not a regression; any client code keyed on the old classification for this extension must be updated as part of this feature (tracked in tasks.md), but no other extension's classification changes. Legacy binary `.ppt` files remain classified as `binary` unless research during implementation finds `.ppt` support is low-effort (spec.md Assumptions).
- `PUT /api/file` (update) and `DELETE /api/file`: no contract change. Both already reject non-`markdown`/`text` types — `pptx` falls through that existing guard automatically, so FR-017 (read-only) requires no new server-side check beyond ensuring `editable: false` is always set in the new response branch above.
