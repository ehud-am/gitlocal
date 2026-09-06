---

description: "Task list for PDF preview sharpness fix and macOS About menu (v0.13.1)"
---

# Tasks: PDF Preview Sharpness & macOS About Menu

**Input**: Design documents from `specs/040-pdf-quality-about-menu/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included for User Story 1 — constitution Principle II mandates ≥90% per-file branch coverage on TypeScript/React source, so `PdfViewer.tsx`'s existing Vitest suite must be extended alongside the change. User Story 2 (native Swift) has no automated coverage gate; it follows this repo's existing native manual-test-plan convention (`native/macos/GitLocalTests/*.md`) instead.

**Organization**: Tasks are grouped by user story. US1 and US2 touch entirely different files/languages and have no dependency on each other — both can be implemented, tested, and shipped independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Path Conventions

Single existing repo structure per `plan.md`: `ui/src/components/ContentPanel/` (US1), `native/macos/GitLocal/GitLocal/` and `native/macos/GitLocalTests/` (US2). No new setup or foundational infrastructure is required — both stories modify existing, already-wired files.

---

## Phase 1: Setup

Not needed. Both stories build on existing, already-integrated components (`PdfViewer.tsx` is already registered in the preview registry from spec 036; `AppDelegate.installMainMenu` is already wired at app launch). No new project scaffolding, dependency installation, or configuration is required.

---

## Phase 2: Foundational

Not needed. US1 and US2 share no code, data model, or infrastructure — there is nothing that must be built once for both to depend on. Proceed directly to the user story phases.

---

## Phase 3: User Story 1 - Sharp PDF previews (Priority: P1) 🎯 MVP

**Goal**: PDF pages render sharply on Retina/HiDPI displays and remain sharp when the user zooms in, without regressing load time, standard-density quality, or existing preview behavior.

**Independent Test**: Open any PDF in the preview panel on a high-density display and visually confirm text/line art are sharp at default zoom and after zooming in (per `quickstart.md` §1); ships and verifies independently of US2.

### Tests for User Story 1

> Write/extend these tests first; confirm the new assertions fail against the current `scale: 1.5`-only implementation before making the implementation change.

- [X] T001 [P] [US1] Add a test in `ui/src/components/ContentPanel/PdfViewer.test.tsx` asserting that, for a mocked `window.devicePixelRatio` of `2`, a rendered page's `canvas.width`/`canvas.height` equal the PDF.js viewport size at scale `1.5` multiplied by `2` (per `contracts/pdf-viewer-render-contract.md` rule 1)
- [X] T002 [P] [US1] Add a test in `ui/src/components/ContentPanel/PdfViewer.test.tsx` asserting the canvas's CSS-facing layout size (style width/height or equivalent) stays equal to the unscaled logical-scale viewport size regardless of `devicePixelRatio` (contract rule 2)
- [X] T003 [P] [US1] Add a test in `ui/src/components/ContentPanel/PdfViewer.test.tsx` asserting that when `window.devicePixelRatio` is `undefined`/non-finite, rendering falls back to a device pixel ratio of `1` (contract rule 4)

### Implementation for User Story 1

- [X] T004 [US1] In `ui/src/components/ContentPanel/PdfViewer.tsx`, compute an effective device pixel ratio (`window.devicePixelRatio` if a positive finite number, else `1`) inside the per-page render loop (depends on T001-T003 existing as failing tests)
- [X] T005 [US1] In `ui/src/components/ContentPanel/PdfViewer.tsx`, derive a scaled render viewport (logical `scale: 1.5` viewport dimensions × effective device pixel ratio) and set `canvas.width`/`canvas.height` from it instead of the unscaled viewport (depends on T004)
- [X] T006 [US1] In `ui/src/components/ContentPanel/PdfViewer.tsx`, constrain the canvas element's CSS layout size (e.g. `canvas.style.width`/`canvas.style.height`) to the original unscaled logical viewport size so on-page appearance is unchanged (depends on T005)
- [X] T007 [US1] In `ui/src/components/ContentPanel/PdfViewer.tsx`, pass the scaled render viewport to `page.render({ canvasContext, viewport, canvas })` so rendered content matches the higher-resolution backing store (depends on T005)
- [X] T008 [US1] Run `npm test` (Vitest + coverage) scoped to `PdfViewer.test.tsx` and confirm ≥90% branch coverage on `PdfViewer.tsx` per constitution Principle II, and that all tests from T001-T003 now pass (depends on T004-T007)

**Checkpoint**: PDF previews are sharp on HiDPI displays and after zoom, per `quickstart.md` §1, with no layout or existing-behavior regression. Independently shippable as v0.13.1's first fix.

---

## Phase 4: User Story 2 - About GitLocal menu item (Priority: P2)

**Goal**: The native macOS app's application menu offers a standard "About GitLocal" item that shows the app icon and version number via AppKit's built-in About panel.

**Independent Test**: Launch `GitLocal.app`, open the app menu, choose "About GitLocal", confirm the standard panel shows the app icon and current version, and dismiss it with no side effects (per `quickstart.md` §2); ships and verifies independently of US1.

### Tests for User Story 2

- [ ] T009 [P] [US2] Add a "Standard About panel" section to `native/macos/GitLocalTests/ShortcutCommandTests.md` (following the existing manual-test-plan format used by its "Edit Commands"/"Find Command" sections) describing the checks: "About GitLocal" is the first item in the app menu; selecting it opens a panel showing the app icon and current version number; dismissing it leaves the main window and any open repository/terminal session unaffected

### Implementation for User Story 2

- [ ] T010 [US2] In `native/macos/GitLocal/GitLocal/AppDelegate.swift`'s `installMainMenu(for:)`, add an `NSMenuItem` titled "About GitLocal" with action `#selector(NSApplication.orderFrontStandardAboutPanel(_:))` and target `nil`, inserted as the first item in `appMenu`, followed by a separator, ahead of the existing "Set as Default Markdown Reader" item (per `contracts/about-menu-contract.md`)
- [ ] T011 [US2] Build and manually run the checks added in T009 against a debug build of `GitLocal.app` (via Xcode) to confirm the panel shows the correct icon/version and dismisses cleanly (depends on T009, T010)

**Checkpoint**: Native macOS app exposes a working, standard "About GitLocal" menu item per `quickstart.md` §2. Independently shippable alongside or after US1.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Release-readiness steps spanning both stories, per constitution Principle VIII.

- [ ] T012 [P] Bump `package.json` version to `0.13.1` and add a `CHANGELOG.md` entry summarizing the PDF sharpness fix and the About menu addition
- [ ] T013 Run `npm run lint` and full `npm test` at the repo root to confirm no regressions outside `PdfViewer.tsx`
- [ ] T014 Run the full `quickstart.md` validation (§1 and §2) end-to-end before release sign-off
- [ ] T015 Run the constitution-mandated contrarian QA review across the full v0.13.1 change set and consolidate findings into a release-review artifact under `releases/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Skipped — no shared infrastructure needed (see Phase 1/2 notes above)
- **User Story 1 (Phase 3)**: No dependency on US2; can start immediately
- **User Story 2 (Phase 4)**: No dependency on US1; can start immediately, in parallel with US1
- **Polish (Phase 5)**: Depends on both US1 and US2 being complete

### Within Each User Story

- US1: T001-T003 (tests) before T004-T007 (implementation) before T008 (verify coverage/pass)
- US2: T009 (test plan) can be written in parallel with or before T010 (implementation); T011 (manual run) depends on both

### Parallel Opportunities

- T001, T002, T003 can be written in parallel (same file, but independent assertions — coordinate to avoid merge conflicts in the same test file)
- The entirety of Phase 3 (US1) can run in parallel with the entirety of Phase 4 (US2) — different files, different languages, no shared state
- T009 [US2] can run in parallel with any US1 task
- T012 [P] (version/changelog) can run in parallel with T013/T014/T015 setup, though T015 should be the final step before release sign-off

---

## Parallel Example: User Story 1 vs User Story 2

```bash
# Two independent workstreams, safe to run at the same time:
Track A (US1): T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008
Track B (US2): T009 → T010 → T011
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (US1: PDF sharpness) — this is the explicitly named, higher-priority bug fix
2. **STOP and VALIDATE**: Run `quickstart.md` §1 on a Retina display
3. Ship as the core of v0.13.1 if About menu (US2) isn't ready yet

### Incremental Delivery

1. Add User Story 1 (PDF sharpness) → validate independently → ready to ship
2. Add User Story 2 (About menu) → validate independently → ready to ship
3. Complete Phase 5 (Polish) once both are done → cut v0.13.1

---

## Notes

- No `[Story]` label needed for Phase 5 tasks (cross-cutting, per template convention)
- Every US1 code task lists its exact target file (`PdfViewer.tsx`) since the whole story is a single-file change plus its test file
- Every US2 code task lists its exact target file (`AppDelegate.swift`) plus the existing native manual-test-plan file it extends
- Avoid combining T004-T007 into a single commit-less blob; each maps to one contract rule from `contracts/pdf-viewer-render-contract.md` for traceability
