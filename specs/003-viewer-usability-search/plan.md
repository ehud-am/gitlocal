# Implementation Plan: Viewer Usability and Search

**Branch**: `003-viewer-usability-search` | **Date**: 2026-03-31 | **Spec**: [specs/003-viewer-usability-search/spec.md](specs/003-viewer-usability-search/spec.md)
**Input**: Feature specification from `specs/003-viewer-usability-search/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Improve GitLocal's core repository-browsing workflow by adding one-click copy actions for rendered code blocks and raw files, enabling double-click activation in folder selection, preserving repository context across browser refreshes, auto-refreshing tree and file views when the local filesystem changes, allowing the sidebar to collapse and restore, and introducing explicit repository search modes for names and file contents with case-matching controls. The implementation will extend the existing Hono API and React SPA without adding a remote dependency, using URL-backed viewer state, local repository change detection, and focused UI contracts for search and recovery behavior.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI  
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, esbuild  
**Storage**: No database; all runtime state is derived from the local filesystem, git metadata, URL state, and in-memory server process state  
**Testing**: Vitest for backend and frontend, React Testing Library for UI behavior, repository integration tests for server endpoints and context recovery flows  
**Target Platform**: Local desktop browser sessions on macOS, Windows, and Linux, served by the Node.js CLI process  
**Project Type**: Local-first CLI application with a Node.js-served React single-page app  
**Performance Goals**: Copy actions should feel immediate, refresh should restore the previous view in one navigation cycle, filesystem-driven UI refresh should surface visible changes within a few seconds, and repository search should return useful initial results quickly enough for interactive use on normal local repositories  
**Constraints**: Fully local runtime only, preserve the existing GitLocal visual language, maintain at least 90% per-file coverage, avoid introducing platform-specific file picker behavior, keep repository browsing understandable for non-developers, use repository-relative paths in committed docs, and degrade gracefully when files or folders disappear during use  
**Scale/Scope**: Single open repository at a time, one active viewer context per browser tab, filesystem monitoring limited to the currently open repository, search scoped to the open repository, and focused API/UI changes within the existing server and SPA architecture

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First**: Pass. All planned runtime and UI changes stay within the existing TypeScript/Node.js stack.
- **Test Coverage**: Pass. The feature touches interactive UI and server handlers, so the plan includes matching backend and frontend tests to preserve the ≥90% per-file coverage bar.
- **Fully Local**: Pass. Refresh persistence, monitoring, and search all operate on local repository data only; no remote services are introduced.
- **Node.js-Served React UI**: Pass. The entire feature is delivered through the existing React SPA served by the Hono backend.
- **Clean & Useful UI**: Pass. The design emphasizes discoverable copy actions, predictable search modes, graceful fallback states, and reduced navigation friction.
- **Free & Open Source**: Pass. No proprietary dependencies or gated services are required.
- **Repository-Relative Paths**: Pass. This plan and the generated artifacts use repository-relative paths suitable for commit history and GitHub rendering.

**Post-Design Check**: Pass. The research decisions, data model, contracts, and quickstart keep the product local-first, TypeScript-only, and UI-focused while preserving repository-relative documentation and explicit test coverage expectations.

## Project Structure

### Documentation (this feature)

```text
specs/003-viewer-usability-search/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── clipboard-and-picker.md
│   ├── repository-search.md
│   └── viewer-state-and-sync.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── server.ts
├── types.ts
├── git/
│   ├── repo.ts
│   └── tree.ts
├── handlers/
│   ├── files.ts
│   ├── git.ts
│   ├── pick.ts
│   ├── search.ts
│   └── sync.ts
└── services/
    └── repo-watch.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    ├── git/
    └── handlers/

ui/
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── services/
│   │   ├── api.ts
│   │   └── viewerState.ts
│   ├── types/
│   │   └── index.ts
│   └── components/
│       ├── ContentPanel/
│       │   ├── ContentPanel.tsx
│       │   ├── CodeViewer.tsx
│       │   ├── MarkdownRenderer.tsx
│       │   └── CopyButton.tsx
│       ├── FileTree/
│       │   ├── FileTree.tsx
│       │   └── FileTreeNode.tsx
│       ├── Picker/
│       │   └── PickerPage.tsx
│       ├── Search/
│       │   ├── SearchPanel.tsx
│       │   └── SearchResults.tsx
│       └── GitInfo/
│           └── GitInfo.tsx
└── package.json
```

**Structure Decision**: Keep the existing single-repository Hono + React structure and add focused backend handlers/services plus a small set of UI components for copy controls, viewer state, and search. Filesystem synchronization logic belongs on the backend so the UI can stay declarative and poll lightweight sync state. URL state helpers live in the UI service layer so refresh recovery, sidebar collapse, selected branch, selected file, raw mode, and active search mode are all restored consistently.

## Complexity Tracking

No constitutional violations or exceptional complexity allowances are required for this feature.
