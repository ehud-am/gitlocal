# Implementation Plan: Current Product Baseline

**Branch**: `001-baseline-product-spec` | **Date**: 2026-03-28 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-baseline-product-spec/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Document the current GitLocal product as an implementation-ready baseline that preserves its fully local, read-only repository browsing experience. The planning work converts the approved baseline specification into concrete design artifacts covering the runtime architecture, user-visible data model, external contracts for the CLI and local HTTP API, and a quickstart that can be used to verify the documented behavior against the current codebase.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+; React 18 for the browser UI  
**Primary Dependencies**: Hono, @hono/node-server, React, Vite, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, open  
**Storage**: No persistent application database; state is held in process and derived from the local filesystem and local git repository on demand  
**Testing**: Vitest with coverage enforcement for server and UI test suites  
**Target Platform**: Local desktop/laptop environments with Node.js 22+, git 2.22+, and a default browser  
**Project Type**: Local-first CLI application that launches a Node.js-served React web app  
**Performance Goals**: Initial repository load should feel immediate for small-to-medium repositories, branch switching should refresh visible context quickly, and file browsing should remain responsive through lazy tree loading  
**Constraints**: Fully local execution only, read-only repository access, minimal dependency growth, React UI served by the Node.js backend, maintain at least 90% branch coverage per file  
**Scale/Scope**: Single-repository viewing session at a time, bounded recent-commit list, non-recursive directory expansion, and browser-based repository reading for non-developer users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First**: Pass. The baseline and all planned follow-up implementation work remain within the existing TypeScript/Node.js/React stack.
- **Test Coverage**: Pass. Any implementation derived from this plan must keep server and UI code at or above 90% branch coverage per file and use the existing Vitest workflows.
- **Fully Local**: Pass. The documented behavior depends only on local git, local files, and a local browser session.
- **Node.js-Served React UI**: Pass. The plan preserves the current CLI -> local HTTP server -> static React SPA delivery model.
- **Clean & Useful UI**: Pass. The documented experience remains content-focused, readable, and GitHub-inspired, with Markdown rendering and easy tree navigation.
- **Free & Open Source**: Pass. No proprietary services, gated features, or incompatible dependencies are introduced by this planning work.

**Post-Design Check**: Pass. The generated research, data model, contracts, and quickstart artifacts remain aligned with all six constitutional principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-baseline-product-spec/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md
│   ├── http-api.yaml
│   └── ui-navigation.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── cli.ts
├── server.ts
├── git/
│   ├── repo.ts
│   └── tree.ts
├── handlers/
│   ├── files.ts
│   ├── git.ts
│   └── pick.ts
└── types.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    ├── git/
    └── handlers/

ui/
├── src/
│   ├── App.tsx
│   ├── services/
│   │   └── api.ts
│   └── components/
│       ├── Breadcrumb/
│       ├── ContentPanel/
│       ├── FileTree/
│       ├── GitInfo/
│       └── Picker/
└── vitest.config.ts
```

**Structure Decision**: Use the existing single-repository layout with a server-side `src/` tree, shared repository behavior in `src/git/`, backend tests under `tests/`, and a colocated React application in `ui/`. Planning artifacts describe the existing seams instead of proposing a structural rewrite.

## Complexity Tracking

No constitutional violations or complexity exceptions are required for this baseline planning work.
