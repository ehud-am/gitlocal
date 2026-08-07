# Research: Multi-Pane Workspace

## Decision: Externalize pane list/layout state; reuse `ContentPanel` unchanged, one instance per open Content Pane

**Rationale**: `App.tsx` currently owns a single `selectedPath`/`selectedPathType` pair, and `ContentPanel.tsx` internally owns per-file state (`showRaw`, `mode`: view/edit/create/create-folder/confirm-delete, draft content) via `useState`, keyed for data-fetching by a React Query key that already includes `selectedPath`. Rather than refactoring `ContentPanel`'s internal state to be externally controlled per-pane (a large, high-risk rewrite of a 51KB component), mount one `ContentPanel` instance per open Content Pane, each given its own `path` prop. Each instance's internal `useState` and React Query cache entry are then naturally independent per pane, with zero changes to `ContentPanel`'s own logic. This directly satisfies FR-013 (existing single-file behavior unchanged) by construction: with exactly one pane open, the tree renders exactly one `ContentPanel`, identical to today.

**Alternatives considered**:

- Refactor `ContentPanel` into a controlled component receiving all view/edit state as props from a new central store. Rejected: much larger surface area of behavior change for an already-large, well-tested component, with correspondingly higher regression risk against FR-013's zero-regression requirement, for no capability benefit over per-pane mounting.
- Keep a single `ContentPanel` and swap its `path` prop when switching tabs (no multiple mounts). Rejected: this is exactly today's behavior and does not support Layout Mode's requirement to show multiple panes simultaneously (FR-005); tabs would lose per-tab scroll position/draft state on switch, violating User Story 1's acceptance scenario that switching tabs preserves each file's view state.

## Decision: Terminal panes use `node-pty` (server) + WebSocket (`ws`) + `xterm.js` (client)

**Rationale**: This is the standard, actively-maintained stack for embedding a real interactive terminal in a Node.js + browser app (used by VS Code, code-server, Wetty, ttyd, and similar tools). `node-pty` provides genuine PTY semantics (raw TTY, resize/`SIGWINCH`, job control) that `child_process` pipes cannot, which matters directly for SC-005's driving use case (watching an interactive AI agent CLI run). `ws` is a minimal, already-transitively-present (via override) WebSocket library, promoted to a direct dependency since the server now uses it directly rather than incidentally. `xterm.js` is the de facto standard browser terminal emulator component, MIT-licensed, with a small footprint (`@xterm/xterm` + `@xterm/addon-fit` for responsive sizing).

**Alternatives considered**:

- Plain `child_process.spawn` with stdio pipes, streamed over Server-Sent Events (output) and a POST endpoint (input). Rejected: no PTY means broken behavior for full-screen/interactive programs (many agent CLIs redraw in place, use raw mode, or query terminal size), and SSE+POST doesn't map naturally onto true bidirectional low-latency interaction.
- A managed third-party terminal-as-a-service. Rejected outright by Constitution Principle III (local-first, no third-party remote services).
- WebSocket without a real PTY (raw pipe framing over WS). Rejected for the same interactivity reasons as plain `child_process` above — the transport isn't the limiting factor, the process I/O model is.

## Decision: Fixed CSS-grid layout presets — 2-column = 1×2, 4-tile = 2×2, 6-tile = 3×2

**Rationale**: The spec (Assumptions) explicitly defers exact grid shape to the plan. A 3-column × 2-row shape for 6-tile matches typical widescreen viewport proportions better than 2×3 (tiles stay closer to a readable aspect ratio for code/terminal content, which is usually taller-than-wide-unfriendly at extreme aspect ratios). All three presets are implemented as fixed CSS Grid templates (`grid-template-columns`/`grid-template-rows`), no runtime resize logic — matching the spec's Assumption that layouts are fixed presets, not freeform/resizable.

**Alternatives considered**:

- 6-tile as 2×3 (2 columns, 3 rows). Rejected as the default: taller tiles are worse for typical wide-monitor use, though this is a low-stakes choice that can be revisited from user feedback without any data-model impact (grid shape is a pure CSS/rendering concern, not part of the Pane/Layout data model).
- User-resizable/freeform panes (drag-to-resize, drag-to-reorder tiles). Rejected as out of scope per spec Assumptions — adds significant complexity (persisted or transient resize state, drag interaction, collision handling) not requested by any user story.

## Decision: No persistence of pane list, layout mode, or terminal sessions across reload; existing single-file `viewerState.ts` persistence is left untouched for the implicit single-pane case

**Rationale**: FR-014 requires no persistence of the multi-pane workspace state. The existing `viewerState.ts` already persists the single most-recently-viewed file to `localStorage` so a reload restores the last file — this existing behavior is indistinguishable from "restoring one pane" and is preserved unchanged (satisfies FR-013). What's explicitly new and explicitly NOT persisted is: additional open tabs beyond the first, the selected layout mode, and all terminal sessions (which cannot meaningfully survive a reload anyway, since the underlying WebSocket and PTY process are tied to the live browser session).

**Alternatives considered**:

- Persist the full pane list and layout mode (but not terminal sessions) to `localStorage`, restoring tabs/tiles on reload. Rejected: FR-014 explicitly scopes this out as a deliberate initial-version simplification; adding partial persistence (panes yes, terminals no) would create confusing asymmetric behavior between pane types.

## Decision: One `node-pty` process per Terminal Pane, tracked server-side in an in-memory session map keyed by a generated session id, cwd fixed to the repository root

**Rationale**: Each Terminal Pane's WS connection carries a session id (generated client-side, or assigned on connect) used to look up its `IPty` instance in an in-memory `Map`. This keeps the server itself stateless-per-repository beyond the currently open terminal sessions (consistent with the rest of the server, e.g. `src/handlers/file.ts` being stateless-per-request). `cwd` is fixed to the repository root rather than a per-pane "current folder," since the spec's acceptance scenarios describe terminals scoped to "the current repository's working directory" (not a per-file directory), keeping the mental model simple and matching FR-007 exactly.

**Alternatives considered**:

- Scope a terminal's cwd to the folder currently selected in the file tree. Rejected: not requested by any acceptance scenario, adds ambiguity when no folder is selected or the workspace has no active Content Pane, and the spec's own wording ("scoped to the current repository's working directory," FR-007) already gives an unambiguous default.
- Persist/resume terminal sessions across a WS disconnect (e.g. reconnect to the same still-running shell). Rejected as out-of-scope by FR-014 (no persistence across reload) — a disconnect either ends the session (explicit close) or the pane will need to be reopened; resumable sessions are a larger feature (session multiplexing, akin to `tmux`) not requested here.

## Decision: Verify through mocked-`node-pty` unit tests for the server handler, RTL-based component tests for the client, and a manual smoke pass with a real shell/agent

**Rationale**: The risky, testable behavior is (a) correct pane/tab/layout state transitions (fully unit-testable, no I/O), (b) correct WS session lifecycle and independence (testable against a mocked `node-pty`/`ws` pair, avoiding CI flakiness from spawning real shells), and (c) real interactive terminal fidelity (best verified manually, since faithfully asserting terminal rendering/PTY behavior in an automated test adds more flakiness risk than value). This mirrors how the 031-json-viewer feature separated pure-logic unit tests (`json-tree.test.ts`) from a manual smoke-sample pass.

**Alternatives considered**:

- Spawn real shells in CI for terminal handler tests. Rejected: introduces platform-dependent flakiness (shell availability, timing) into CI for marginal benefit over a well-mocked `node-pty` module, which already fully covers the session-lifecycle logic this feature owns.
