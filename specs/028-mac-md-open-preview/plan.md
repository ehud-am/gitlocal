# Implementation Plan: Mac Markdown Open Preview

**Branch**: `028-mac-md-open-preview` | **Date**: 2026-07-06 | **Spec**: `specs/028-mac-md-open-preview/spec.md`
**Input**: Feature specification from `specs/028-mac-md-open-preview/spec.md`

## Summary

Enable the macOS app to optionally become the default Markdown reader after a first-run opt-in or an explicit later native menu action, so double-clicking a Markdown file in Finder activates GitLocal, resolves the containing local folder or repository, and opens the requested Markdown file in rendered preview. Update the viewer design to remove the subtle tree/README tab choice: folder pages should follow the familiar GitHub pattern with the folder tree first and README below on the same page, plus a quick README link near the top when a README exists and a checkbox to hide/show `.*` files. The implementation stays in the shared TypeScript/React app where possible, with Swift limited to native document registration, default-reader consent/setup, and open-request forwarding.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI and React UI; Swift 5.x for the existing scoped macOS wrapper
**Primary Dependencies**: Existing Hono local server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; macOS AppKit/WebKit and LaunchServices document metadata for native wrapper behavior
**Storage**: No database; runtime state remains derived from local filesystem/git metadata, browser URL/local UI state, local first-run/default-reader preference state, native app session open requests, and in-memory server/UI state
**Testing**: Vitest with per-file coverage gates, React Testing Library, xcodebuild for wrapper validation, existing macOS package/cask smoke scripts when packaging metadata changes
**Target Platform**: macOS native app for Finder double-click/default-reader workflow; shared browser/npm viewer remains supported for folder layout regressions
**Project Type**: Local-first TypeScript CLI/server + React SPA, with a thin macOS wrapper around the same local service and UI
**Performance Goals**: First-run default-reader prompt must not add noticeable startup delay; Finder-opened Markdown files should reach rendered preview within 5 seconds on a typical local repository; README quick-link scroll and dotfile visibility toggles should be immediate and must not reset the active folder or selected file
**Constraints**: Preserve the TypeScript product core, keep Swift isolated to the wrapper, avoid telemetry and remote services, do not alter npm/browser launch semantics except for the shared viewer layout, keep GitHub-Flavored Markdown rendering, maintain 90% per-file coverage
**Scale/Scope**: One native macOS open-file path, one shared startup/open-target path, and one shared folder browsing layout for repositories and non-git folders

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: Pass. Product behavior remains in the existing TypeScript server/UI. Swift changes are restricted to app metadata, default-reader prompting, the explicit default-reader menu action, and file-open forwarding.
- **II. Test Coverage**: Pass with required work. Any touched TypeScript/React files need focused tests that keep per-file branch coverage at or above 90%.
- **III. Local-First with Git Remote Exception**: Pass. The feature uses local Finder paths, local filesystem/git metadata, and OS file association APIs only.
- **IV. Node.js-Served React UI**: Pass. The macOS app continues to host the same Node-served React SPA.
- **V. Clean & Useful UI**: Pass. The revised design is GitHub-inspired: visible folder tree, README below, rendered Markdown first, compact dotfile control, and no subtle tree/README tabs.
- **VI. Free & Open Source**: Pass. No proprietary services or paid capabilities are introduced.
- **VII. Repository-Relative Paths and Release Documentation**: Pass. Plan and design artifacts use repository-relative paths.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: Pass. Release-specific changelog, README, package version, and QA work remain release tasks outside this feature plan unless this feature is shipped in a release branch.

## Project Structure

### Documentation (this feature)

```text
specs/028-mac-md-open-preview/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mac-open-file.md
│   └── workspace-layout.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
native/macos/
└── GitLocal/                 # Thin native wrapper, app metadata, open-file handling

src/
├── cli.ts                    # Startup/open path handling if shared CLI arguments are touched
├── server.ts                 # Local service startup and API surface
└── ...                       # Existing filesystem/git/open-path services

ui/
├── src/
│   ├── App.tsx               # Startup target hydration and top-level viewer state
│   ├── components/
│   │   ├── ContentPanel.tsx  # Markdown preview/file rendering
│   │   └── FileTree.tsx      # Folder tree, selected item, dotfile visibility
│   └── ...                   # Existing hooks/state helpers
└── tests/                    # React behavior coverage

tests/
└── ...                       # Server/open-path coverage

packaging/macos/
└── ...                       # Package/cask validation if metadata changes affect release assets
```

**Structure Decision**: Keep the existing shared app structure. Native code is limited to the macOS wrapper; all layout, preview, folder tree, README jump, and dotfile behavior belongs in the shared React UI and existing TypeScript server contracts.

## Complexity Tracking

No constitution violations or complexity exceptions are required.

## Phase 0: Research

Research resolves the following decisions in `research.md`:

- Default Markdown-reader setup is opt-in on first run or through an explicit later macOS app menu action, and never automatic.
- The app may advertise Markdown document support so users can choose GitLocal through macOS, but default-reader changes require explicit acceptance or a user-initiated native menu action.
- Swift remains a thin open-request forwarding layer.
- Startup/open targets must let native file-open requests override saved viewer state and README defaults.
- Folder pages use a GitHub-like layout: folder tree first, README below, README quick link near the top, dotfiles shown by default with a hide `.*` checkbox.
- Native registration starts with Markdown file types GitLocal already supports, with `.md` as the primary extension.
- Native metadata requires build/package smoke validation in addition to TypeScript tests.

## Phase 1: Design & Contracts

Design outputs:

- `data-model.md`: Open request, default-reader preference, active folder context, selected file, document preview, and workspace layout state.
- `contracts/mac-open-file.md`: Native app, local service, UI, and error contracts for Finder-opened Markdown files.
- `contracts/workspace-layout.md`: GitHub-like folder tree/README layout contract, README jump behavior, dotfile toggle behavior, and regression checks.
- `quickstart.md`: Verification workflow for shared tests, server open-file behavior, React viewer layout, macOS wrapper build, opt-in default-reader setup, Finder workflow, and package/cask impact.

**Post-design Constitution Re-check**: Pass. The Phase 1 design keeps product behavior shared in TypeScript/React, confines Swift to wrapper responsibilities, preserves local-first behavior, avoids new dependencies, and maintains the clean GitHub-inspired UI direction.

## Phase 2: Task Planning Approach

Tasks should be ordered so foundational contracts and tests precede behavior changes:

1. Validate native app metadata, first-run preference storage, and later menu setup without changing OS defaults automatically.
2. Add or confirm shared startup/open-target plumbing for Finder-opened Markdown files.
3. Implement React startup hydration so requested files override saved/default selections and render Markdown preview.
4. Replace the subtle tree/README tab design with a folder page that shows the folder tree first and README below.
5. Add the README quick link and dotfile visibility checkbox.
6. Cover server, UI, native wrapper, and manual package/cask verification paths.

Task generation must preserve independent user-story slices where possible: optional default-reader setup, later native menu setup, Finder open-file activation, folder/README layout, README jump link, dotfile density control, and error handling.
