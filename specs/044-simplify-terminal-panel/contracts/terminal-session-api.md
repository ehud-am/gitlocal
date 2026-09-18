# Contract: Terminal Session API (revised)

Supersedes the `kind`-aware contract in `specs/032-integrated-terminal-panel/contracts/terminal-api.md`
for the fields changed below. All other existing endpoints/behavior (WebSocket I/O, session
listing, resize, close) are unchanged and not repeated here.

## `POST /api/terminal/sessions`

Creates a new terminal session. No longer accepts or requires a `kind`.

**Request body**:

```json
{
  "contextPath": "optional/path/for/initial/cwd",
  "contextType": "optional-context-type"
}
```

- `kind` is no longer part of the request. Any `kind` field sent by an old client build MUST be
  ignored by the server (do not error on unknown fields), since the panel now only ever creates
  one kind of session.

**Response body** (`201`):

```json
{
  "id": "session-id",
  "status": "running",
  "contextPath": "optional/path/for/initial/cwd"
}
```

- `kind` is removed from the response shape.
- The `503 cli_not_found` response and its capability pre-flight are removed entirely — session
  creation only fails for the same reasons a plain shell could always fail (e.g., session limit
  reached), unrelated to any CLI-availability check.

## `GET /api/terminal/capabilities` (if retained)

If this endpoint has no remaining purpose once `claudeCliFound`/`codexCliFound` are removed,
it MUST be deleted along with its handler and any UI caller. Verify at implementation time
whether any other field on `TerminalCapabilities` is still in use before deciding to keep a
(possibly empty) endpoint versus removing it outright.
