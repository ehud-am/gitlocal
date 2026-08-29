# Phase 0 Research: File Preview Framework

## 1. PDF rendering library

**Decision**: `pdfjs-dist` (Mozilla PDF.js, npm package), lazy-loaded on first PDF open, with its worker script bundled locally via Vite asset import (not the library's default CDN worker URL).

**Rationale**:
- It is the only actively-maintained, browser-native, dependency-light PDF renderer with a permissive license (Apache-2.0, MIT-compatible per Constitution VI) and no native/WASM toolchain requirement beyond what Vite already handles.
- Runs entirely client-side against bytes already delivered by the existing `/api/file` endpoint (base64), satisfying Local-First (Principle III) with zero new server-side code paths beyond classification/delivery.
- Used in production by numerous local-first and Electron-style apps for exactly this "render a PDF the browser doesn't natively embed nicely" case.

**Alternatives considered**:
- Native `<embed type="application/pdf">` / browser built-in PDF viewer: rejected — behavior is inconsistent across browsers/embedded WebKit (the macOS app's embedded WebKit view, per Constitution I, must behave identically to the npm/browser distribution), no control over corrupted-file fallback UX (FR-006), no scroll-within-panel guarantee (Acceptance Scenario 2).
- Server-side PDF-to-image/HTML conversion (e.g., via a spawned `pdftoppm`/poppler process): rejected — adds a native system dependency not currently present, complicates the Homebrew/npm dual-distribution story (Constitution I), and pushes rendering work server-side for no benefit since the client already receives full file bytes.
- `react-pdf` (wrapper around pdfjs-dist): rejected as an added layer of indirection with its own extra dependency weight; the plan calls for a minimal, framework's-own `PdfViewer.tsx` built directly on `pdfjs-dist`, keeping the new-dependency surface to exactly one package.

**Worker packaging note**: `pdfjs-dist`, by default, may resolve its worker from a CDN or expect explicit `GlobalWorkerOptions.workerSrc` configuration. This MUST be set to a locally bundled asset (Vite `?url` import of the `pdf.worker.min.mjs` file shipped inside the `pdfjs-dist` package) — never a CDN URL — to satisfy Principle III. This is a concrete implementation task, tracked in tasks.md.

## 2. SVG safe rendering approach

**Decision**: Reuse the existing base64-data-URI `<img>` mechanism already used for raster images, applied to SVG as its own distinct preview type. Raw source view reuses the existing `CodeViewer` (xml language), fed the UTF-8 text the server already delivers for text-mode content types.

**Rationale**:
- Browsers do not execute `<script>` elements, do not process `<foreignObject>` interactive content, and do not fetch most externally-referenced resources when an SVG is loaded via `<img src="...">` (as opposed to inline `<svg>` markup in the DOM, an `<object>`, or an `<iframe>`) — this is standard, long-documented browser behavior, not an assumption specific to this codebase. It directly satisfies FR-005/SC-002 (no script execution, no external fetch) without adding a sanitization dependency (e.g., DOMPurify + `dompurify`'s SVG profile), keeping the framework's dependency footprint at just `pdfjs-dist`.
- This is the same rendering path GitLocal already uses for every other image format today — no new server or client rendering primitive, only a new registry entry.

**Alternatives considered**:
- Inline `<svg>` injection into the DOM (`dangerouslySetInnerHTML`): rejected outright — this would execute embedded scripts and is exactly the vulnerability FR-005 exists to prevent.
- DOMPurify-based sanitization then inline injection: rejected for this version — adds a new dependency and a maintenance burden (keeping an allowlist current) for no behavioral gain over the already-inert `<img>` approach; noted in spec Assumptions as an implementation-level choice, not mandated.
- `<object type="image/svg+xml">`: rejected — unlike `<img>`, `<object>`-embedded SVG can execute embedded scripts in some browsers, which would violate FR-005.

**Consequence for server delivery**: unlike the current generic `image` type (base64-only, no raw text needed), `svg` needs BOTH representations: base64 (for the rendered `<img>`) and UTF-8 text (for the raw-source `CodeViewer` toggle). Decision: server delivers UTF-8 text (same `encoding: 'utf-8'` mode already used for markdown/json/text types) and the client base64-encodes that same string client-side (`btoa`/`TextEncoder`-based) to build the `data:image/svg+xml;base64,...` URI for the rendered view — avoiding a second network round-trip or a new encoding mode on the server. This is captured in `contracts/file-content-api.md`.

## 3. Registry pattern shape

**Decision**: A single typed lookup object, `previewRegistry: Record<PreviewType, PreviewRegistryEntry>`, defined in `ui/src/components/ContentPanel/preview-registry.ts`, where `PreviewRegistryEntry` carries the render component plus the small set of booleans/flags `ContentPanel` currently branches on (raw-toggle availability, editability).

**Rationale**: FR-001/FR-009/SC-004 require dispatch to become table-driven rather than branch-driven. A plain object keyed by the existing `FileContent['type']` union is the smallest change that achieves this — no new state management library, no plugin-loader machinery, consistent with "minimal framework" from the originating request and Constitution I's anti-bloat stance. It is also the natural extension point for a future "customer config extensions" mechanism (explicitly out of scope now) since new entries could later be merged into the same object at runtime.

**Alternatives considered**:
- A class-based plugin system with lifecycle hooks (`register`, `canHandle`, `render`): rejected as over-engineering relative to the five-to-seven fixed entries this version needs; the spec explicitly calls for a *minimal* framework.
- Keeping per-type checks in `ContentPanel.tsx` but extracted into a helper function: rejected — this does not satisfy FR-009's requirement that adding a type not touch core dispatch code, since the helper itself would still need a new branch per type.

## 4. Testability / coverage strategy (Principle II, ≥90% per-file branch coverage)

**Decision**: Check in small, fixed, deterministic fixture files (`ui/src/test-fixtures/sample.pdf` — a tiny single/multi-page PDF generated once and committed; `ui/src/test-fixtures/sample.svg`, `ui/src/test-fixtures/malformed.svg`, and a byte-corrupted `broken.pdf`) so `PdfViewer`/`SvgViewer` tests exercise real parsing for the happy path, and mock `pdfjs-dist`'s `getDocument` for the error/corrupted-file and large-page-count branches (avoids needing to hand-craft a valid encrypted PDF fixture just to hit the `PasswordException` branch).

**Rationale**: Matches the existing test style in the codebase (real small fixtures for happy-path component tests, `vi.mock` for hard-to-construct edge cases) and keeps coverage of error branches deterministic and fast rather than depending on parsing real corrupted binary data, which can be flaky across `pdfjs-dist` versions.
