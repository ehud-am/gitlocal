# Implementation Plan: File Preview Framework

**Branch**: `036-file-preview-framework` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/036-file-preview-framework/spec.md`

## Summary

Replace `ContentPanel`'s single hand-written if/else dispatch chain with a small preview-type registry, then migrate the five existing preview experiences (Markdown, JSON, raster image, code/text, binary fallback) onto it with zero behavioral change. Extend `detectFileType()` to split two new distinct preview types out of the current buckets — `pdf` (currently misclassified as `binary`) and `svg` (currently grouped under generic `image`) — and add a registry entry + renderer component for each: `PdfViewer.tsx` (client-side page rendering via `pdfjs-dist`, MIT) and `SvgViewer.tsx` (rendered graphic + raw-XML toggle, reusing the existing base64-`<img>` pattern which is already script-inert in image context, so no new sanitization dependency is required). Both new types are read-only, matching current image behavior; office formats (docx/xlsx/pptx) and a user-configurable custom-extension mechanism are explicitly out of scope (spec Assumptions) but the registry shape is designed not to preclude either later.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+ (existing project baseline; unchanged)
**Primary Dependencies**: Existing — Hono ^4.x, React 18, Vite, `react-markdown`/`remark-gfm`/`rehype-highlight`, `highlight.js`. New — `pdfjs-dist` (Mozilla, Apache-2.0/MIT-compatible per npm license field — confirm exact SPDX at install time, see research.md) for client-side PDF page rendering. No new dependency for SVG.
**Storage**: N/A — files are read from the filesystem/git blob at request time, same as today; no persistence layer added
**Testing**: Vitest for both server and UI (existing), `@testing-library/react` + `jest-axe` for new UI components, matching existing patterns in `MarkdownRenderer.test.tsx`/`JSONViewer.test.tsx`
**Target Platform**: Cross-platform — npm package and the macOS Homebrew native app wrapper; both share this code per Constitution Principle I
**Project Type**: Web application — existing single-repo layout with `src/` (Hono backend) and `ui/` (Vite/React frontend)
**Performance Goals**: PDF first-page visible without noticeably degrading responsiveness, consistent with existing "large Markdown/JSON file" expectations (no new numeric SLA introduced by the spec)
**Constraints**: All PDF/SVG rendering client-side/local only, no new network calls (Principle III); must not regress existing preview test suites or per-file coverage (Principle II); `pdfjs-dist` adds non-trivial bundle size to the UI build — tracked in Complexity Tracking
**Scale/Scope**: Single local user; PDFs of ordinary document length (tens to low hundreds of pages), not exhaustively large archival PDFs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TypeScript-First Product Core | PASS | All new code (registry, `PdfViewer.tsx`, `SvgViewer.tsx`, `detectFileType` changes) is TypeScript in the existing server/UI stack. `pdfjs-dist` is a pure-JS/WASM-free client library, not a new language or native addon. |
| II. Test Coverage (NON-NEGOTIABLE) | PASS (design accounts for it) | New components are tested with fixture PDFs/SVGs (small, checked-in test fixtures) and `pdfjs-dist` mocked in unit tests where real parsing isn't the thing under test, mirroring existing `vi.mock` patterns; registry migration must keep existing suites green (FR-010). |
| III. Local-First with Git Remote Exception | PASS | `pdfjs-dist` runs entirely in the browser against bytes already fetched from the local server; no remote PDF.js CDN/worker fetch — the worker script is bundled and served locally (see research.md). SVG rendering fetches nothing external, and FR-005 explicitly requires no script execution / no external resource fetch. |
| IV. Node.js-Served React UI | PASS | No change to the serving model; new components are additional React UI served the same way. |
| V. Clean & Useful UI | PASS | PDF/SVG previews follow the same minimal, GitHub-inspired presentation as existing viewers; no new chrome beyond the existing raw-view toggle pattern. |
| VI. Free & Open Source | PASS | `pdfjs-dist` license is verified MIT/Apache-2.0-compatible before being added (research.md); no proprietary component introduced. |
| VII. Repository-Relative Paths | PASS | All new spec-kit artifacts use repository-relative paths. |
| VIII. Release Branches / Pre-GA / Contrarian QA | DEFERRED (not a plan-time gate) | Required before this feature ships in a release branch, per existing project practice. |

No violations requiring justification; Complexity Tracking below documents bundle-size and worker-packaging risk, not a constitution exception.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`).*

