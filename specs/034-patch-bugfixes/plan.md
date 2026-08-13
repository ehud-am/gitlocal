# Implementation Plan: Patch Bug Fixes (0.10.2)

**Branch**: `034-patch-bugfixes` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/034-patch-bugfixes/spec.md`

## Summary

A patch release covering six independently shippable bug fixes and relocations: (1) restore folder-view scrolling, broken since the terminal panel's introduction, by giving `main.content-area` (`ui/src/App.tsx`) the missing `min-h-0` needed for its flex-column children to shrink instead of overflowing; (2) fix Claude/Codex terminal tabs failing with a PATH error by adding a login-shell PATH-resolution fallback to `isCliAvailable`/`detectCapabilities` (`src/terminal/cli-detection.ts`), since the current check only inspects the server process's own `process.env.PATH`, missing PATH extensions sourced from `~/.zshrc`/`~/.bashrc`/nvm that an interactive shell resolves; (3) add a native-menu "Toggle Terminal" item (Ctrl+`) that reuses the existing, already-implemented Ctrl+` browser shortcut rather than introducing a new Cmd+T binding, which browsers reserve for new-tab; (4) consolidate the two independent, unsynchronized "Hide .* files" toggles (`FileTree.tsx`, `ContentPanel.tsx`) into one persisted, shared setting, exposed as a native menu item and a single browser toolbar control; (5) remove the toolbar Refresh button, relying on the native View menu's existing Cmd+R item and adding a browser-safe Ctrl+Alt+R shortcut plus an always-visible browser control; (6) remove the sidebar "Tracked/All/Local" dropdown, relocating it to the native menu and the same browser toolbar control introduced for dotfile visibility. Every native-menu addition reuses the existing `dispatchNativeCommand` → `gitlocal:native-command` CustomEvent bridge (`AppDelegate.swift` / `ViewerWindowController.swift` / `App.tsx`); no new native-web plumbing is introduced.

## Technical Context

**Language/Version**: TypeScript 5.8.3, React 18.3.1 (UI); Node.js 22+ (server); Swift (native macOS wrapper, `native/macos/GitLocal/`) — all existing project baselines, unchanged.
**Primary Dependencies**: Existing only. No new npm dependencies. Native fix for US2 uses Node's built-in `node:child_process` (`execFileSync`) alongside the existing `node:fs`/`node:path` used by `cli-detection.ts`.
**Storage**: Existing `ViewerState` localStorage blob (`ui/src/services/viewerState.ts`) gains one new persisted field (dotfile visibility) using the same `readViewerState`/`writeViewerState` pattern already used for `generatedLocalVisibility`, `sidebarCollapsed`, etc.
**Testing**: Vitest (server: `tests/unit/terminal/cli-detection.test.ts`, `tests/unit/terminal/session-manager.test.ts`; UI: `@testing-library/react` + `jest-axe` component suites) — existing patterns extended, not replaced. Coverage target unchanged: ≥90% per-file branch coverage.
**Target Platform**: Cross-platform — npm/browser distribution and the macOS Homebrew native app wrapper both render the same UI bundle; the native-only pieces (menu items, `AppDelegate.swift`/`ViewerWindowController.swift`) are additive to the existing Swift shell under `native/macos/`.
**Project Type**: Web application (existing single-repo layout: `src/` Hono backend, `ui/` Vite/React frontend) plus the existing thin native Swift wrapper.
**Performance Goals**: No new performance requirement. The US2 login-shell PATH fallback (`execFileSync`) only runs when the fast raw-PATH walk misses, and only for `claude`/`codex` (two calls max, at session-creation time, not on every keystroke).
**Constraints**: US2's shell-profile probe must not hang indefinitely if a user's shell profile does something slow/interactive — needs a bounded timeout and must fail closed (treat timeout/error as "not found", never a false positive). US3's and US5's new shortcuts must avoid any combination already reserved by macOS or by any major browser (this ruled out Cmd+T/Ctrl+T and Cmd+R/Ctrl+R, see Research below).
**Scale/Scope**: Six independently shippable stories touching: `ui/src/App.tsx` (layout fix, toolbar removals, native-command handling, new toolbar control), `ui/src/components/FileTree/FileTree.tsx` and `ui/src/components/ContentPanel/ContentPanel.tsx` (remove local dotfile state), `ui/src/services/viewerState.ts` + `ui/src/types/index.ts` (new persisted field), `src/terminal/cli-detection.ts` (PATH fallback), `native/macos/GitLocal/GitLocal/AppDelegate.swift` and `ViewerWindowController.swift` (new menu items/handlers). No new components, no new files beyond tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TypeScript-First Product Core | PASS | All product logic stays in TypeScript/TSX (`ui/`, `src/`); the Swift changes are strictly additive menu wiring in the existing thin native shell under `native/macos/`, consistent with the constitution's scoped exception. |
| II. Test Coverage (NON-NEGOTIABLE) | PASS (design accounts for it) | Existing suites extended: `cli-detection.test.ts` gains cases for the login-shell fallback (mocking `execFileSync`); `App.test.tsx`, `FileTree.test.tsx`, `ContentPanel.test.tsx` updated for the state consolidation and control relocations; new toolbar control gets its own assertions. No new untested surface area. |
| III. Local-First with Git Remote Exception | PASS | No network behavior changes. The US2 fix still only inspects the local filesystem/shell — no remote calls introduced. |
| IV. Node.js-Served React UI | PASS | No change to the serving model. |
| V. Clean & Useful UI | PASS | Directly advances this principle: fixes a real scrolling regression, removes duplicated/desynced controls, and declutters the toolbar. |
| VI. Free & Open Source | PASS | No new dependencies. |
| VII. Repository-Relative Paths and Release Documentation | PASS | Spec-kit artifacts use repository-relative paths; CHANGELOG/README review deferred to release time per Principle VIII. |
| VIII. Release Branches, Pre-GA Versioning, and Contrarian QA | DEFERRED (not a plan-time gate) | Targets `0.10.2` per spec.md Assumptions; release-time obligations (version bump, changelog, contrarian QA, `releases/0.10.2-release-review.md`) apply when the release branch is cut, not during spec/plan/implement. |

No violations requiring justification; no Complexity Tracking entries needed.

## Phase 0: Research

Two open technical unknowns existed at spec time; both are now resolved and captured here rather than in a separate `research.md` (narrow enough to fold inline, matching how 033 omitted `research.md` for a similarly-scoped patch — unlike 033, this feature does have real unknowns, so they're recorded explicitly below instead of assumed away).

**1. How should Claude/Codex CLI PATH resolution work (US2)?**
Root cause confirmed by reading `src/terminal/cli-detection.ts` and `src/handlers/terminal.ts`: `detectCapabilities()` calls `isCliAvailable('claude', process.env.PATH)`, a synchronous directory walk over the *server process's own* `PATH`. `src/handlers/terminal.ts:74-80` gates session creation on this result *before* any PTY is spawned — so when `claude` is only resolvable via a shell profile (nvm, a `~/.zshrc` PATH export, etc.), the pre-flight check fails and the request never reaches `session-manager.ts`, which is why the error appears immediately rather than as a shell-level "command not found". `session-manager.ts` itself needs no change: once a session is created, it spawns the user's shell interactively (`node-pty` on a real TTY) and types `claude\n` into it (`session-manager.ts:152-159`) — the same mechanism as a user manually typing `claude` into a Regular tab, which already works because an interactive shell sources `~/.zshrc`. **Decision**: add a login-shell fallback to `detectCapabilities()` only (not `isCliAvailable`, which stays a pure, fast, synchronously-testable PATH walk and keeps its existing test contract in `cli-detection.test.ts`): when the raw walk misses, run `execFileSync(shell, ['-ilc', \`command -v ${command}\`], { timeout: 2000 })` where `shell = process.env.SHELL || '/bin/sh'`, treating any thrown error/timeout as "not found" (fail closed, per FR-003). `-i` sources `~/.zshrc`/`~/.bashrc` (interactive-shell files, where most PATH exports live); `-l` additionally sources `~/.zprofile`/`~/.profile` (login-shell files) for full parity with how Terminal.app itself would resolve the command. Only exercised on `darwin`/`linux` (the platforms `node-pty` supports interactively spawning a real login shell for); `win32` keeps the existing raw-PATH-only behavior.

**2. What keyboard shortcuts are safe for the terminal toggle (US3) and refresh (US5) across both distributions?**
Confirmed via the existing implementation and cross-checking browser/OS reservations: Cmd+T/Ctrl+T is reserved by every major browser (Chrome/Firefox/Safari/Edge) for "new tab" and cannot be intercepted by page JS; Cmd+\` is reserved by macOS for cycling windows within an app. The terminal toggle already avoids both — `TerminalPanel.tsx:107-116` implements Ctrl+\` globally (not Cmd), matching VS Code's own cross-platform convention, and works unchanged in both distributions today. US3's only remaining work is exposing that existing binding as a discoverable native menu item. The same class of conflict applies to Refresh: Cmd+R/Ctrl+R is reserved by every browser for page reload and cannot be intercepted, so a literal "Cmd+R in the browser too" is not achievable. **Decision**: keep the native macOS menu's existing Cmd+R (`AppDelegate.swift:155-161`, already implemented, no change needed) for the native app, and add **Ctrl+Alt+R** as the browser-safe cross-distribution refresh shortcut (unclaimed by macOS and by all major browsers), implemented as a new global `keydown` listener in `App.tsx` following the same pattern as `TerminalPanel.tsx`'s Ctrl+\` handler. Dotfile visibility's native shortcut (FR-007) has no cross-distribution constraint (browser gets a control, not a shortcut, per FR-008) — Cmd+Shift+. is used, matching macOS Finder's own convention for toggling hidden files, for discoverability.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`).*

This feature has no new data model (state consolidation reuses the existing `ViewerState` shape with one added field) and no new HTTP API surface, so Phase 1 output is scoped to `quickstart.md` (manual verification steps) and an update to the existing `specs/021-native-shortcuts/contracts/native-app-commands.md`-style contract, extended in place rather than duplicated (see Project Structure below). Re-reviewing the Constitution Check table against that scope changes nothing: still no new dependencies, no network/service changes beyond the local `execFileSync` shell probe (already covered under Principle III's "local git CLI" spirit — this is a local shell command, not a network call), and the accessibility-preservation constraint (FR-016) is carried into the quickstart's manual verification steps. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/034-patch-bugfixes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # n/a — folded into this plan's "Phase 0: Research" section (two unknowns, both narrow)
├── data-model.md         # n/a — no new data entities; the one new persisted field is documented inline below
├── quickstart.md        # Phase 1 output — manual verification checklist per user story
├── contracts/            # Phase 1 output — extends specs/021-native-shortcuts/contracts/native-app-commands.md's
│                          # table with this feature's new commands (toggle-terminal, toggle-dotfiles, refresh
│                          # already listed, tracked-visibility); no new contracts/ dir needed under 034 itself
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Existing single-repo web application layout (unchanged), plus the existing native macOS wrapper.

src/
├── terminal/
│   └── cli-detection.ts              # US2: add login-shell fallback to detectCapabilities()
└── (tests/unit/terminal/cli-detection.test.ts updated accordingly)

ui/
├── src/
│   ├── App.tsx                       # US1: add min-h-0 to `main.content-area` (line 1296)
│   │                                  # US3: handle 'toggle-terminal' native command; add Ctrl+Alt+R listener
│   │                                  # US4/US6: remove Refresh button (US5), add single "View options" toolbar
│   │                                  #   control (dotfile visibility + Tracked/All/Local), gated on
│   │                                  #   NOT running inside the native WebView (reuses the existing
│   │                                  #   postNativeAppCommand() bridge-detection pattern)
│   │                                  # US5: remove Refresh button; handle 'refresh' still via existing branch
│   │                                  # US6: remove inline Tracked/All/Local <select> from sidebar toolbar
│   │                                  #   (lines 1250-1264), moved into the new toolbar control
│   ├── App.test.tsx                  # Updated for all of the above
│   ├── services/
│   │   └── viewerState.ts            # US4: persist the consolidated dotfile-visibility field
│   ├── types/index.ts                # US4: add the field to the ViewerState interface
│   └── components/
│       ├── FileTree/
│       │   ├── FileTree.tsx          # US4: remove local showDotfiles state (lines 56, 186, 243-249);
│       │   │                          #   accept it as a prop instead
│       │   └── FileTree.test.tsx
│       └── ContentPanel/
│           ├── ContentPanel.tsx      # US4: remove local showDotfiles state (lines 251, 564, 662, 705-714);
│           │                          #   accept it as a prop instead
│           └── ContentPanel.test.tsx
└── tests/                            # Existing UI test setup — unchanged

native/macos/GitLocal/GitLocal/
├── AppDelegate.swift                 # US3: add "Toggle Terminal" (Ctrl+`) to the View menu
│                                      # US4: add "Hide Dotfiles" (Cmd+Shift+.) checkable item
│                                      # US6: add "Tracked/All/Local" submenu with checkmarks
├── ViewerWindowController.swift      # New @objc handlers (toggleTerminal, toggleDotfiles,
│                                      #   setTrackedVisibility) dispatching via the existing
│                                      #   dispatchNativeCommand(_:) helper — same pattern as
│                                      #   refreshViewer/findInPreview/etc.
└── (native UI tests, if any exist for menu wiring — verified during implementation)
```

**Structure Decision**: Existing single-repo web application structure (`src/` backend + `ui/` frontend) plus the existing native Swift wrapper are both extended in place — no new directories, no new top-level components. US1 and US2 are single-file, root-cause-targeted fixes. US3/US4/US6 add native menu items that all reuse the one existing `dispatchNativeCommand` → `gitlocal:native-command` bridge already wired through `AppDelegate.swift` → `ViewerWindowController.swift` → `App.tsx`, so no new native-web communication mechanism is introduced. US4 and US6 share a single new browser-side "View options" toolbar control rather than each getting their own, per spec.md's Assumption that the browser distribution should consolidate menu-relocated items into one compact control.

## Complexity Tracking

*No Constitution Check violations — table not needed.*
