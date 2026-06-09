# Implementation Plan: README Logo and Markdown Toolbar Polish

**Branch**: `024-fix-share-toolbar` | **Date**: 2026-06-09 | **Spec**: `specs/024-fix-share-toolbar/spec.md`
**Input**: Feature specification from `specs/024-fix-share-toolbar/spec.md`

**Note**: This plan covers a small documentation and UI polish patch: restore the README logo in repository renderers, move Markdown share actions into the existing file-level find toolbar row, and remove redundant sharing helper copy.

## Summary

Fix the README logo regression by referencing a repository asset that resolves in both hosted and local README renderers. Reduce Markdown viewer toolbar height by combining the Markdown share actions with the existing Find in File row, removing the dedicated share-action row and the sentence "Sharing uses the saved Markdown content." Keep the existing share outcomes, accessibility labels, and non-Markdown file behavior intact.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI and React UI  
**Primary Dependencies**: Existing React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned  
**Storage**: No database; behavior derives from local filesystem contents, git metadata, browser URL/local UI state, and in-memory server/UI state  
**Testing**: Vitest with @vitest/coverage-v8; React Testing Library for UI behavior and accessibility checks; README path validation through repository file checks  
**Target Platform**: Cross-platform npm package plus existing macOS Homebrew cask/native wrapper  
**Project Type**: Local-first TypeScript CLI/server plus React SPA with thin macOS desktop wrapper  
**Performance Goals**: Markdown toolbar controls remain visible immediately when content loads; no additional loading step for share actions or file-level find; README logo resolves on first render  
**Constraints**: Maintain 90% per-file branch coverage; no hosted share links, telemetry, account features, cloud services, or new proprietary dependency; preserve local-first Markdown share/copy/export outcomes  
**Scale/Scope**: Single README asset reference and one Markdown content-panel toolbar surface, including representative desktop and narrow-window layouts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-first product core**: PASS. The UI change stays in the existing TypeScript/React product core; the README change is documentation-only.
- **Test coverage**: PASS with requirement. Modified TypeScript/React files must keep at least 90% per-file coverage through focused component tests.
- **Local-first with Git remote exception**: PASS. The feature preserves local share/copy/export behavior and adds no remote services.
- **Node.js-served React UI**: PASS. UI remains the existing React/Vite app served by the Node backend.
- **Clean & useful UI**: PASS. The feature directly reduces clutter and preserves readable Markdown review.
- **Free & open source**: PASS. No dependency, licensing, or proprietary-service change is planned.
- **Repository-relative paths and release documentation**: PASS. Documentation and planning references use repository-relative paths; the README logo must not depend on contributor-local absolute paths or generated build output.
- **Release branches, pre-GA versioning, and contrarian QA**: PASS with implementation requirement. If released, the patch must follow existing pre-GA release QA expectations.

## Project Structure

### Documentation (this feature)

```text
specs/024-fix-share-toolbar/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-markdown-toolbar.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
README.md

ui/public/
└── gitlocal-logo.svg

ui/src/
├── components/
│   └── ContentPanel/
│       ├── ContentPanel.tsx
│       ├── ContentPanel.test.tsx
│       ├── MarkdownShareActions.tsx
│       └── MarkdownShareActions.test.tsx
└── styles/
    └── globals.css
```

**Structure Decision**: Use the existing README asset, content-panel toolbar, Markdown share action component, and global styles. Avoid a new toolbar framework or sharing abstraction; this is a targeted layout and documentation regression fix.

## Phase 0: Research

Research is captured in `specs/024-fix-share-toolbar/research.md`.

Resolved decisions:

- The README logo should reference a repository-tracked asset that exists outside generated build output and resolves from hosted Markdown renderers.
- Markdown share actions should remain their own focused component but be renderable inside the existing file action row.
- The saved-content helper sentence should be removed from normal rendered Markdown views; accessible button labels/status messages remain the explanation surface.
- Responsive behavior should prefer a clean wrap or compact grouping over a second dedicated share row when horizontal space is constrained.
- Tests should cover action visibility, absence of the redundant sentence, find/share coexistence, and README logo asset existence.

## Phase 1: Design & Contracts

Design artifacts:

- `specs/024-fix-share-toolbar/data-model.md`
- `specs/024-fix-share-toolbar/contracts/ui-markdown-toolbar.md`
- `specs/024-fix-share-toolbar/quickstart.md`

Contract scope:

- UI toolbar contract defines the visible controls, removed copy, accessibility expectations, and responsive behavior for rendered Markdown views.
- README contract is covered by requirements and quickstart verification because it is a documentation asset reference, not a runtime interface.
- No local API or external service contract changes are introduced.

## Constitution Check - Post-Design

- **TypeScript-first product core**: PASS. Design stays in existing TypeScript/React UI and README documentation.
- **Test coverage**: PASS with planned component coverage for toolbar behavior and documentation path validation.
- **Local-first**: PASS. No remote or account behavior is introduced.
- **Node.js-served React UI**: PASS. No app architecture change.
- **Clean & useful UI**: PASS. The design removes redundant text and recovers vertical reading space.
- **Free & open source**: PASS. No dependency or license change.
- **Documentation paths**: PASS. The logo fix uses repository-relative paths only.
- **Release QA**: PASS with implementation requirement for existing verification and release review if this becomes a release candidate.

## Complexity Tracking

No constitution violations requiring complexity justification.