Design choices (registry pattern with no new server round-trips, bundled-not-CDN PDF.js worker, base64-`<img>` reuse for SVG instead of a new sanitizer dependency) introduce no new constitution risk beyond the bundle-size item already tracked. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/036-file-preview-framework/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── file-content-api.md  # Phase 1 output — FileContent type/API changes
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this plan)
```

### Source Code (repository root)

This feature extends GitLocal's existing web-application layout (backend `src/` + frontend `ui/`); no new top-level projects are introduced.

```text
src/
├── git/repo.ts                    # EXISTING — detectFileType() gains 'svg' and 'pdf' return values
├── handlers/file.ts               # EXISTING — fileHandler gains explicit svg/pdf response branches (text/base64 content modes)
└── types.ts                       # EXISTING — FileContent['type'] union extended with 'svg' | 'pdf'

tests/unit/
├── git/repo.test.ts                # EXISTING — extend detectFileType coverage for svg/pdf
└── handlers/file.test.ts           # EXISTING — extend fileHandler coverage for svg/pdf branches

ui/src/components/ContentPanel/
├── preview-registry.ts            # NEW — PreviewType -> { Component, allowRawToggle, ... } map; the framework's core
├── preview-registry.test.ts       # NEW
├── PdfViewer.tsx                  # NEW — pdfjs-dist page rendering
├── PdfViewer.test.tsx             # NEW
├── SvgViewer.tsx                  # NEW — rendered graphic (base64 <img>) + raw XML toggle
├── SvgViewer.test.tsx             # NEW
├── MarkdownRenderer.tsx           # EXISTING — registered into preview-registry.ts, no internal changes
├── JSONViewer.tsx                 # EXISTING — registered into preview-registry.ts, no internal changes
├── CodeViewer.tsx                 # EXISTING — remains the raw-view/text/code renderer, referenced by the registry
├── ContentPanel.tsx               # EXISTING — if/else dispatch chain (lines ~1272-1314) replaced with a registry lookup
└── ContentPanel.test.tsx          # EXISTING — extend for svg/pdf dispatch, keep all existing cases green

ui/src/test-fixtures/               # NEW (if not already present) — small checked-in sample.pdf / sample.svg for component tests

ui/package.json                    # EXISTING — add `pdfjs-dist`
```

**Structure Decision**: Follow the existing single-repo web-application layout exactly. The framework itself is a new, small `preview-registry.ts` module inside the existing `ContentPanel/` directory (not a new top-level module) since it is purely a rendering-dispatch concern local to that component; server-side changes are confined to the existing `detectFileType()`/`fileHandler` functions already responsible for file-type classification and content delivery. No new top-level directories or build tooling.

## Complexity Tracking

> Constitution Check above shows no violations requiring justification. Execution-level risks tracked here for visibility, not as constitution exceptions.

| Risk | Why Needed | Mitigation |
|---|---|---|
| `pdfjs-dist` bundle size | PDF rendering requires parsing/rendering PDF pages, which is infeasible to hand-roll; `pdfjs-dist` is the only mature, MIT-license-compatible option | Load it as an async/lazy-imported chunk (consistent with the existing `MarkdownShareActions` lazy-load pattern in `ContentPanel.tsx`) so it only enters the bundle when a PDF is actually opened, not on initial app load |
| `pdfjs-dist` worker packaging | The library requires a separate worker script; if misconfigured it silently falls back to the main thread (perf) or fails to load (CDN-dependent default in some setups) | Bundle the worker locally via Vite's `?url`/asset-import pattern and point `pdfjs-dist`'s `workerSrc` at the local bundled asset explicitly, verified in research.md and covered by a quickstart check — never rely on the library's CDN default, which would violate Principle III |
