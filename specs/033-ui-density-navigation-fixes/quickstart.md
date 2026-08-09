# Quickstart: UI Density & Navigation Fixes

Manual verification steps once the feature is implemented, covering each user story in `spec.md`. This feature is UI-only, so verification is visual/interactive — there's no new API surface or data setup.

## Setup

```sh
npm install
npm run dev:server   # starts the Hono server against a local repo path
npm run dev:ui        # starts the Vite dev server
```

Open the app in a browser, browse into a local repository that has at least 3-4 tags set, and keep the browser dev tools handy for resizing the viewport.

## US1 — Repository block fits on smaller displays without clipping

1. At a full-width (e.g. 1920px) window, open a repository with several tags — confirm line 1 shows the repo name (left) and search + branch selection (right); line 2 shows tags (left) and root/readme (right).
2. Narrow the window to a typical laptop width (~1280px) — confirm the repo name still renders in full, never clipped or overlapped by tags.
3. Compare the block's overall height to the pre-change layout — confirm it reads as visibly denser (smaller margins/padding) while everything stays legible and clickable.
4. Open a repository with zero tags — confirm line 2 doesn't leave obvious empty space where tags would be.

## US2 — Parent Folder navigation always reachable from the top toolbar

1. From the folder view, confirm a Parent Folder control appears in the top toolbar (not just the repository block).
2. Navigate into the git view and the file view — confirm the control is present in the same toolbar location on both.
3. Navigate to a root with no parent — confirm the control is disabled (not hidden) in the toolbar.
4. Activate the control from a non-root folder — confirm it navigates up one level, matching prior behavior.
5. Confirm the Parent Folder control no longer appears inside the repository block (not duplicated).

## US3 — Toolbar buttons communicate priority through color

1. View the top toolbar — confirm Refresh reads as plain/low-emphasis (gray) compared to its previous styling.
2. Confirm Terminal and the relocated Parent Folder both use the existing secondary button treatment, visually distinct from Refresh.
3. Tab through the toolbar with the keyboard — confirm focus rings and hover states still work correctly on all three buttons.

## US4 — Denser, single-layer current folder view

1. Open a folder with 10+ entries — confirm rows are visibly tighter (less vertical whitespace) than before.
2. Inspect the DOM/visual borders around the listing — confirm there is exactly one bordered/background container, not a nested block-in-block.
3. Confirm all row content is still fully readable and click targets are still easy to hit at the new density.

## US5 — Terminal panel expand control always reachable

1. Open the terminal panel, then collapse it.
2. Resize the browser window to a short height (e.g. simulate a small laptop or zoom in to 150%) — confirm the expand control stays visible without scrolling the page.
3. Repeat at a very wide-but-short window — confirm the same holds.
4. Click the expand control — confirm the panel returns to its prior expanded height.

## US6 — Terminal text is appropriately sized

1. Open the terminal panel — confirm the rendered text is visibly smaller than the previous default.
2. Compare the number of visible scrollback lines at a fixed panel height before/after — confirm more lines are visible after the change.
3. Drag-resize the terminal panel — confirm text reflows cleanly with no clipped or overlapping glyphs at the new font size.

## Accessibility check (all stories)

Run the existing `jest-axe` suites for `App`, `RepoContextHeader`, `ContentPanel`, and `TerminalPanel`/`TerminalView` — confirm no new violations. Manually tab through the toolbar and repository block to confirm focus order still makes sense after the Parent Folder relocation and the repository block's row restructuring.
