# Implementation Plan: JSON Document Viewer

**Branch**: `031-json-viewer` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/031-json-viewer/spec.md`

## Summary

Add a pretty, structured rendering for `.json` files in the content panel, following the same view/raw/edit pattern already used for Markdown. The server-side file-type detector gains a `json` type alongside `markdown`/`text`/`image`/`binary`. A new lightweight, dependency-free JSON tree parser and renderer (modeled directly on the existing Markdown front-matter metadata parser/view) renders valid JSON as a collapsible key/value/array tree by default. Users toggle to the existing raw code view (unchanged, still syntax-highlighted) using the same control already used for Markdown, and edit JSON the same way any other text file is edited today, with a non-blocking warning if saved content is not valid JSON. Malformed JSON always falls back to raw view rather than showing a broken pane.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI; React 18 TypeScript UI
**Primary Dependencies**: Existing React 18, Vite, @tanstack/react-query, highlight.js (already used by `CodeViewer` for JSON syntax highlighting), Vitest, React Testing Library; no new runtime dependency planned
**Storage**: No new storage; JSON pretty-view state is derived from the currently loaded file content, same as Markdown
**Testing**: Vitest, React Testing Library, existing UI and server coverage setup
**Target Platform**: Local browser UI served by GitLocal and the shared macOS wrapper hosting the same UI
**Project Type**: Local-first repository viewer with React frontend and Node.js-served static app
**Performance Goals**: Pretty-view parsing and rendering stays immediate for typical config-sized JSON files; large/deeply nested documents remain responsive via collapsible sections, consistent with how the product already handles large Markdown/text files
**Constraints**: Preserve source text access; do not alter saved file content on view (only on explicit edit+save); do not change unrelated file-type behavior; no new database or persistent preferences; maintain 90% per-file coverage
**Scale/Scope**: One new content type (`json`) touching file-type detection, the content panel dispatch, one new parser module, one new renderer component, and the existing inline editor's save path; representative scope includes `package.json`-style config files, small and large arrays, deeply nested objects, and malformed JSON

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: Pass. Work stays in the existing TypeScript server (`detectFileType`) and TypeScript/React UI; no new runtime or dependency.
- **II. Test Coverage**: Pass. Plan includes unit coverage for the JSON tree parser (valid, malformed, edge-case values) and renderer/dispatch coverage in `ContentPanel`, at 90% per-file.
- **III. Local-First with Git Remote Exception**: Pass. Feature parses already-loaded local file content; adds no network behavior.
- **IV. Node.js-Served React UI**: Pass. The existing React SPA remains the only product surface touched.
- **V. Clean & Useful UI**: Pass. Directly improves readability of a very common file type while preserving raw/edit access.
- **VI. Free & Open Source**: Pass. No proprietary services or paid dependencies introduced.
- **VII. Repository-Relative Paths and Release Documentation**: Pass. Planning artifacts use repository-relative paths only.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: Pass. No release is being cut in this planning phase; implementation must still pass normal verification (and a contrarian QA pass) before any release.

## Project Structure

### Documentation (this feature)

```text
specs/031-json-viewer/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   └── json-viewer-ui.md            # Phase 1 output: user-facing UI contract
└── checklists/
    └── requirements.md              # Spec quality checklist
```

### Source Code (repository root)

```text
src/git/
└── repo.ts                          # detectFileType: add 'json' type detection

tests/unit/git/
└── repo.test.ts                     # Coverage for .json → type 'json', language 'json'

ui/src/types/
└── index.ts                        # FileContentType: add 'json'

ui/src/components/ContentPanel/
├── json-tree.ts                    # New: parse JSON text into a display tree (pure, no deps)
├── json-tree.test.ts               # New: coverage for objects, arrays, scalars, nesting, malformed input
├── JSONViewer.tsx                  # New: recursive collapsible pretty-view component
├── JSONViewer.test.tsx             # New: rendering, expand/collapse, empty-file, malformed fallback
├── ContentPanel.tsx                # Dispatch: render JSONViewer for type 'json' + !showRaw;
│                                   # extend canToggleRaw; add soft JSON-validity warning in handleSaveEdit
└── ContentPanel.test.tsx           # Extend: JSON dispatch, raw toggle, edit-save warning coverage

ui/src/styles/
└── globals.css                     # Add json-tree-* styles, modeled on existing markdown-metadata-* styles
```

**Structure Decision**: Single existing web application (`src/` Node/TypeScript backend + `ui/` React frontend). No new project or package boundary is introduced. The feature reuses the existing content-panel dispatch, raw/edit toggle mechanism, and inline editor; it adds one new parser module and one new presentational component, following the same shape as the existing Markdown front-matter parser (`markdown-frontmatter.ts`) and its view (`MetadataEntryView` in `MarkdownRenderer.tsx`).

## Complexity Tracking

No constitution violations or complexity exceptions.

## Phase 0: Research

Research completed in [research.md](./research.md). Key decision: parse JSON with the built-in `JSON.parse` (no new dependency), build a small typed tree structure analogous to the existing Markdown metadata entries, and render it with a recursive component supporting per-node collapse/expand; fall back to the existing raw `CodeViewer` whenever parsing fails.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md): JSON document, parsed tree node, and view-mode state model.
- [contracts/json-viewer-ui.md](./contracts/json-viewer-ui.md): User-facing UI contract and regression expectations.
- [quickstart.md](./quickstart.md): Implementation verification workflow.

## Post-Design Constitution Check

- **TypeScript/UI scope** remains unchanged and dependency-free.
- **Coverage and QA** are addressed by parser tests, renderer tests, dispatch tests, and focused UI verification against representative JSON samples.
- **Local-first behavior** is unaffected because parsing is derived from already-loaded file text only.
- **Clean, useful UI** is directly improved for a very common file type while raw/edit access is fully preserved.
- **Repository-relative documentation** is maintained across generated artifacts.

Result: Pass.
