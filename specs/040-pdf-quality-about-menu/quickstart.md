# Quickstart: Validate PDF Preview Sharpness & macOS About Menu

## Prerequisites

- Repository checked out on branch `040-pdf-quality-about-menu`
- `npm install` run at repo root (and in `ui/` if it has its own lockfile step)
- A Retina/HiDPI Mac display (or a display scaled >100%) available for the sharpness check
- For the About menu check: Xcode + the `native/macos/GitLocal` project, or a Homebrew-cask-built `GitLocal.app`

## 1. Validate PDF preview sharpness

1. `npm run build && npm test` — confirm the existing `PdfViewer.test.tsx` suite still passes after the rendering change (see [contracts/pdf-viewer-render-contract.md](contracts/pdf-viewer-render-contract.md)).
2. Start the app (`npm start` or the project's existing dev/run flow) against a repo containing a PDF file (e.g., `ui/src/test-fixtures/sample.pdf`).
3. Open that PDF in the preview panel on a Retina/HiDPI display.
4. Visually compare against opening the same file in macOS Preview.app at an equivalent zoom — text and line art should look equally sharp, with no soft/blurry edges (SC-001).
5. Zoom in within the browser (Cmd/Ctrl +) and confirm the canvas content stays sharp rather than pixelating (Acceptance Scenario 2).
6. Repeat on a standard-density display or with display scaling at 100% — confirm no visual regression and no noticeable added load delay for a typical (<20 page) document (SC-002, Acceptance Scenario 3).

**Expected outcome**: Sharp rendering on HiDPI displays at default zoom and after zooming in; unchanged quality/perf on standard-density displays.

## 2. Validate the "About GitLocal" menu item

1. Open `native/macos/GitLocal` in Xcode (or install the Homebrew cask build) and run/launch `GitLocal.app`.
2. Click the application menu (bearing the app's name, leftmost custom menu in the menu bar).
3. Confirm "About GitLocal" appears as the first item (see [contracts/about-menu-contract.md](contracts/about-menu-contract.md)).
4. Select it — confirm a panel appears showing the GitLocal app icon and the current version number.
5. Dismiss the panel (close button or Esc) — confirm the main GitLocal window and any open repository/terminal session are unaffected (Acceptance Scenario 3).

**Expected outcome**: Standard macOS About panel, correct icon and version, no side effects on dismissal (SC-003, SC-004).
