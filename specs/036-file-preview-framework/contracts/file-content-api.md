# Contract: `GET /api/file` — FileContent response changes

No new endpoint is introduced. This documents the additive changes to the existing `GET /api/file?path=...&branch=...` response consumed by `ui/src/components/ContentPanel/ContentPanel.tsx`.

## Request

Unchanged: `GET /api/file?path=<repo-relative-path>&branch=<branch-or-HEAD>`

## Response: `FileContent`

```ts
interface FileContent {
  path: string
  content: string
  encoding: 'utf-8' | 'base64' | 'none'
  type: 'markdown' | 'json' | 'text' | 'image' | 'binary' | 'svg' | 'pdf' // 'svg' and 'pdf' are NEW
  language: string
  editable: boolean
  revisionToken: string
}
```

### New branch: `type === 'svg'`

```ts
{
  path,
  content: rawBytes.toString('utf-8'),  // raw XML text, NOT base64
  encoding: 'utf-8',
  type: 'svg',
  language: 'xml',
  editable: false,                       // forced false regardless of working-tree/branch editable state
  revisionToken: editableState.revisionToken,
}
```

Client responsibility: to render the graphic, base64-encode this same UTF-8 string client-side and build `data:image/svg+xml;base64,<encoded>` for the `<img src>`. To show raw source, pass `content` directly to the existing `CodeViewer` with `language="xml"`. No second request.

### New branch: `type === 'pdf'`

```ts
{
  path,
  content: rawBytes.toString('base64'),
  encoding: 'base64',
  type: 'pdf',
  language: '',
  editable: false,                       // forced false regardless of working-tree/branch editable state
  revisionToken: editableState.revisionToken,
}
```

Client responsibility: base64-decode into a `Uint8Array`/`ArrayBuffer` and pass to `pdfjs-dist`'s `getDocument({ data })`.

## Backward compatibility

- Existing `type` values (`markdown`, `json`, `text`, `image`, `binary`) and their response shapes are **unchanged**.
- Files previously classified as `image` (svg) or `binary` (pdf) will now be classified as `svg`/`pdf` respectively — this is the intended reclassification (spec FR-003/FR-004), not a regression; any client code keyed on the old classification for these two extensions must be updated as part of this feature (tracked in tasks.md), but no other extension's classification changes.
- `PUT /api/file` (update) and `DELETE /api/file`: no contract change. Both already reject non-`markdown`/`text` types (see `src/handlers/file.ts` `updateFileHandler`, `type !== 'markdown' && type !== 'text'` check) — `svg` and `pdf` fall through that existing guard automatically, so FR-007 (read-only) requires no new server-side check beyond ensuring `editable: false` is always set in the two new response branches above.
