# Phase 1 Data Model: Footer Link Pattern & PPTX Preview Fidelity

This feature has no persisted or server-side data model — both fixes are client-side UI/parsing concerns operating on data already provided (a footer's static link config; a `.pptx` file's bytes, delivered base64-encoded as today). The entities below are in-memory TypeScript shapes used while parsing/rendering a presentation, extending the existing `PptxSlide`/`PptxShape`/`PptxPresentation` types in `ui/src/components/ContentPanel/PptxViewer.tsx`.

## Entities

### PptxPlaceholder (new)

Represents one placeholder shape's identity, used to match a slide's placeholder to its layout's/master's corresponding placeholder.

| Field | Type | Notes |
|---|---|---|
| `type` | `string \| null` | From `p:ph/@type` (e.g. `"title"`, `"body"`, `"ctrTitle"`); `null` means the default `"body"`-equivalent per OOXML (an unset `@type` implies a content placeholder). |
| `idx` | `string \| null` | From `p:ph/@idx`; used as the primary match key when present on both sides. |

**Validation rules**: Purely derived from XML attributes; no user input, no validation beyond "attribute present or not."

### ResolvedShapeGeometry (new, replaces ad hoc inline geometry resolution)

The merged position/size for a shape after applying slide → layout → master precedence, component-wise.

| Field | Type | Notes |
|---|---|---|
| `xEmu` | `number` | From slide's own `a:xfrm/a:off/@x` if present, else matched layout shape's, else matched master shape's, else `0`. |
| `yEmu` | `number` | Same precedence, `a:off/@y`. |
| `widthEmu` | `number` | Same precedence, `a:ext/@cx`. |
| `heightEmu` | `number` | Same precedence, `a:ext/@cy`. |

**Relationships**: Computed per shape at parse time from up to three XML sources (slide shape, matched layout shape, matched master shape); replaces the current `parseXfrm` call, which only reads the slide.

### PptxSlide (extended)

Existing shape (`ui/src/components/ContentPanel/PptxViewer.tsx:20-25`); no field renamed, but population logic changes:

| Field | Type | Notes |
|---|---|---|
| `index` | `number` | Unchanged. |
| `shapes` | `PptxShape[]` | Now includes placeholder shapes that have inherited (not just direct) geometry; text content still comes only from the slide's own runs (never inherited prompt text — see research.md §3). |
| `backgroundFill` | `string \| null` | Now resolved slide → layout → master (was slide-only). |
| `notes` | `string \| null` | Unchanged. |

### PptxLayout / PptxMaster (new, internal parse-time only — not exposed to the rendered component)

Not new exported types; represented internally during parsing as the raw parsed XML record for `slideLayoutN.xml` / `slideMasterN.xml`, each reduced to a list of placeholder shapes (`{ placeholder: PptxPlaceholder, geometry, backgroundFill, ... }`) that `parseSlide` looks up against. These are intermediate parse artifacts, cached per presentation load (a deck's slides commonly share 1-3 layouts/masters, so each layout/master XML is parsed once and reused across slides that reference it, not re-read per slide).

### Slide scroll position (new, component state only)

Not a data entity so much as UI state: replaces the current single `slideIndex` used both as "what's rendered" and "what's current." After this change:
- All slides are always rendered (subject to the deferred off-screen rendering in research.md §4).
- A separate `visibleSlideIndex` (derived from `IntersectionObserver` callbacks) drives only the "Slide N of M" position indicator display — it has no effect on what's mounted/rendered beyond the deferred-rendering optimization.

## State Transitions

None beyond existing behavior: opening a new `.pptx` file re-parses from scratch (unchanged `useEffect` keyed on `content`), and scroll position resets to the top slide on a new file, per spec.md's Edge Cases ("scroll position resets to the first slide" on file switch — reasonable default, no deep-linking to a specific slide).

## Footer (no new entity)

`AppFooter.tsx`'s existing `Props { version: string }` is unchanged. The two links (`gitlocal.dev`, GitHub project) remain static, hardcoded URLs as today — only their visual presentation (icon + label) and, in the native macOS wrapper, their navigation handling change. No new props, state, or data flow.
