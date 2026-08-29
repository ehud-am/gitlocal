# Feature Specification: File Preview Framework

**Feature Branch**: `036-file-preview-framework`
**Created**: 2026-08-28
**Status**: Draft
**Input**: User description: "Minimal extensible framework for previewing non-code file formats (Word docs, PowerPoint, Excel, PDF, SVG, etc). Migrate existing Markdown and JSON preview into the framework, then extend it with out-of-the-box PDF and SVG preview support."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
-->

### User Story 1 - Preview a PDF file inline (Priority: P1)

A user browsing a repo opens a `.pdf` file (a spec export, a signed contract, a design doc). Today this shows "Binary file — preview not available." Instead, they see the PDF rendered as pages directly in the content panel, the same way they'd expect from GitHub or a file explorer, without downloading it or leaving the app.

**Why this priority**: PDF is the most common non-code artifact builders keep in a repo alongside code (specs, exports, signed docs) and today it has zero preview support — this is the single highest-value gap the framework closes.

**Independent Test**: Open any valid `.pdf` file in the repo browser and confirm its pages render inline in the content panel, with no change to how any other file type is displayed.

**Acceptance Scenarios**:

1. **Given** a repo containing a valid `.pdf` file, **When** the user selects that file, **Then** the content panel renders the PDF's pages inline instead of showing the binary fallback message.
2. **Given** a multi-page PDF, **When** it is open, **Then** the user can move between/scroll through pages within the content panel.
3. **Given** a large PDF (many pages), **When** it is opened, **Then** the first page becomes visible without noticeably degrading responsiveness (consistent with existing performance expectations for large Markdown/JSON files).
4. **Given** a corrupted or password-protected PDF, **When** the user opens it, **Then** the system falls back to a clear "can't preview this file" message instead of crashing or hanging.

---

### User Story 2 - Preview an SVG file as a rendered graphic, with raw source available (Priority: P2)

A user opens a `.svg` file (an icon, a diagram, an exported chart). They see it rendered as a graphic by default — scaled to fit, not distorted — and can switch to a raw/source view to inspect the underlying XML, matching the existing pretty/raw pattern already used for Markdown and JSON.

**Why this priority**: SVG already renders minimally today (as a generic image), but it is not surfaced as its own preview experience and has no raw-source toggle. Making it a first-class, safely-rendered preview type is valuable but lower-impact than closing the PDF gap.

**Independent Test**: Open any `.svg` file, confirm it renders as a graphic, use the existing view toggle to see the raw XML source, then switch back.

**Acceptance Scenarios**:

1. **Given** a repo containing a valid `.svg` file, **When** the user selects it, **Then** the content panel renders it as a graphic, scaled to fit the panel without distortion.
2. **Given** an `.svg` file open in rendered view, **When** the user selects "View raw", **Then** the exact raw XML source is shown with syntax highlighting, using the same toggle control already used for Markdown/JSON.
3. **Given** an SVG file containing embedded `<script>` elements or external resource references, **When** it is rendered, **Then** the embedded script does not execute and no external resource is fetched — the graphic renders safely as inert markup.
4. **Given** a malformed or non-SVG file with a `.svg` extension, **When** the user opens it, **Then** the system falls back to a clear "can't preview this file" message instead of crashing.

---

### User Story 3 - Consistent preview behavior across all file types, with zero regressions (Priority: P1)

A user browsing the repo moves between Markdown, JSON, images, code files, and now PDFs and SVGs. Every file type they could already preview before this change (Markdown pretty/raw, JSON pretty/raw/edit, images, syntax-highlighted code, the binary fallback) continues to behave exactly as it did, because the dispatch logic was migrated to a shared framework rather than rewritten ad hoc.

**Why this priority**: This is the safety net for the whole feature. The framework's entire purpose is to make adding PDF/SVG (and future formats) possible without regressing existing, load-bearing preview behavior — it must ship alongside P1 (PDF), not after it.

**Independent Test**: Run the existing Markdown/JSON/image/code/binary-fallback test suites unmodified against the migrated framework and confirm all pass; manually spot-check each existing type in the browser.

**Acceptance Scenarios**:

1. **Given** the migrated framework, **When** a Markdown file is opened, **Then** pretty rendering, raw toggle, relative links, heading anchors, find-highlighting, and edit-in-place all work exactly as before.
2. **Given** the migrated framework, **When** a JSON file is opened, **Then** pretty tree view, raw toggle, and edit-in-place all work exactly as before.
3. **Given** the migrated framework, **When** a PNG/JPG/GIF/WEBP/ICO/BMP/TIFF image is opened, **Then** it renders exactly as before (unaffected by SVG becoming its own preview type).
4. **Given** the migrated framework, **When** a file type has no registered preview renderer, **Then** the same fallback behavior as today applies (raw/code view for text-like extensions, "Binary file — preview not available" for true binaries).

---

### Edge Cases

