# Phase 1 Data Model: File Preview Framework

No persistent storage is introduced. "Entities" here are in-memory/type-level shapes shared between server and client.

## PreviewType

Extends the existing `detectFileType()` classification. Mutually exclusive; one value per file.

| Value | Today | This feature |
|---|---|---|
| `markdown` | existing | unchanged |
| `json` | existing | unchanged |
| `text` | existing | unchanged (code/plain-text fallback) |
| `image` | existing (includes svg) | unchanged, **minus** `svg`, which becomes its own value |
| `binary` | existing (includes pdf) | unchanged, **minus** `pdf`, which becomes its own value |
| `svg` | — | **NEW** |
| `pdf` | — | **NEW** |

Source of truth: `detectFileType(filename)` in `src/git/repo.ts`. Change: move `'svg'` out of `imageExts` into its own check returning `{ type: 'svg', language: 'xml' }`; move `'pdf'` out of `binaryExts` into its own check returning `{ type: 'pdf', language: '' }`.

## FileContent (existing type, extended)

`src/types.ts` — the wire shape returned by `GET /api/file` and consumed by `ContentPanel`.

| Field | Type (after change) | Notes |
|---|---|---|
| `path` | `string` | unchanged |
| `content` | `string` | unchanged in shape; for `svg` now carries UTF-8 text (not base64) — see contracts/file-content-api.md |
| `encoding` | `'utf-8' \| 'base64' \| 'none'` | unchanged set of values; `svg` uses `'utf-8'`, `pdf` uses `'base64'` |
| `type` | `'markdown' \| 'json' \| 'text' \| 'image' \| 'binary' \| 'svg' \| 'pdf'` | **union extended** with the two new values |
| `language` | `string` | `svg` reports `'xml'` (enables raw-view syntax highlighting via existing `CodeViewer`); `pdf` reports `''` (no raw/code view offered) |
| `editable` | `boolean` | `svg` and `pdf` always `false`, enforced server-side regardless of working-tree branch state |
| `revisionToken` | `string` | unchanged |

## PreviewRegistryEntry (new, client-only)

Defined in `ui/src/components/ContentPanel/preview-registry.ts`. One entry per `PreviewType`.

| Field | Type | Description |
|---|---|---|
| `Component` | `React.ComponentType<PreviewComponentProps>` | Renderer for the "pretty" view of this type |
| `supportsRawToggle` | `boolean` | Whether the existing raw/pretty toggle control is offered (markdown, json, svg: `true`; image, pdf, text, binary: `false` — text/code IS the raw view, so no separate toggle) |
| `editable` | `boolean` | Whether the file-edit affordance may be offered for this type, subject to the server's own `editable` flag on the response (markdown, json, text: `true`; image, svg, pdf, binary: `false`) |

`PreviewComponentProps` (shared shape all registry components accept): `{ content: FileContent; ... existing props ContentPanel already threads through (find query, revision token, save handler, etc.) }` — exact prop list preserved from current per-type components during migration, not redesigned.

## Relationships

```text
detectFileType(filename) -> PreviewType
                                  │
                                  ▼
              fileHandler (src/handlers/file.ts) -> FileContent { type: PreviewType, ... }
                                  │
                                  ▼
     ContentPanel.tsx  looks up  previewRegistry[fileContent.type]  -> PreviewRegistryEntry
                                  │
                                  ▼
                      renders  <entry.Component content={fileContent} .../>
```

No new database, cache, or file-format entity is introduced; this is purely a reclassification (PreviewType) plus a dispatch table (PreviewRegistryEntry) layered over existing data flow.
