# HTTP API Contract: Markdown Share Actions

This feature should reuse existing read/update/open APIs where possible. New server contracts are limited to local startup preference/default-folder behavior if implementation cannot be handled by existing endpoints.

## Existing APIs Reused

### `GET /api/file?path={path}&branch={branch}&raw={raw}`

Used to load Markdown source/render input and revision tokens.

**Expected behavior for this feature**

- Markdown files return `type: "markdown"` and editable text content when supported.
- `revisionToken` is included when update/delete actions need conflict protection.

### `PUT /api/file`

Used to save edited Markdown or text content before sharing when required by the selected flow.

**Expected behavior for this feature**

- Conflict responses remain explicit and must not be bypassed by share actions.

### `GET /api/info`

Used to determine whether the app is in picker mode, folder mode, or repository mode after startup or refresh.

### `GET /api/tree`, `GET /api/readme`, `GET /api/sync`

Used by the visible refresh action through existing query invalidation.

## New or Extended API: Startup Preferences

If the last-used folder cannot be resolved entirely inside existing server startup/open handlers, add local preference endpoints.

### `GET /api/startup-folder`

Returns the resolved startup folder decision and candidate defaults.

**Response**

```json
{
  "path": "<documents-folder>",
  "source": "platform-default",
  "exists": true,
  "readable": true,
  "platformDefaultPath": "<documents-folder>",
  "lastUsedPath": "",
  "fallbackReason": ""
}
```

**Rules**

- `source` is one of `explicit`, `last-used`, `platform-default`, or `home-fallback`.
- Response must not expose unrelated filesystem contents.
- Missing or unreadable remembered folders return a fallback path rather than a blocking error.

### `PUT /api/startup-folder`

Stores the last successfully opened folder.

**Request**

```json
{
  "path": "<opened-folder>",
  "source": "picker-open"
}
```

**Response**

```json
{
  "ok": true,
  "path": "<opened-folder>",
  "message": "Startup folder preference updated."
}
```

**Validation**

- `path` must exist and be a readable directory.
- `source` is one of `explicit-launch`, `picker-open`, `repo-open`, or `native-open`.
- Invalid paths return `400` with a clear local error.

## Non-Goals

- No hosted share links.
- No Slack Web API, OAuth, webhook, or account integration.
- No email provider API.
- No telemetry endpoint.
