# Implementation Plan: Fix Git Folder Detection

**Branch**: `015-fix-git-folder-detection` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/015-fix-git-folder-detection/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix repository-folder detection and open routing so GitLocal treats an actual repository root as a repository, a folder inside a repository as a folder inside a worktree, and a folder outside git as a regular folder. The implementation will replace ambiguous "is inside any worktree" checks with one authoritative local path classification that uses Git's own resolved top-level worktree and canonical path comparison. Picker labels, open behavior, active-root metadata, and git capability gating will consume that classification so repository folders open with repository functionality on the first open action while plain folders and nested folders retain regular-folder behavior.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+; React 18 TypeScript UI  
**Primary Dependencies**: Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Radix UI primitives; no new runtime dependency planned  
**Storage**: No database; classification is derived from local filesystem metadata and local git metadata at request time  
**Testing**: Vitest, React Testing Library; per-file branch coverage threshold remains 90%  
**Target Platform**: Local Node.js-served browser application on developer machines  
**Project Type**: Single npm package with Node.js HTTP server and React SPA  
**Performance Goals**: Path classification completes in one lightweight local git probe for git-aware paths and does not block folder browsing beyond existing per-entry directory scan behavior; opening a repository folder exposes repository context on first viewer load  
**Constraints**: Local-first operation; no network access for classification; no custom git metadata parser as source of truth; no committed contributor-local absolute paths in docs; patch release scope only  
**Scale/Scope**: One active local root at a time; affected surfaces are repository/folder classification helpers, picker browse/open routing, server active-root initialization, and focused UI tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First**: PASS. All affected server, CLI, and UI code remains TypeScript on Node.js 22+.
- **II. Test Coverage**: PASS with required work. The implementation must add targeted unit/integration/component tests and preserve 90% per-file coverage.
- **III. Local-First with Git Remote Exception**: PASS. Classification uses only local filesystem and local git metadata; no network behavior is added.
- **IV. Node.js-Served React UI**: PASS. No delivery model changes.
- **V. Clean & Useful UI**: PASS. Correct labels and first-action open behavior make the picker clearer without adding new visual complexity.
- **VI. Free & Open Source**: PASS. No proprietary service or dependency is introduced.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. Planning artifacts use repository-relative links and paths.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. This is a patch bug-fix feature; release-specific gates remain required before publishing.

## Project Structure

### Documentation (this feature)

```text
specs/015-fix-git-folder-detection/
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
│   ├── repo.ts           # authoritative local path classification and git metadata helpers
│   └── tree.ts           # tree listing for active roots
├── handlers/
│   ├── folder.ts         # picker browse metadata and picker folder actions
│   ├── repo.ts           # open-root handling and active-root info responses
│   └── file.ts           # active-root file and tree operations
├── server.ts             # startup active-root routing
└── types.ts              # shared server response contracts

tests/
├── integration/server.test.ts
└── unit/
    ├── git/repo.test.ts
    └── handlers/
        ├── folder.test.ts
        └── repo.test.ts

ui/src/
├── components/Picker/PickerPage.tsx
├── components/Picker/PickerPage.test.tsx
├── components/RepoContext/
├── services/api.ts
└── types/index.ts
```

**Structure Decision**: Use the existing single-package Node server plus React SPA layout. Centralize classification in `src/git/repo.ts` and route existing handlers/UI through that shared result, rather than adding parallel folder/repository detection paths.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations.

## Phase 0: Research Summary

Research output is captured in [research.md](research.md). All technical-context questions are resolved.

## Phase 1: Design Summary

Design output is captured in [data-model.md](data-model.md), [contracts/local-api.md](contracts/local-api.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **I. TypeScript-First**: PASS. Design stays within existing TypeScript server/UI modules.
- **II. Test Coverage**: PASS with planned coverage for canonical path classification, picker routing, active-root info, and UI open behavior.
- **III. Local-First with Git Remote Exception**: PASS. The design uses local git commands only and introduces no network dependency.
- **IV. Node.js-Served React UI**: PASS. No delivery model changes.
- **V. Clean & Useful UI**: PASS. Repository rows open as repositories, nested folders remain browsable folders, and labels become more accurate.
- **VI. Free & Open Source**: PASS. No new dependency is required by the design.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. Artifacts use repository-relative documentation paths.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. Patch-release validation remains required before publishing.
