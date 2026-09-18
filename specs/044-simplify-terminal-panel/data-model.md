# Phase 1 Data Model: Simplify Terminal Panel

## TerminalTab (revised)

Represents one terminal session shown in the panel. Replaces the current shape that included a
`kind` discriminator.

| Field         | Type                          | Notes |
|---------------|-------------------------------|-------|
| `id`          | string                        | Unique session identifier (unchanged from today). |
| `label`       | string                        | Sequential display label, e.g. "Terminal 1", "Terminal 2" — derived from creation order, not from any kind (replaces `labelFor(kind, ordinal)`). |
| `status`      | `'running' \| 'exited' \| 'unavailable'` | Unchanged; `'unavailable'` still covers the case where a session could not be created (e.g. no shell available), but no longer covers a missing `claude`/`codex` CLI, since that check is removed. |
| `contextPath` | string \| undefined            | Working-directory context the tab was opened from (unchanged). |
| `scrollback`  | string (buffered server-side) | Unchanged: server retains up to 200k chars per session for reconnect replay. |

**Removed fields**: `kind` (`'regular' | 'claude' | 'codex'`) is deleted from
`TerminalSession`, `CreateTerminalSessionRequest`, and `TerminalTabRef` (server `src/terminal/types.ts`
and mirrored UI `ui/src/types/index.ts`). `TerminalCapabilities.claudeCliFound` /
`.codexCliFound` are deleted; `TerminalCapabilities` either shrinks to whatever non-kind fields
remain or is removed entirely if nothing else used it (verify at implementation time).

**Validation rules**: None specific to the tab beyond what already exists (e.g., max concurrent
sessions, `MAX_CONCURRENT_SESSIONS = 20`, unchanged).

**State transitions**: Unchanged — `running` → `exited` on process exit; a failed create attempt
surfaces as a local `unavailable` tab (no server session) rather than a `cli_not_found`-specific
message, since that capability check no longer exists.

## TerminalPanelPreference (new)

Represents the user's remembered terminal panel dock position, independent of any tab or
session.

| Field         | Type                              | Notes |
|---------------|------------------------------------|-------|
| `dockPosition`| `'bottom' \| 'left' \| 'right'`   | Persisted preference. Defaults to `'right'` when no preference file exists yet (FR-004). |

**Persistence**: A single JSON file at `~/.gitlocal/terminal-panel-preference.json`, written and
read via a new `src/services/terminal-panel-preference.ts` module mirroring
`src/services/startup-preferences.ts` (same read-with-fallback, atomic-write approach; overridable
path via an env var for tests, e.g. `GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH`, matching the
existing `GITLOCAL_STARTUP_PREFERENCE_PATH` convention).

**Validation rules**:
- `dockPosition` MUST be one of `'bottom' | 'left' | 'right'`; a `PUT` with any other value is
  rejected with `400`.
- A missing, corrupt, or unreadable preference file is treated as "no preference set" and
  resolves to the default (`'right'`) rather than erroring, consistent with how
  `startup-preferences.ts` handles a missing/corrupt startup-folder file.

**State transitions**:
1. No file present → `GET` returns default `'right'` (not persisted to disk until the user
   explicitly changes it, matching the lazy-write pattern of the existing preference services).
2. User changes position in the UI → client calls `PUT` with the new value → server validates
   and writes the file → server responds with the persisted value → UI updates layout
   immediately without waiting for a reload.
3. App restarts → UI calls `GET` on startup → applies the persisted (or default) position before
   the panel is first shown.

## Relationships

`TerminalPanelPreference` is a single global setting, independent of and not referenced by any
`TerminalTab` — changing dock position never affects tab identity, session state, or scrollback
(FR-006).
