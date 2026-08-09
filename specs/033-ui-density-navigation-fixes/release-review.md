# Release Review: UI Density & Navigation Fixes

**Release**: 0.10.1
**Date**: 2026-08-09
**Branch**: `033-ui-density-navigation-fixes`

## Scope Reviewed

- Repository block restructured into two lines (name/search/branch on line 1, tags/root/readme on line 2) to stop the repo name clipping on narrower windows.
- "Parent Folder" control moved out of the repository block into the persistent top toolbar.
- Top toolbar restyled and reordered to Parent Folder, Refresh, Terminal, Theme (most page-specific to most global), with Refresh/Parent Folder as plain/low-emphasis controls and Terminal using a new soft-green `highlight` button variant.
- Denser row spacing in the current folder view (git repository and local folder browsing), with a redundant nested container removed.
- Terminal panel: fixed collapsed-state expand button falling outside the viewport, reduced default font size, and corrected the collapse/expand chevron to point toward where the panel will move.
- Added an "X" close-file button to the file view, returning to the file's containing folder, gated by the existing unsaved-edit discard confirmation.

## Contrarian QA Findings

A dedicated contrarian QA sub-agent reviewed the full diff against base commit `d8fb2e0` across bugs, performance, security, accessibility, dead code, and implementation inefficiencies, and cross-checked it against the corresponding tests.

- **Bugs**: No blocking issues found. Traced the close-file button through root-level and deeply nested path edge cases, the unsaved-edit discard guard, and the Parent Folder toolbar relocation — all correct and covered by tests.
- **Performance**: No regressions. No new work added to render hot paths; the terminal font-size change is a one-time constructor option, not per-render.
- **Security**: No issues found. No new dynamic content reaches `innerHTML`/`dangerouslySetInnerHTML`; new icons are static inline SVGs; path handling reuses existing plumbing.
- **Accessibility**: One blocking issue found and fixed during this review — the new `highlight` button variant's soft-green background failed WCAG AA text contrast in light theme (4.43:1 resting, 3.97:1 hover, against a 4.5:1 requirement for normal-size text). Fixed by reducing the `color-mix` tint from 10%/18% to 5%/8%, which now measures 4.77:1 resting and 4.57:1 hover in light theme (6.34:1 / 6.02:1 in dark theme), verified against the actual `--success`/`--card` custom property values. Close-file button has an accurate aria-label/title, is keyboard-reachable, and is covered by existing `axe()` accessibility assertions in both the no-file and file-view states. Toolbar tab order after reordering is logical (page-specific → global) and explicitly asserted by a new test. One pre-existing, non-blocking nit noted: the `panel-icon-button` CSS class (used by the new close button and the pre-existing kebab menu trigger) has no matching style rules and relies on default focus styling rather than the project's explicit `:focus-visible` rules — predates this branch, not a regression, worth a follow-up.
- **Dead code**: None found. The old in-header `ParentFolderIcon` and its call site were fully removed; `tsc --noEmit` ran clean with no unused-code diagnostics.
- **Implementation inefficiencies**: One pre-existing, non-blocking nit noted: `parentPathOf` is independently defined in both `ContentPanel.tsx` and `App.tsx` (present before this branch); the new close-button code correctly reuses the existing local copy rather than adding a third. Not a new inefficiency introduced by this branch.

## README Review

README was reviewed for release impact. No README changes are required — these are in-app UI/UX refinements (spacing, button styling, navigation controls) with no change to install, launch, packaging, or documented workflow instructions.

## Validation

- `npx vitest run src/App.test.tsx src/components/ContentPanel/ContentPanel.test.tsx src/components/TerminalPanel/TerminalPanel.test.tsx src/components/RepoContext/RepoContextHeader.test.tsx src/components/ui/button.test.tsx` — 167/167 passed (contrarian QA pass, pre-fix)
- `npx vitest run src/App.test.tsx src/components/ui/button.test.tsx` — 52/52 passed (post-fix re-check of the contrast fix)
- `npm run test:ui` — 426/426 passed, all files at or above the ≥90% branch coverage gate
- `npm run test:server` — 430/431 passed; the 1 failure (`tests/integration/terminal.test.ts`) is an environment-specific sandbox issue (proxy/TLS interference with local `fetch`, `HPE_INVALID_CONSTANT`) in a file this branch does not touch, reproduced identically on a clean base checkout
- `npm run lint` — clean (`tsc --noEmit`)
- `npm run build` — succeeded (server + UI bundles)
- `npm run audit` / `npm run audit:ui` — 0 vulnerabilities in both the root and UI package

## Residual Risk

- `panel-icon-button` has no CSS rules of its own (pre-existing gap, not introduced by this branch) — flagged as a follow-up for a future focus-ring/visual-polish pass, not a release blocker.
- The two independent `parentPathOf` implementations (`ContentPanel.tsx`, `App.tsx`) are a minor, pre-existing duplication that could be consolidated into a shared util in a future cleanup, not required for this release.
