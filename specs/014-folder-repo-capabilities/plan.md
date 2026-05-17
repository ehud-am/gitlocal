# Implementation Plan: Folder and Repository Capabilities

**Branch**: `014-folder-repo-capabilities` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/014-folder-repo-capabilities/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Extend GitLocal so a selected regular local folder can be browsed and edited with the same core file operations currently available for repository working trees, while cleaning up the expanded git repository context view. The implementation will generalize local filesystem tree/file/mutation behavior to the active local root, present local repository and remote repository identity in one expanded row, remove redundant upstream/commit/sync UI affordances, and add an editable SSH key path to git identity.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+; React 18 TypeScript UI  
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present in the UI  
**Storage**: No database; state is derived from local filesystem contents, git metadata/config, browser URL state, and in-memory server/UI state  
**Testing**: Vitest, React Testing Library, jest-axe where existing UI accessibility tests apply; per-file branch coverage threshold remains 90%  
**Target Platform**: Local Node.js-served browser application on developer machines  
**Project Type**: Single npm package with Node.js HTTP server and React SPA  
**Performance Goals**: Non-git folder browsing locates known files in under 30 seconds for folders up to 500 visible entries; file create/edit/delete completes within 2 minutes; SSH key path editing completes within 60 seconds  
**Constraints**: Local-first operation; no telemetry or account dependency; no custom remote protocol integration; no committed contributor-local absolute paths in docs; file operations must not escape the selected local root  
**Scale/Scope**: One local active folder or git repository at a time; feature spans file tree/content/mutation APIs, repository context presentation, git identity editing, and associated tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First**: PASS. All affected server, CLI, and UI code remains TypeScript on Node.js 22+.
- **II. Test Coverage**: PASS with required work. Server and UI changes must include focused unit/integration/component tests that preserve 90% per-file coverage.
- **III. Local-First with Git Remote Exception**: PASS. The feature adds local-only folder operations, removes in-app commit/remote-sync actions from the UI, and limits SSH key path editing to local git identity/configuration.
- **IV. Node.js-Served React UI**: PASS. The feature remains within the existing Node-served React SPA.
- **V. Clean & Useful UI**: PASS. The plan reduces duplicated repository context, removes unused actions, and keeps non-git folders in the same practical browser/editor workflow.
- **VI. Free & Open Source**: PASS. No new proprietary components or paid services are planned.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. Planning artifacts use repository-relative links and paths.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. This is not a release branch; release-specific gates remain unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/014-folder-repo-capabilities/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── git/
│   ├── repo.ts           # repository metadata, git identity, remote context, path-safe local operations
│   └── tree.ts           # tree listing for git and regular local folders
├── handlers/
│   ├── file.ts           # tree/file/create/update/delete handlers for active local root
│   ├── folder.ts         # folder picker and folder mutation handlers
│   ├── repo.ts           # repo/folder info, open-root, and git identity handlers
│   └── sync.ts           # retained sync-state support for file status where applicable
├── server.ts             # active repo/folder routing state and API route wiring
└── types.ts              # shared server contracts

tests/
├── integration/server.test.ts
└── unit/
    ├── git/
    └── handlers/

ui/src/
├── App.tsx
├── components/
│   ├── ContentPanel/     # file view/edit/create/delete flows
│   ├── FileTree/         # regular folder and repo tree browsing
│   └── RepoContext/      # expanded git repository context and identity actions
├── services/api.ts       # UI API client contracts
└── types/index.ts        # UI-side shared contracts
```

**Structure Decision**: Use the existing single-package Node server plus React SPA layout. Extend current file/tree/git identity modules rather than adding a new subsystem, because the feature is a broader active-local-root capability over the same UI and API surface.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations.

## Phase 0: Research Summary

Research output is captured in [research.md](research.md). All technical-context questions are resolved.

## Phase 1: Design Summary

Design output is captured in [data-model.md](data-model.md), [contracts/local-api.md](contracts/local-api.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **I. TypeScript-First**: PASS. Design stays within TypeScript server/UI modules.
- **II. Test Coverage**: PASS with planned tests for regular-folder APIs, git identity SSH key path behavior, repository context UI, and removed actions.
- **III. Local-First with Git Remote Exception**: PASS. No new network dependency is introduced.
- **IV. Node.js-Served React UI**: PASS. No delivery model changes.
- **V. Clean & Useful UI**: PASS. UI changes simplify repository context and add expected folder actions.
- **VI. Free & Open Source**: PASS. No new dependency is required by the design.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. Artifacts use repository-relative documentation paths.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. Release gates remain outside this feature plan.
