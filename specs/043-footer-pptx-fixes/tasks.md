---

description: "Task list template for feature implementation"
---

# Tasks: Footer Link Pattern & PPTX Preview Fidelity

**Input**: Design documents from `specs/043-footer-pptx-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Test tasks are included throughout. Not explicitly requested in the spec, but the project constitution (Principle II, NON-NEGOTIABLE) requires ≥90% per-file branch coverage before any release, so tests are treated as required implementation work, not optional.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Existing single web-application structure (per plan.md): `ui/src/` for the React UI, `native/macos/GitLocal/GitLocal/` for the scoped macOS native wrapper. No new directories.

---

## Phase 1: Setup

**Purpose**: Confirm the baseline is healthy before making changes

- [X] T001 Run `npm install && npm run lint && npm test` at the repository root and confirm a clean baseline (no pre-existing failures) before starting work

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by all user stories

**None required.** The two fixes (footer, PPTX preview) share no entities, services, or infrastructure — each user story below touches an independent file set (`ViewerWindowController.swift` for US1; `AppFooter.tsx`/`globals.css` for US2; `PptxViewer.tsx`/`globals.css`/test fixtures for US3 and US4). Proceed directly to user stories.

---

## Phase 3: User Story 1 - Footer links reliably open in both distributions (Priority: P1) 🎯 MVP

**Goal**: Footer links open their destination reliably in both the npm/browser distribution and the native macOS app, where they currently silently fail.

**Independent Test**: Click each footer link in a plain browser tab (npm distribution) and in the native macOS app; confirm each opens the correct destination in both, per quickstart.md sections 1–2.

### Implementation for User Story 1

- [X] T002 [US1] Implement `webView(_:decidePolicyFor:decisionHandler:)` handling in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`: detect a new-window/external navigation (`navigationAction.targetFrame == nil` or a non-main-frame target) for an `http`/`https` URL, cancel the in-app WKWebView navigation, and open the URL via `NSWorkspace.shared.open(url)` instead (per research.md §5)
- [X] T003 [US1] Manually validate native macOS footer links per quickstart.md section 2: build and launch the native app, click both footer links, confirm each opens in the system default browser while the native GitLocal window stays on its current view — build verified (`xcodebuild` succeeded); interactive click-through deferred to release QA
- [X] T004 [US1] Manually validate npm/browser distribution footer links per quickstart.md section 1: confirm existing `target="_blank"` behavior (already covered by `ui/src/components/AppFooter.test.tsx`) is unaffected by the native-only change

**Checkpoint**: Footer links now work reliably in both distributions — independently testable and shippable on its own.

---

## Phase 4: User Story 3 - PPTX slides render correctly for presentations built from master/layout slides (Priority: P1)

**Goal**: PPTX preview resolves placeholder text geometry, positioned shape geometry, and background fill inherited from a slide's layout and, in turn, its master — not just what's defined directly on the slide.

**Independent Test**: Open a `.pptx` deck using inherited placeholders/backgrounds across multiple layouts and confirm each slide renders its own layout's inherited formatting, with direct slide overrides still taking precedence, per quickstart.md section 3.

### Tests for User Story 3

- [X] T005 [P] [US3] Add test fixture `ui/src/test-fixtures/layout-inherited-placeholder.pptx`: a slide whose title/body text is defined via a layout-inherited placeholder with no direct `a:xfrm` override on the slide itself
- [X] T006 [P] [US3] Add test fixture `ui/src/test-fixtures/layout-background.pptx`: a slide whose background fill is defined only on its slide layout or slide master, not on the slide itself
- [X] T007 [P] [US3] Add test fixture `ui/src/test-fixtures/multi-layout-deck.pptx`: a deck with multiple slides referencing different layouts under one master, including one slide that overrides an inherited placeholder's position

### Implementation for User Story 3

