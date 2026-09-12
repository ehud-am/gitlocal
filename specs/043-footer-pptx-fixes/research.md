# Phase 0 Research: Footer Link Pattern & PPTX Preview Fidelity

## 1. Why current PPTX preview breaks on non-trivial decks

**Finding**: Inspected the existing preview fixtures (`ui/src/test-fixtures/*.pptx`, e.g. `sample.pptx`, `variants.pptx`). None contain `ppt/slideLayouts/` or `ppt/slideMasters/` parts, and none of their slides reference a layout relationship at all — they're flat, from-scratch slides with all geometry/text defined directly. `PptxViewer.tsx`'s `parseSlide` (ui/src/components/ContentPanel/PptxViewer.tsx:116-202) only ever reads the slide's own XML: text shapes are added only `if (runs.length > 0)` (line 144), and background is read only from the slide's own `p:cSld > p:bg` (lines 130-135). A slide whose title/body is an inherited placeholder (no direct `a:r` runs, no direct `a:xfrm`) or whose background is set on its layout/master is silently dropped or shown blank. This matches the reported symptom exactly: trivial decks (built by hand with no master customization, or where PowerPoint happened to write full overrides) look fine; decks built the normal way — themed template, inherited placeholders — do not.

**Decision**: Extend parsing to read, per slide, its `slideLayoutN.xml` (via the slide's own `_rels/slideN.xml.rels`, relationship type ending `/slideLayout`) and that layout's `slideMasterN.xml` (via the layout's own rels, type ending `/slideMaster`), then merge placeholder geometry/formatting, background fill, and any other rendered property using slide → layout → master precedence (most specific wins), matching OOXML's documented inheritance model (ECMA-376 Part 1, §19.3 "Presentation Placeholders").

**Alternatives considered**:
- *Pull in a full OOXML rendering library*: rejected — spec 039 already established no free/license-compatible pixel-faithful PPTX renderer exists; this repo intentionally hand-rolls a "best-effort formatted" reader with `jszip` + `fast-xml-parser`, and this fix stays within that same approach, just extending which parts it reads.
- *Only fix background inheritance, leave placeholder text as-is*: rejected — the user's own report ("more than trivial presentations... are not rendered correctly") calls out rendering broadly, and placeholder text omission is the more visible defect (missing titles/body text) versus a wrong background color.

## 2. OOXML placeholder matching rule (slide ↔ layout ↔ master)

**Finding**: A slide shape that's a placeholder carries `p:nvSpPr > p:nvPr > p:ph` with optional `@type` (e.g. `title`, `body`, `ctrTitle`, `subTitle`) and optional `@idx` (a numeric index, used when multiple placeholders share a type, e.g. multiple content boxes). A layout placeholder shape carries the same `p:ph` element. The match between a slide's placeholder and its layout's corresponding placeholder is: same `@idx` if both specify one; otherwise same `@type` (with `body`/`obj`/`subTitle` families treated as compatible in real PowerPoint, but for this best-effort preview, exact `@type` string match is sufficient — an unmatched placeholder simply falls back to rendering only what the slide itself defines, per FR-008's graceful-degradation requirement). The same matching rule applies one level up between a layout's placeholders and its master's placeholders.

**Decision**: Implement a small `matchPlaceholder(slidePh, candidates)` helper: prefer `idx` match, fall back to `type` match, else `undefined` (no inherited placeholder found → render slide-only data, satisfying the edge case in spec.md's Edge Cases section).

**Alternatives considered**: Matching by shape order/position only — rejected, not reliable per OOXML spec and would misattribute inherited formatting to the wrong placeholder when a layout reorders shapes.

## 3. Property-level merge (geometry, text formatting, background)

**Finding**: For a given resolved placeholder chain (slide shape → matched layout shape → matched master shape), each individual property (position `a:off`, size `a:ext`, run formatting `a:rPr` bold/italic/size/color, and paragraph-level default text properties) is independently inherited: if the slide doesn't specify an `a:xfrm`, use the layout's; if the layout doesn't specify one either, use the master's. Text content itself (the actual placeholder *text*) is different: master/layout placeholder "text" is prompt text ("Click to edit Master title style") that PowerPoint never displays when rendering an actual slide — only the slide's own `a:t` run text should ever be shown as content. Only *formatting* and *geometry* are inherited, never literal placeholder prompt text.
Background inheritance is simpler and already slide-level in the current code (`p:cSld > p:bg`); the same lookup just needs to also check the layout's `p:cSld > p:bg` and then the master's `p:cSld > p:bg` when the slide doesn't define one, using the same solid-fill-only extraction already in place (gradient/picture fills remain a stated best-effort gap, consistent with spec 039's scope).

**Decision**: Merge at property level, not whole-shape level: `resolvedGeometry = slideXfrm ?? layoutXfrm ?? masterXfrm` (component-wise, since a slide might override position but not size); text *content* always comes from the slide's own runs only — if a slide placeholder has no runs of its own, render nothing for that shape rather than inherited prompt text (this also naturally handles unused placeholders that PowerPoint's UI shows as empty on a real slide).

