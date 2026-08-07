# Contract: Terminal Session API

Session lifecycle is plain REST (Hono handler, `src/handlers/terminal.ts`, following the existing handler pattern). Live I/O is a WebSocket per session. All endpoints operate only on the server's currently active repository/picker path context (same `repoPath` injection pattern already used by other handlers, per `src/server.ts`).

## `POST /api/terminal/sessions`

Create a new terminal session (open a tab).

**Request body**:
```json
{
  "kind": "regular | claude | codex",
  "contextPath": "string (relative or absolute path as currently visible in the UI, or omitted)",
  "contextType": "file | dir | none"
}
```

**Behavior**:
- Resolves the working directory per `research.md` (`classifyLocalPath()` on `contextPath`; parent directory if `contextType === "file"`; repository root if `contextType === "none"` or resolution fails).
- If `kind` is `claude` or `codex`, pre-flight-checks that the CLI is resolvable on `PATH` before spawning.
- If PTY support is unavailable on this platform/build, does not attempt to spawn.

**Response `201`**:
```json
{
  "id": "uuid",
  "kind": "regular",
  "cwd": "/absolute/resolved/path",
  "status": "starting | running"
}
```

**Response `503`** (FR-010 / FR-015 — CLI missing or PTY unavailable):
```json
{
  "error": "cli_not_found | pty_unavailable",
  "message": "human-readable explanation for the tab UI"
}
```

## `GET /api/terminal/sessions`

List currently live sessions (used to reconcile UI state after a panel remount within the same page load; not used across reloads, since sessions don't survive those).

**Response `200`**: `TerminalSession[]` (same shape as the create response, plus `exitInfo` when `status === "exited"`).

## `DELETE /api/terminal/sessions/:id`

Close a tab (FR-004/FR-005). Terminates the underlying process and transitions the session to `exited`.

**Response `204`** on success, `404` if the session id is unknown.

## `WS /api/terminal/sessions/:id/io`

Bidirectional I/O channel for one session, opened by the client immediately after a successful `POST`.

**Client → Server frames**:
```json
{ "type": "input", "data": "raw keystroke bytes as string" }
{ "type": "resize", "cols": 120, "rows": 32 }
```

**Server → Client frames**:
```json
{ "type": "output", "data": "raw PTY output chunk as string" }
{ "type": "exit", "code": 0, "signal": null }
```

**Behavior**:
- On connect, the server immediately begins streaming any output already buffered since session creation (covers the case where the client's `POST` succeeded but the socket connects a moment later).
- If `kind` is `claude` or `codex`, the server writes the launch command + newline to the PTY once the shell reports ready (first prompt render), per `research.md` — this happens server-side, not as a client-sent `input` frame, so it happens identically regardless of when the client's socket attaches.
- Closing the socket does **not** close the session (FR-003 — hiding the panel must not kill sessions); only `DELETE /api/terminal/sessions/:id` does. The client is expected to keep the socket open only while the panel/tab is mounted and reconnect it (without recreating the session) when the tab becomes visible again after being hidden, subject to the socket-reconnect edge case below.
- If the socket disconnects unexpectedly (not via panel hide, e.g. a network blip) while the session is still `running`, output continues to buffer server-side (bounded buffer, oldest output dropped first) so a reconnect can catch up; this is an execution detail, not a new functional requirement — the spec only requires no session loss from *navigation*, and this preserves that even across incidental socket drops within the same page load.

## `GET /api/terminal/capabilities`

Read-only capability probe the UI calls once on first mount to decide whether to offer the terminal panel at all (FR-015).

**Response `200`**:
```json
{
  "available": true,
  "claudeCliFound": true,
  "codexCliFound": false
}
```
