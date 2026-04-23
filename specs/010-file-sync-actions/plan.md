# Implementation Plan: File Sync Indicators and Commit/Remote Actions

**Branch**: `010-file-sync-actions` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/010-file-sync-actions/spec.md`

## Summary

Extend GitLocal with per-file sync indicators for uncommitted local changes, local-only commits, upstream-only commits, and divergence, then add repository-level commit and sync actions in the header. The server remains authoritative for git status and upstream comparisons, while the client renders compact badges and guarded action dialogs.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+  
**Primary Dependencies**: Hono, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library, Radix UI primitives  
**Storage**: None; sync state is derived from the working tree, git refs, and in-memory UI state  
**Testing**: Existing backend unit/integration suites plus targeted frontend component and app tests  
**Target Platform**: Local desktop browser served by the Node-based local server  
**Project Type**: Full-stack web application  
**Constraints**: No background remote polling, remote operations only through local `git`, no silent merge/rebase behavior, >=90% per-file branch coverage  
**Scale/Scope**: Current-repository sync metadata, header actions, file-tree and folder-list badges, focused commit/sync dialogs

## Constitution Check

- `TypeScript-first`: Pass.
- `Test coverage`: Pass. The feature touches git state and needs targeted backend/frontend coverage.
- `Local-first with Git remote exception`: Pass. Remote sync remains explicitly user-initiated and runs through local Git commands only.
- `Node.js-served React UI`: Pass.
- `Clean & useful UI`: Pass. The indicators and actions are designed to reduce ambiguity rather than add hidden git behavior.
- `Repository-relative paths`: Pass.

## Project Structure

### Documentation (this feature)

```text
specs/010-file-sync-actions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── sync-and-commit.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── git/
│   └── repo.ts
├── handlers/
│   ├── files.ts
│   ├── git.ts
│   └── sync.ts
├── services/
│   └── repo-watch.ts
├── server.ts
└── types.ts

ui/src/
├── App.tsx
├── services/api.ts
├── types/index.ts
└── components/
    ├── FileTree/
    ├── ContentPanel/
    └── RepoContext/
```

## Phase 0: Research Focus

- Define a small per-file sync-state model that can be shared by tree rows, folder rows, and selected-file context.
- Confirm safe repository-level sync behavior for ahead-only, behind-only, dirty, and diverged cases.
- Reuse the existing dialog/button foundation for commit and sync actions instead of introducing a new UI pattern family.

## Phase 1: Design Focus

- Extend `TreeNode` and `SyncStatus` with shared sync metadata.
- Add one commit mutation and one remote-sync mutation to the git handlers/contracts.
- Wire repo-header actions and file-row badges against the server-owned sync model.

## Complexity Tracking

No constitution violations are expected for this feature.
