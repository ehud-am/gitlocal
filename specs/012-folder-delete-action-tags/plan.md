# Implementation Plan: Folder Delete Action And Compact Tags

**Branch**: `012-folder-delete-action-tags` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/012-folder-delete-action-tags/spec.md`

## Summary

Move folder deletion out of the left navigation row icon and into the main folder view action area, styled as a destructive outline action near the existing create actions. Compact left navigation status tags by shortening labels such as "local only" to "local" and reducing tag visual weight while preserving scanability and status meaning.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library, Radix UI primitives
**Storage**: None; UI state is derived from local filesystem metadata, git metadata, browser URL state, and in-memory server/UI state
**Testing**: Existing frontend component/app tests plus backend verification where contracts are reused
**Target Platform**: Local desktop browser served by the Node-based local server
**Project Type**: Full-stack local web application with a React repository browser UI
**Performance Goals**: Folder view actions and left-panel tags render without perceptible delay; compact tags must not introduce layout shifts during normal tree browsing
**Constraints**: Repository-relative paths in committed docs; no change to recursive delete confirmation safety; repository root deletion remains unavailable; >=90% per-file branch coverage
**Scale/Scope**: Reposition one existing destructive folder action, preserve existing delete confirmation behavior, and compact left-panel status tags across visible tree/list rows

## Constitution Check

- `TypeScript-first`: Pass. Planned implementation stays in TypeScript for the existing UI and shared types.
- `Test coverage`: Pass. UI behavior changes require targeted React tests and must preserve >=90% per-file coverage.
- `Local-first with Git remote exception`: Pass. The feature only changes local UI placement and display labels; no network behavior is added.
- `Node.js-served React UI`: Pass. The existing React UI remains served by the Node backend.
- `Clean & useful UI`: Pass. The change reduces visual noise and places the destructive action in a clearer contextual area.
- `Free & open source`: Pass. No new proprietary dependency is required.
- `Repository-relative paths and release documentation`: Pass. Planning artifacts use repository-relative paths.
- `Release branches, pre-GA versioning, and contrarian QA`: Pass for planning. Release-specific version, changelog, README review, and contrarian QA remain release gates if this feature ships.

## Project Structure

### Documentation (this feature)

```text
specs/012-folder-delete-action-tags/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── folder-view-actions.md
└── tasks.md
```

### Source Code (repository root)

```text
ui/src/
├── App.tsx
├── components/
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

tests/
└── unit/ and integration coverage for reused folder delete contracts

ui/src/*.test.tsx
ui/src/components/**/*.test.tsx
```

**Structure Decision**: Reuse the existing React application surfaces. The delete entry point belongs with current folder actions in the main content/folder view, while left-panel tag sizing and wording remain in the tree/list row components that already render navigation metadata. Existing folder delete API contracts and confirmation dialog are reused rather than redesigned.

## Phase 0: Research Focus

- Decide where the main folder delete action should appear relative to existing create actions.
- Decide the destructive outline visual treatment and disabled/hidden rules.
- Decide compact status tag wording and sizing rules for left-panel rows.
- Confirm the move does not change recursive deletion confirmation safety.

## Phase 1: Design Focus

- Model folder view actions, left navigation tags, and deletable-folder eligibility.
- Define a UI contract for main-view delete action visibility, styling, and confirmation handoff.
- Define compact tag label mapping and readability requirements.
- Write a manual quickstart that validates placement, root/file exclusions, destructive styling, typed confirmation reuse, and compact tag scanability.

## Post-Design Constitution Check

- `TypeScript-first`: Pass. Design remains within the existing TypeScript UI.
- `Test coverage`: Pass. Planned contracts identify UI tests for placement, removal from left panel, destructive styling, and tag labels.
- `Local-first with Git remote exception`: Pass. No remote behavior is introduced.
- `Node.js-served React UI`: Pass.
- `Clean & useful UI`: Pass. The design makes a destructive command clearer and reduces left-panel clutter.
- `Repository-relative paths and release documentation`: Pass. Generated artifacts avoid contributor-local absolute paths.

## Complexity Tracking

No constitution violations are expected for this feature.
