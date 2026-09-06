# Contract: PdfViewer Render Behavior

**Component**: `ui/src/components/ContentPanel/PdfViewer.tsx`
**Type**: Internal UI rendering contract (no network/API surface)

## Inputs (unchanged)

- `content: string` — base64-encoded PDF file bytes, as today.

## Rendering contract (new)

1. For each page rendered, the canvas backing-store size (`canvas.width` / `canvas.height`) MUST equal the page's PDF.js viewport size at the existing logical scale (`1.5`) multiplied by the effective device pixel ratio at render time.
2. The canvas's on-page layout size (as observed via its CSS box) MUST remain equal to the existing logical-scale viewport size — i.e., this change MUST NOT alter how large the page appears on screen.
3. `page.render()` MUST be called with a viewport matching the scaled (device-pixel-ratio-aware) backing-store size, so rendered content is sharp at that backing-store resolution.
4. If `window.devicePixelRatio` is unavailable or not a positive finite number, the effective device pixel ratio MUST default to `1` (behavior identical to pre-fix rendering).
5. Existing behaviors are unchanged: progressive per-page rendering in order, cancellation/`destroy()` on unmount or `content` change, and the existing password-protected/unrenderable error messaging.

## Non-goals

- No new props, no new user-facing zoom controls, no change to the `editable: false` preview-registry contract from spec 036.
