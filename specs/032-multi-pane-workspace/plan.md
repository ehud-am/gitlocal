# Implementation Plan: Multi-Pane Workspace

**Branch**: `032-multi-pane-workspace` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/032-multi-pane-workspace/spec.md`

## Summary

Replace the workspace's single `selectedPath` state with an ordered list of Panes (Content Panes bound to a file, or Terminal Panes bound to a live local shell), each independently open. Two view modes sit on top of the same pane list: **Tabbed Mode** (today's behavior, extended to multiple tabs, one pane visible at a time) and **Layout Mode** (2-column/4-tile/6-tile CSS-grid presets, several panes visible simultaneously, content and terminal panes mixed freely). Content Panes are implemented by mounting one existing `ContentPanel` instance per open file rather than rewriting its internal state, so today's single-file behavior is preserved by construction (FR-013). Terminal Panes are new: a `node-pty`-backed shell process per pane on the server, streamed to an `xterm.js` instance in the browser over a WebSocket, with no cross-session persistence (FR-014), matching the constitution's local-first principle since no new remote/network surface is introduced — only a same-origin, local-machine WebSocket. The feature is explicitly scoped as an experimental step beyond the product's traditionally non-IDE positioning, accepted by product direction (see Constitution Check).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server/CLI; React 18 TypeScript UI
**Primary Dependencies**: Existing React 18, Vite, @tanstack/react-query, Vitest, React Testing Library. New: `node-pty` (server-side PTY process spawning), `ws` (server-side WebSocket, promoting the existing transitive override to a direct dependency), `@xterm/xterm` + `@xterm/addon-fit` (client-side terminal rendering) — see [research.md](./research.md) for why no dependency-free alternative exists for real PTY/terminal emulation
**Storage**: No new persistent storage. Pane list, active tab, layout mode, and terminal sessions are in-memory only for the lifetime of the browser tab/app session (FR-014); the existing single-file `viewerState.ts` localStorage persistence continues to apply only to the implicit single-pane case, unchanged
**Testing**: Vitest, React Testing Library, existing UI and server coverage setup; server-side WebSocket/PTY handler tested against a mocked `node-pty` module (spawning real shells in CI is avoided for determinism)
**Target Platform**: Local browser UI served by GitLocal and the shared macOS wrapper hosting the same UI; terminal panes require a real PTY on the host OS (macOS/Linux; Windows PTY behavior is out of scope per Assumptions)
**Project Type**: Local-first repository viewer with React frontend and Node.js-served static app (existing single web-app project; no new project boundary)
**Performance Goals**: At least 6 simultaneously open panes (any mix) without errors or perceptible responsiveness degradation (SC-001); terminal output streams with no user-perceptible added latency for interactive use (SC-005)
**Constraints**: Preserve all existing single-file behavior unchanged when only one pane is open (FR-013); no persistence of pane/layout/terminal-session state across reload (FR-014); terminal panes are local-shell-only, no new remote network integration (constitution Principle III); maintain 90% per-file coverage; `node-pty` is a native addon requiring prebuilt binaries per platform/Node version — this is the same class of packaging risk that caused the v0.9.16 `libnode.dylib` macOS release bug, so the macOS native app packaging path MUST be explicitly re-verified for this dependency (see Constitution Check)
**Scale/Scope**: Tab strip + 3 tiled layout presets (2-column, 4-tile, 6-tile) over a shared Pane list; Content Pane reuses the existing per-file viewer stack unchanged; Terminal Pane is wholly new (server PTY handler + WS route + client xterm component); touches `App.tsx`'s top-level state, adds a new `Workspace` component family, and adds one new server handler

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: Pass, with a flagged risk. All new code is TypeScript on the existing Node.js/React stack — no backend language change. `node-pty`, `ws`, and `@xterm/xterm` are justified by clear need (no dependency-free way to spawn a real PTY or render a terminal in a browser); this matches the constitution's "justified by clear need" bar, not an "avoid bloat" violation. **Risk**: `node-pty` is a native addon distributed as prebuilt binaries per platform/arch/Node ABI. The npm package install (`npm install -g gitlocal`) and the macOS Homebrew cask's bundled Node runtime MUST both resolve a working prebuilt binary, or the macOS app repeats the class of packaging failure fixed in v0.9.16 (`libnode.dylib`). Tracked explicitly in Complexity Tracking below and MUST be verified for both distributions before release, not just the npm path.
- **II. Test Coverage**: Pass, achievable. New modules (pane state hook, layout components, terminal server handler, terminal client component) get unit coverage at 90% per file; PTY interaction is tested via a mocked `node-pty` module rather than spawning real shells in CI, consistent with how other I/O boundaries (git, filesystem) are already tested in this codebase.
- **III. Local-First with Git Remote Exception**: Pass. The terminal WebSocket is a same-origin, localhost-only connection to the already-running local GitLocal server — it is not a new remote/telemetry/third-party network integration, and no code path in this feature calls an external network API. Shell sessions run entirely on the user's own machine.
- **IV. Node.js-Served React UI**: Pass. No new server, no new build pipeline; the existing Node-served React SPA gains a WebSocket upgrade route alongside its existing HTTP routes.
- **V. Clean & Useful UI / Target Audience & UX Philosophy**: **Flagged, accepted deviation, not a Core Principle violation.** Principle V's explicit MUSTs (Markdown rendering, folder tree navigability) are unaffected and remain intact. However, the broader "Target Audience & UX Philosophy" section describes GitLocal as explicitly non-IDE, for users "not necessarily comfortable with terminal commands." Terminal panes directly conflict with that framing. This was surfaced to product direction during `/specify` and explicitly accepted as an intentional, scoped **experimental** capability, to be re-evaluated after initial delivery (see spec.md Assumptions) — not silently built around the guidance. No constitution amendment is made now; this plan documents the accepted tradeoff for future review rather than treating it as resolved doctrine.
- **VI. Free & Open Source**: Pass. `node-pty` (MIT), `ws` (MIT), `@xterm/xterm` (MIT) are all MIT-compatible; no proprietary or paid dependency introduced.
- **VII. Repository-Relative Paths and Release Documentation**: Pass. Planning artifacts use repository-relative paths only. A release cutting this feature MUST update `CHANGELOG.md` and pass a full README review per this principle, including documenting the new terminal capability's local-shell-access nature.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: Pass, with an emphasized requirement. No release is cut in this planning phase. The mandatory pre-release contrarian QA pass for whichever release ships this feature MUST specifically verify: (a) `node-pty` prebuilt binaries resolve correctly on both the npm package path and the macOS Homebrew cask's bundled Node runtime, mirroring the v0.9.16 verification approach; (b) terminal session cleanup (no orphaned shell processes) on pane close, tab close, and app/browser close; (c) accessibility of the new tab strip and layout switcher controls.

## Project Structure

### Documentation (this feature)

```text
specs/032-multi-pane-workspace/
├── plan.md                              # This file
├── research.md                          # Phase 0 output
├── data-model.md                        # Phase 1 output
├── quickstart.md                        # Phase 1 output
└── contracts/
    └── multi-pane-workspace-ui.md       # Phase 1 output: user-facing UI contract
