# Implementation Plan: Manual Local File Editing

**Branch**: `006-manual-file-editing` | **Date**: 2026-04-04 | **Spec**: `specs/006-manual-file-editing/spec.md`
**Input**: Feature specification from `specs/006-manual-file-editing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a lightweight manual editing workflow to GitLocal so users can make small local file changes without leaving the app: edit existing text files, create new files, and delete files safely. The implementation stays inside the current Hono + React architecture by extending the file handler surface with guarded working-tree mutation endpoints, teaching the working-tree tree view to reflect real filesystem state, and layering a small inline editor flow into the existing content panel with conflict and unsaved-change protection.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI  
**Primary Dependencies**: Hono, @hono/node-server, React 18, @tanstack/react-query, Vite 7, Vitest, React Testing Library, esbuild  
**Storage**: No database; runtime state is derived from the local filesystem, git metadata, browser URL state, and in-memory server/UI state  
**Testing**: Vitest for backend and frontend, React Testing Library for UI workflows, Hono integration tests for file API behavior  
**Target Platform**: Local desktop browser sessions on macOS, Windows, and Linux, served by the local Node.js process  
**Project Type**: Local-first CLI application with a Node.js-served React single-page app  
**Performance Goals**: File create, update, and delete actions should complete fast enough to feel immediate for ordinary text files, and the file tree should reflect successful changes without a full page reload  
**Constraints**: Fully local runtime only, maintain at least 90% per-file coverage, keep generated artifacts repository-relative, preserve GitLocal's lightweight GitHub-like browsing experience, restrict mutation to the current working tree, and avoid expanding the feature into a multi-file IDE workflow  
**Scale/Scope**: One open repository at a time, one active inline edit session in the content area, and lightweight text-file operations only for the current working-tree branch

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First**: Pass. All planned server and UI work remains in the existing TypeScript codebase.
- **Test Coverage**: Pass. The plan includes backend handler tests, tree behavior tests, and UI workflow tests to preserve the ≥90% per-file requirement.
- **Fully Local**: Pass. File reads and mutations operate only on the local filesystem within the opened repository.
- **Node.js-Served React UI**: Pass. The feature extends the existing Hono-served SPA rather than changing the product architecture.
- **Clean & Useful UI**: Pass. The editing workflow stays focused on small manual interventions and avoids turning the app into a full IDE.
- **Free & Open Source**: Pass. No new proprietary or gated dependencies are introduced.
- **Repository-Relative Paths**: Pass. All generated planning artifacts use repository-relative paths.

**Post-Design Check**: Pass. The design stays within the local TypeScript/React architecture, uses server-truth refresh after mutations, and explicitly bounds the UI to a single lightweight edit flow rather than IDE-scale editing.

## Project Structure

### Documentation (this feature)

```text
specs/006-manual-file-editing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── manual-file-operations.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── git/
│   ├── repo.ts
│   └── tree.ts
├── handlers/
│   └── files.ts
├── server.ts
└── types.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    └── handlers/
        └── files.test.ts

ui/
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   └── components/
│       ├── ContentPanel/
│       │   ├── ContentPanel.tsx
│       │   ├── ContentPanel.test.tsx
│       │   └── [new lightweight editor helpers as needed]
│       └── FileTree/
│           ├── FileTree.tsx
│           └── FileTree.test.tsx
```

**Structure Decision**: Keep the feature inside the current single-project Hono + React layout. Server-side repository and path safety logic stays centralized in `src/git/` and `src/handlers/files.ts`, while the UI work remains in the existing content panel, file tree, shared API client, and app-level selection/query refresh flow.

## Complexity Tracking

No constitutional violations or exceptional complexity allowances are required for this feature.
