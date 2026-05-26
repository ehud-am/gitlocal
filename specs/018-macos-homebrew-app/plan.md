# Implementation Plan: macOS Homebrew Native App

**Branch**: `018-macos-homebrew-app` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/018-macos-homebrew-app/spec.md`

**Planning Status**: Design artifacts are complete. The constitution has been amended to allow the scoped macOS native wrapper and Homebrew app distribution while preserving the TypeScript/Node product core.

## Summary

Add a macOS-native GitLocal distribution that users install through Homebrew while preserving the existing npm package unchanged. The product positioning pivots toward less-technical builders in AI-driven development workflows: GitLocal is primarily for browsing code, reading Markdown project knowledge, reviewing generated changes, and making small edits when needed. The macOS app remains a thin native wrapper around the existing GitLocal local service and React viewer: it starts the packaged Node-based service on localhost, loads the same UI in an embedded macOS web view, manages lifecycle cleanup, and ships as a versioned app artifact referenced by a project-owned Homebrew cask/tap.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for the existing server/CLI and React UI; Swift 5.x for the macOS native wrapper; Ruby cask metadata for the Homebrew tap  
**Primary Dependencies**: Existing Hono server, @hono/node-server, React 18, Vite 7, current npm build/test stack; macOS AppKit/WebKit for the wrapper; Homebrew cask packaging conventions; GitHub Releases for versioned app artifacts  
**Storage**: No new application database; bundled release assets for the native app, user-local app preferences only if needed for native window/session state, Homebrew cask metadata in a project-owned tap repository  
**Testing**: Existing Vitest and React Testing Library coverage for shared product code; XCTest/manual smoke tests for native lifecycle; shell-based packaging verification for cask install/upgrade/uninstall; `npm run verify` remains required for shared code  
**Target Platform**: macOS only for this native distribution, with npm distribution retained for macOS, Windows, and Linux  
**Project Type**: Existing local-first Node/React repository viewer plus a macOS desktop wrapper and Homebrew cask distribution path  
**Performance Goals**: Native app opens a viewer window in under 5 seconds on supported Macs after install; local service binds on loopback in under 2 seconds; quit cleanup completes in under 2 seconds for normal sessions  
**Constraints**: Preserve local-first behavior; bind only to loopback by default; keep npm package behavior unchanged; avoid relying on a user's global npm installation; maintain 90% per-file coverage for changed TypeScript/React files; do not commit contributor-local absolute paths; sign/notarization status must be explicit before public cask release  
**Scale/Scope**: One native app bundle for the current GitLocal release, one local service process per app session, one project-owned Homebrew tap/cask path for initial distribution, macOS support only in this release

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First Product Core**: PASS. Existing product backend/CLI remains TypeScript, and the scoped Swift wrapper is permitted by the amended constitution as a thin macOS distribution shell rather than a product-core fork.
- **Test Coverage**: PASS with scope. Changed TypeScript/React files must retain 90% per-file coverage. Native Swift packaging must have its own lifecycle/package smoke tests because it is outside the current Vitest coverage model.
- **Local-First with Git Remote Exception**: PASS. The native app starts a local service and renders local UI over loopback only; no new remote service behavior is introduced.
- **Node.js-Served React UI**: PASS. The same React SPA remains served by the Node.js backend; the native app embeds the local viewer rather than replacing the UI.
- **Clean & Useful UI**: PASS. The app avoids a terminal dependency while preserving the existing repository viewer surface.
- **Free & Open Source**: PASS. The wrapper and tap/cask metadata remain MIT-compatible and open source.
- **Repository-Relative Paths and Release Documentation**: PASS. Planning artifacts use repository-relative paths and the release requires README/changelog documentation.
- **Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS with release-time obligations. This is a dot-release feature; release tasks must include version bump, release review, and contrarian QA before shipping.

**Governance action completed**: The constitution now permits an additional macOS native app distribution and a small platform-native wrapper while preserving the TypeScript/Node product core and npm distribution.

## Project Structure

### Documentation (this feature)

```text
specs/018-macos-homebrew-app/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── homebrew-cask.md
│   ├── native-app.md
│   └── release-workflow.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── cli.ts                    # Existing npm CLI/browser entrypoint remains supported
├── index.ts                  # Existing package/server entrypoint
└── server.ts                 # Existing local service and UI serving behavior

ui/
└── dist/                     # Existing built React app, reused by npm and native app packaging

native/
└── macos/
    └── GitLocal/             # Swift macOS wrapper project and native tests

packaging/
└── macos/
    ├── cask/                 # Cask template and tap update notes/scripts
    └── release/              # App packaging, signing/notarization, checksum workflow docs/scripts

.github/
└── workflows/
    ├── publish.yml           # Tag-driven release pipeline for npm plus macOS/Homebrew
    └── macos-app-release.yml # Manual native app artifact build/package validation

tests/
├── integration/
└── unit/
```

**Structure Decision**: Keep shared product code in the existing TypeScript/React layout. Add macOS-only native wrapper code under `native/macos/` and packaging/release support under `packaging/macos/`, so the npm package remains lean and cross-platform while the cask consumes versioned macOS release artifacts.

## Governance Rationale

The original constitution allowed only the TypeScript/Node npm distribution. This feature required a scoped amendment because the requested deliverable is specifically a Homebrew-installed macOS native app using a platform-native wrapper.

The accepted path is a thin Swift/AppKit wrapper around the existing Node.js-served React UI. Electron was rejected because it would make the npm package heavy, npm-launched native installation was rejected because it is operationally brittle, and browser-only npm mode does not meet the no-terminal native-app goal.

## Phase 0: Research Summary

See [research.md](research.md).

Resolved decisions:

- Use a Swift/AppKit wrapper with WebKit as the macOS native shell.
- Keep the native app self-contained for normal use instead of depending on the user's global npm installation.
- Distribute the first macOS app release through a project-owned Homebrew tap with a cask that points to GitHub Release artifacts.
- Package a versioned signed/notarized app artifact when release credentials are available; explicitly document any pre-signing limitation if used for internal testing.
- Preserve npm as the existing cross-platform distribution and keep native app packaging outside the npm package contents.
- Document the measured shared-code ratio between distributions: 90.4% shared app implementation by line count, excluding tests, docs, and generated build outputs.

## Phase 1: Design Summary

See [data-model.md](data-model.md), [contracts/native-app.md](contracts/native-app.md), [contracts/homebrew-cask.md](contracts/homebrew-cask.md), [contracts/release-workflow.md](contracts/release-workflow.md), and [quickstart.md](quickstart.md).

Post-design constitution check: PASS after the governance amendment for scoped macOS native wrapper/distribution. All other principles remain satisfied by the proposed design.
