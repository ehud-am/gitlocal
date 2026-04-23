# Tasks: File Sync Indicators and Commit/Remote Actions

**Input**: Design documents from `specs/010-file-sync-actions/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

## Phase 1: Foundation

- [ ] T001 Extend shared sync and mutation contracts in `src/types.ts` and `ui/src/types/index.ts`
- [ ] T002 Extend the frontend API client for commit and sync actions in `ui/src/services/api.ts`
- [ ] T003 Add git helpers for file sync classification, commit creation, and upstream sync in `src/git/repo.ts`
- [ ] T004 Register and implement commit/sync handlers in `src/handlers/git.ts` and `src/server.ts`
- [ ] T005 Extend sync and tree responses with file/repo sync metadata in `src/services/repo-watch.ts`, `src/handlers/sync.ts`, `src/git/tree.ts`, and `src/handlers/files.ts`

## Phase 2: UI

- [ ] T006 Render file sync badges in `ui/src/components/FileTree/FileTreeNode.tsx` and `ui/src/components/ContentPanel/ContentPanel.tsx`
- [ ] T007 Add repository-level commit and sync actions in `ui/src/components/RepoContext/RepoContextHeader.tsx`
- [ ] T008 Wire commit/sync dialogs, mutation flows, and refresh behavior in `ui/src/App.tsx`

## Phase 3: Verification

- [ ] T009 Add backend coverage in `tests/unit/git/repo.test.ts`, `tests/unit/handlers/git.test.ts`, and `tests/integration/server.test.ts`
- [ ] T010 Add frontend coverage in `ui/src/components/FileTree/FileTree.test.tsx`, `ui/src/components/ContentPanel/ContentPanel.test.tsx`, `ui/src/components/RepoContext/RepoContextHeader.test.tsx`, and `ui/src/App.test.tsx`
- [ ] T011 Run targeted verification for the touched backend and frontend suites
