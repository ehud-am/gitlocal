# Phase 0 Research: PDF Preview Sharpness & macOS About Menu

## 1. Why PDF previews render blurry

**Decision**: Scale the PDF.js render viewport (and the canvas backing-store size) by `window.devicePixelRatio`, while keeping the canvas's CSS width/height at the original layout size, then let the browser downscale for display.

**Rationale**: `PdfViewer.tsx` currently calls `page.getViewport({ scale: 1.5 })` and sets `canvas.width`/`canvas.height` directly from that viewport — a fixed logical-pixel size with no awareness of the display's device pixel ratio. On a 2x Retina display, the canvas backing store ends up under-sampled by 2x relative to the physical pixels the browser must stretch it across, which is the standard cause of "fuzzy canvas" rendering on HiDPI screens. This is the same class of bug covered by the well-established `<canvas>` HiDPI pattern: render at `cssSize * devicePixelRatio`, then constrain the element's CSS size back down.

**Alternatives considered**:
- *Re-render at higher scale only on zoom*: rejected — the blur is visible even at the default zoom level on Retina displays, so the base render must already account for device pixel ratio, not just future zoom interactions.
- *Switch to SVG or text-layer rendering instead of canvas*: rejected as out of scope — much larger change, no license/availability issue with the current canvas approach, and the existing architecture (spec 036) already committed to canvas-based rendering with zero `ContentPanel` changes; a resolution fix should preserve that.
- *Always render at a very high fixed scale (e.g., 4x) regardless of display*: rejected — wastes memory/CPU on standard-density displays and does not adapt if the user zooms further; device-pixel-ratio-aware scaling is the standard-practice fix and keeps cost proportional to actual display fidelity.

## 2. Interaction with existing zoom behavior

**Decision**: Preserve the existing `scale: 1.5` as the logical/CSS-facing zoom baseline; multiply only the *rendered* viewport passed to `page.render()` by `devicePixelRatio`, and set the canvas element's CSS `width`/`height` (via style or the existing layout) to the unscaled logical viewport dimensions so on-page layout is unchanged.

**Rationale**: This keeps the visible size of the PDF page identical to today (no layout regression) while only increasing the backing-store resolution — the minimal, targeted fix matching FR-001/FR-002/FR-004 without touching zoom-range semantics or introducing new UI controls.

**Alternatives considered**: Introducing a new user-facing zoom control — rejected, out of scope (spec doesn't request new zoom UI, only sharper rendering at existing zoom behavior).

## 3. Performance/memory tradeoff on large documents

**Decision**: Accept the standard 2x–3x (device pixel ratio dependent) memory/CPU cost per page canvas, consistent with how every other Retina-aware canvas-based PDF renderer behaves; no additional caching or downsampling strategy is introduced.

**Rationale**: `PdfViewer.tsx` already renders pages progressively, one at a time, in page order (`no-await-in-loop` pages sequentially) and destroys the loading task on unmount/content change — this progressive, cancellable rendering already bounds worst-case memory/CPU exposure for large documents. Device-pixel-ratio scaling increases per-page canvas memory but does not change this existing bounding behavior, so FR-003 (no user-noticeable regression) is satisfied without new work.

**Alternatives considered**: Capping the effective device pixel ratio (e.g., clamp to 2x max) for very large documents — considered but deferred; not required by the spec's success criteria, and can be added later if real-world testing on large PDFs shows a regression.

## 4. Native macOS "About GitLocal" menu item

**Decision**: Add a standard `NSMenuItem` titled "About GitLocal" to the existing app menu in `AppDelegate.installMainMenu(for:)`, wired to the built-in `NSApplication.orderFrontStandardAboutPanel(_:)` action (target `nil`, so it resolves through the responder chain to `NSApp`), placed as the first item in the app menu (standard macOS convention: About is first, above other app-menu items).

**Rationale**: `orderFrontStandardAboutPanel` is the platform-standard "About" panel that AppKit ships for free — it automatically displays the app icon (from the bundle's `CFBundleIconFile`/asset catalog) and version information (from `CFBundleShortVersionString`/`CFBundleVersion` in `Info.plist`) with zero custom UI code, matching "like many native apps do" from the request and requiring no new dependency, custom window, or extra maintenance surface. This keeps the native wrapper thin per constitution Principle I (macOS wrapper "MUST remain a thin shell").

**Alternatives considered**:
- *Custom About window/view*: rejected — unnecessary custom UI and maintenance burden when the OS-provided panel already satisfies FR-006/FR-007 exactly; conflicts with "thin shell" wrapper principle.
- *Showing version in a corner of the main window instead of a menu*: rejected — the user explicitly asked for a Mac menu option matching platform convention, not an in-window indicator.

## 5. Where the version number comes from

**Decision**: Rely on the native app's existing `Info.plist` `CFBundleShortVersionString`, which the macOS packaging pipeline already sets from the release version (per constitution Principle VIII, each release branch updates `package.json` version metadata; the macOS packaging step propagates that same version into the app bundle's Info.plist). No new version-tracking mechanism is introduced.

**Rationale**: Reusing the existing single source of truth avoids version drift between the npm package and the native app, and matches the assumption already recorded in the spec that "no new version scheme" is introduced.

**Alternatives considered**: Reading version from the running local server's `/api/info` response instead of `Info.plist` — rejected, adds an unnecessary runtime dependency/network round-trip for a static, build-time-known value that AppKit's standard panel already reads directly from the bundle.
