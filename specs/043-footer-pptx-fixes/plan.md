# Implementation Plan: Footer Link Pattern & PPTX Preview Fidelity

**Branch**: `043-footer-pptx-fixes` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/043-footer-pptx-fixes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Two independent patch-level fixes sharing a release: (1) the app footer's GitHub/gitlocal.dev links silently fail to open in the native macOS distribution because its `WKWebView` has no navigation-policy handling for external/new-window navigation, and the footer's visual treatment doesn't read as a recognizable "GitHub + website" pattern; (2) the read-only PPTX preview (`PptxViewer.tsx`) only reads each slide's own XML, so any slide relying on inherited placeholder text, background, or geometry from its slide layout/master (the normal case for non-trivial decks) renders incorrectly, and slide-to-slide navigation uses top-of-panel Prev/Next buttons instead of the requested continuous scroll.

Technical approach: extend `PptxViewer.tsx`'s existing `jszip` + `fast-xml-parser` parsing to also read each slide's `slideLayoutN.xml` and the layout's `slideMasterN.xml`, merging placeholder/background/geometry properties slide → layout → master (most-specific wins), then replace the paged single-slide view with a vertically stacked scrollable list of all slides plus a scroll-derived position indicator, keeping per-slide notes accessible inline. Separately, add a `WKNavigationDelegate`/`WKUIDelegate` external-link handler in `ViewerWindowController.swift` that routes new-window/external navigation to `NSWorkspace.shared.open`, and restyle `AppFooter.tsx` with small inline SVG icons (GitHub mark, globe) in a compact, muted, developer-tool-footer treatment — both distributions share the same `AppFooter.tsx`, so only the native external-open behavior is macOS-specific.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (UI/server); Swift 5.9 (scoped macOS native wrapper only)
**Primary Dependencies**: React 18, Vite 7 (UI); existing `jszip` (MIT) + `fast-xml-parser` (MIT), both already lazy-loaded for PPTX preview (spec 039) — no new dependencies; AppKit/WebKit (`WKNavigationDelegate`, `NSWorkspace`) for the native macOS wrapper
**Storage**: N/A — no persisted state; PPTX parsing remains in-memory per open file
**Testing**: Vitest + @vitest/coverage-v8 (≥90% per-file branch coverage) for `AppFooter.tsx`/`PptxViewer.tsx`; existing native macOS lifecycle/package validation for the Swift change (no dedicated Swift unit test harness exists in this repo today — validated via the existing manual native-app QA pattern used in specs 034/035/040/042)
**Target Platform**: Browser (npm distribution, all OSes) and native macOS app (Homebrew cask), same shared React UI
**Project Type**: Web application (Node-served React SPA) with a scoped macOS native wrapper — matches existing repo structure, no new project type
**Performance Goals**: Scrolling a 50+ slide deck must stay visibly responsive (no scroll stall) per SC-004; slide layout/master resolution adds bounded, one-time-per-slide XML reads already within the existing yield-per-3-slides parsing loop
**Constraints**: Read-only preview only (no editing, no pixel-faithful rendering — consistent with the original PPTX preview's documented scope in spec 039); zero new runtime dependencies; footer must keep working with no version string (existing behavior preserved)
**Scale/Scope**: Two isolated, independently shippable fixes touching `AppFooter.tsx` (+ its CSS), `PptxViewer.tsx` (+ its CSS/tests), and `ViewerWindowController.swift`; no server-side or API changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: PASS. The PPTX/footer logic stays in the existing TypeScript/React UI. The only Swift change is inside `native/macos/`, remains a thin wrapper behavior (routing an external URL open to the OS), does not fork product behavior or add telemetry, and keeps npm package contents/behavior unchanged.
- **II. Test Coverage (NON-NEGOTIABLE)**: PASS (planned). `AppFooter.tsx` and `PptxViewer.tsx` already have Vitest suites at ≥90% branch coverage; new logic (layout/master merge, scroll-based slide indicator, icon rendering, link-click routing hook) will be covered by new/extended test cases in the same files. `AppFooter.tsx`'s coverage-gate inclusion was already fixed in spec 042 — no repeat of that gap expected, but the plan re-verifies `ui/vitest.config.ts` coverage `include` still lists both files.
- **III. Local-First with Git Remote Exception**: PASS. No network calls added; footer links are user-initiated navigation to public URLs (not GitLocal-initiated telemetry or remote APIs), same as today.
- **IV. Node.js-Served React UI**: PASS. No change to the serving model; both fixes are within the existing React SPA served by the Node backend.
- **V. Clean & Useful UI**: PASS (this is the intent). Footer restyle follows a minimal, GitHub-inspired developer-tool pattern; PPTX scroll navigation improves clarity/usability over the current paged view.
- **VI. Free & Open Source**: PASS. No new dependencies introduced (reusing `jszip`/`fast-xml-parser`, already MIT); any SVG icon assets used are recreated inline (no third-party icon library dependency) to avoid a new license to vet.
- **VII. Repository-Relative Paths and Release Documentation**: PASS (planned). This plan and its artifacts use repo-relative paths throughout; the release will need a `CHANGELOG.md` entry and README check per the existing patch-release pattern (handled at release time, not part of this feature's code changes).
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS (planned). This ships as a patch release (consistent with prior patches like 0.13.1, 0.10.3); `package.json` version bump and contrarian QA sub-agent review happen at release-cut time, outside this plan's scope but required before release approval.

No violations requiring justification. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/043-footer-pptx-fixes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md         # Phase 1 output (/speckit.plan command)
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

No `contracts/` directory: this feature adds no new API endpoint, CLI command, or other external interface — it changes existing UI component rendering/interaction and one native-wrapper navigation-policy handler.

### Source Code (repository root)

```text
ui/src/
├── components/
│   ├── AppFooter.tsx                          # Restyle: icon-paired links, dev-tool footer pattern
│   ├── AppFooter.test.tsx                      # Extend: icon presence, styling-affecting DOM assertions
│   └── ContentPanel/
│       ├── PptxViewer.tsx                      # Add layout/master parsing + merge; replace paged nav with scroll list
│       ├── PptxViewer.test.tsx                 # Extend: inheritance fixtures, scroll-position indicator
│       └── preview-registry.tsx                # No change expected (same PptxViewer entry point)
├── styles/
│   └── globals.css                             # Footer link/icon styling; pptx scroll-list layout styles
└── test-fixtures/
    └── *.pptx                                  # Add new fixtures: slide-with-layout-only-placeholder.pptx,
                                                  # slide-layout-background.pptx, multi-layout-deck.pptx (or similar)

native/macos/GitLocal/GitLocal/
└── ViewerWindowController.swift                # Add WKNavigationDelegate/WKUIDelegate external-link routing
                                                  # to NSWorkspace.shared.open for new-window/target=_blank navigation
```

**Structure Decision**: Existing single web-application structure (Node-served React UI under `ui/`) plus the existing scoped macOS native wrapper under `native/macos/` — both already established by prior features (036, 038, 039, 040, 042). No new top-level directories or project types are introduced; this feature only touches files within those two existing trees.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

*No violations — table omitted.*
