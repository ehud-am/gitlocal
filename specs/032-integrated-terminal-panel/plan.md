# Implementation Plan: Integrated Terminal Panel

**Branch**: `032-integrated-terminal-panel` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/032-integrated-terminal-panel/spec.md`

## Summary

Add a persistent, bottom-docked terminal panel (VS Code-style) reachable from every page in GitLocal. Users can show/hide it without killing sessions, open/close multiple independent tabs, and choose a tab kind — Regular shell, Claude (auto-launches the `claude` CLI), or Codex (auto-launches the `codex` CLI). New tabs default their working directory to whatever folder/file is currently visible. Technical approach (see `research.md`): `node-pty` on the server for real PTY sessions behind a WebSocket-per-tab transport, `@xterm/xterm` in the UI for rendering, session lifecycle as ordinary Hono REST handlers, and reuse of the existing `classifyLocalPath()` path-safety boundary for working-directory resolution. All state is in-memory only, matching the app's existing no-persistence-layer model.

## Technical Context

**Language/Version**: TypeScript 5.8.3, Node.js 22+ (existing project baseline; unchanged)
**Primary Dependencies**: Existing — Hono ^4.12.23, @hono/node-server ^2.0.11, React 18.3.1, Vite 8, TanStack Query 5.28, Radix UI. New — `node-pty` (server PTY spawning), `ws` (promoted from an unused override to a real dependency, for the terminal WebSocket transport), `@xterm/xterm` + `@xterm/addon-fit` (UI terminal rendering)
**Storage**: N/A — terminal sessions are in-memory only for the server process lifetime; no database or file persistence added (see `research.md`)
**Testing**: Vitest for both server and UI (existing); `hono/testing` `testClient` for REST handlers; injectable-PTY fake for session-manager unit tests plus a small set of real-shell integration tests; `@testing-library/react` + `jest-axe` for UI components, matching existing patterns in `App.test.tsx`
**Target Platform**: Cross-platform — npm package (Linux/macOS/Windows via Node 22+) and the macOS Homebrew native app wrapper; both share this code per Constitution Principle I
**Project Type**: Web application — existing single-repo layout with `src/` (Hono backend) and `ui/` (Vite/React frontend)
**Performance Goals**: Interactive terminal latency (keystroke-to-echo) imperceptible for local use, consistent with any local shell; no numeric SLA specified by the feature request beyond "not laggy for local, in-process use"
**Constraints**: Local-only — no new network calls introduced by GitLocal itself (Principle III); must not regress the existing test suite or per-file coverage (Principle II); new native dependency (`node-pty`) must be packaged correctly for both the npm and Homebrew distributions (see Risks in `research.md` and Complexity Tracking below)
**Scale/Scope**: Single local user, small number of concurrent terminal tabs (SC-003 requires supporting at least 6 simultaneously without cross-talk or degradation)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TypeScript-First Product Core | PASS | All new server/UI code is TypeScript on the existing Node/React stack; no new backend language. `node-pty`'s native addon is a compiled dependency, not a new language/runtime — tracked as a packaging risk, not a constitution violation, since Principle I only restricts the *language* of product code. |
| II. Test Coverage (NON-NEGOTIABLE) | PASS (design accounts for it) | Testability strategy in `research.md` (injectable PTY factory) exists specifically so 90%-per-file coverage is achievable without spawning real processes in every test. |
| III. Local-First with Git Remote Exception | PASS | Terminal sessions are local child processes spawned by the local server; GitLocal implements no new remote protocol or API call. Whatever a user does *inside* a shell (e.g. `git push`, or the Claude/Codex CLIs' own network use) is the same as if they'd opened their OS's native terminal — no different in kind from the existing local-git-invoked remote exception. |
| IV. Node.js-Served React UI | PASS | No change to the serving model; the terminal panel is additional React UI served the same way as the rest of the SPA. |
| V. Clean & Useful UI | PASS (with a default-off gate) | Panel defaults to hidden/no tabs (FR-016), so it adds zero visual weight for users who don't open it, preserving the minimal, content-focused default experience for the primary "browsing/reading" audience. |
| VI. Free & Open Source | PASS | `node-pty`, `ws`, and `@xterm/xterm`/`@xterm/addon-fit` are all MIT-licensed, compatible with the project's MIT license and dependency policy. |
| VII. Repository-Relative Paths | PASS | All new spec-kit artifacts use repository-relative paths; no contributor-local absolute paths introduced. |
| VIII. Release Branches / Pre-GA / Contrarian QA | DEFERRED (not a plan-time gate) | This feature ships inside a future `0.x.y` release; a contrarian QA pass and accessibility review are required before that release, per existing project practice (see prior QA cycles) — tracked as a release-time obligation, not a blocker to planning or implementation.

No violations requiring justification; Complexity Tracking below documents a *risk*, not a constitution exception.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`).*

