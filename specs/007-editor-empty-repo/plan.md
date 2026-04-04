# Implementation Plan: Editor Workspace, Folder-First Main View, and Markdown Comment Hiding

**Branch**: `007-editor-empty-repo` | **Date**: 2026-04-04 | **Spec**: [/Users/ehudamiri/Documents/projects/gitlocal/specs/007-editor-empty-repo/spec.md](/Users/ehudamiri/Documents/projects/gitlocal/specs/007-editor-empty-repo/spec.md)
**Input**: Feature specification from `/Users/ehudamiri/Documents/projects/gitlocal/specs/007-editor-empty-repo/spec.md`

## Summary

Make the inline editor use the main content area more fully, hide markdown comments in rendered mode, and replace the current no-selection / folder-error experience with a folder-first content view in the main panel. When no primary file is selected, GitLocal should show the current folder's files and subfolders using a visual pattern consistent with the existing non-git folder browser, with an `Open` action on each row and double-click navigation.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+  
**Primary Dependencies**: Hono, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, Vitest, React Testing Library  
**Storage**: None; runtime state is derived from local filesystem metadata, git metadata, browser URL state, and in-memory server/UI state  
**Testing**: Vitest, React Testing Library, integration tests via existing server test suite  
**Target Platform**: Local desktop browser with Node-based local server  
**Project Type**: Full-stack web application  
**Performance Goals**: Preserve current interactive browsing responsiveness for repository and folder navigation  
**Constraints**: Offline-capable, no database, GitHub-like browsing experience, >=90% per-file branch coverage  
**Scale/Scope**: Single local repository or folder session with content-panel browsing, editing, and navigation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `Code quality`: Pass. The change fits the existing Hono + React codebase and can be implemented with typed server/client contracts plus focused tests.
- `Test-first verification`: Pass. The work can be covered with backend metadata/directory tests and UI tests for editor expansion, folder list behavior, and markdown rendering behavior.
- `Local-first product behavior`: Pass. All required signals come from local filesystem and git metadata already available to the app.
- `Simplicity`: Pass. The plan extends the current content panel instead of introducing a new navigation surface or separate editor shell.

## Project Structure

### Documentation (this feature)

```text
specs/007-editor-empty-repo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── content-panel-navigation.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── handlers/
│   └── git.ts
├── git/
│   ├── repo.ts
│   └── tree.ts
└── types.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    ├── git/
    │   └── repo.test.ts
    └── handlers/
        └── git.test.ts

ui/
└── src/
    ├── App.tsx
    ├── App.css
    ├── App.test.tsx
    ├── services/
    │   └── api.ts
    ├── types/
    │   └── index.ts
    └── components/
        └── ContentPanel/
            ├── ContentPanel.tsx
            ├── ContentPanel.test.tsx
            ├── InlineFileEditor.tsx
            └── MarkdownRenderer.tsx
```

**Structure Decision**: Keep the existing single server + single UI structure. Server work will extend repository metadata and folder listing support, while UI work will concentrate in the content panel, shared API/types, and styling/tests.

## Phase 0: Research Focus

- Confirm the minimum server metadata needed to choose between a selected file view and a folder-first main view.
- Confirm how to reuse the existing non-git folder-browser look and interaction model inside the repository content panel without duplicating logic unnecessarily.
- Confirm the safest rendered-markdown path for hiding comments only in rendered mode.

## Phase 1: Design Focus

- Define the normalized main-panel state when no file is selected, including current-folder list presentation and empty-folder messaging.
- Define the server/client contract for directory entries, including enough information for per-row `Open` actions and double-click behavior.
- Define responsive layout expectations for the larger inline editor so desktop space is used better without breaking smaller viewports.

## Complexity Tracking

No constitution violations are expected for this feature.
