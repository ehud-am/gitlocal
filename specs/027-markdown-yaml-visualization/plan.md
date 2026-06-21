# Implementation Plan: Markdown YAML Visualization

**Branch**: `027-markdown-yaml-visualization` | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/027-markdown-yaml-visualization/spec.md`

## Summary

Improve rendered Markdown reading for files that begin with YAML front matter by splitting recognized front matter from the Markdown body, showing the metadata in a distinct structured area, and rendering only the remaining body through the Markdown renderer. The implementation stays in the existing React content panel, adds focused parsing/model helpers for front matter, extends Markdown renderer tests and styling, and preserves source, copy, share, search, image, link, and navigation behavior.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI; React 18 TypeScript UI  
**Primary Dependencies**: Existing React 18, Vite, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, React Testing Library; no new runtime dependency planned  
**Storage**: No new storage; front matter presentation is derived from the currently loaded Markdown file content  
**Testing**: Vitest, React Testing Library, existing UI coverage setup  
**Target Platform**: Local browser UI served by GitLocal and the shared macOS wrapper hosting the same UI  
**Project Type**: Local-first repository viewer with React frontend and Node.js-served static app  
**Performance Goals**: Front matter detection and rendering remains immediate for normal Markdown files and representative skill files; no additional file or network request is introduced  
**Constraints**: Preserve source text access; do not alter saved file content; do not change backend APIs; no new database or persistent preferences; maintain 90% per-file coverage  
**Scale/Scope**: One Markdown rendering improvement affecting files opened in the content panel; representative scope includes skill files, specs, README-like docs, and Markdown files without front matter

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: Pass. Work stays in the existing TypeScript/React UI and does not introduce another runtime.
- **II. Test Coverage**: Pass. Plan includes unit coverage for parsing/model helpers and renderer coverage for valid, malformed, and non-front-matter documents.
- **III. Local-First with Git Remote Exception**: Pass. Feature uses already-loaded local file content and adds no network behavior.
- **IV. Node.js-Served React UI**: Pass. The existing React SPA remains the only product surface touched.
- **V. Clean & Useful UI**: Pass. Feature improves Markdown readability while preserving GitHub-Flavored Markdown behavior for the body.
- **VI. Free & Open Source**: Pass. No proprietary services or paid dependencies are introduced.
- **VII. Repository-Relative Paths and Release Documentation**: Pass. Planning artifacts use repository-relative paths only.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: Pass. No release is being cut in this planning phase; implementation must still pass normal verification before release.

## Project Structure

### Documentation (this feature)

```text
specs/027-markdown-yaml-visualization/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── markdown-frontmatter-ui.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
ui/src/components/ContentPanel/
├── MarkdownRenderer.tsx                 # Render metadata area plus Markdown body
├── MarkdownRenderer.test.tsx            # UI regression coverage for front matter rendering
├── markdown-frontmatter.ts              # Front matter detection and metadata view model helper
├── markdown-frontmatter.test.ts         # Helper coverage for valid, malformed, and ordinary Markdown
├── markdown-output.ts                   # Confirm output helpers preserve raw Markdown/source behavior
└── markdown-output.test.ts              # Add regression coverage if output title/plain text needs body-only behavior

ui/src/styles/
├── globals.css                          # Metadata visualization styling
└── globals.test.ts                      # Style selector regression coverage if existing pattern applies
```

**Structure Decision**: Use the existing content panel Markdown renderer and tests. Add one local helper module if implementation needs a reusable front matter model; keep backend, file API, and macOS wrapper untouched because the shared UI handles both distributions.

## Complexity Tracking

No constitution violations or complexity exceptions.

## Phase 0: Research

Research completed in [research.md](./research.md). Key decision: split start-of-file front matter before Markdown rendering, present metadata in a compact structured metadata panel, and render the body separately so front matter delimiters cannot distort Markdown formatting.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md): Front matter, Markdown body, and metadata display state model.
- [contracts/markdown-frontmatter-ui.md](./contracts/markdown-frontmatter-ui.md): User-facing UI contract and regression expectations.
- [quickstart.md](./quickstart.md): Implementation verification workflow.

## Post-Design Constitution Check

- **TypeScript/UI scope** remains unchanged and dependency-free.
- **Coverage and QA** are addressed by helper tests, renderer tests, and focused UI verification against representative Markdown samples.
- **Local-first behavior** is unaffected because parsing is derived from loaded file text only.
- **Clean Markdown reading** is directly improved and raw source remains available.
- **Repository-relative documentation** is maintained across generated artifacts.

Result: Pass.
