# Contract: Local Folder and Repository Context API

This feature extends the existing local browser API. Paths in requests are root-relative unless noted otherwise.

## GET /api/info

Returns active root metadata for either a git repository or a regular folder.

### Regular Folder Response

```json
{
  "name": "notes",
  "path": "/runtime/absolute/path/notes",
  "currentBranch": "",
  "isGitRepo": false,
  "pickerMode": true,
  "version": "0.6.3",
  "hasCommits": false,
  "rootEntryCount": 12,
  "gitContext": null
}
```

### Git Repository Response Additions

```json
{
  "gitContext": {
    "user": {
      "name": "Repo User",
      "email": "repo@example.com",
      "source": "local",
      "sshKeyPath": "~/.ssh/id_repo"
    },
    "remote": {
      "name": "origin",
      "fetchUrl": "git@github.com:example/project.git",
      "webUrl": "https://github.com/example/project",
      "selectionReason": "origin"
    }
  }
}
```

## GET /api/tree?path={path}&branch={branch}

Returns immediate child entries for the requested path.

### Regular Folder Behavior

- `branch` is ignored for regular folders.
- Response includes every readable immediate child file and folder at `path`.
- Returned paths are root-relative.
- Git sync metadata is omitted when it is not meaningful.

```json
[
  {
    "name": "README.md",
    "path": "README.md",
    "type": "file",
    "localOnly": true
  },
  {
    "name": "docs",
    "path": "docs",
    "type": "dir",
    "localOnly": true
  }
]
```

## GET /api/file?path={path}&branch={branch}

Returns file contents from the active root.

### Regular Folder Behavior

- `branch` is ignored for regular folders.
- Text and markdown files are editable.
- Image and binary files are viewable but not editable.
- Missing or unreadable files return an error response with a user-readable message.

## POST /api/file

Creates a file under the active root.

### Request

```json
{
  "path": "docs/new-file.md",
  "content": "# New file\n"
}
```

### Success Response

```json
{
  "ok": true,
  "operation": "create",
  "path": "docs/new-file.md",
  "status": "created",
  "message": "File created successfully."
}
```

### Error Rules

- Empty paths are blocked.
- Paths outside the active root are blocked.
- Existing files or folders at the same path return a conflict.
- Filesystem permission failures return `failed` or `blocked` with a visible message.

## PUT /api/file

Updates an editable text file under the active root.

### Request

```json
{
  "path": "docs/new-file.md",
  "content": "# Updated\n",
  "revisionToken": "current-token"
}
```

### Success Response

```json
{
  "ok": true,
  "operation": "update",
  "path": "docs/new-file.md",
  "status": "updated",
  "message": "File updated successfully."
}
```

### Error Rules

- Missing files are blocked.
- Stale revision tokens return `conflict`.
- Binary or unsupported files are blocked.
- Paths outside the active root are blocked.

## DELETE /api/file

Deletes a file under the active root after UI confirmation.

### Request

```json
{
  "path": "docs/new-file.md",
  "revisionToken": "current-token"
}
```

### Success Response

```json
{
  "ok": true,
  "operation": "delete",
  "path": "docs/new-file.md",
  "status": "deleted",
  "message": "File deleted successfully."
}
```

### Error Rules

- Directories are not deleted through this contract.
- Missing files are blocked.
- Stale revision tokens return `conflict` when available.
- Paths outside the active root are blocked.

## PUT /api/git/identity

Updates repository-scoped git identity fields, including SSH key path.

### Request

```json
{
  "name": "Repo User",
  "email": "repo@example.com",
  "sshKeyPath": "~/.ssh/id_repo"
}
```

### Success Response

```json
{
  "ok": true,
  "message": "Repository identity updated.",
  "user": {
    "name": "Repo User",
    "email": "repo@example.com",
    "source": "local",
    "sshKeyPath": "~/.ssh/id_repo"
  }
}
```

### Error Rules

- Requests are blocked when no git repository is active.
- Name and email validation remains unchanged.
- Empty `sshKeyPath` clears the repository-specific key path.
- Invalid persistence attempts return a visible message and leave prior identity data intact.

## Removed UI Action Contract

The expanded repository context action surface must not offer:

- Commit current changes.
- Check remote sync.
- Sync with remote or push/pull from the repository context.

Backend routes may remain for compatibility unless a later task explicitly removes them, but they are not part of the visible user workflow for this feature.
