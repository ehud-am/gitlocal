# Implementation Plan: Accurate Version Display and Code Line Numbers

**Branch**: `005-version-line-numbers` | **Date**: 2026-04-02 | **Spec**: `specs/005-version-line-numbers/spec.md`
**Input**: Feature specification from `specs/005-version-line-numbers/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix two presentation issues in GitLocal's viewer shell: ensure the footer always displays the real running release version from a single runtime source of truth, and add readable left-side line numbers to code-oriented content surfaces without changing non-code presentations. The implementation stays within the existing Node.js + React app, tightening version propagation through the existing metadata flow and extending the code viewer rendering/styling so numbered code remains aligned and copy-friendly.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI  
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 7, react-markdown, rehype-highlight, highlight.js, Vitest, React Testing Library, esbuild  
**Storage**: No database; runtime state comes from local filesystem metadata, git metadata, build/package metadata, URL state, and in-memory server state  
**Testing**: Vitest for backend and frontend, React Testing Library for UI behavior, server integration tests for metadata responses  
**Target Platform**: Local desktop browser sessions on macOS, Windows, and Linux, served by the local Node.js process  
**Project Type**: Local-first CLI application with a Node.js-served React single-page app  
**Performance Goals**: Footer version rendering should remain immediate on initial page load, and line-numbered code views should preserve current reading responsiveness for ordinary repository files without noticeable layout lag  
**Constraints**: Fully local runtime only, preserve the existing GitHub-like visual language, maintain at least 90% per-file coverage, keep committed docs repository-relative, avoid introducing a second independent version source, and preserve existing code-copy, markdown, and raw-view behavior aside from the new numbering treatment  
**Scale/Scope**: Single open repository at a time, one running app version shown across all screens, and code-numbering changes limited to existing code-oriented viewer surfaces in the current SPA

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First**: Pass. The work stays entirely inside the existing TypeScript server and React UI.
- **Test Coverage**: Pass. The plan includes focused backend and frontend tests for version metadata and numbered code rendering to preserve the ≥90% per-file bar.
- **Fully Local**: Pass. Version data remains local build/runtime metadata and line numbering is purely local presentation logic.
- **Node.js-Served React UI**: Pass. The feature extends the existing Hono-served React SPA without changing architecture.
- **Clean & Useful UI**: Pass. The change improves trust in footer metadata and readability of code content while preserving the existing minimal UI language.
- **Free & Open Source**: Pass. No new proprietary or gated dependencies are introduced.
- **Repository-Relative Paths**: Pass. All generated planning artifacts use repository-relative paths.

**Post-Design Check**: Pass. The design keeps a single runtime version source, uses lightweight UI contracts for numbered code rendering, and stays within the local TypeScript/React architecture and documentation path rules.

## Project Structure

### Documentation (this feature)

```text
specs/005-version-line-numbers/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── viewer-presentation.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── git/
│   └── repo.ts
├── handlers/
│   └── git.ts
└── types.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    └── handlers/
        └── git.test.ts

ui/
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── types/
│   │   └── index.ts
│   └── components/
│       ├── AppFooter.tsx
│       └── ContentPanel/
│           ├── CodeViewer.tsx
│           ├── ContentPanel.tsx
│           ├── ContentPanel.test.tsx
│           ├── MarkdownRenderer.tsx
│           └── MarkdownRenderer.test.tsx
```

**Structure Decision**: Keep the change within the existing single-repository Hono + React structure. Server-side app metadata continues to originate in `src/git/repo.ts` and flow through the existing info payload, while the UI removes hardcoded footer-version fallbacks and adds a reusable numbered-code presentation inside the existing content-panel components and shared styles.

## Complexity Tracking

No constitutional violations or exceptional complexity allowances are required for this feature.