Re-reviewed against the same table above: design choices (in-memory-only state, reuse of `classifyLocalPath()`, server as source of truth for working directory, default-hidden panel, injectable PTY for testability) do not introduce any new constitution risk beyond the native-dependency packaging item already tracked. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/032-integrated-terminal-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── terminal-api.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by this plan)
```

### Source Code (repository root)

This feature extends GitLocal's existing web-application layout (backend `src/` + frontend `ui/`); no new top-level projects are introduced.

```text
src/
├── handlers/
│   └── terminal.ts          # NEW — session create/list/close REST handlers (matches file.ts/folder.ts pattern)
├── terminal/                # NEW
│   ├── session-manager.ts   # In-memory TerminalSession registry, lifecycle, injectable PTY factory
│   ├── websocket.ts         # WS upgrade handling + input/output/resize framing (contracts/terminal-api.md)
│   └── cli-detection.ts     # Pre-flight `claude`/`codex` PATH checks (FR-010) + platform PTY capability check (FR-015)
├── git/repo.ts               # EXISTING — classifyLocalPath() reused for working-directory resolution
└── server.ts                  # EXISTING — register new routes + WS upgrade alongside existing handlers

tests/
├── unit/
│   ├── handlers/terminal.test.ts        # NEW
│   └── terminal/session-manager.test.ts # NEW — uses injectable fake PTY (research.md)
└── integration/
    └── terminal.test.ts                  # NEW — small number of real-shell end-to-end cases

ui/src/
├── components/
│   └── TerminalPanel/        # NEW
│       ├── TerminalPanel.tsx        # Bottom dock shell, show/hide
│       ├── TerminalTabStrip.tsx     # Tab open/close/switch, kind labeling
│       ├── TerminalView.tsx         # @xterm/xterm instance + WebSocket wiring for one tab
│       └── *.test.tsx               # Co-located tests (existing convention), incl. jest-axe checks
├── hooks/
│   └── useTerminalPanel.ts   # NEW — panel/tab state, mirrors TerminalPanel/TerminalTabRef in data-model.md
├── services/
│   └── terminalApi.ts        # NEW — REST + WebSocket client for contracts/terminal-api.md
└── App.tsx                    # EXISTING — mount <TerminalPanel> at the root layout level (see research.md) so it survives navigation between folder/git/file/edit views
```

**Structure Decision**: Follow the existing single-repo web-application layout exactly — new server code under `src/handlers/` and a new `src/terminal/` module (mirroring how git/file logic is already isolated under `src/git/`), new UI code under `ui/src/components/TerminalPanel/` mounted once at the `App.tsx` root so it persists across all page/content types, per FR-013. No new top-level directories, build tooling, or project boundaries are introduced.

## Complexity Tracking

> Constitution Check above shows no violations requiring justification. One execution-level risk is tracked here for visibility, not as a constitution exception.

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|---------------------------------------|
| `node-pty` native (compiled) dependency — the first in this codebase | Real PTY semantics (resize, raw mode, job control) are required for Claude Code/Codex CLIs and any interactive shell program to behave correctly (research.md) | Plain `child_process.spawn` with piped stdio was rejected: it breaks interactive CLI prompts and terminal resize, which would make the Claude/Codex terminal kinds (the feature's most differentiating requirement) unusable |
