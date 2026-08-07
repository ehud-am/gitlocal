# Phase 1 Data Model: Integrated Terminal Panel

All state below is **in-memory only** (server process lifetime for sessions; browser tab lifetime for panel UI state), per `research.md`. Nothing here is persisted to disk or a database.

## TerminalKind (enum)

| Value | Launch behavior |
|---|---|
| `regular` | Plain shell, nothing auto-run |
| `claude` | Shell + auto-typed `claude` launch command once ready |
| `codex` | Shell + auto-typed `codex` launch command once ready |

## TerminalSession (server-side)

One per open terminal tab. Owned by the server's in-memory terminal-session manager; not persisted.

| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | Stable identity for the tab; used as the WebSocket route/session key |
| `kind` | `TerminalKind` | Set at creation, immutable |
| `cwd` | absolute path (string) | Resolved once at creation via `classifyLocalPath()` (see research.md); immutable for the session's lifetime (FR-012) |
| `status` | `'starting' \| 'running' \| 'exited' \| 'unavailable'` | `unavailable` = FR-010 pre-flight check failed (missing CLI) or FR-015 (no PTY support on this platform) |
| `exitInfo` | `{ code: number \| null, signal: string \| null } \| null` | Populated when `status` transitions to `exited` |
| `createdAt` | ISO timestamp | For ordering tabs / diagnostics only, not shown as a requirement in spec |
| `pty` | internal (not serialized) | The underlying `IPty` handle (or injected fake in tests, per research.md) |

**Lifecycle**: `starting` → `running` on successful spawn, or → `unavailable` if the pre-flight check (FR-010) or platform capability check (FR-015) fails before spawn is attempted. `running` → `exited` when the child process exits for any reason (normal exit, crash, or explicit close). Closing a tab (FR-005) always transitions to `exited` and tears down the PTY; a session is removed from the manager only once its owning WebSocket connection also closes (so late-arriving output during teardown isn't lost).

**Validation rules**:
- `cwd` MUST be an existing directory inside a path already validated by `classifyLocalPath()`; the server never spawns against a client-supplied raw string.
- A session's `kind` cannot change after creation — kind changes require closing the tab and opening a new one (consistent with FR-007 being a creation-time choice only).

## TerminalPanel (client-side UI state)

Lives in the top-level `App.tsx` state tree (same pattern as `viewerRepoPath`/`selectedPath`, per research.md), not a new global store.

| Field | Type | Notes |
|---|---|---|
| `visible` | boolean | Show/hide state (FR-002); default `false` on load (FR-016) |
| `tabs` | `TerminalTabRef[]` | Ordered list of open tabs; empty by default |
| `activeTabId` | string \| null | Which tab is focused/visible within the panel |

## TerminalTabRef (client-side UI state)

The client's view of a `TerminalSession`; created optimistically when the user opens a tab, then reconciled with the server's session id once creation succeeds.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Matches server `TerminalSession.id` once established |
| `kind` | `TerminalKind` | Mirrors server value, also used for the tab's icon/label (US4 acceptance scenario 5) |
| `label` | string | Derived display label, e.g. "Regular 1", "Claude", "Codex" — not user-editable in this scope |
| `cwd` | string | Echoed back from the server for display (e.g. a tooltip), not independently computed client-side |
| `status` | mirrors server `status` | Drives UI affordances (e.g. "session ended" banner per Edge Cases) |

## Relationships

```text
TerminalPanel 1 ── * TerminalTabRef ── 1 TerminalSession (server, via WebSocket)
                                            │
                                            └─ kind: TerminalKind
```

- A `TerminalPanel` has zero or more `TerminalTabRef`s.
- Each `TerminalTabRef` corresponds to exactly one live `TerminalSession` on the server, connected via one dedicated WebSocket.
- `VisibleContentContext` (from the spec's Key Entities) is not a stored entity — it is read at the instant a new tab is opened (`viewerRepoPath` + `selectedPath` + `selectedPathType` from `App.tsx`) and sent as part of the tab-creation request; it has no independent lifecycle.
