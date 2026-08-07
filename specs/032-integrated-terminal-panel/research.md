# Phase 0 Research: Integrated Terminal Panel

## Context

The repository currently has **zero terminal-related code**. A prior attempt at a terminal feature (`032-multi-pane-workspace`) was fully reverted from `main` (see `git log` — reverts `d7f8212`/`5d5df2d`/`257c2a1`, merged via PR #58) at the user's explicit request, because its multi-pane tiling approach was the wrong design. This plan starts from a clean slate and does not reuse any of that code, though it draws on lessons learned (see Risks below).

## Decision: PTY backend — `node-pty`

**Decision**: Use `node-pty` on the server to spawn real pseudo-terminal processes (shell, `claude`, `codex`).

**Rationale**: A terminal panel that runs the Claude Code CLI and Codex CLI interactively needs real PTY semantics (job control, terminal resize (`SIGWINCH`), raw-mode input, ANSI passthrough) — a plain `child_process.spawn` with piped stdio cannot provide this faithfully (no controlling TTY, broken interactive prompts, no resize support). `node-pty` is the de facto standard for this in Node.js tooling (used by VS Code itself) and is MIT-licensed, satisfying Principle VI.

**Alternatives considered**:
- Plain `child_process.spawn` with piped stdio — rejected: breaks interactive CLI UX (Claude Code / Codex CLIs expect a TTY) and terminal resize.
- WebContainer / browser-only terminal emulation (no real shell) — rejected: cannot run real shell commands or local CLIs, which is the entire point of the feature.

**Risk — first native (compiled) dependency in this codebase**: `node-pty` ships prebuilt native binaries per-platform/per-Node-ABI (or builds from source via `node-gyp`). This project has *zero* native npm dependencies today and bundles its server with `esbuild --bundle --platform=node --format=esm` (see `package.json` `build:server`). esbuild cannot bundle a native `.node` addon into the single-file output — it must be marked `--external` and its platform binary copied alongside `dist/`. This is the same *class* of packaging failure the project already hit once with `libnode.dylib` in the macOS Homebrew app (fixed via `fix/esm-bundle-native-deps`, released as the v0.9.16 hotfix). **Mitigation**: the build must explicitly externalize `node-pty` and copy its native binary into both the npm package (`files` in `package.json`) and the macOS Homebrew app bundle step; this must be validated on all three supported OSes (macOS, Linux, Windows) in CI before release, and is called out explicitly as a task-level risk in Complexity Tracking below. FR-015 (graceful "terminal support unavailable" degradation) exists specifically to contain the blast radius if a given platform/architecture combination lacks a prebuilt binary.

## Decision: transport — WebSocket, one connection per terminal tab

**Decision**: Add `ws` as a real dependency (currently only present as a transitive `overrides` pin) and expose a WebSocket upgrade endpoint per terminal session for bidirectional low-latency I/O (keystrokes up, output + resize acks down). Session lifecycle (create/list/close) stays as ordinary Hono REST handlers in `src/handlers/`, consistent with the existing handler pattern; only the live I/O stream uses a socket.

**Rationale**: Interactive terminal I/O needs a persistent, low-latency, bidirectional channel; polling HTTP is unsuitable (latency, ordering, resize events). WebSocket is the standard fit and integrates with `@hono/node-server`'s underlying Node HTTP server via a plain `ws.Server` upgrade handler, requiring no framework change.

**Alternatives considered**:
- Server-Sent Events (SSE) for output + POST for input — rejected: two channels to keep in sync, no native binary-safe framing, more complex than a single socket.
- Long-polling — rejected: unacceptable latency for an interactive shell.

## Decision: terminal rendering — `@xterm/xterm`

**Decision**: Use `@xterm/xterm` (the current maintained scope of the former `xterm.js`) with `@xterm/addon-fit` for auto-sizing, in the React UI.

**Rationale**: Industry-standard, MIT-licensed, used by VS Code and virtually every other browser-based terminal integration; handles ANSI escape sequences, cursor control, and scrollback that a naive `<pre>`/output-log rendering cannot.

## Decision: Claude/Codex terminal kind = shell + auto-typed launch command, not a special protocol

**Decision**: A "Claude" or "Codex" terminal tab is a normal PTY shell session where the server, immediately after the shell prompt is ready, writes the launch command (`claude` or `codex`) plus a newline into the PTY, exactly as if the user had typed it.

**Rationale**: Keeps the server's terminal-session code uniform across all three kinds (one code path, one entity), satisfies FR-008/FR-009 ("automatically launch... without the user typing") with minimal special-casing, and naturally produces FR-010's required behavior for free: if `claude`/`codex` isn't on `PATH`, the shell itself reports "command not found," which the client can pattern-detect (or the server can pre-flight-check via `which`/`where` before spawning) to show the clearer "tool isn't available" message called for in FR-010. Pre-flight `which claude` / `which codex` (platform-appropriate) is the chosen mechanism, run server-side before spawning, so the UI can show FR-010's message deterministically instead of parsing shell output.

## Decision: working-directory resolution reuses `classifyLocalPath()`

**Decision**: The "new tab opens where you're looking" behavior (FR-011) resolves its working directory using the existing `classifyLocalPath()` utility in `src/git/repo.ts`, the same function already used to validate and classify paths for file/folder browsing. The client sends the currently-visible path (from `viewerRepoPath` + `selectedPath` in `App.tsx`) when creating a tab; the server re-validates it server-side (never trusts the client path verbatim) and resolves it to a real, existing directory (using the file's parent directory when `selectedPathType === 'file'`), falling back to the repository root if resolution fails (deleted/renamed path, or no path in view) per the Edge Cases section of the spec.

**Rationale**: Reuses an already-hardened, already-tested path-safety boundary instead of introducing a second one; keeps the server, not the client, as the source of truth for what directory a shell is allowed to start in (defense in depth — the client is not trusted to constrain the working directory to inside the repo).

## Decision: session lifetime = server process lifetime, no persistence across reload

**Decision**: Terminal sessions live only in server memory for the lifetime of the Node process (same model as the rest of the app's runtime state, e.g. `currentRepoPath` in `src/server.ts`). A browser reload always starts with zero tabs (FR-016); there is no database, file, or other persistence layer added.

**Rationale**: Matches the existing app-wide pattern (no persistence layer exists in this codebase beyond the filesystem/git itself, per Constitution Principle III's "state in-process or derived from filesystem/git at request time"), and matches the spec's explicit Assumptions.

## Testability strategy (for 90% coverage, Principle II)

**Decision**: The server-side terminal-session manager is written with the actual `node-pty` spawn call behind a small injectable factory (`createPty: (cmd, args, opts) => IPty`), so unit/integration tests can substitute a fake PTY (a simple `EventEmitter`-based stub) to exercise session lifecycle, kind-based launch-command injection, working-directory resolution, and error paths without spawning real OS processes in CI. A small number of true end-to-end tests (real shell, e.g. spawning `sh -c 'echo hi'`) validate the real `node-pty` integration itself on Linux/macOS CI runners, mirroring the temp-git-repo fixture pattern already used in `tests/unit/handlers/folder.test.ts`. UI-side, the `@xterm/xterm` instance and WebSocket are mocked in component tests (consistent with existing `vi.mock('./services/api')` patterns in `App.test.tsx`), with `jest-axe` used for the panel and tab strip exactly as already done elsewhere in the UI test suite.

## Open items carried into Phase 1

None blocking — all unknowns above have a decision. The one item to keep validating through implementation (not a spec ambiguity, an execution risk) is the native-binary packaging step for `node-pty` across npm + Homebrew distributions, tracked in Complexity Tracking in `plan.md`.
