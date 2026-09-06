# Phase 1 Data Model: PDF Preview Sharpness & macOS About Menu

This feature introduces no persisted data, database entities, or API payloads. Both changes are
rendering/UI behavior adjustments. The two conceptual entities from the spec are captured here for
completeness, not because they require new data structures.

## PDF Render Configuration (in-memory, per render pass)

Not persisted; exists only for the duration of a single `PdfViewer` render effect run.

| Field | Type | Description |
|---|---|---|
| `devicePixelRatio` | number | Read from `window.devicePixelRatio` at render time; drives the backing-store scale factor. |
| `logicalViewport` | `PageViewport` (pdfjs-dist) | Existing viewport at the current logical scale (unchanged `1.5` baseline). |
| `renderViewport` | `PageViewport` (pdfjs-dist) | `logicalViewport` scaled by `devicePixelRatio`; used only for `canvas.width`/`canvas.height` and `page.render()`. |

**Validation rules**: `devicePixelRatio` MUST fall back to `1` if unavailable (e.g., non-browser test environment) so existing unit tests and non-DOM render paths keep working unchanged.

**State transitions**: None — recomputed fresh on every render effect invocation (per page, per content change), matching existing `PdfViewer.tsx` lifecycle.

## About Panel (native macOS, no custom state)

Not a custom data entity — delegated entirely to AppKit's built-in `NSApplication.orderFrontStandardAboutPanel(_:)`, which reads directly from the app bundle (`Info.plist` + icon asset) at invocation time. GitLocal introduces no new struct, model, or stored state for this panel.

| Field (sourced from bundle, not GitLocal code) | Description |
|---|---|
| App icon | From the bundle's existing icon asset, already used for Dock/Finder. |
| `CFBundleShortVersionString` | Existing release version already set by the macOS packaging pipeline. |

**Validation rules**: N/A — AppKit guarantees a well-formed panel as long as the bundle has icon and version metadata, which it already must have to be a valid, signed macOS app bundle.