```

### Source Code (repository root)

```text
src/
├── server.ts                            # Register the new WebSocket upgrade route alongside existing HTTP routes
└── handlers/
    ├── terminal.ts                      # New: WS upgrade handler; spawns/tracks node-pty sessions per pane, streams I/O, kills PTY on close
    └── terminal.test.ts                 # New: session lifecycle, independent-session isolation, cleanup-on-close, mocked node-pty

ui/src/
├── App.tsx                              # Replace selectedPath/selectedPathType scalars with the pane workspace state (via usePaneWorkspace)
├── App.test.tsx                         # Extend: multi-pane open/close/switch, layout mode switch, zero-regression single-pane coverage
├── types/
│   └── index.ts                         # New: Pane, PaneKind ('content' | 'terminal'), WorkspaceLayoutMode types; ViewerState scoped to single-pane persistence only
├── hooks/
│   ├── usePaneWorkspace.ts              # New: pane list, active pane, layout mode, open/close/reorder/select actions; not persisted (FR-014)
│   └── usePaneWorkspace.test.ts         # New: unit coverage for all pane/layout transitions incl. edge cases (over/under capacity, last-pane-closed)
├── components/
│   ├── ContentPanel/                    # Unchanged internally; mounted once per open Content Pane, keyed by pane id
│   │   └── ContentPanel.tsx             # No behavior change; existing single-instance usage becomes "one of possibly several" instances
│   └── Workspace/                       # New folder: the multi-pane shell
│       ├── WorkspaceShell.tsx           # New: renders TabStrip + LayoutSwitcher + either tabbed single-pane view or the tiled grid
│       ├── WorkspaceShell.test.tsx
│       ├── TabStrip.tsx                 # New: scrollable/overflow-safe tab bar (Edge Cases: 20+ tabs)
│       ├── TabStrip.test.tsx
│       ├── LayoutSwitcher.tsx           # New: control to pick Tabbed / 2-column / 4-tile / 6-tile
│       ├── LayoutSwitcher.test.tsx
│       ├── PaneTile.tsx                 # New: renders one pane (ContentPanel or TerminalPane) into a tab or grid tile, with empty/"open a file" placeholder state
│       ├── PaneTile.test.tsx
│       ├── TerminalPane.tsx             # New: xterm.js instance bound to one WS session; connect/disconnect/reconnect-on-error, "session ended" state
│       └── TerminalPane.test.tsx
├── services/
│   ├── api.ts                           # No change to existing file endpoints; already stateless-per-request, safe for concurrent multi-pane use
│   ├── terminalSocket.ts                # New: thin WebSocket client wrapper (connect, send input, receive output/close events) used by TerminalPane
│   └── terminalSocket.test.ts
└── styles/
    └── globals.css                      # Add workspace-tabstrip-*, workspace-grid-*, terminal-pane-* styles

