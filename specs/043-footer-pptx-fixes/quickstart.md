# Quickstart: Validating Footer Link Pattern & PPTX Preview Fidelity

## Prerequisites

- Repo installed: `npm install` at repo root.
- For the native macOS check: Xcode installed and able to build `native/macos/GitLocal` (see `packaging/macos/` for the existing build workflow); a Homebrew-cask-equivalent local build is sufficient, no cask packaging needed for validation.

## 1. Footer links — npm/browser distribution

```bash
npm run build
npm start
```

1. Open the printed local URL in a regular browser tab.
2. Confirm the footer shows a GitHub-mark-labeled link and a globe/site-labeled link for gitlocal.dev, styled compactly and muted (not competing visually with the main content).
3. Click the GitHub link → a new tab opens to `https://github.com/ehud-am/gitlocal`; the original GitLocal tab is untouched.
4. Click the gitlocal.dev link → a new tab opens to `https://gitlocal.dev`.
5. Tab to each link with keyboard only and confirm a visible focus outline.
6. Resize the browser window to a narrow (mobile) width and confirm the footer doesn't overlap or truncate.

**Expected outcome**: Both links open correctly in new tabs; footer reads clearly as "GitHub + website" at a glance; no layout breakage at narrow widths. (SC-001, SC-005)

## 2. Footer links — native macOS distribution

1. Build and launch the native macOS app pointed at a local repo (existing `native/macos/` build workflow).
2. Click the GitHub footer link inside the native app window.
3. Click the gitlocal.dev footer link inside the native app window.

**Expected outcome**: Each click opens the destination in the Mac's default system browser (a separate app), while the native GitLocal window stays open on the current view. Previously, clicking did nothing. (SC-001)

## 3. PPTX preview — layout/master inheritance

1. Obtain or construct a `.pptx` deck that uses PowerPoint's slide master/layout system with inherited (not directly overridden) placeholder text, a layout- or master-level background, and at least two different layouts in use across the deck. (New fixtures for this are added under `ui/src/test-fixtures/` as part of implementation — see tasks.md once generated.)
3. Open that file in GitLocal (browser or native) and let the preview render.

**Expected outcome**:
- Title/body text that's only defined via layout placeholder inheritance is visible, at the position/size the layout specifies (not blank, not at position 0,0). (SC-002, FR-006)
- A slide whose background comes only from its layout or master shows that background, not white. (SC-002, FR-006)
- Two slides using different layouts from the same master show their own layout's formatting, not one hardcoded look. (FR-006, FR-006 acceptance scenario 3)
- A slide that overrides a layout-inherited placeholder's position still shows its own override, not the layout's position. (FR-007)

## 4. PPTX preview — scroll navigation

1. Open a multi-slide `.pptx` file (using an existing fixture such as `variants.pptx`, or a larger one for the responsiveness check).
2. Scroll down through the preview panel.

**Expected outcome**:
- All slides are visible in order by scrolling alone; there is no "Next"/"Previous" button requirement to advance. (SC-003, FR-009)
- A "Slide N of M" (or equivalent) indicator updates to reflect the slide currently in view while scrolling. (FR-010)
- A slide with speaker notes still exposes its notes inline as you scroll to it. (FR-011)
- For a larger deck (50+ slides, e.g. a synthetically generated fixture or a real-world sample), scrolling through the whole deck stays smooth — no visible freeze. (SC-004, FR-013)

## 5. Automated checks

```bash
npm run lint
npm test
```

**Expected outcome**: Type check passes; `AppFooter.tsx` and `PptxViewer.tsx` (and any new test-fixture-backed cases) pass with ≥90% per-file branch coverage maintained, per Constitution Principle II. Confirm both files remain listed in `ui/vitest.config.ts`'s coverage `include` (previously a gap fixed in spec 042/038 — verify it wasn't reintroduced).
