# Implementation Plan: Ignored Local File Visibility

**Branch**: `008-ignored-files-visibility` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/008-ignored-files-visibility/spec.md`

## Summary

Surface ignored local files and folders in GitLocal's current working-tree browsing flows without making them look tracked. The implementation will extend shared tree and search entry metadata with a local-only flag, keep historical branch views unchanged, count visible ignored items when deciding whether a repository or folder is empty, and render a consistent local-only cue across the file tree, folder list, search results, and active item context.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+  
**Primary Dependencies**: Hono, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library  
**Storage**: None; runtime state is derived from local filesystem contents, git metadata, browser URL state, and in-memory server/UI state  
**Testing**: Vitest, React Testing Library, existing unit and integration test suites  
**Target Platform**: Local desktop browser served by the Node-based local server  
**Project Type**: Full-stack web application  
**Performance Goals**: Preserve current interactive browsing and search responsiveness for typical local repositories while adding local-only metadata  
**Constraints**: Offline-capable, no database, no remote calls, GitHub-like browsing clarity, >=90% per-file branch coverage, repository-relative documentation only  
**Scale/Scope**: Single local repository session with tree browsing, folder navigation, active file viewing, and quick file search

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `TypeScript-first`: Pass. The feature extends existing TypeScript server and React client types instead of adding a parallel model layer.
- `Test coverage`: Pass. The change fits the current unit, handler, integration, and UI test suites and can preserve the required per-file coverage thresholds.
- `Fully local`: Pass. Ignored-item detection and presentation rely only on local filesystem and local git metadata.
- `Node.js-served React UI`: Pass. The work stays within the existing Hono server and Vite-served React SPA.
- `Clean & useful UI`: Pass. The plan adds a lightweight, consistent local-only cue rather than introducing a separate status workflow or visually noisy warning system.
- `Repository-relative paths`: Pass. This plan and the generated artifacts use repository-relative paths and links suitable for contributors on other machines.
- `Post-Phase-1 re-check`: Pass. The research, data model, quickstart, and contracts keep the feature local, typed, testable, and scoped to the existing browsing experience with no constitution violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/008-ignored-files-visibility/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── local-only-visibility.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── handlers/
│   ├── files.ts
│   ├── git.ts
│   └── search.ts
├── git/
│   ├── repo.ts
│   └── tree.ts
└── types.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    ├── git/
    │   ├── repo.test.ts
    │   └── tree.test.ts
    └── handlers/
        ├── git.test.ts
        └── search.test.ts

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
        ├── ContentPanel/
        │   ├── ContentPanel.tsx
        │   └── ContentPanel.test.tsx
        ├── FileTree/
        │   ├── FileTree.tsx
        │   ├── FileTree.test.tsx
        │   └── FileTreeNode.tsx
        └── Search/
            ├── SearchPanel.test.tsx
            └── SearchResults.tsx
```

**Structure Decision**: Keep the existing single server + single UI structure. Server work will enrich current working-tree entry/search metadata and root-entry counting, while UI work will apply a shared local-only presentation across the tree, folder list, search results, and active item context.

## Phase 0: Research Focus

- Choose the smallest shared server/client metadata shape that can mark ignored local items across tree entries, folder rows, and search results.
- Confirm how to enumerate current working-tree items so ignored files and ignored folders become visible while repository internals remain hidden.
- Confirm how repository-empty logic should treat ignored visible items so ignored-only roots and folders do not render misleading empty states.

## Phase 1: Design Focus

- Define the normalized browse-entry and search-result shapes, including the local-only flag used by both server and UI.
- Define cue placement and wording for the file tree, content-panel directory list, search results, and active item header so users understand the item remains local.
- Define the verification approach for ignored files, ignored directories, ignored-only roots, and transitions where an item's local-only status changes or the item disappears.

## Complexity Tracking

No constitution violations are expected for this feature.
