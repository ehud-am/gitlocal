# Phase 1 Data Model: Repo Safety, Search & Review Fixes + PPTX Preview

The four bug fixes operate on existing internal data shapes with no new entities — see the "Existing shapes touched" section below. The PPTX preview introduces new client-side parsed entities (not persisted, derived at preview time from the fetched file bytes).

## Existing shapes touched (bug fixes only)

- **Repo-relative path containment result** (`resolveSafeRepoPath` return value): unchanged shape (`string | null`); fix changes only the validation performed before returning a non-null value. No schema change.
- **Search result entry** (`searchGitTreeByContent` output item): unchanged shape (`{ path: string; line: number; snippet: string }` or equivalent); fix changes only how `path`/`line` are extracted from raw `git grep -z` output. No schema change.
- **Changed-file entry** (`parsePorcelainChangeState` output): unchanged shape (`{ path: string; oldPath?: string; type: ChangeType; canOpen: boolean }` or equivalent); fix changes only how `path`/`oldPath` strings are decoded from porcelain quoting. No schema change.
- **WebSocket upgrade handling**: no data shape involved; behavioral fix only.

## New entities (PPTX preview, client-side only)

### PptxPresentation

Represents a parsed `.pptx` file for preview purposes. Exists only in browser memory for the duration of the preview; never persisted or sent back to the server.

| Field | Type | Description |
|---|---|---|
| `slides` | `PptxSlide[]` | Ordered list of parsed slides, in presentation order |
| `slideWidthEmu` | `number` | Presentation-wide slide width, in EMU, from `ppt/presentation.xml` |
| `slideHeightEmu` | `number` | Presentation-wide slide height, in EMU, from `ppt/presentation.xml` |

### PptxSlide

| Field | Type | Description |
|---|---|---|
| `index` | `number` | Zero-based position in the presentation |
| `shapes` | `PptxShape[]` | Text boxes and images positioned on this slide |
| `backgroundFill` | `string \| null` | CSS color string for slide background, if a solid fill is present; `null` if unresolved/unsupported (e.g., gradient/picture fill) |
| `notes` | `string \| null` | Plain-text speaker notes for this slide; `null` if the slide has no notes part or the notes body is empty |

### PptxShape

A discriminated union of the two renderable shape kinds this feature supports.

| Field | Type | Description |
|---|---|---|
| `kind` | `'text' \| 'image'` | Discriminator |
| `xEmu`, `yEmu`, `widthEmu`, `heightEmu` | `number` | Position/size in EMU, converted to CSS pixels at render time via a fixed scale factor derived from `slideWidthEmu`/`slideHeightEmu` |
| `runs` *(kind: 'text')* | `PptxTextRun[]` | Ordered text runs making up this text box's content |
| `imageDataUri` *(kind: 'image')* | `string` | Base64 data URI of the resolved embedded image, or omitted/placeholder if the image part could not be resolved |

### PptxTextRun

| Field | Type | Description |
|---|---|---|
| `text` | `string` | Run's literal text content |
| `bold` | `boolean` | Whether the run is bold |
| `italic` | `boolean` | Whether the run is italic |
| `fontSizePt` | `number \| null` | Font size in points, if specified; `null` falls back to a default |
| `color` | `string \| null` | CSS color string, if specified; `null` falls back to a default |

### Preview registry entry (extension of existing shape)

The existing `PreviewRegistryEntry` shape (from spec 036, extended in spec 038) is unchanged in structure. This feature adds one new keyed entry:

```ts
pptx: {
  Component: PptxViewer,   // React.lazy-loaded
  supportsRawToggle: false,
  editable: false,
}
```

### FileContent type (extension of existing shape)

`FileContent['type']` union (in `src/types.ts`) gains one new literal: `'pptx'`, alongside existing `'pdf' | 'excel' | 'csv' | ...`. The response shape for a `pptx`-typed file is otherwise identical to the existing `excel` case: `{ type: 'pptx', encoding: 'base64', content: string }`.

## Validation rules

- A slide with zero shapes is valid and renders as an empty slide (edge case in spec.md — no crash).
- A shape with a `kind: 'image'` whose referenced media part cannot be resolved (missing relationship, unsupported image format) is rendered as a simple placeholder rather than omitted entirely, so users understand something was there — mirroring the Excel chart-indicator scope decision.
- `notes: null` and `notes: ''` (empty string after trimming) are both treated as "no notes" for rendering purposes (FR-016 — no empty/broken notes area shown).
- Any unrecoverable parse failure (corrupted zip, missing required XML parts) surfaces as a top-level "cannot preview this file" state (FR-018), not a partially-rendered `PptxPresentation`.
