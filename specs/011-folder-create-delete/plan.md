# Implementation Plan: Folder Create And Delete

**Branch**: `011-folder-create-delete` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/011-folder-create-delete/spec.md`

## Summary

Add working-tree folder operations to GitLocal so users can create subfolders in the current repository folder and delete selected subfolders recursively only after a GitHub-style typed confirmation. The server remains authoritative for path validation, repository-boundary checks, folder impact counting, and filesystem mutation; the React UI adds folder-level actions, create-folder input, and a destructive confirmation dialog that requires the exact folder name.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+  
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library, Radix UI primitives  
**Storage**: None; folder state is derived from local filesystem contents, git metadata, browser URL state, and in-memory server/UI state  
**Testing**: Existing backend unit/integration suites plus targeted frontend component and app tests  
**Target Platform**: Local desktop browser served by the Node-based local server  
**Project Type**: Full-stack local web application  
**Performance Goals**: Folder create/delete view refreshes complete within 2 seconds for typical repositories; delete impact count is available before confirmation for normal project folders  
**Constraints**: Repository-relative paths only in committed docs; mutations limited to the current working tree; repository root deletion blocked; path traversal and duplicate names blocked; >=90% per-file branch coverage  
**Scale/Scope**: Current repository folder browsing, folder-list/tree actions, one create-folder operation, one recursive delete-folder operation with impact preview and typed confirmation

## Constitution Check

- `TypeScript-first`: Pass. Server and UI changes remain TypeScript.
- `Test coverage`: Pass. The feature touches filesystem mutation and destructive UI flows, so backend and frontend tests are required to maintain >=90% per-file branch coverage.
- `Local-first with Git remote exception`: Pass. All operations are local filesystem operations inside the opened repository; no network behavior is added.
- `Node.js-served React UI`: Pass.
- `Clean & useful UI`: Pass. The feature adds direct folder controls and an explicit destructive confirmation without changing the GitHub-inspired browsing model.
- `Free & open source`: Pass. No proprietary dependency is required.
- `Repository-relative paths and release documentation`: Pass. Planning artifacts use repository-relative links and paths.
- `Release branches, pre-GA versioning, and contrarian QA`: Pass for design. Release-specific version, changelog, README, and QA review work remains a later release gate if this feature ships.

## Project Structure

### Documentation (this feature)

```text
specs/011-folder-create-delete/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── folder-operations.md
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
    ├── git/
    │   └── repo.test.ts
    └── handlers/
        └── files.test.ts

ui/src/
├── App.tsx
├── components/
│   ├── AppDialogs.tsx
│   ├── ContentPanel/
│   │   └── ContentPanel.tsx
│   ├── FileTree/
│   │   ├── FileTree.tsx
│   │   └── FileTreeNode.tsx
│   └── ui/
├── services/
│   └── api.ts
└── types/
    └── index.ts
```

**Structure Decision**: Reuse the existing full-stack layout. Folder mutation helpers belong with other repository-safe filesystem helpers in `src/git/repo.ts`; HTTP handlers extend the existing file operation handler area in `src/handlers/files.ts`; UI controls integrate into the existing file tree, folder list, dialog, API, and shared type surfaces.

## Phase 0: Research Focus

- Define repository-safe folder name and path validation rules that align with current file mutation behavior.
- Decide how to count delete impact, including tracked, untracked, ignored, hidden, nested, and modified files.
- Decide the delete confirmation lifecycle, including stale-impact revalidation and partial failure messaging.
- Reuse existing API mutation and dialog patterns instead of adding a new workflow family.

## Phase 1: Design Focus

- Add shared folder operation request/result types for creation, deletion preview, and confirmed deletion.
- Add server contracts for create folder, preview folder deletion, and delete folder.
- Extend UI API services and folder browsing controls to expose create and delete actions only for current working-tree folders.
- Add a typed confirmation dialog that disables the final destructive action until the exact folder name matches.
- Refresh tree, folder listing, selected path, and affected queries after successful mutations.

## Post-Design Constitution Check

- `TypeScript-first`: Pass. All contracts and planned code are TypeScript-oriented.
- `Test coverage`: Pass. Planned artifacts identify backend and frontend coverage for validation, confirmation, stale state, and failure paths.
- `Local-first with Git remote exception`: Pass. No remote-service integration or telemetry is introduced.
- `Node.js-served React UI`: Pass.
- `Clean & useful UI`: Pass. Dialog and controls are scoped to expected folder-management workflows.
- `Repository-relative paths and release documentation`: Pass. Generated artifacts avoid contributor-local absolute paths.

## Complexity Tracking

No constitution violations are expected for this feature.
