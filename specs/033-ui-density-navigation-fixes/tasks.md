# Tasks: UI Density & Navigation Fixes

**Input**: Design documents from `specs/033-ui-density-navigation-fixes/`
**Prerequisites**: plan.md, spec.md

**Tests**: Included — per Constitution Principle II (NON-NEGOTIABLE ≥90% per-file branch coverage), existing component test suites are updated alongside their markup/style changes rather than treated as optional.

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and shipped independently. There is no Foundational phase — this feature adds no shared infrastructure; every story is a self-contained change to existing components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)

## Path Conventions

Existing single-repo web app layout. All paths below are under `ui/src/`.

---

## Phase 1: User Story 1 - Repository block fits on smaller displays without clipping (Priority: P1) 🎯 MVP

**Goal**: Restructure the repository block into two rows (name+search/branch on row 1, tags+root/readme on row 2) so the repo name never clips, and tighten its spacing.

**Independent Test**: Per quickstart.md US1 — narrow the viewport with a multi-tag repo open and confirm the name stays fully visible with tags on their own row.

### Tests for User Story 1

- [x] T001 [P] [US1] Update `ui/src/components/RepoContext/RepoContextHeader.test.tsx` to assert the two-row grouping (name+search/branch in row 1; tags+root/readme in row 2) and that the repo name node has no truncating/clipping class at narrow widths.

### Implementation for User Story 1

- [x] T002 [US1] Restructure `ui/src/components/RepoContext/RepoContextHeader.tsx` (currently a single `flex-col xl:flex-row` row at lines 161-169) into two explicit row containers: row 1 = name (left) + search trigger and branch selector (right); row 2 = tags (left) + root and readme controls (right, moved out of row 1).
- [x] T003 [US1] Reduce `.repo-context-header`'s vertical spacing in `ui/src/styles/globals.css` (currently `gap-3 px-5 py-4` inline in the component and related rules around line 162) — tighten `gap`/`py` values for a denser block.
- [x] T004 [US1] Reduce the root/readme controls' size (smaller `Button` `size` prop or dedicated compact styling) now that they sit on their own row.
- [x] T005 [US1] Handle the zero-tags case so row 2's left side collapses rather than leaving visible empty space (edge case from spec.md).

**Checkpoint**: Repository block renders as two dense rows; repo name never clips at any supported width.

---

## Phase 2: User Story 2 - Parent Folder navigation always reachable from the top toolbar (Priority: P1)

**Goal**: Move the Parent Folder control from the repository block to the persistent top toolbar.

**Independent Test**: Per quickstart.md US2 — confirm the control is present in the toolbar on every content type, disabled at root, and no longer duplicated in the repository block.

**Depends on**: Nothing from US1, but touches `RepoContextHeader.tsx` (removing the control US1 leaves in place) and should land after T002 to avoid rebasing the row restructuring around a control that's about to move.

### Tests for User Story 2

- [x] T006 [P] [US2] Update `ui/src/App.test.tsx` to assert a Parent Folder control renders in the top toolbar, is disabled with no parent, and navigates correctly when activated.
- [x] T007 [P] [US2] Update `ui/src/components/RepoContext/RepoContextHeader.test.tsx` to assert the Parent Folder control (previously at lines 187-216) is no longer rendered there.

### Implementation for User Story 2

- [x] T008 [US2] Add the Parent Folder control (icon-only responsive pattern, matching the existing `xl:hidden` / `hidden xl:inline-flex` pair) to the top toolbar in `ui/src/App.tsx` (alongside the Terminal/Refresh buttons around lines 1178-1200), wired to the same `onNavigateParent` / `parentFolderEnabled` state already driving the removed control.
- [x] T009 [US2] Remove the Parent Folder `Button` pair from `ui/src/components/RepoContext/RepoContextHeader.tsx` (lines 187-216) and drop the now-unused `onNavigateParent`/`parentFolderEnabled` props from its interface if nothing else in the component uses them.
- [x] T010 [US2] Confirm disabled/enabled behavior and aria-label/title text carry over unchanged to the relocated control (FR-007, FR-015).

**Checkpoint**: Parent Folder is reachable from the top toolbar on every page, disabled correctly at root, and no longer present in the repository block.

