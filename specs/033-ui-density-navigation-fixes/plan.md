# Implementation Plan: UI Density & Navigation Fixes

**Branch**: `033-ui-density-navigation-fixes` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/033-ui-density-navigation-fixes/spec.md`

## Summary

A UI-only patch release covering six independently shippable fixes to information density and navigation: (1) restructure the repository block (`RepoContextHeader.tsx`) into two rows so tags can't clip the repo name and vertical spacing/control size shrink; (2) move the Parent Folder control from the repository block up to the persistent top toolbar (`App.tsx`) alongside Terminal and Refresh; (3) restyle the toolbar so Refresh reads as low-emphasis/plain and Terminal (plus the relocated Parent Folder) keep the existing secondary treatment, using the app's existing `Button` variant system rather than new one-off styles; (4) tighten vertical spacing in the current folder view (`ContentPanel.tsx`) and collapse its redundant nested container into a single bordered block; (5) fix the terminal panel's collapsed expand control (`TerminalPanel.tsx`) so it never sits outside the viewport; (6) reduce the xterm.js terminal font size (`TerminalView.tsx`). No server-side, data-model, or session-management changes — this is CSS/markup/prop-wiring only across four existing UI components.

## Technical Context

**Language/Version**: TypeScript 5.8.3, React 18.3.1 (existing project baseline; unchanged)
**Primary Dependencies**: Existing only — Tailwind utility classes + the project's CSS custom-property design tokens (`globals.css`), the existing `Button` component variant system, `@xterm/xterm` (already a dependency; only its `Terminal` constructor options change). No new dependencies.
**Storage**: N/A — no state, persistence, or data model changes.
**Testing**: Vitest + `@testing-library/react` + `jest-axe`, matching existing patterns in `App.test.tsx`, `RepoContextHeader.test.tsx`, `ContentPanel.test.tsx`, and the `TerminalPanel`/`TerminalView` test suites from feature 032. Coverage target unchanged: ≥90% per-file branch coverage.
**Target Platform**: Cross-platform — npm package and the macOS Homebrew native app wrapper both render the same UI bundle, so no per-platform work is needed.
**Project Type**: Web application — existing single-repo layout (`src/` Hono backend untouched; `ui/` Vite/React frontend is the only surface touched).
**Performance Goals**: No new performance requirement; must not regress existing render performance or the terminal's fit-to-container behavior.
**Constraints**: Purely presentational/layout change — no new network calls, no new PTY/session behavior, no accessibility regressions (existing aria-labels/titles/focus order must be preserved or improved, never removed).
**Scale/Scope**: Four existing UI components (`RepoContextHeader.tsx`, `App.tsx` toolbar, `ContentPanel.tsx`, `TerminalPanel.tsx`/`TerminalView.tsx`) plus their associated CSS in `globals.css`; no new components, routes, or files beyond tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TypeScript-First Product Core | PASS | All changes are TypeScript/TSX + CSS in the existing `ui/` React app; no new language or runtime. |
| II. Test Coverage (NON-NEGOTIABLE) | PASS (design accounts for it) | Existing component test suites (`RepoContextHeader`, `App` toolbar, `ContentPanel`, `TerminalPanel`/`TerminalView`) are updated alongside markup changes rather than added fresh; layout/CSS-only assertions (row grouping, control presence, font-size prop) keep coverage at or above the enforced threshold without new untested surface area. |
| III. Local-First with Git Remote Exception | PASS | No network behavior changes at all; this release doesn't touch any remote call path. |
| IV. Node.js-Served React UI | PASS | No change to the serving model; same SPA, same bundling. |
| V. Clean & Useful UI | PASS | Directly advances this principle — reduces visual clutter/whitespace, fixes a content-clipping bug, and makes a previously nested/hidden control (Parent Folder) permanently and predictably reachable. |
| VI. Free & Open Source | PASS | No new dependencies introduced. |
| VII. Repository-Relative Paths and Release Documentation | PASS | Spec-kit artifacts use repository-relative paths; release documentation (CHANGELOG, version bump) handled at release time per Principle VIII, not by this plan. |
| VIII. Release Branches, Pre-GA Versioning, and Contrarian QA | DEFERRED (not a plan-time gate) | This feature is intended to ship as `0.10.1`; the release-time obligations (version bump, changelog, contrarian QA pass, accessibility review, `releases/0.10.1-release-review.md`) apply when the release branch is cut, not during spec/plan/implement. |

No violations requiring justification; no Complexity Tracking entries needed.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`).*

This feature has no data model and no service contracts (pure UI restructuring), so Phase 1 is scoped to `quickstart.md` (manual verification steps) only — see Project Structure below. Re-reviewing the table above against that scope changes nothing: still no new dependencies, no network/service changes, and the accessibility-preservation constraint (FR-015) is carried into the quickstart's manual verification steps. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/033-ui-density-navigation-fixes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command) — n/a, no unknowns requiring research; omitted
├── data-model.md         # Phase 1 output — n/a, no data entities; omitted
├── quickstart.md        # Phase 1 output (/speckit.plan command) — manual verification checklist per user story
├── contracts/            # Phase 1 output — n/a, no new API surface; omitted
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Existing single-repo web application layout (unchanged) — this feature only touches
# files already listed below; no new top-level directories.

src/                                    # Hono backend — NOT touched by this feature
tests/                                  # Server-side Vitest tests — NOT touched by this feature

ui/
├── src/
│   ├── App.tsx                         # Top toolbar: Refresh/Terminal styling, relocated Parent Folder control
│   ├── App.test.tsx                    # Toolbar tests updated for relocated/restyled controls
│   ├── components/
│   │   ├── RepoContext/
│   │   │   ├── RepoContextHeader.tsx   # Two-row repo block layout; Parent Folder control removed
│   │   │   └── RepoContextHeader.test.tsx
│   │   ├── ContentPanel/
│   │   │   ├── ContentPanel.tsx        # Denser spacing; collapse redundant nested container
│   │   │   └── ContentPanel.test.tsx
│   │   └── TerminalPanel/
│   │       ├── TerminalPanel.tsx       # Collapsed expand-control viewport fix
│   │       ├── TerminalPanel.test.tsx
│   │       ├── TerminalView.tsx        # xterm.js fontSize option
│   │       └── TerminalView.test.tsx
│   └── styles/globals.css              # `.repo-context-header`, `.content-directory-panel`,
│                                        # `.content-directory-table-wrap` spacing rules
└── tests/                              # Existing UI test setup (jest-axe, RTL) — unchanged
```

**Structure Decision**: Existing single-repo web application structure (`src/` backend + `ui/` frontend) is unchanged; this feature is scoped entirely to five existing files under `ui/src/` (plus their test files) and their associated rules in `ui/src/styles/globals.css`. No new directories, no new components — every change is a modification to markup, CSS, and one xterm.js constructor option in files that already exist.

## Complexity Tracking

*No Constitution Check violations — table not needed.*
