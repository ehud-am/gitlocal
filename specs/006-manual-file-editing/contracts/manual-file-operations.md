# Manual File Operations Contract

## File Read Contract

- `GET /api/file` continues to return the current file content payload for viewer rendering.
- For working-tree text files, the payload also includes:
  - `editable`: whether inline editing is allowed in the current context.
  - `revisionToken`: the snapshot token required for guarded update and delete requests.
- Non-text files and non-working-tree contexts must return `editable: false`.

## Create File Contract

- `POST /api/file` creates a new local file inside the opened repository.
- Request body:
  - `path`: repository-relative target path.
  - `content`: initial file content.
- Success behavior:
  - Returns `ok: true`, `operation: "create"`, `status: "created"`, and the created `path`.
- Failure behavior:
  - Blocks requests for existing paths, invalid paths, and paths outside the repository boundary.

## Update File Contract

- `PUT /api/file` saves manual edits to an existing local text file.
- Request body:
  - `path`: repository-relative target path.
  - `content`: replacement file content.
  - `revisionToken`: snapshot token from the last successful read.
- Success behavior:
  - Returns `ok: true`, `operation: "update"`, `status: "updated"`, and the updated `path`.
- Failure behavior:
  - Returns `status: "conflict"` when the revision token no longer matches the on-disk file state.
  - Returns a blocked or failed result for invalid paths, missing files, non-text files, or non-working-tree contexts.

## Delete File Contract

- `DELETE /api/file` removes an existing local file after UI confirmation.
- Request body:
  - `path`: repository-relative target path.
  - `revisionToken`: snapshot token from the last successful read.
- Success behavior:
  - Returns `ok: true`, `operation: "delete"`, `status: "deleted"`, and the deleted `path`.
- Failure behavior:
  - Returns `status: "conflict"` when the file changed after it was opened.
  - Returns a blocked or failed result if the path is outside the repository boundary or cannot be removed.

## UI Interaction Contract

- Inline editing controls appear only for editable working-tree text files.
- New-file creation can be started from the repository view without leaving the app.
- Delete actions always require a confirmation step before the request is sent.
- After any successful create, update, or delete, the UI refreshes file and tree data from the server and updates the current selection accordingly.