---

## Phase 3: User Story 5 - Terminal panel expand control always reachable (Priority: P1)

**Goal**: Ensure the collapsed terminal panel's expand control never falls outside the viewport.

**Independent Test**: Per quickstart.md US5 — collapse the panel at short window heights and confirm the control stays visible without scrolling.

**Independent of US1/US2** — different component (`TerminalPanel.tsx`), can be done in parallel.

### Tests for User Story 5

- [x] T011 [P] [US5] Update `ui/src/components/TerminalPanel/TerminalPanel.test.tsx` to assert the collapsed panel's expand control renders within a viewport-constrained container (e.g. asserting a `position`/layout property or a regression test against the specific bug's root cause once identified).

### Implementation for User Story 5

- [x] T012 [US5] Diagnose why the collapsed-state expand control (currently the plain in-flow button in `ui/src/components/TerminalPanel/TerminalPanel.tsx` lines 191-253, with no `position: fixed/sticky`) can end up below the fold — likely interaction with the `app-body`/`AppFooter` flex layout in `ui/src/App.tsx` (around line 1424) at short viewport heights.
- [x] T013 [US5] Fix the collapsed panel's positioning (e.g. anchor the 32px collapsed bar so it's always within the flex layout's visible region, independent of sibling content height) so the expand control never requires scrolling to reach.

**Checkpoint**: Collapsed terminal panel's expand control is always reachable, at any tested window size.

---

## Phase 4: User Story 3 - Top toolbar buttons communicate priority through color (Priority: P2)

**Goal**: Restyle Refresh as plain/gray and keep Terminal + the relocated Parent Folder as secondary.

**Independent Test**: Per quickstart.md US3 — visually confirm Refresh is lower-emphasis than Terminal/Parent Folder.

**Depends on**: US2 (T008) — Parent Folder must already be in the toolbar before its styling can be addressed here.

### Tests for User Story 3

