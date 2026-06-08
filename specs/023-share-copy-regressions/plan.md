# Implementation Plan: Share and Copy Regression Patch

**Branch**: `023-share-copy-regressions` | **Date**: 2026-06-08 | **Spec**: `specs/023-share-copy-regressions/spec.md`
**Input**: Feature specification from `specs/023-share-copy-regressions/spec.md`

**Note**: This plan covers a patch release for share/copy control regressions, Save PDF behavior, toolbar icon polish, and a renewed git-folder recognition regression check.

## Summary

Fix the file action surface so Copy is a real icon-and-label button available for every readable text view, including raw and rendered representations. Remove unsupported Email, Slack, and visible Print actions; add icons to Share, Find in File, Refresh, and Light/Dark Theme; and repair Save PDF using a dedicated rendered-output path that preserves local-first behavior. Re-check git-folder recognition across direct launch, picker open, current-folder open, and nested-folder cases, with the likely fix focused on keeping local path classification and active-root state consistent after startup and open routing.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI and React UI; Swift 5.x only if existing macOS wrapper command parity is touched  
**Primary Dependencies**: Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned  
**Storage**: No database; runtime state remains derived from local filesystem contents, git metadata, browser URL/local UI state, in-memory server state, and optional user-local startup preference file  
**Testing**: Vitest with @vitest/coverage-v8; React Testing Library and accessibility assertions for UI; manual browser/PDF and optional macOS wrapper validation for export behavior  
**Target Platform**: Cross-platform npm package plus existing macOS Homebrew cask/native wrapper  
**Project Type**: Local-first TypeScript CLI/server plus React SPA with thin macOS desktop wrapper  
**Performance Goals**: Copy and share actions visible immediately with loaded file content; Save PDF flow starts within 2 seconds for representative rendered documents; folder classification completes during normal browse/open response time without delaying the initial shell  
**Constraints**: Maintain 90% per-file coverage; no hosted share links, telemetry, account features, email-provider API, Slack API, cloud storage, or new proprietary dependency; visible Print action removed while Save PDF remains available  
**Scale/Scope**: Single-user local repository/folder browsing, readable text files already supported by the app, rendered Markdown/readme output, and representative projects with hundreds of root entries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-first product core**: PASS. The patch is in the existing TypeScript/React product core; Swift only remains in scope for existing native command parity if needed.
- **Test coverage**: PASS with requirement. Modified TypeScript/React files must keep at least 90% per-file coverage through `npm test`.
- **Local-first with Git remote exception**: PASS. The plan removes Slack/email provider-style options and adds no remote service integration.
- **Node.js-served React UI**: PASS. UI remains React/Vite served by the Node backend.
- **Clean & useful UI**: PASS. The action surface becomes clearer and more consistent, with unsupported options removed.
- **Free & open source**: PASS. No proprietary dependency or paid integration is planned.
- **Repository-relative paths and release documentation**: PASS. Artifacts use repository-relative references; release review and changelog remain required during implementation/release.
- **Release branches, pre-GA versioning, and contrarian QA**: PASS with requirement. This is a patch release and must include release review/contrarian QA before final approval.

## Project Structure

### Documentation (this feature)

```text
specs/023-share-copy-regressions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── local-api.md
│   └── ui-actions.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── cli.ts
├── server.ts
├── git/
│   └── repo.ts
├── handlers/
│   ├── folder.ts
│   └── repo.ts
└── types.ts

tests/
└── unit/
    ├── git/
    │   └── repo.test.ts
    └── handlers/
        ├── folder.test.ts
        └── repo.test.ts

ui/src/
├── App.tsx
├── App.test.tsx
├── App.native-shortcuts.test.tsx
├── components/
│   ├── ContentPanel/
│   │   ├── ContentPanel.tsx
│   │   ├── ContentPanel.test.tsx
│   │   ├── MarkdownShareActions.tsx
│   │   ├── MarkdownShareActions.test.tsx
│   │   ├── markdown-output.ts
│   │   └── markdown-output.test.ts
│   ├── Picker/
│   │   ├── PickerPage.tsx
│   │   └── PickerPage.test.tsx
│   └── RepoContext/
│       └── RepoContextHeader.tsx
├── services/
│   └── api.ts
├── styles/
│   └── globals.css
└── types/
    └── index.ts
```

**Structure Decision**: Use the existing content panel, Markdown action helper, picker, server path-classification, and repository-open flow. Avoid a new export subsystem or share-provider abstraction; this is a targeted patch over existing surfaces.

## Phase 0: Research

Research is captured in `specs/023-share-copy-regressions/research.md`.

Resolved decisions:

- Copy is promoted to an icon-and-label button for every readable text representation, not just Markdown.
- Raw and rendered copy use explicit active-representation semantics so users know what content is copied.
- Email, Slack, and visible Print are removed from the in-app action surface.
- Save PDF remains visible and uses a dedicated rendered-output save flow; browser/OS PDF saving may be invoked internally, but Print is not exposed as a separate action.
- Icons use the existing UI icon conventions and preserve labels/accessibility for toolbar actions.
- Git-folder recognition work focuses on consistent local path classification across startup, picker browse, typed open, double-click open, and current-folder action flows.

## Phase 1: Design & Contracts

Design artifacts:

- `specs/023-share-copy-regressions/data-model.md`
- `specs/023-share-copy-regressions/contracts/ui-actions.md`
- `specs/023-share-copy-regressions/contracts/local-api.md`
- `specs/023-share-copy-regressions/quickstart.md`

Contract scope:

- UI actions define visibility and behavior for Copy, Share, Save PDF, removed destinations, and icon-bearing toolbar controls.
- Local API contracts define expected path-classification behavior for folder browse, repository open, startup/direct launch, and info responses.
- No new external API or hosted sharing contract is introduced.

## Constitution Check - Post-Design

- **TypeScript-first product core**: PASS. Design stays in the existing TypeScript/React app; no new backend runtime.
- **Test coverage**: PASS with planned unit/component coverage for action visibility, copy/export helpers, and folder classification/open routing.
- **Local-first**: PASS. Removed Slack/email actions reduce remote-integration ambiguity; Save PDF remains local/browser-mediated.
- **Node.js-served React UI**: PASS. No architecture change.
- **Clean & useful UI**: PASS. Controls become clearer, unsupported actions are removed, and icons supplement existing text/accessibility.
- **Free & open source**: PASS. No proprietary dependency planned.
- **Documentation paths**: PASS. All artifact references are repository-relative.
- **Release QA**: PASS with implementation requirement for changelog, release-review artifact, and verify command before release approval.

## Complexity Tracking

No constitution violations requiring complexity justification.
