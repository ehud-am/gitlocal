# Implementation Plan: Markdown Share Actions

**Branch**: `022-markdown-share-actions` | **Date**: 2026-06-07 | **Spec**: `specs/022-markdown-share-actions/spec.md`
**Input**: Feature specification from `specs/022-markdown-share-actions/spec.md`

**Note**: This plan covers the Markdown print/share release enhancement plus visible refresh, editor undo/redo, content-panel select-all, and startup folder behavior.

## Summary

Add Markdown-specific rendered output actions, a visible top-right refresh action, standard editor undo/redo shortcuts, content-panel-scoped select-all behavior, and last-used/default startup folder resolution. The implementation uses the existing React `ContentPanel` and query invalidation paths, adds small UI helpers for rendered Markdown output, editor history, and content-panel selection, keeps all state local, and extends the macOS wrapper only to dispatch native menu commands into the shared web UI.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI and React UI; Swift 5.x only for the existing scoped macOS wrapper  
**Primary Dependencies**: Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned  
**Storage**: No database; runtime state from local filesystem/git, browser URL/local UI state, in-memory server state, and optional user-local startup preference file  
**Testing**: Vitest with @vitest/coverage-v8 for server and UI; React Testing Library and jest-axe for UI accessibility checks; xcodebuild/manual notes for macOS wrapper validation  
**Target Platform**: Cross-platform npm package plus existing macOS Homebrew cask/native wrapper  
**Project Type**: Local-first TypeScript CLI/server plus React SPA, with thin macOS desktop wrapper  
**Performance Goals**: Refresh reflects typical local file/git changes within 5 seconds; Markdown print/share action discovery within 10 seconds; share flows start within 20 seconds when destination is available  
**Constraints**: ≥90% per-file coverage; no hosted share links, telemetry, account features, Slack API, email provider API, or cloud storage; preserve local-only operation; keep Swift changes scoped to native wrapper command dispatch  
**Scale/Scope**: Single-user local repository/folder browsing and lightweight editing; typical project Markdown documents including headings, tables, lists, links, code blocks, and multi-page rendered output

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-first product core**: PASS. Product logic remains TypeScript/React. Swift is limited to the existing macOS wrapper for native menu command dispatch.
- **Test coverage**: PASS with requirement. New TypeScript files and modified UI/server behavior must maintain ≥90% per-file coverage through `npm test`.
- **Local-first with Git remote exception**: PASS. Sharing uses local browser/OS capabilities and fallbacks only; no hosted or service API integrations are introduced.
- **Node.js-served React UI**: PASS. UI remains React/Vite served by the Node server.
- **Clean & useful UI**: PASS. Markdown actions are contextual and content-focused; select-all scopes to content panel to support reading/copying without selecting app chrome.
- **Free & open source**: PASS. No proprietary dependencies or paid integrations.
- **Repository-relative paths and release documentation**: PASS. Planning artifacts use repository-relative paths.
- **Release branches, pre-GA versioning, contrarian QA**: PASS with requirement. Release docs and review artifact must be updated before handoff.

## Project Structure

### Documentation (this feature)

```text
specs/022-markdown-share-actions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   └── ui-events.md
├── checklists/
│   └── requirements.md
├── release-review.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── cli.ts
├── server.ts
├── types.ts
├── handlers/
│   ├── folder.ts
│   └── repo.ts
└── services/
    └── startup-preferences.ts

tests/
└── unit/
    ├── handlers/
    │   ├── folder.test.ts
    │   └── repo.test.ts
    └── services/
        └── startup-preferences.test.ts

ui/src/
├── App.tsx
├── App.test.tsx
├── App.native-shortcuts.test.tsx
├── components/
│   ├── ContentPanel/
│   │   ├── ContentPanel.tsx
│   │   ├── ContentPanel.test.tsx
│   │   ├── InlineFileEditor.tsx
│   │   ├── InlineFileEditor.test.tsx
│   │   ├── MarkdownShareActions.tsx
│   │   ├── MarkdownShareActions.test.tsx
│   │   ├── editor-history.ts
│   │   ├── editor-history.test.ts
│   │   ├── markdown-output.ts
│   │   └── markdown-output.test.ts
│   └── Picker/
│       ├── PickerPage.tsx
│       └── PickerPage.test.tsx
├── services/api.ts
├── styles/globals.css
└── types/index.ts

native/macos/GitLocal/GitLocal/
├── AppDelegate.swift
└── ViewerWindowController.swift

native/macos/GitLocalTests/
├── LifecycleTests.md
└── ShortcutCommandTests.md
```

**Structure Decision**: Use the existing server/CLI, React UI, and macOS wrapper structure. Add small focused helpers in `ui/src/components/ContentPanel/` for Markdown output extraction, editor history, and content-panel selection rather than introducing a larger editor/export subsystem.

## Phase 0: Research

Research is captured in `specs/022-markdown-share-actions/research.md`.

Resolved decisions:

- Markdown actions live in rendered Markdown views.
- Browser/native print is the primary rendered print/PDF path.
- Save as PDF is exposed as a first-class action with print/save-to-PDF fallback.
- Email, Slack, and other share actions use local system/browser capabilities and local fallbacks.
- Unsaved content must be included when visible or clearly disclosed.
- Visible Refresh reuses the existing query invalidation refresh path.
- Undo/redo uses a focused editor history helper rather than a heavy editor dependency.
- Content-panel select-all handles platform select-all only when the content panel is active, preserving native input behavior elsewhere.
- Startup folder resolution happens in CLI/server-local preference logic.

## Phase 1: Design & Contracts

Design artifacts:

- `specs/022-markdown-share-actions/data-model.md`
- `specs/022-markdown-share-actions/contracts/http-api.md`
- `specs/022-markdown-share-actions/contracts/ui-events.md`
- `specs/022-markdown-share-actions/quickstart.md`

Contract scope:

- UI events define visible refresh, Markdown actions, print/share commands, editor undo/redo, content-panel select-all, and startup folder behavior.
- HTTP APIs are limited to startup preference support; Markdown output, refresh, undo/redo, and select-all remain client-side or existing API behavior.

## Constitution Check - Post-Design

- **TypeScript-first product core**: PASS. New behavior is TypeScript/React; native Swift only forwards commands.
- **Test coverage**: PASS with planned tests across server helpers, UI helpers, component behavior, app command routing, and picker startup messaging.
- **Local-first**: PASS. No new network services; Slack/email use local handlers/share surface only.
- **Node.js-served React UI**: PASS. No architecture change.
- **Clean & useful UI**: PASS. Actions are contextual to Markdown/content panels and preserve familiar shortcut behavior.
- **Free & open source**: PASS. No proprietary dependency required.
- **Documentation paths**: PASS. All artifact references are repository-relative.
- **Release QA**: PASS with planned release-review artifact and verify command.

## Complexity Tracking

No constitution violations requiring complexity justification.
