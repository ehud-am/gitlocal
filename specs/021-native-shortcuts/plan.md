# Implementation Plan: Native App Shortcuts

**Branch**: `021-native-shortcuts` | **Date**: 2026-06-01 | **Spec**: `specs/021-native-shortcuts/spec.md`
**Input**: Feature specification from `specs/021-native-shortcuts/spec.md`

## Summary

Restore expected macOS native app command behavior for Copy, Cut, Paste, Find, and Refresh so the Homebrew app distribution matches the browser distribution where users expect platform shortcuts to work. The technical approach is to keep the existing thin native wrapper, add native menu/shortcut command routing around the embedded viewer, scope Find to preview-panel content, and verify the patch release across the native wrapper, shared web UI, and browser distribution.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for the shared app; React 18 TypeScript UI; Swift 5.x for the scoped macOS wrapper  
**Primary Dependencies**: Existing Hono local server, React/Vite UI, AppKit/WebKit native wrapper, Vitest/React Testing Library, xcodebuild for wrapper validation  
**Storage**: No database; runtime state remains derived from local filesystem/git metadata, browser URL state, in-memory UI/server state, and native app session state  
**Testing**: Vitest with coverage for TypeScript/React changes; React Testing Library for UI behavior; xcodebuild for macOS wrapper build validation; macOS package/cask smoke scripts where release packaging is affected  
**Target Platform**: macOS native app distribution plus existing browser/npm distribution regression coverage  
**Project Type**: Desktop app wrapper around a local web application, sharing the existing Node.js-served React product core  
**Performance Goals**: Standard command actions feel immediate; Refresh reflects typical local repository changes within 5 seconds; Find remains responsive on representative preview content  
**Constraints**: Preserve thin-wrapper architecture; no telemetry, account flow, external service, new persistent storage, or user migration; no forked product behavior from browser distribution; maintain 90% per-file branch coverage for TypeScript/React files  
**Scale/Scope**: Patch-scoped fix covering five native commands and release verification; no global repository search, full IDE editing model, or non-macOS native wrapper work

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First Product Core**: PASS. Shared product behavior remains in the TypeScript/React app; Swift changes are limited to the permitted macOS wrapper.
- **Test Coverage**: PASS. Plan requires Vitest/React Testing Library coverage for shared app behavior and native build/package validation for wrapper changes.
- **Local-First with Git Remote Exception**: PASS. Feature uses only local UI commands and local repository refresh behavior; no new network integration.
- **Node.js-Served React UI**: PASS. Native app continues to load the existing local web UI served by the Node.js process.
- **Clean & Useful UI**: PASS. Command behavior supports reading, Markdown review, and lightweight intervention without adding visual complexity.
- **Free & Open Source**: PASS. No proprietary components or paid services.
- **Repository-Relative Paths and Release Documentation**: PASS. Planning artifacts use repository-relative paths; release work must include changelog and README review as required.
- **Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. Feature is patch-scoped and must include version/changelog/release review tasks before shipping.

## Project Structure

### Documentation (this feature)

```text
specs/021-native-shortcuts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── native-app-commands.md
└── tasks.md
```

### Source Code (repository root)

```text
native/macos/
├── GitLocal/GitLocal/
│   ├── AppDelegate.swift
│   ├── ViewerWindowController.swift
│   └── Info.plist
├── GitLocalTests/
│   └── LifecycleTests.md
└── README.md

ui/src/
├── App.tsx
├── components/ContentPanel/
│   ├── ContentPanel.tsx
│   ├── CodeViewer.tsx
│   └── MarkdownRenderer.tsx
└── components/Search/

tests/
├── integration/
└── unit/

packaging/macos/
├── release/
└── cask/
```

**Structure Decision**: Use the existing desktop-wrapper structure. Native command routing belongs under `native/macos/GitLocal/GitLocal/`; preview-scoped Find behavior and any refresh hooks that need web-app cooperation belong in `ui/src/`; release validation remains under existing macOS packaging paths. No new app package, service, or storage layer is introduced.

## Complexity Tracking

No constitution violations require justification.

## Phase 0: Research

See `specs/021-native-shortcuts/research.md`.

## Phase 1: Design & Contracts

- Data model: `specs/021-native-shortcuts/data-model.md`
- User-facing command contract: `specs/021-native-shortcuts/contracts/native-app-commands.md`
- Validation quickstart: `specs/021-native-shortcuts/quickstart.md`

## Post-Design Constitution Check

- **TypeScript-First Product Core**: PASS. Design keeps the Swift wrapper thin and avoids moving product logic into native code.
- **Test Coverage**: PASS. Tasks must include focused tests for any TypeScript/React changes and build/package validation for Swift wrapper changes.
- **Local-First with Git Remote Exception**: PASS. All commands operate against local app state, clipboard, and local filesystem/git-derived data.
- **Node.js-Served React UI**: PASS. The wrapper continues to host the same Node.js-served React UI.
- **Clean & Useful UI**: PASS. The plan restores expected platform commands without adding distracting UI.
- **Free & Open Source**: PASS. No dependency or licensing change planned.
- **Repository-Relative Paths and Release Documentation**: PASS. Generated artifacts use repository-relative links and release tasks must update changelog/README.
- **Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. Patch release verification, version metadata, changelog, README review, and contrarian QA remain required before release.