- [x] T014 [P] [US3] Update `ui/src/App.test.tsx` to assert the Refresh button uses the plain/gray variant and Terminal + Parent Folder use the secondary variant (via `Button`'s `variant` prop, not one-off classNames).

### Implementation for User Story 3

- [x] T015 [US3] Change the Refresh button's `variant` prop in `ui/src/App.tsx` (lines ~1189-1197) from `secondary` to the existing plain/low-emphasis variant (`ghost`, per `ui/src/components/ui/button.tsx` lines 6-30), or add a new low-emphasis variant to `button.tsx` only if none of the existing ones fit — reuse first.
- [x] T016 [US3] Confirm the Terminal button and the relocated Parent Folder button (from T008) keep `variant="secondary"`.

**Checkpoint**: Toolbar buttons are visually differentiated by priority using the existing variant system.

---

## Phase 5: User Story 4 - Denser, single-layer current folder view (Priority: P2)

**Goal**: Tighten row/section spacing in the folder listing and collapse its redundant nested container.

**Independent Test**: Per quickstart.md US4 — confirm tighter row spacing and a single bordered container around the listing.

**Independent of all other stories** — different component (`ContentPanel.tsx`).

### Tests for User Story 4

- [x] T017 [P] [US4] Update `ui/src/components/ContentPanel/ContentPanel.test.tsx` to assert the listing renders inside a single container element (no nested wrapper carrying its own border/background) and that row-spacing classes reflect the tightened values.

### Implementation for User Story 4

- [x] T018 [US4] Identify the redundant nested container around the directory listing in `ui/src/components/ContentPanel/ContentPanel.tsx` (`.content-panel-selection-root` wrapping `.content-directory-panel`, lines 683-746) and collapse it to a single element, moving whichever behavior (selection root ref, aria-label) is actually load-bearing onto the remaining element.
- [x] T019 [US4] Reduce spacing values for `.content-directory-panel` (padding, currently `1rem`) and `.content-directory-table-wrap` (margin-top, currently `0.5rem`) in `ui/src/styles/globals.css` (lines ~1148-1155, ~1433) for a denser layout.
- [x] T020 [US4] Verify row click targets and text legibility are unaffected at the new density (FR-010 constraint).

**Checkpoint**: Folder view is denser with a single visible container around the listing.

---

## Phase 6: User Story 6 - Terminal text is appropriately sized (Priority: P3)

**Goal**: Reduce the xterm.js terminal font size.

**Independent Test**: Per quickstart.md US6 — confirm smaller rendered text and more visible scrollback lines at a fixed panel height.

**Independent of all other stories** — different component (`TerminalView.tsx`).

### Tests for User Story 6

- [~] T021 [P] [US6] ~~Update `ui/src/components/TerminalPanel/TerminalView.test.tsx`~~ — no such file exists; skipped by design. `vitest.config.ts` already excludes `TerminalView.tsx` from the coverage gate (xterm/WebSocket aren't meaningfully assertable in jsdom), relying instead on `TerminalPanel.test.tsx`'s mocked `TerminalView` and the server-side `tests/integration/terminal.test.ts`. Adding a new xterm-constructor-mocking test file for a one-line `fontSize` change would contradict that established convention.

### Implementation for User Story 6

- [x] T022 [US6] Add a `fontSize` option to the `Terminal` constructor in `ui/src/components/TerminalPanel/TerminalView.tsx` (line 39-42, currently `{ convertEol: true, cursorBlink: true }`), reduced by roughly 2px from the current effective default.
- [x] T023 [US6] Confirm `FitAddon`'s fit-to-container behavior still reflows correctly at the new font size on panel resize (FR-013) — verify no clipped/overlapping glyphs.

**Checkpoint**: Terminal renders smaller text with more visible scrollback, and resize/fit behavior is unaffected.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all six stories together.

- [x] T024 [P] Run the full `jest-axe` suites for `App`, `RepoContextHeader`, `ContentPanel`, and `TerminalPanel`/`TerminalView` — confirm zero new accessibility violations (FR-015).
- [ ] T025 Walk through `quickstart.md` end-to-end manually in a real browser at multiple viewport widths. **Not done** — requires a live browser, not available in this environment. Needs a manual pass before/at release.
- [x] T026 Run `npm run lint`, `npm test`, and `npm run build` and confirm coverage stays at or above the enforced per-file branch threshold.

---

## Dependencies & Execution Order

### Phase Dependencies

- No Foundational phase — all six stories can start immediately, subject only to the intra-story ordering below.
- **US3 (Phase 4)** depends on **US2 (Phase 2)**: the Parent Folder control must already be in the toolbar (T008) before its color/variant can be set (T016).
- **US1 (Phase 1)** and **US2 (Phase 2)** both touch `RepoContextHeader.tsx`; do US1's row restructuring (T002) before US2 removes the Parent Folder control (T009) to avoid rebasing one change around the other.
- US4, US5, US6 touch entirely different files (`ContentPanel.tsx`, `TerminalPanel.tsx`, `TerminalView.tsx` respectively) and have no dependency on any other story.
- **Polish (Phase 7)** depends on all six stories being complete.

### Parallel Opportunities

- All `[P]`-marked test tasks (T001, T006, T007, T011, T014, T017, T021) can be written in parallel — different files, no shared state.
- US4, US5, US6 (Phases 5, 6, 3) can be implemented in parallel with each other and with the US1→US2→US3 chain, since they touch disjoint files.
- T024 (accessibility suites) can run in parallel with T025 (manual quickstart walkthrough).

---

## Implementation Strategy

### MVP First

The three P1 stories (US1 repository block, US2 Parent Folder relocation, US5 terminal expand-button fix) are the minimum viable slice — they fix the one clipping bug and one functional bug in the request. P2/P3 stories (US3 button coloring, US4 folder density, US6 terminal font) are pure polish and can ship in the same release or be deferred without blocking the P1 fixes.

### Incremental Delivery

1. Ship US1 + US2 + US5 (P1) first if time-constrained — each is independently testable and delivers real value alone.
2. Add US3 (depends on US2) and US4 (independent).
3. Add US6 (independent, lowest risk) last.
4. Run Phase 7 polish once all desired stories are in.

## Notes

- This is a UI-only release; no server-side (`src/`, `tests/`) changes are in scope.
- Whether this ships as `0.10.1` or another version is a release-time decision (Constitution Principle VIII), not part of these tasks.
