# Implementation Plan: PDF Preview Sharpness & macOS About Menu

**Branch**: `040-pdf-quality-about-menu` | **Date**: 2026-09-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/040-pdf-quality-about-menu/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Two independent fixes for v0.13.1: (1) sharpen the existing read-only PDF preview (`PdfViewer.tsx`, spec 036) by scaling the PDF.js render viewport and canvas backing store by `window.devicePixelRatio` while keeping on-page layout size unchanged, fixing blur on Retina/HiDPI displays and while zooming; (2) add a standard "About GitLocal" item to the native macOS app's menu (`AppDelegate.swift`), wired to AppKit's built-in `orderFrontStandardAboutPanel(_:)` so it shows the app icon and version with zero custom UI code, keeping the native wrapper thin per constitution Principle I.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22+ (PDF fix); Swift 5.9 (About menu, native macOS wrapper only)
**Primary Dependencies**: `pdfjs-dist` (already in use, no version/API change needed); AppKit (`NSMenuItem`, `NSApplication.orderFrontStandardAboutPanel(_:)`) — no new dependency
**Storage**: N/A
**Testing**: Vitest + `@vitest/coverage-v8` for `PdfViewer.tsx` (existing `PdfViewer.test.tsx` extended); manual/XCTest-style verification for the native menu item per existing macOS app conventions
**Target Platform**: Browser (PDF preview, both npm and macOS distributions share this code); macOS 12+ native app (About menu, macOS-only)
**Project Type**: Web application UI change + scoped native macOS wrapper change (existing structure, no new project)
**Performance Goals**: No user-noticeable regression in PDF preview load/render time for typical (<20 page) documents (SC-002)
**Constraints**: Must not alter on-page PDF layout size or existing zoom range; About panel must be dismissible with no side effects on the running app/session
**Scale/Scope**: Two small, independently shippable changes touching `ui/src/components/ContentPanel/PdfViewer.tsx` and `native/macos/GitLocal/GitLocal/AppDelegate.swift`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (TypeScript-First Product Core)**: PASS. PDF fix is TypeScript in the shared core. The About menu item is native Swift, but confined to `native/macos/` and remains a thin AppKit shell (no custom window, no forked product behavior, no telemetry) — explicitly permitted.
- **Principle II (Test Coverage ≥90%)**: PASS (planned). `PdfViewer.tsx` already has `PdfViewer.test.tsx`; the render-scale change will extend that suite to keep ≥90% branch coverage on the modified file. `AppDelegate.swift` is native macOS code outside the TypeScript/Vitest coverage gate; existing native app testing conventions (see specs 032/034/035) apply.
- **Principle III (Local-First)**: PASS. No network calls introduced; About panel reads only local bundle metadata.
- **Principle IV (Node.js-Served React UI)**: PASS. No change to serving model; `PdfViewer.tsx` remains client-rendered React within the existing served SPA.
- **Principle V (Clean & Useful UI)**: PASS. Sharper PDF rendering directly improves readability/utility; About menu follows standard, unobtrusive macOS convention.
- **Principle VI (Free & Open Source / MIT)**: PASS. No new dependency introduced by either change.
- **Principle VII (Repo-relative paths)**: PASS. No absolute contributor-local paths introduced in any spec artifact.
- **Principle VIII (Release branches, versioning, contrarian QA)**: Applies at release time (0.13.1 patch version bump, changelog, contrarian QA) — not a design-time gate for this plan, but noted for the eventual release step.

No violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/040-pdf-quality-about-menu/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── pdf-viewer-render-contract.md
│   └── about-menu-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
ui/
└── src/
    └── components/
        └── ContentPanel/
            ├── PdfViewer.tsx        # MODIFIED: device-pixel-ratio-aware render scaling
            └── PdfViewer.test.tsx   # MODIFIED: coverage for new scaling behavior

native/
└── macos/
    └── GitLocal/
        └── GitLocal/
            └── AppDelegate.swift    # MODIFIED: add "About GitLocal" menu item
```

**Structure Decision**: No new projects or directories. This feature modifies exactly two existing files (`ui/src/components/ContentPanel/PdfViewer.tsx` and `native/macos/GitLocal/GitLocal/AppDelegate.swift`) plus their associated tests, fitting entirely within the existing single-repo structure documented in `CLAUDE.md` (`src/`, `ui/`, `native/macos/`).

## Complexity Tracking

*No violations — table omitted.*