**Alternatives considered**: Rendering layout/master prompt text as a visual placeholder hint (e.g., greyed "Title" text) when the slide leaves it empty — rejected as out of scope; not requested, and would risk being mistaken for actual slide content in a read-only preview meant to reflect what's on the slide.

## 4. Continuous-scroll navigation replacing paged buttons

**Finding**: The current UI (`ui/src/components/ContentPanel/PptxViewer.tsx:307-331`) keeps one `slideIndex` in state and renders exactly one slide, with Prev/Next buttons mutating that index. All slide data is already parsed up front into `presentation.slides` (full array in memory) — so continuous scroll doesn't need incremental/lazy data loading, only incremental/deferred *rendering* to stay responsive per SC-004 on large decks.

**Decision**: Render all slides as a vertically stacked list (reusing the existing per-slide shape-rendering JSX, unchanged) inside a scrollable container. Track the "current" slide for the position indicator via `IntersectionObserver` on each slide's wrapper element (a common, dependency-free technique already idiomatic for scroll-spy UIs), rather than manual `scroll` event math — this avoids adding a new dependency and matches the constitution's dependency-bloat caution (Principle I). For responsiveness on large decks (SC-004, FR-013), defer *shape rendering* for slides outside an expanded viewport window using the same `IntersectionObserver` (render a lightweight placeholder box of the correct slide size until a slide is near-visible, then mount its shapes) — this is a lighter-weight approach than pulling in a virtualization library, and keeps the "no new dependency" constraint from Principle VI/I.

**Alternatives considered**:
- *Add `react-window` or similar list-virtualization library*: rejected — adds a new dependency for a problem `IntersectionObserver`-gated rendering already solves at this feature's scale (spec.md's SC-004 target is 50 slides, not thousands), keeping with Principle I's "avoid dependency bloat."
- *Keep paged view, just improve button styling*: rejected — directly contradicts the explicit user preference for endless scroll over buttons.

## 5. Native macOS external-link handling

**Finding**: `ViewerWindowController.swift` (native/macos/GitLocal/GitLocal/ViewerWindowController.swift:5-38) creates a single `WKWebView`, sets itself as `WKNavigationDelegate`, but implements no `webView(_:decidePolicyFor:decisionHandler:)` and no `WKUIDelegate`/`webView(_:createWebViewWith:for:windowFeatures:)`. Per WebKit's default behavior, a request for a new browsing context (a `target="_blank"` anchor click, or any navigation with `navigationAction.targetFrame == nil`) with no `WKUIDelegate.createWebViewWith` implementation is simply dropped — nothing opens, nothing errors. This precisely matches "does not follow the links" for the native distribution while the npm/browser distribution (plain `<a target="_blank">` in a real browser tab) already works today.

**Decision**: Implement `WKNavigationDelegate.webView(_:decidePolicyFor:decisionHandler:)` (already the assigned delegate) to detect `navigationAction.targetFrame == nil || navigationAction.targetFrame?.isMainFrame == false` for an external `http`/`https` URL, cancel the in-app navigation, and route it to `NSWorkspace.shared.open(url)` so it opens in the user's default system browser — this requires no new `WKUIDelegate` assignment, just extending the existing navigation-policy delegate method already wired up.

**Alternatives considered**: Assigning a `WKUIDelegate` and implementing `createWebViewWith` to spawn a second `WKWebView`/window — rejected; the product's own design intent (a thin native wrapper around the local app, per Constitution Principle I) is for genuinely external sites to leave the app, not be embedded in a second in-app browser window.

## Summary — all NEEDS CLARIFICATION resolved

No unresolved unknowns remain. Both fixes use only dependencies/APIs already present in the codebase (`jszip`, `fast-xml-parser`, `IntersectionObserver`, `WKNavigationDelegate`, `NSWorkspace`); no new third-party packages required.