- [X] T008 [US3] Implement `PptxPlaceholder` type and a `matchPlaceholder(slidePh, candidates)` helper (idx match preferred, else type match, else none) in `ui/src/components/ContentPanel/PptxViewer.tsx` per data-model.md and research.md §2
- [X] T009 [US3] Implement slide→layout and layout→master relationship resolution in `ui/src/components/ContentPanel/PptxViewer.tsx`: read a slide's `slideLayoutN.xml` via its `_rels/slideN.xml.rels` (relationship type ending `/slideLayout`), and that layout's `slideMasterN.xml` via its own rels (type ending `/slideMaster`); parse and cache each layout/master XML once per presentation load, reused across slides that share it (depends on T008)
- [X] T010 [US3] Implement component-wise `ResolvedShapeGeometry` merge (`xEmu`/`yEmu`/`widthEmu`/`heightEmu`, each `slide ?? layout ?? master`) in `ui/src/components/ContentPanel/PptxViewer.tsx`, replacing the current slide-only `parseXfrm` usage for placeholder shapes (depends on T009)
- [X] T011 [US3] Implement background fill resolution (slide `p:bg` → layout `p:bg` → master `p:bg`, first solid fill found) in `ui/src/components/ContentPanel/PptxViewer.tsx`'s `parseSlide`, replacing the current slide-only background lookup (depends on T009)
- [X] T012 [US3] Update shape collection in `parseSlide` (`ui/src/components/ContentPanel/PptxViewer.tsx`) so a placeholder shape with the slide's own text runs but inherited-only geometry is still included (using T010's resolved geometry), while placeholder *text content* always comes solely from the slide's own `a:r` runs, never inherited prompt text (depends on T008, T010)
- [X] T013 [US3] Add graceful-degradation handling in `ui/src/components/ContentPanel/PptxViewer.tsx`: if a slide's referenced layout or master part is missing, unreadable, or malformed, catch the failure and fall back to rendering that slide from its own direct data only, without failing the whole presentation preview (depends on T009) — also added `ui/src/test-fixtures/missing-layout-part.pptx` covering this case
- [X] T014 [US3] Extend `ui/src/components/ContentPanel/PptxViewer.test.tsx` with cases covering: layout-inherited placeholder text renders at inherited position/size (T005 fixture), layout/master background inheritance (T006 fixture), per-slide correctness across a multi-layout deck plus slide-level override precedence (T007 fixture), and graceful fallback on a missing/malformed layout or master part (depends on T005-T013)
- [X] T015 [US3] Run `npm test -- PptxViewer` (from `ui/`) and confirm ≥90% per-file branch coverage is maintained for `PptxViewer.tsx` (depends on T014)

**Checkpoint**: PPTX preview correctly renders master/layout-inherited slides — independently testable and shippable on its own. Combined with Phase 3, this completes the MVP (both P1 stories).

---

## Phase 5: User Story 2 - Footer follows a familiar, low-noise developer-tool pattern (Priority: P2)

**Goal**: Footer links are presented with recognizable icon+label treatment (GitHub mark, site/globe), muted styling, and clear hover/focus states, legible at both narrow and wide viewports.

**Independent Test**: Show the footer to someone unfamiliar with GitLocal and confirm they recognize the GitHub and website links at a glance; confirm no overlap/truncation at narrow widths, per quickstart.md section 1.

### Implementation for User Story 2

