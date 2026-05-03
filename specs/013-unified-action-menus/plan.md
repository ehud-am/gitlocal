# Implementation Plan: Unified Action Menus

**Branch**: `013-unified-action-menus` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/013-unified-action-menus/spec.md`

## Summary

Unify optional item-level commands for non-git folders, files, and git folders behind the same three-dots menu pattern. Preserve every existing setup, create, edit, view, navigation, and delete command while moving inconsistent standalone entry points into menus; style delete menu items in red; and upgrade file deletion to the same exact typed-name confirmation pattern already required for folder deletion.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library, Radix UI primitives
**Storage**: None; runtime state is derived from local filesystem metadata, git metadata, browser URL state, and in-memory server/UI state
**Testing**: Existing frontend component/app tests plus backend handler tests only if the file delete request contract changes
**Target Platform**: Local desktop browser served by the Node-based local server
**Project Type**: Full-stack local web application with a React repository browser UI
**Performance Goals**: Menus open instantly during normal browsing, add no visible layout shifts, and keep delete confirmation state responsive while typing
**Constraints**: Repository-relative paths in committed docs; local-first operation only; repository root deletion remains unavailable; exact typed-name confirmation for file and folder deletes; existing folder delete impact/stale-preview safety must not be weakened; >=90% per-file branch coverage
**Scale/Scope**: Optional command entry points in picker/non-git setup context, file content actions, git folder content actions, and file/folder delete confirmation UI

## Constitution Check

- `TypeScript-first`: Pass. Planned implementation stays in TypeScript for the existing UI and only touches backend TypeScript if a delete contract adjustment is required.
- `Test coverage`: Pass. UI behavior changes require targeted React tests and must preserve >=90% per-file branch coverage.
- `Local-first with Git remote exception`: Pass. The feature changes local UI affordances and local filesystem delete confirmation only; no remote API behavior is added.
- `Node.js-served React UI`: Pass. The existing React SPA remains served by the Node backend.
- `Clean & useful UI`: Pass. One predictable menu pattern reduces visual inconsistency while keeping destructive commands visually distinct.
- `Free & open source`: Pass. No proprietary dependency is required.
- `Repository-relative paths and release documentation`: Pass. Planning artifacts use repository-relative paths.
- `Release branches, pre-GA versioning, and contrarian QA`: Pass for planning. Release-specific version, changelog, README review, and contrarian QA remain release gates if this feature ships.

## Project Structure

### Documentation (this feature)

```text
specs/013-unified-action-menus/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── action-menus.md
└── tasks.md
```

### Source Code (repository root)

```text
ui/src/
├── App.tsx
├── components/
│   ├── AppDialogs.tsx
│   ├── ContentPanel/
│   │   ├── ContentPanel.tsx
│   │   └── DeleteFileDialog.tsx
│   ├── Picker/
│   │   └── PickerPage.tsx
│   └── ui/
│       └── dropdown-menu.tsx
├── services/
│   └── api.ts
├── styles/
│   └── globals.css
└── types/
    └── index.ts

src/
└── handlers/
    └── files.ts

tests/
└── unit and integration coverage for any reused or changed file delete contract

ui/src/*.test.tsx
ui/src/components/**/*.test.tsx
```

**Structure Decision**: Reuse the existing Radix-backed dropdown menu primitive and current React surfaces. Picker setup actions stay in `PickerPage.tsx` but use the shared three-dots affordance; file actions stay in `ContentPanel.tsx`; git folder view actions move from standalone buttons in `ContentPanel.tsx` into a menu; delete confirmation changes are owned by `DeleteFileDialog.tsx` for files and `AppDialogs.tsx` for folders. Backend file handlers are touched only if implementation chooses to validate a new client-provided confirmation field server-side.

## Phase 0: Research Focus

- Decide the shared three-dots menu affordance, accessible label pattern, and hidden-empty-menu rule.
- Decide how existing git folder actions move into a menu without losing create file, create folder, edit/view, navigation, or delete capabilities.
- Decide destructive item styling that remains clear in the menu without turning every destructive option into a separate button style.
- Decide the typed-name delete confirmation model for files and folders, including duplicate names in different folders.
- Confirm repository root deletion remains unavailable and existing folder delete impact/stale-preview behavior is preserved.

## Phase 1: Design Focus

- Model action menus, menu items, action targets, and delete confirmation state.
- Define a UI contract for non-git setup menus, file action menus, git folder action menus, and destructive item styling.
- Define a confirmation contract for exact typed-name matching, target location display, cancel behavior, and stale target handling.
- Write a manual quickstart that validates all three menu contexts, file/folder delete confirmation, root deletion exclusion, keyboard access, and command preservation.

## Post-Design Constitution Check

- `TypeScript-first`: Pass. Design remains within existing TypeScript UI and optional TypeScript handler tests.
- `Test coverage`: Pass. Planned contracts identify UI tests for menu visibility, destructive styling, command preservation, exact typed-name confirmation, and cancel safety.
- `Local-first with Git remote exception`: Pass. No remote behavior is introduced.
- `Node.js-served React UI`: Pass.
- `Clean & useful UI`: Pass. The design standardizes command discovery and makes destructive options more recognizable.
- `Repository-relative paths and release documentation`: Pass. Generated artifacts avoid contributor-local absolute paths.

## Complexity Tracking

No constitution violations are expected for this feature.
