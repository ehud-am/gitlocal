# Implementation Plan: Copy Control Polish

**Branch**: `004-copy-control-polish` | **Date**: 2026-03-31 | **Spec**: [specs/004-copy-control-polish/spec.md](specs/004-copy-control-polish/spec.md)
**Input**: Feature specification from `specs/004-copy-control-polish/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Refine GitLocal's existing copy affordances so they feel lighter and more intentional: replace text-based copy buttons with a standard copy icon, keep the raw-file full-copy action available, and ensure rendered markdown shows copy controls only for code blocks. The implementation stays entirely in the existing React content-panel layer, reusing the current clipboard interaction while tightening where and how the control appears.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI  
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, esbuild  
**Storage**: No database; runtime state is derived from the filesystem, git metadata, browser URL state, and in-memory UI state  
**Testing**: Vitest for backend and frontend, React Testing Library for UI behavior, existing content-panel tests extended for copy-control rendering and clipboard behavior  
**Target Platform**: Local desktop browser sessions on macOS, Windows, and Linux, served by the Node.js CLI process  
**Project Type**: Local-first CLI application with a Node.js-served React single-page app  
**Performance Goals**: Copy controls should remain visually lightweight, appear without delaying content render, and complete clipboard actions on the first interaction under normal browser permission conditions  
**Constraints**: Fully local runtime only, preserve the existing GitLocal minimal UI language, maintain at least 90% per-file coverage, avoid broadening copy behavior beyond existing raw-file and markdown-code targets, and use repository-relative paths in committed docs  
**Scale/Scope**: One visible raw-file copy control per raw view, one visible copy control per markdown code block, and no server-side API or persistence changes required for this polish iteration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First**: Pass. The work remains inside the existing TypeScript React UI and does not introduce any other runtime.
- **Test Coverage**: Pass. The plan explicitly extends UI tests for copy-control rendering, accessibility text, and clipboard behavior to preserve the ≥90% per-file coverage rule.
- **Fully Local**: Pass. Clipboard interaction remains fully local and does not introduce any remote calls or telemetry.
- **Node.js-Served React UI**: Pass. The feature is entirely delivered through the existing React SPA served by the Node.js backend.
- **Clean & Useful UI**: Pass. The change reduces visual noise in markdown rendering and aligns copy controls across markdown and raw views.
- **Free & Open Source**: Pass. No new proprietary or incompatible dependency is needed.
- **Repository-Relative Paths**: Pass. All planning artifacts use repository-relative paths suitable for sharing and commit history.

**Post-Design Check**: Pass. The resulting design keeps the feature UI-only, local-first, testable, and consistent with the project's repository-relative documentation rules.

## Project Structure

### Documentation (this feature)

```text
specs/004-copy-control-polish/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── copy-controls.md
└── tasks.md
```

### Source Code (repository root)

```text
ui/src/
├── App.css
├── components/
│   └── ContentPanel/
│       ├── CodeViewer.tsx
│       ├── ContentPanel.test.tsx
│       ├── ContentPanel.tsx
│       ├── CopyButton.tsx
│       ├── MarkdownRenderer.test.tsx
│       └── MarkdownRenderer.tsx
├── services/
│   └── api.ts
└── types/
    └── index.ts
```

**Structure Decision**: Keep the implementation inside the existing content-panel UI components. `MarkdownRenderer.tsx` governs which rendered markdown elements expose copy controls, `CopyButton.tsx` becomes the shared icon-based affordance with accessible labels and status feedback, `CodeViewer.tsx` and `ContentPanel.tsx` continue to anchor raw-file copy behavior, and the related UI tests absorb the new rendering and clipboard expectations. No backend file changes are required unless implementation reveals an unexpected coupling.

## Complexity Tracking

No constitutional violations or exceptional complexity allowances are required for this feature.