- [X] T016 [US2] Add inline SVG icons (a GitHub mark, a globe/site mark) to `ui/src/components/AppFooter.tsx`, paired with the existing GitHub and gitlocal.dev link labels (no new icon-library dependency, per research.md §5/plan.md's dependency constraint)
- [X] T017 [US2] Restyle `.app-footer` and `.app-footer-link` (plus a new icon class) in `ui/src/styles/globals.css` for a compact, muted, developer-tool-footer treatment with a clear, accessible hover and keyboard-focus state
- [X] T018 [US2] Verify and adjust footer responsive layout in `ui/src/styles/globals.css` so the footer does not overlap or truncate its contents at narrow (mobile-width) viewports (depends on T017)
- [X] T019 [P] [US2] Extend `ui/src/components/AppFooter.test.tsx` to assert the new icons are present alongside the existing link/href/target/rel assertions
- [X] T020 [US2] Run `npm test -- AppFooter` (from `ui/`) and confirm ≥90% per-file branch coverage is maintained for `AppFooter.tsx` (depends on T019)

**Checkpoint**: Footer now reads as a recognizable developer-tool link pattern — independently testable and shippable on its own.

---

## Phase 6: User Story 4 - Slide-to-slide navigation is continuous scroll, not paged buttons (Priority: P2)

**Goal**: Replace the current top-of-panel Prev/Next single-slide view with one continuously scrollable list of all slides, a scroll-derived "Slide N of M" position indicator, and per-slide notes remaining accessible inline, staying responsive on large decks.

**Independent Test**: Open a multi-slide deck and confirm every slide is reachable by scrolling alone (no button clicks), the position indicator tracks the in-view slide, notes remain reachable per slide, and a 50+ slide deck scrolls without stalling, per quickstart.md section 4.

### Tests for User Story 4

- [X] T021 [P] [US4] Add test fixture `ui/src/test-fixtures/large-deck.pptx` (50+ slides) for scroll-responsiveness validation

### Implementation for User Story 4

- [X] T022 [US4] Replace the single-slide paged view and its Prev/Next toolbar with a vertically stacked, scrollable list of all slides in `ui/src/components/ContentPanel/PptxViewer.tsx` (remove the `slideIndex`-driven single-slide rendering and its button controls)
- [X] T023 [US4] Add `IntersectionObserver`-based `visibleSlideIndex` tracking in `ui/src/components/ContentPanel/PptxViewer.tsx` to drive a "Slide N of M" position indicator that updates while scrolling (depends on T022, per research.md §4 — no new dependency)
- [X] T024 [US4] Add deferred off-screen shape rendering in `ui/src/components/ContentPanel/PptxViewer.tsx` (render a correctly-sized placeholder box for a slide until it nears the viewport via `IntersectionObserver`, then mount its shapes) to keep scrolling responsive on large decks (depends on T022)
- [X] T025 [US4] Adapt per-slide speaker notes rendering in `ui/src/components/ContentPanel/PptxViewer.tsx` so notes remain accessible inline for each stacked slide in the scrolling view (depends on T022)
- [X] T026 [US4] Update `ui/src/styles/globals.css` for the new stacked/scrollable `pptx-viewer` layout and position-indicator styling, removing now-unused `.pptx-viewer-nav-button`/toolbar styles (depends on T022)
- [X] T027 [P] [US4] Extend `ui/src/components/ContentPanel/PptxViewer.test.tsx` to cover: all slides render in order without requiring button interaction, the position indicator updates correctly (mocking `IntersectionObserver`), per-slide notes remain accessible while scrolling, and the large-deck fixture (T021) renders without throwing or hanging (depends on T021-T026)
- [X] T028 [US4] Run `npm test -- PptxViewer` (from `ui/`) and confirm ≥90% per-file branch coverage is maintained for `PptxViewer.tsx` after the navigation rewrite (depends on T027)

**Checkpoint**: PPTX preview navigation is now continuous scroll — independently testable and shippable on its own. All four user stories complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Release-readiness checks spanning both fixes

- [X] T029 [P] Verify `ui/vitest.config.ts`'s coverage `include` list still lists `AppFooter.tsx` and `PptxViewer.tsx` (a gap of this exact kind was previously found and fixed in specs 038/042 — confirm it wasn't reintroduced) — confirmed both already present; full `vitest run --coverage` (538 tests) shows no per-file gate errors
- [X] T030 Run `npm run lint && npm test` at the repository root and confirm no regressions in any other suite — clean typecheck; server 465 tests passed, UI 538 tests passed, no coverage-gate errors
- [X] T031 Manually run the full `quickstart.md` validation end-to-end (all 5 sections, including the native macOS build) — sections 1/3/4 verified interactively in-browser (footer icons + link markup, layout/master-inherited geometry rendering correctly positioned, real mouse-wheel scroll updates the "Slide N of M" indicator correctly); section 2 (native macOS) verified via successful `xcodebuild`, interactive click-through left to release QA; section 5 automated checks covered by T030
- [X] T032 Add a `CHANGELOG.md` entry describing this patch release's footer and PPTX preview fixes, per Constitution Principle VII

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Empty — nothing blocks the user stories
- **User Stories (Phase 3-6)**: All can start immediately after Phase 1; no cross-story code dependencies (each touches a distinct file set), though US2 and US4 build on top of files US1 and US3 already touch respectively — see note below
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1, footer functionality)**: Independent — touches only `ViewerWindowController.swift`
- **User Story 3 (P1, PPTX inheritance)**: Independent — touches only `PptxViewer.tsx`/test fixtures
- **User Story 2 (P2, footer visuals)**: Touches `AppFooter.tsx`/`globals.css`, disjoint from US1's Swift file — no code dependency on US1, but doing US1 first avoids two people touching footer-adjacent behavior in the same release window with unverified link behavior underneath the new styling
- **User Story 4 (P2, PPTX scroll)**: Touches the same `PptxViewer.tsx` file as US3 — recommended to sequence **after** US3 so the scroll rewrite (T022) is built on top of the already-inheritance-aware `parseSlide`/shape data, avoiding a merge conflict or duplicated rework in the same file. Not a hard technical blocker (the two changes touch different regions of the file — parsing vs. rendering), but sequencing avoids rebasing pain.