- What happens when a `.pdf` file is corrupted, truncated, or password-protected? → Clear non-preview fallback message, no crash (User Story 1, Scenario 4).
- What happens when an `.svg` file contains scripts or references external URLs? → Rendered inertly; no script execution, no network fetch (User Story 2, Scenario 3), consistent with the Local-First constitutional principle.
- What happens when an `.svg` has an extreme or missing `viewBox`/dimensions? → Must scale to fit the content panel like a regular image, not overflow or collapse to zero size.
- What happens when a file's extension claims a supported preview type but its content doesn't match (e.g., a `.pdf` that's actually plain text, or vice versa)? → Falls back to the "can't preview this file" message rather than crashing the panel.
- What happens when the user opens a very large PDF (e.g., hundreds of pages)? → Pages load progressively; opening the file must not block the UI.
- Are PDF and SVG files editable in this version? → No. Both are read-only preview, consistent with how images are handled today; SVG's raw-source view is read-only (view only, no save), matching the "preview first, editing later" framing in the originating request.
- What happens to a file format that isn't text, image, PDF, or SVG (e.g. `.docx`, `.xlsx`, `.pptx` in this version)? → Falls back to the existing "Binary file — preview not available" message; the framework is designed so a renderer for these can be registered later without changing core dispatch, but building those renderers is out of scope here (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace the current single if/else dispatch chain that decides how to render a file's content with a shared preview framework: a registry mapping a file's preview type to (a) how its content is fetched/encoded and (b) which UI component renders it.
- **FR-002**: The framework MUST preserve, without behavioral change, the existing preview experiences for: Markdown (pretty/raw toggle, relative links, heading anchors, find-highlighting, edit-in-place), JSON (pretty tree/raw toggle, edit-in-place), raster images (PNG/JPG/GIF/WEBP/ICO/BMP/TIFF), syntax-highlighted code/text, and the binary "preview not available" fallback.
- **FR-003**: The system MUST classify PDF files as their own distinct preview type (no longer grouped under "binary") and render their pages inline in the content panel.
- **FR-004**: The system MUST classify SVG files as their own distinct preview type (no longer grouped under generic "image") and render them as scaled, safely-inert graphics, with a raw/source XML view available via the same toggle mechanism used for Markdown/JSON.
- **FR-005**: SVG rendering MUST NOT execute embedded scripts or fetch externally referenced resources.
- **FR-006**: The system MUST show a clear, non-crashing fallback message when a PDF or SVG file cannot be parsed/rendered (corrupted, encrypted, or extension/content mismatch), rather than a blank panel or unhandled error.
- **FR-007**: PDF and SVG previews MUST be read-only in this version; the file-edit affordance MUST NOT be offered for these types (matching current image behavior).
- **FR-008**: All PDF and SVG rendering MUST happen entirely client-side/locally, with no data sent to or fetched from any remote service, per the project's local-first principle.
- **FR-009**: The registry MUST make adding a new built-in preview type (matching extension(s), content mode, and renderer component) a self-contained addition that does not require modifying the core dispatch logic — demonstrated by PDF and SVG both being added as registry entries rather than new branches hand-woven into existing dispatch code.
- **FR-010**: Existing automated tests covering Markdown, JSON, image, code, and binary-fallback preview behavior MUST continue to pass unmodified (or with only mechanical import/path updates) after the migration.

### Key Entities *(include if feature involves data)*

- **Preview Type**: A named, mutually-exclusive classification a file's content is assigned to for preview purposes (e.g. `markdown`, `json`, `image`, `svg`, `pdf`, `text`, `binary`). Extends today's `detectFileType` output with two new distinct values (`svg`, `pdf`) split out of the current `image`/`binary` buckets.
- **Preview Renderer Registry Entry**: The framework's core unit — associates a Preview Type with (a) the content mode the server must use to deliver the file (text / base64 / none), (b) whether the type is editable, and (c) the React component responsible for rendering it.
- **Content Panel**: The existing UI surface (`ui/src/components/ContentPanel/`) that looks up the current file's Preview Type in the registry and delegates rendering to the matching entry, replacing its current inline if/else chain.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open any valid PDF file in a repo and see its pages rendered inline, with zero files that previously showed "Binary file — preview not available" now requiring a download to view (for the PDF format specifically).
- **SC-002**: A user can open any valid SVG file and see it rendered as a scaled graphic by default, and reach the raw XML source in one interaction (the same toggle already used for Markdown/JSON), with 0 of the file's embedded scripts (if any) executing.
- **SC-003**: 100% of the existing preview/viewer automated test suite (Markdown, JSON, image, code, binary-fallback) passes after the migration with no reduction in per-file test coverage below the project's 90% branch-coverage gate.
- **SC-004**: Adding PDF and SVG preview support requires zero new conditional branches added to the pre-existing dispatch code path in `ContentPanel` — both are added purely as new registry entries plus new renderer components.
- **SC-005**: Opening a corrupted or unsupported PDF/SVG file never crashes the content panel or leaves it in a blank/stuck state — it always resolves to a visible fallback message.

## Assumptions

- This version's scope is limited to the framework itself plus PDF and SVG as the two new built-in preview types. Office document formats (Word/`.docx`, PowerPoint/`.pptx`, Excel/`.xlsx`) are explicitly out of scope for this version; they are the motivating long-term examples for the framework's extensibility but are not implemented here. They continue to fall back to the existing binary "preview not available" message.
- "Customer config extensions" (a mechanism for users to register custom/third-party preview handlers, e.g. for proprietary formats) is a future direction referenced by the originating request but is explicitly out of scope for this version. This spec only requires that the internal registry design not preclude adding such a mechanism later — it does not require building the mechanism now.
- Editing is out of scope for both new types in this version ("preview... and maybe later edit them too," per the originating request). PDF has no edit affordance (matches current image behavior). SVG raw-source view is read-only.
- PDF rendering re-uses a well-established, MIT/permissive-licensed, client-side rendering library rather than a server-side conversion step, consistent with the project's local-first and dependency-justification principles (Constitution I, III).
- SVG safety (no script execution, no external fetches) is achieved through the rendering approach chosen during planning (e.g. sanitization or an inherently inert rendering method); the specific technique is a planning/implementation decision, not a spec-level requirement beyond the FR-005 outcome.
- The existing `detectFileType` binary-extension list already includes `pdf`; this version removes `pdf` from that list and gives it (and `svg`, already in the image-extension list) their own explicit preview-type classification.
- No changes to the server-side file-fetch/edit permission model are required beyond ensuring PDF and SVG are not marked editable (already the default for anything other than `markdown`/`text`).
