# Contract: Terminal Panel Preference API (new)

Mirrors the existing `GET`/`PUT /api/default-reader-preference` route pair in `src/server.ts`.

## `GET /api/terminal-panel-preference`

Returns the current dock-position preference, or the default if none has been saved yet.

**Response body** (`200`):

```json
{ "dockPosition": "right" }
```

- `dockPosition` is always one of `"bottom" | "left" | "right"`.
- If no preference file exists yet, or it is unreadable/corrupt, the response is the default
  (`"right"`) — this endpoint never errors due to a missing/bad file.

## `PUT /api/terminal-panel-preference`

Persists a new dock-position preference.

**Request body**:

```json
{ "dockPosition": "left" }
```

**Response body** (`200`):

```json
{ "dockPosition": "left" }
```

**Error response** (`400`): when `dockPosition` is missing or not one of the three valid values.

```json
{ "error": "Invalid dockPosition" }
```
