# Implementation Plan: Viewer Usability Upgrades

**Branch**: `025-viewer-usability-upgrades` | **Date**: 2026-06-11 | **Spec**: `specs/025-viewer-usability-upgrades/spec.md`
**Input**: Feature specification from `specs/025-viewer-usability-upgrades/spec.md`

**Note**: This plan covers a broad viewer-usability upgrade for GitLocal's local-first repository viewer. It is intentionally organized into independently testable slices so implementation can ship the highest-value reading, search, and background-change workflows incrementally.

## Summary

Upgrade GitLocal from a capable repository/file viewer into a calmer AI-agent review cockpit for semi-technical product managers. The implementation will keep the existing local-first TypeScript/React architecture, add no new runtime dependency by default, and extend current viewer state, repo sync, search, content-panel, sidebar, and Markdown rendering surfaces. Core work includes clearer normal-view Markdown reading with in-document find highlights and relative-link handling, separate scoped repository search, changed-files and recent/key-doc navigation, plain-language repo status, local/generated visibility controls, stronger background-change notices, safer low-frequency edit affordances, lower-attention Markdown actions, README-first folder tabs for Git and non-Git folders, and simplified changed-files entry points.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI and React UI  
**Primary Dependencies**: Existing Hono local server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned  
**Storage**: No database; runtime state remains derived from local filesystem contents, git metadata, browser URL/local UI state, local browser storage for viewer preferences/recent items, and in-memory server/UI state  
**Testing**: Vitest with @vitest/coverage-v8; React Testing Library for component/user-flow tests; focused unit tests for repo/search/sync helpers; manual or browser verification for representative desktop and narrow layouts  
**Target Platform**: Cross-platform npm package plus existing macOS Homebrew cask/native wrapper that serves the shared viewer  
**Project Type**: Local-first TypeScript CLI/server plus React SPA with thin macOS desktop wrapper  
**Performance Goals**: Changed-files summary and repo status remain available within normal sync polling cadence; scoped search shows first useful results, counts, or a partial-results state within 3 seconds on typical project repositories; rendered Markdown find highlighting remains responsive for long documents  
**Constraints**: Maintain 90% per-file branch coverage; preserve local-first/no telemetry/no accounts/no cloud services; use repository-relative documentation paths; avoid destructive actions as primary reading controls; preserve non-current branch read-only behavior; avoid crawling generated/local-only content unless users opt in  
**Scale/Scope**: Existing local repositories with thousands of files, large Markdown/spec histories, generated folders, and active background file changes; six user journeys covering reading, background review, search, navigation, repo status, and rare edits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-first product core**: PASS. Plan stays in existing TypeScript/Node server, CLI, and React UI. No alternate product runtime is introduced.
- **Test coverage**: PASS with implementation requirement. Any touched TypeScript/React files must keep at least 90% per-file coverage through focused unit/component tests.
- **Local-first with Git remote exception**: PASS. Feature uses local filesystem/git metadata and existing local Git state. No telemetry, account, cloud, or custom remote-service behavior is planned.
- **Node.js-served React UI**: PASS. The UI remains the existing React SPA served by the Node backend.
- **Clean & useful UI**: PASS. The feature directly prioritizes Markdown reading, repository navigation, and lightweight intervention over full-IDE workflows.
- **Free & open source**: PASS. No proprietary component or paid service is introduced; no new dependency is planned.
- **Repository-relative paths and release documentation**: PASS. Planning artifacts use repository-relative paths. Any future release still requires README/changelog/release review work.
- **Release branches, pre-GA versioning, and contrarian QA**: PASS with release requirement. If this becomes a release candidate, existing pre-GA release and contrarian QA rules apply.

## Project Structure

### Documentation (this feature)

```text
specs/025-viewer-usability-upgrades/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── local-api.md
│   └── ui-surfaces.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Created by /speckit-tasks, not /speckit-plan
```

### Source Code (repository root)

