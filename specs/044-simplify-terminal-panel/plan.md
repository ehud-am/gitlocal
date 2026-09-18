# Implementation Plan: Simplify Terminal Panel

**Branch**: `044-simplify-terminal-panel` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/044-simplify-terminal-panel/spec.md`

## Summary

Simplify the integrated terminal panel by (1) removing the "Claude"/"Codex" terminal-kind
concept so every tab is a plain shell, (2) adding a dock-position preference (bottom/left/right,
default right) that persists across app restarts via a new server-side preference file
following the existing `startup-preferences.ts` pattern, and (3) replacing the current
kind-selector-plus-create control with a single "New Terminal" action used identically in the
empty state and the tab strip. This removes `src/terminal/cli-detection.ts` and
`ui/src/components/TerminalPanel/TerminalKindSelect.tsx` outright, strips the `kind` field from
the terminal session type/API/contract, and reworks `TerminalPanel.tsx`'s single height-based
layout into an orientation-aware layout (height/row-resize for bottom, width/col-resize for
left/right).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+ (active LTS)
**Primary Dependencies**: Hono ^4.x + @hono/node-server (server), `node-pty` + `ws` (terminal
sessions, unchanged), React 18 + Vite 7 + `@xterm/xterm` + `@xterm/addon-fit` (UI, unchanged)
**Storage**: New JSON preference file `~/.gitlocal/terminal-panel-preference.json`
(`{ "dockPosition": "bottom" | "left" | "right" }`), following the existing
`src/services/startup-preferences.ts` pattern (`startup-folder.json`, `default-reader.json`)
**Testing**: Vitest + @vitest/coverage-v8, ≥90% per-file branch coverage (root `vitest.config.ts`
and `ui/vitest.config.ts`)
**Target Platform**: Both GitLocal distributions — npm/browser package and the macOS Homebrew
native-wrapper app — sharing this code unchanged
**Project Type**: Web application (Node.js/Hono backend + React/Vite frontend in one repo)
**Performance Goals**: Dock-position change reflected in the UI in under 2 seconds (SC-003); no
PTY/session restart on reposition
**Constraints**: Must not regress the existing Ctrl+` toggle shortcut or the native macOS
"Toggle Terminal" menu item; must not lose any open session or scrollback when repositioning
(FR-006); ≥90% per-file branch coverage (Principle II) — any new file must be added to
`ui/vitest.config.ts`'s explicit coverage `include` allowlist (a gap previously missed for
specs 038 and 042, per project history)
**Scale/Scope**: Touches ~10 existing files across `src/terminal/`, `src/handlers/terminal.ts`,
`ui/src/components/TerminalPanel/`, `ui/src/hooks/useTerminalPanel.ts`, `ui/src/types/index.ts`,
and `ui/src/App.tsx`; deletes 2 files (`src/terminal/cli-detection.ts`,
`ui/src/components/TerminalPanel/TerminalKindSelect.tsx`); adds 1 small server preference module
+ 2 new API routes + 1 small UI control for choosing dock position

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: PASS. Pure TypeScript/React change; no new runtime, no
  new language, no dependency added (uses existing Hono/React/fs primitives).
- **II. Test Coverage (NON-NEGOTIABLE)**: PASS, with an explicit action item — the plan calls out
  updating `ui/vitest.config.ts`'s coverage include list for every new/removed UI file (see
  Technical Context "Constraints" and research.md Decision 6), continuing the project's existing
  practice of catching this gap before merge (per CLAUDE.md notes on specs 038/042).
- **III. Local-First with Git Remote Exception**: PASS. The new preference endpoints are local
  HTTP routes served by the existing local Node server; no new network calls, no remote services.
- **IV. Node.js-Served React UI**: PASS. No change to the build/serving model.
- **V. Clean & Useful UI**: PASS — directly advances this principle by removing an unnecessary
  decision point (kind selection) and clarifying the new-terminal action, per the constitution's
  target-audience guidance that the product should optimize for simple, GitHub-like interactions
  over IDE-style configurability.
- **VI. Free & Open Source**: PASS. No new dependencies.
- **VII. Repository-Relative Paths and Release Documentation**: PASS. This plan and its
  artifacts use repository-relative paths throughout; a `CHANGELOG.md` entry is required at
  release time (tracked in tasks, not in this plan).
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: N/A at planning time — the
  release process (version bump, contrarian QA review) applies when this feature branch merges
  into a release branch, not to the plan itself.

No violations. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/044-simplify-terminal-panel/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── terminal-session-api.md
│   └── terminal-panel-preference-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This feature modifies the existing GitLocal layout in place; no new top-level directories.

```text
src/
├── terminal/
│   ├── types.ts                 # remove TerminalKind, kind fields, claude/codex capability flags
│   ├── session-manager.ts       # remove kind-based auto-launch write
│   └── cli-detection.ts         # DELETED (was Claude/Codex-only)
├── handlers/
│   └── terminal.ts              # remove VALID_KINDS/isValidKind/cli_not_found pre-flight
├── services/
│   └── terminal-panel-preference.ts   # NEW — JSON file read/write, mirrors startup-preferences.ts
├── types.ts                     # add TerminalPanelPreference / dock position types
└── server.ts                    # register GET/PUT /api/terminal-panel-preference routes

ui/src/
├── components/TerminalPanel/
│   ├── TerminalPanel.tsx        # orientation-aware layout (height vs width resize)
│   ├── TerminalTabStrip.tsx     # single "New Terminal" action, drop kind icon/select
│   ├── TerminalKindSelect.tsx   # DELETED
│   └── TerminalView.tsx         # unchanged
├── hooks/
│   └── useTerminalPanel.ts      # drop kind/labelFor logic, add dock-position state + fetch/save
├── services/
│   └── terminalPanelPreference.ts  # NEW — client for the new preference API
├── types/index.ts               # remove TerminalKind & related fields; add DockPosition type
└── App.tsx                      # conditionally place TerminalPanel in column vs row flex context

tests/
├── unit/handlers/terminal.test.ts          # update: no kind, no cli_not_found path
├── unit/terminal/session-manager.test.ts   # update: no auto-launch write
├── unit/terminal/cli-detection.test.ts     # DELETED
└── unit/services/terminal-panel-preference.test.ts  # NEW

ui/src/components/TerminalPanel/TerminalPanel.test.tsx      # update for orientation + new control
ui/src/components/TerminalPanel/TerminalTabStrip.test.tsx   # update for single new-terminal action
ui/src/hooks/useTerminalPanel.test.ts                        # update: no kind, dock-position state
```

**Structure Decision**: Reuse the existing single-repo layout (`src/`, `ui/`, `tests/`) exactly
as documented in `CLAUDE.md` — this is a targeted modification/deletion within the existing
terminal feature area, not a new module or new top-level directory. A small new server service
(`src/services/terminal-panel-preference.ts`) mirrors the existing
`src/services/startup-preferences.ts` pattern for consistency with the codebase's established
approach to restart-durable preferences.

## Complexity Tracking

Not applicable — no constitution violations to justify.
