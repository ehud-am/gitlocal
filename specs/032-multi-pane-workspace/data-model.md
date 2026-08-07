# Data Model: Multi-Pane Workspace

## Pane

Represents one open unit within the workspace — either a file view or a terminal session. This is the client-side entity that replaces today's single `selectedPath`/`selectedPathType` pair with an ordered collection.

**Fields**:

- `id`: Stable client-generated identifier for this pane (not the file path — a path may be opened in more than one pane per Edge Cases).
- `kind`: `'content' | 'terminal'`.
- `contentPath`: Repository-relative file path (present only when `kind === 'content'`).
- `terminalSessionId`: Identifier of the associated server-side Terminal Session (present only when `kind === 'terminal'`, assigned once the WS connection is established).
- `title`: Display label for the tab/tile — file basename for Content Panes, a generated "Terminal N" label for Terminal Panes.

**Validation rules**:

- A Content Pane always has exactly one `contentPath`; a Terminal Pane always has exactly one `terminalSessionId` once connected (may be transiently absent while connecting).
- `id` is unique within the current workspace's pane list; `contentPath` is NOT required to be unique (the same file may be open in multiple panes, per spec Edge Cases).

## Workspace Pane List (workspace state)

The ordered collection of all currently open Panes, plus which one is active and how they're arranged. Owned by the new `usePaneWorkspace` hook at the `App.tsx` level, replacing `selectedPath`/`selectedPathType`.

**Fields**:

- `panes`: Ordered array of `Pane`.
- `activePaneId`: The pane shown in Tabbed Mode (the "current tab"); ignored in Layout Mode, where multiple panes are visible.
- `layoutMode`: `'tabbed' | '2-column' | '4-tile' | '6-tile'`.
- `tilePaneIds`: For a tiled `layoutMode`, the ordered list of pane ids currently assigned to visible tiles (length ≤ the mode's tile capacity: 2, 4, or 6).

**Validation rules**:

- `panes` may be empty (workspace empty state, per Edge Cases); when empty, `activePaneId` is `null` and `layoutMode` resets to `'tabbed'`.
- `activePaneId`, when set, MUST reference a pane present in `panes`.
- `tilePaneIds` entries MUST all reference panes present in `panes`; when `tilePaneIds.length` is less than the mode's tile capacity, the remaining tiles render the empty/"open a file" placeholder (FR-011); when more panes are open than tile capacity, the non-tiled panes remain reachable via a tab strip/overflow list rendered alongside the grid (FR-012).
- Switching `layoutMode` never removes entries from `panes` (FR-006) — it only changes which pane(s) are visible and how `tilePaneIds` is computed/displayed.
- This state is held in memory only for the browser session; it is never written to `viewerState.ts` or any other persistent store (FR-014).

**State transitions**:

- **Open pane**: append a new `Pane` to `panes`; set `activePaneId` to the new pane's id; if in a tiled `layoutMode` with a free tile slot, also append to `tilePaneIds`.
- **Close pane**: remove the pane from `panes` and from `tilePaneIds` if present; if it was `activePaneId`, select an adjacent remaining pane as active (or `null` if `panes` is now empty); its Terminal Session (if any) is closed server-side as part of this transition (FR-009).
- **Switch active tab**: set `activePaneId`; no change to `panes` or `tilePaneIds`.
- **Change layout mode**: set `layoutMode`; recompute `tilePaneIds` from the existing `panes` order, capped at the new mode's tile capacity; no panes are closed or lost (FR-006).

## Content Pane (rendering concern, not new state)

A Pane with `kind === 'content'` renders exactly one `ContentPanel` instance, given `contentPath` as its `path`. All existing per-file state (`showRaw`, edit `mode`, draft content, React Query cache entry) continues to live inside that `ContentPanel` instance exactly as it does today — the Pane entity above only tracks *which* file is open in *which* slot, not how that file is currently being viewed/edited. This is what the original feature request calls a "file window" once placed into a tiled layout.

## Terminal Pane (client) / Terminal Session (server)

**Terminal Pane fields** (client, rendering concern):

- `terminalSessionId`: Links to the server-side session.
- `connectionState`: `'connecting' | 'connected' | 'ended' | 'error'` — drives the pane's displayed state (live terminal, "session ended," or a connection-error indicator).

**Terminal Session fields** (server, in-memory only, `src/handlers/terminal.ts`):

- `id`: Session identifier, matches the client's `terminalSessionId`.
- `pty`: The `node-pty` `IPty` process handle.
- `cwd`: Repository root the shell was spawned in (FR-007).
- `socket`: The associated open WebSocket connection, if currently connected.

**Validation rules**:

- Every Terminal Session's `pty` is independent of every other session's — no shared process, environment, or I/O stream (FR-008, SC-004).
- A Terminal Session is removed from the server's session map and its `pty` is killed when: the owning pane is closed (FR-009), the WebSocket closes for any reason (including browser/tab close), or the `pty` process itself exits (in which case the pane's `connectionState` becomes `'ended'` rather than being silently dropped, per Edge Cases).
- No Terminal Session is ever restored/resumed after its WebSocket closes (see research.md) — a new pane always starts a brand new session.

**State transitions**:

- **Open**: client generates a pane and opens a WebSocket to the terminal route; server creates a new session, spawns `pty` with `cwd` = repository root, and streams output; `connectionState` moves `'connecting'` → `'connected'`.
- **Live use**: client sends keystrokes/input over the WebSocket; server writes to `pty.write(...)`; `pty` output is streamed back over the same WebSocket and rendered by `xterm.js` (FR-008).
- **User-initiated close**: client closes the pane (tab/tile close) → WebSocket closes → server kills the `pty` and removes the session (FR-009); `connectionState` is not shown as `'ended'` in this path since the pane itself is gone.
- **Process-initiated end**: the shell process exits on its own (e.g. the user typed `exit`) → server detects `pty` exit, closes the WebSocket → client sets `connectionState = 'ended'` and the pane shows a clear "session ended" state rather than freezing or going blank (Edge Cases).
- **Connection error**: WebSocket errors/disconnects unexpectedly (not via explicit close or a clean `pty` exit) → client sets `connectionState = 'error'`, distinct from `'ended'`, so a genuinely dropped connection reads differently from a deliberately closed shell.