### Within Each User Story

- Test fixtures/tests before or alongside implementation (constitution's coverage gate makes tests required, not optional, for this project)
- Parsing/data changes before rendering changes that consume them
- Coverage verification (`npm test -- <File>`) as the last task in each story

### Parallel Opportunities

- T005, T006, T007 (US3 fixtures) can run in parallel — different files
- T019 (US2 test) can run in parallel with T016-T018 once T017 lands (styling task order still matters for T018 which depends on T017)
- T021 (US4 fixture) can run in parallel with early US3 work
- T029 (Polish) can run in parallel with T030-T032
- US1 and US3 (both P1, disjoint files) can be worked on fully in parallel by different people
- US2 and US4 can each start as soon as their respective P1 prerequisite story (US1, US3) lands, and can then run in parallel with each other (disjoint files: Swift/footer vs. PptxViewer)

---

## Parallel Example: User Story 3

```bash
# Launch all three new PPTX fixtures for User Story 3 together:
Task: "Add test fixture ui/src/test-fixtures/layout-inherited-placeholder.pptx"
Task: "Add test fixture ui/src/test-fixtures/layout-background.pptx"
Task: "Add test fixture ui/src/test-fixtures/multi-layout-deck.pptx"
```

## Parallel Example: User Story 1 + User Story 3 (both P1)

```bash
# Different developers, fully independent files:
Developer A: T002-T004 (native/macos/GitLocal/GitLocal/ViewerWindowController.swift)
Developer B: T005-T015 (ui/src/components/ContentPanel/PptxViewer.tsx + fixtures)
```

---

## Implementation Strategy

### MVP First (Both P1 Stories)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (footer links work)
3. Complete Phase 4: User Story 3 (PPTX inheritance correctness)
4. **STOP and VALIDATE**: Run quickstart.md sections 1-3 independently
5. This is the functional MVP — both reported *defects* (broken links, broken rendering) are fixed; the two P2 stories are polish/UX improvements on top

### Incremental Delivery

1. Setup → baseline confirmed
2. Add User Story 1 → validate → footer links work in both distributions
3. Add User Story 3 → validate → PPTX renders correctly for real-world decks (MVP complete)
4. Add User Story 2 → validate → footer looks like a proper dev-tool footer
5. Add User Story 4 → validate → PPTX navigation is continuous scroll
6. Polish → CHANGELOG, full regression pass, release-ready

### Parallel Team Strategy

With two developers:

1. Both complete Phase 1 together (quick)
2. Developer A: User Story 1 → User Story 2 (same footer file family, sequenced)
3. Developer B: User Story 3 → User Story 4 (same PptxViewer.tsx file, sequenced)
4. Both converge for Phase 7 Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No shared/foundational infrastructure needed — the two fixes are fully decoupled at the file level
- Tests are included as required tasks (not gated behind "if requested") because the project constitution mandates ≥90% per-file branch coverage before release
- Verify tests fail before implementing where a test precedes its implementation task (fixtures + T014/T019/T027 test-writing)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- MVP = both P1 stories (US1 + US3); P2 stories (US2 + US4) are the polish layer explicitly requested but not functionally blocking

---

## Post-Implementation Follow-Up (User Story 3 scope extension)

After initial implementation, user testing against a real-world deck (Microsoft's own "Get started with Microsoft 365 Copilot in PowerPoint" sample) surfaced two gaps the original T008-T015 work didn't cover, both fixed in `ui/src/components/ContentPanel/PptxViewer.tsx`:

- **Theme-color (schemeClr) resolution**: real-world decks set backgrounds and run colors via a theme reference (`a:schemeClr`, e.g. `bg1`/`accent1`) resolved through the slide master's `<p:clrMap>` and a separate `<a:theme>` part's `<a:clrScheme>` — not a literal `a:srgbClr` value, which was the only form originally handled. This is why the reported sample file's background didn't render at all. Added `loadThemeContext`, `extractSolidFillColor`, and `extractDirectColor` (handling both `a:srgbClr` and the `a:sysClr`-with-`lastClr` form), threaded through `parseBgFill` and `parseRuns`. New fixtures: `theme-scheme-colors.pptx` (direct theme-slot reference, indirect via clrMap, sysClr-sourced color, unresolvable/incomplete-theme fallback) and `master-load-failures.pptx` (missing/malformed master part graceful degradation).
- **Responsive slide sizing**: the slide canvas rendered at a fixed natural pixel size (e.g. 1280×720 for a 16:9 deck), overflowing narrower preview panels instead of filling the available width. Slides now render at natural size inside a `ResizeObserver`-measured frame and scale via CSS `transform` to fill the panel width, remaining responsive as the panel resizes. A callback ref (not `useRef` + an empty-deps `useEffect`) is used for the measured element, since the scroll-body div doesn't exist on the very first render (parsing hasn't finished yet) — a plain effect would observe nothing.
- Also fixed a pre-existing gap in this same follow-up: `npm run lint` at the repository root never actually type-checks `ui/` (the root `tsconfig.json` excludes it) — verification for `ui/` changes should also run `cd ui && npx tsc --noEmit` (or `npm run build:ui`, which includes it), not just the root lint script.

All 40 `PptxViewer.test.tsx` cases pass with ≥90% branch coverage maintained (91.48%). Verified against the real sample file via a local server + browser: background now resolves correctly (white, from `bg1` → `lt1` → theme `#FFFFFF`) and the slide scales to fill the panel (`scale(0.51)` at the tested panel width) instead of overflowing.

### Second round: layout/master decorative content

A follow-up screenshot comparison against real PowerPoint (same sample deck) showed the theme/responsive fixes above were correct but insufficient — the deck's slide 1 title layout places its hero graphic and Microsoft logo as `<p:pic>` elements directly on the *layout* (not the slide), which `loadPartIndex` only ever scanned for *placeholder* shapes, silently discarding every non-placeholder shape (images, logos, static captions) on a layout or master. This is a distinct bug from the geometry/background inheritance work above — those shapes aren't "inherited" onto a slide-side counterpart, they're the layout/master's own fixed artwork that PowerPoint always composites underneath the slide's own content.

Fixed by extending `PptxPartIndex` with a `decorations: PptxShape[]` field: `loadPartIndex` now also collects every non-placeholder, non-hidden (`hidden="1"` on `cNvPr` is skipped, e.g. PowerPoint's built-in design-grid guide layer) `p:sp`/`p:pic` shape on the layout/master, resolving each part's own images via that part's own relationship file (not the slide's). `parseSlide` now composes a slide's final shape list as `[...masterDecorations, ...layoutDecorations, ...slideOwnShapes]`, matching PowerPoint's master-under-layout-under-slide compositing order. Also added: an EMF/WMF format gate in `resolveImageDataUri` — those are vector metafile formats no browser can decode, so they now resolve to the existing "image not available" placeholder instead of a broken `<img>` icon (the sample deck's Microsoft logo is exactly such an EMF asset). New fixture: `layout-master-decorations.pptx` (visible + hidden decoration text/image on both layout and master, an EMF decoration, and a stacking-order assertion).

Re-verified against the real sample file: the hero graphic (JPEG) now renders correctly positioned and sized; the EMF Microsoft logo shows the "not available" placeholder instead of nothing; title, subtitle, note, copyright, and date text all present and correctly positioned. `PptxViewer.test.tsx` now at 43 cases, 90.18% branch coverage (still ≥90% gate); full UI suite (548 tests) and full repo suite stable across repeated runs with no coverage-gate failures. Also confirmed `ui`'s own `npx tsc --noEmit` (not just the root `npm run lint`, which excludes `ui/`) is clean throughout.