```text
src/
├── git/
│   ├── repo.ts           # Repository status, changed-file, generated/local classification helpers
│   └── tree.ts           # Tree/search traversal and filtered entry support
├── handlers/
│   ├── file.ts           # Existing file content/update conflict behavior
│   ├── repo.ts           # Repo context/branch endpoints, likely extended for status/doc shortcuts
│   ├── search.ts         # Scoped search and result limits
│   └── sync.ts           # Background change and changed-files status surfaces
├── services/
│   └── repo-watch.ts     # Working-tree revision, active-path reconciliation, background-change metadata
└── types.ts              # Shared server/UI data contracts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    ├── git/
    │   ├── repo.test.ts
    │   └── tree.test.ts
    ├── handlers/
    │   ├── repo.test.ts
    │   ├── search.test.ts
    │   └── sync.test.ts
    └── services/
        └── repo-watch.test.ts

ui/src/
├── App.tsx
├── App.test.tsx
├── components/
│   ├── ContentPanel/
│   │   ├── ContentPanel.tsx
│   │   ├── ContentPanel.test.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── MarkdownRenderer.test.tsx
│   │   └── content-panel-selection.ts
│   ├── FileTree/
│   │   ├── FileTree.tsx
│   │   ├── FileTree.test.tsx
│   │   └── FileTreeNode.tsx
│   ├── RepoContext/
│   │   ├── RepoContextHeader.tsx
│   │   └── RepoContextHeader.test.tsx
│   └── Search/
│       ├── SearchPanel.tsx
│       ├── SearchPanel.test.tsx
│       ├── SearchResults.tsx
│       └── SearchResults.test.tsx
├── services/
│   ├── api.ts
│   ├── viewerState.ts
│   └── viewerState.test.ts
├── types/
│   └── index.ts
└── styles/
    └── globals.css
```

**Structure Decision**: Extend the existing viewer surfaces and shared local API contracts. Keep new capabilities close to current ownership boundaries: content reading in `ContentPanel`/`MarkdownRenderer`, search in `Search`, repo summary and changed-files entry points in `RepoContext`, file tree filtering in `FileTree`, and local state persistence in `viewerState`. Avoid a new app shell, backend subsystem, or full diff/review engine.

## Phase 0: Research

Research is captured in `specs/025-viewer-usability-upgrades/research.md`.

Resolved decisions:

- Markdown relative-link behavior should be derived from rendered Markdown inputs and current file location.
- Background change awareness should build on existing sync polling and revision tokens, adding clearer user-facing metadata rather than a filesystem watcher dependency.
- Changed-files view should be a navigation/review surface, not a full diff tool.
- Search should keep explicit scopes, result limits, generated/local inclusion controls, and partial-result messaging.
- Generated/local visibility should be a persistent viewer preference shared by tree, folder, dashboard, and search surfaces.
- Root dashboard should prioritize key docs, recent items, changed files, and repo status while keeping raw folder browsing available when no README is available. When a Git or non-Git folder has a README, the folder view should expose README and Tree view tabs in that order and default to README to optimize for reading.
- Rare edit actions remain secondary and conflict-safe.

## Phase 1: Design & Contracts

Design artifacts:

- `specs/025-viewer-usability-upgrades/data-model.md`
- `specs/025-viewer-usability-upgrades/contracts/ui-surfaces.md`
- `specs/025-viewer-usability-upgrades/contracts/local-api.md`
- `specs/025-viewer-usability-upgrades/quickstart.md`

Contract scope:

- UI contract defines observable behavior for normal-view Markdown find/link handling, lower-attention Markdown action placement, search, changed-files panel open/close behavior, README-first folder tabs, dashboard fallback, collapsed navigation, repo status, and rare edit controls.
- Local API contract defines intended request/response surfaces for repo summary, changed files, key docs/recent items, scoped search, and sync/background notices.
- No external service, account, telemetry, or hosted-share contract is introduced.

## Constitution Check - Post-Design

- **TypeScript-first product core**: PASS. Design artifacts stay within existing TypeScript/Node and React viewer surfaces.
- **Test coverage**: PASS with planned unit/component coverage for each touched module and helper.
- **Local-first**: PASS. All feature data comes from local filesystem/git metadata, local browser state, and existing local server responses.
- **Node.js-served React UI**: PASS. No architecture change to the React SPA served by the Node backend.
- **Clean & useful UI**: PASS. Design prioritizes Markdown reading, search clarity, and AI-agent review workflows.
- **Free & open source**: PASS. No dependency or license change is required by the design.
- **Documentation paths**: PASS. Artifacts use repository-relative paths only.
- **Release QA**: PASS with implementation requirement for existing verification and release review if released.

## Complexity Tracking

No constitution violations requiring complexity justification.
