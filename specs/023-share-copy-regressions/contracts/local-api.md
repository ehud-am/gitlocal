# Local API Contract: Git Folder Recognition Patch

This patch does not add a new public API. It tightens expected behavior for existing local endpoints and startup/direct launch state.

## Classification Terms

- `repository-root`: The selected directory is exactly the root of a git worktree.
- `inside-repository`: The selected path is inside a git worktree but is not the worktree root.
- `outside-repository`: The selected path is not inside a git worktree.
- `isGitRepo`: Compatibility boolean that means `gitState === "repository-root"`.

## Startup and Direct Launch

**Input**

- Explicit local path from CLI/native launch.
- Remembered startup folder.
- Current working directory when no explicit path is supplied.

**Expected Result**

- A git repository root starts in repository mode.
- A plain folder starts in folder mode.
- A nested folder inside a repository starts in folder mode unless existing product behavior intentionally promotes it.
- Missing or unreadable remembered folders fall back without blocking startup.

## GET /api/folder/browse?path={path}

Returns picker metadata for a local folder and its child entries.

### Repository Root Browse Response

```json
{
  "currentPath": "/runtime/path/app-repo",
  "entries": [],
  "error": "",
  "isGitRepo": true,
  "gitState": "repository-root",
  "openMode": "repository",
  "repositoryRootPath": "/runtime/path/app-repo",
  "canOpen": true
}
```

### Rules

- The current browse root is classified independently from its children.
- Repository child folders return `isGitRepo: true`, `gitState: "repository-root"`, and `openMode: "repository"`.
- Regular child folders return `isGitRepo: false` and `openMode: "folder"`.
- Nested folders inside a repository return `isGitRepo: false` unless they are independent repository roots.

## POST /api/repo/open

Opens a selected local path.

### Request

```json
{
  "path": "/runtime/path/app-repo"
}
```

### Repository Root Response

```json
{
  "ok": true,
  "error": "",
  "path": "/runtime/path/app-repo",
  "rootPath": "/runtime/path/app-repo",
  "selectedPath": "",
  "selectedPathType": "none",
  "openMode": "repository",
  "gitState": "repository-root",
  "repositoryRootPath": "/runtime/path/app-repo"
}
```

### Plain Folder Response

```json
{
  "ok": true,
  "error": "",
  "path": "/runtime/path/plain-folder",
  "rootPath": "/runtime/path/plain-folder",
  "selectedPath": "",
  "selectedPathType": "none",
  "openMode": "folder",
  "gitState": "outside-repository"
}
```

### Rules

- Opening a repository root sets the active root to the canonical repository root.
- Opening a file inside a repository sets the active root to the containing repository root and selects the file.
- Opening a nested folder inside a repository preserves the existing nested-folder behavior and must not falsely enable repository-only UI unless the folder itself is a repository root.
- Missing or unsupported paths return `ok: false` with a user-readable error.

## GET /api/info

Returns active-root metadata after startup or open routing.

### Repository Active Root

```json
{
  "name": "app-repo",
  "path": "/runtime/path/app-repo",
  "currentBranch": "main",
  "isGitRepo": true,
  "pickerMode": false,
  "hasCommits": true,
  "gitContext": null
}
```

### Plain Folder Active Root

```json
{
  "name": "plain-folder",
  "path": "/runtime/path/plain-folder",
  "currentBranch": "",
  "isGitRepo": false,
  "pickerMode": false,
  "hasCommits": false,
  "gitContext": null
}
```

### Rules

- `/api/info` must agree with the classification used by `/api/repo/open` and startup.
- Repository-only UI depends on `isGitRepo: true`.
- A path with `.git` represented as a file, such as a linked worktree, must be recognized when local git reports it as a worktree root.
