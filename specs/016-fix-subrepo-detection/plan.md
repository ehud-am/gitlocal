# Implementation Plan: Fix Nested Repository Detection

**Branch**: `016-fix-subrepo-detection` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/016-fix-subrepo-detection/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix the remaining repository classification gap where a valid repository child can be treated as a regular folder when GitLocal is started or browsing from a plain filesystem parent. The implementation will reproduce the mixed-parent scenario, verify the shared local path classification for repository children listed from non-repository parents, and route picker labels/open behavior through that classification consistently across startup, typed path entry, double-click, and Open actions.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+; React 18 TypeScript UI  
**Primary Dependencies**: Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Radix UI primitives; no new runtime dependency planned  
**Storage**: No database; classification derives from local filesystem metadata, local git metadata, browser URL state, and in-memory server/UI state  
**Testing**: Vitest, React Testing Library; per-file branch coverage threshold remains 90%  
**Target Platform**: Local Node.js-served browser application on developer machines  
**Project Type**: Single npm package with Node.js HTTP server and React SPA  
**Performance Goals**: Folder browsing remains responsive for mixed plain/repository directories; repository child classification completes during existing per-entry browse metadata collection without adding network activity  
**Constraints**: Local-first operation; no network access for classification; no custom git metadata parser as source of truth; no committed contributor-local absolute paths in docs; patch release scope only  
**Scale/Scope**: One active local root at a time; affected surfaces are local path classification, folder browse metadata, repository open routing, picker interactions, and focused tests for mixed plain-parent directories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First**: PASS. All planned source changes remain TypeScript on Node.js 22+ and React TypeScript.
- **II. Test Coverage**: PASS with required work. The implementation must add targeted server and UI tests and preserve 90% per-file coverage.
- **III. Local-First with Git Remote Exception**: PASS. Classification uses local filesystem and local git metadata only.
- **IV. Node.js-Served React UI**: PASS. No delivery model changes.
- **V. Clean & Useful UI**: PASS. The picker should show accurate repository labels and keep the current interaction model.
- **VI. Free & Open Source**: PASS. No proprietary service or dependency is introduced.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. Planning artifacts use repository-relative paths and links.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. This is a patch bug-fix feature; release gates remain required before publishing.

## Project Structure

### Documentation (this feature)

```text
specs/016-fix-subrepo-detection/
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
│   └── repo.ts           # authoritative local path classification and repository validation
├── handlers/
│   ├── folder.ts         # picker browse metadata for mixed parent folders
│   └── repo.ts           # open-root behavior for repository children and folder children
├── server.ts             # startup active-root routing
└── types.ts              # shared response contracts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    ├── git/repo.test.ts
    └── handlers/
        ├── folder.test.ts
        └── repo.test.ts

ui/src/
├── components/Picker/
│   ├── PickerPage.tsx
│   └── PickerPage.test.tsx
├── services/api.ts
└── types/index.ts
```

**Structure Decision**: Use the existing single-package Node server plus React SPA layout. Keep classification centralized in `src/git/repo.ts`, and make folder browse/open surfaces consume that result rather than introducing a second repository-child detection path.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations.

## Phase 0: Research Summary

Research output is captured in [research.md](research.md). All technical-context questions are resolved.

## Phase 1: Design Summary

Design output is captured in [data-model.md](data-model.md), [contracts/local-api.md](contracts/local-api.md), and [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- **I. TypeScript-First**: PASS. Design stays within existing TypeScript server/UI modules.
- **II. Test Coverage**: PASS with planned coverage for mixed plain-parent browse metadata, repository child opening, typed path consistency, startup consistency, and UI double-click/Open behavior.
- **III. Local-First with Git Remote Exception**: PASS. The design uses local filesystem and local git commands only.
- **IV. Node.js-Served React UI**: PASS. No delivery model changes.
- **V. Clean & Useful UI**: PASS. The design corrects labels and opening behavior without adding new UI surfaces.
- **VI. Free & Open Source**: PASS. No new dependency is required by the design.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. Artifacts use repository-relative documentation paths.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. Patch-release validation remains required before publishing.