package.json                             # Add node-pty, ws as direct dependencies
ui/package.json                          # Add @xterm/xterm, @xterm/addon-fit as direct dependencies
```

**Structure Decision**: Single existing web application (`src/` Node/TypeScript backend + `ui/` React frontend). No new project or package boundary. Content Panes deliberately reuse `ContentPanel` unchanged (mounted per-pane) rather than refactoring its internal state to be externally multi-file-aware, minimizing risk to FR-013's zero-regression requirement. Terminal Panes are additive: one new server handler, one new WS route, and a small new `Workspace/` component family on the client — no existing component's behavior changes to accommodate terminals.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| New native-addon dependency (`node-pty`) | Real PTY spawning (job control, resizing, proper TTY semantics for interactive programs like an AI coding agent) is not achievable with `child_process` alone — plain pipes break interactive/full-screen terminal programs and don't support terminal resize (`SIGWINCH`)/TTY ioctls | `child_process.spawn` with plain pipes: rejected, cannot support interactive full-screen programs (many agent CLIs use raw TTY features) and would produce a degraded, misleading "terminal" that breaks SC-005's concrete agent-monitoring use case |
| Terminal panes conflict with the constitution's "Target Audience & UX Philosophy" non-IDE framing | User (product direction) explicitly requested terminal panes as the concrete mechanism for watching an AI agent run alongside its code changes (SC-005), and explicitly accepted the IDE-adjacent tradeoff as intentional and experimental | Omitting terminal panes: rejected, it is one of the four explicitly requested capabilities in this feature and the specific motivating use case for the whole feature, not an incidental add-on |

## Phase 0: Research

Research completed in [research.md](./research.md). Key decisions: mount one `ContentPanel` instance per open Content Pane instead of refactoring its internal state (preserves FR-013 by construction); use `node-pty` + `ws` + `xterm.js` for terminal panes (the standard, actively-maintained approach used by comparable tools, no viable dependency-free alternative); fixed CSS-grid layout presets (2-column = 1×2, 4-tile = 2×2, 6-tile = 3×2); no persistence of pane/layout/terminal state across reload, with the existing single-file `viewerState.ts` persistence untouched for the implicit single-pane case.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md): Pane, Content Pane, Terminal Pane, Workspace Layout, and Terminal Session entity/state models.
- [contracts/multi-pane-workspace-ui.md](./contracts/multi-pane-workspace-ui.md): User-facing UI contract for tabs, layouts, and terminal panes, and regression expectations for existing single-file behavior.
- [quickstart.md](./quickstart.md): Implementation verification workflow.

## Post-Design Constitution Check

- **TypeScript/UI scope** remains within the existing stack; new dependencies are justified and MIT-licensed.
- **Coverage and QA**: unit coverage planned for all new hooks/components/handlers at 90% per file; the native-addon packaging risk is called out explicitly for pre-release contrarian QA on both distributions.
- **Local-first behavior** is preserved: terminal WebSocket traffic never leaves the local machine.
- **UX philosophy tension** remains an explicitly accepted, scoped, experimental deviation — documented here and in spec.md Assumptions, not silently resolved.
- **Repository-relative documentation** is maintained across all generated artifacts.

Result: Pass, with the native-dependency packaging risk and the accepted experimental UX deviation carried forward as tracked items for implementation and release QA rather than open gate failures.
