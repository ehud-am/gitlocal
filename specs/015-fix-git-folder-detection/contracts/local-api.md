# Contract: Git Folder Detection and Open Routing

This patch updates the existing local API behavior for folder browsing and active-root opening. Paths in request bodies are local runtime paths supplied by the user or picker.

## Classification Terms

- `repository-root`: The selected directory is exactly the root of a git worktree.
- `inside-repository`: The selected directory is inside a git worktree but is not the worktree root.
- `outside-repository`: The selected directory is not inside a git worktree.

Existing `isGitRepo` fields remain compatibility booleans and mean `gitState === "repository-root"`.

## GET /api/folder/browse?path={path}

Returns folder picker entries with repository-root labeling derived from the shared classification.

### Response Shape

```json
{
  "currentPath": "/runtime/path/projects",
  "parentPath": "/runtime/path",
  "homePath": "/runtime/home",
  "roots": [{ "name": "/", "path": "/" }],
  "entries": [
    {
      "name": "app-repo",
      "path": "/runtime/path/projects/app-repo",
      "type": "dir",
      "isGitRepo": true,
      "gitState": "repository-root",
      "openMode": "repository"
    },
    {
      "name": "docs",
      "path": "/runtime/path/projects/docs",
      "type": "dir",
      "isGitRepo": false,
      "gitState": "outside-repository",
      "openMode": "folder"
    }
  ],
  "error": "",
  "isGitRepo": false,
  "gitState": "outside-repository",
  "canOpen": true,
  "canCreateChild": true,
  "canInitGit": true,
  "canCloneIntoChild": true
}
```

### Rules

- A directory entry has `isGitRepo: true` only when it is classified as `repository-root`.
- A directory inside a containing repository has `isGitRepo: false`, `gitState: "inside-repository"`, and `openMode: "folder"` unless it is itself a separate repository root.
- A browse target that is a repository root reports `isGitRepo: true` and `gitState: "repository-root"` for the current folder.
- `canInitGit` is false for repository roots and true only where existing folder-init rules allow it.
- Inaccessible entries may be omitted or reported through the existing browse error behavior.

## POST /api/repo/open

Opens a file, repository folder, or regular folder using shared classification.

### Request

```json
{
  "path": "/runtime/path/projects/app-repo"
}
```

### Repository Folder Response

```json
{
  "ok": true,
  "error": "",
  "path": "/runtime/path/projects/app-repo",
  "rootPath": "/runtime/path/projects/app-repo",
  "selectedPath": "",
  "selectedPathType": "none",
  "openMode": "repository",
  "gitState": "repository-root"
}
```

### Folder Inside Repository Response

```json
{
  "ok": true,
  "error": "",
  "path": "/runtime/path/projects/app-repo/docs",
  "rootPath": "/runtime/path/projects/app-repo/docs",
  "selectedPath": "",
  "selectedPathType": "none",
  "openMode": "folder",
  "gitState": "inside-repository",
  "repositoryRootPath": "/runtime/path/projects/app-repo"
}
```

### Regular Folder Response

```json
{
  "ok": true,
  "error": "",
  "path": "/runtime/path/notes",
  "rootPath": "/runtime/path/notes",
  "selectedPath": "",
  "selectedPathType": "none",
  "openMode": "folder",
  "gitState": "outside-repository"
}
```

### Rules

- Opening a repository root sets the active root to that repository and enables repository-mode metadata on the next `GET /api/info`.
- Opening a folder inside a repository sets the active root to that selected folder as a folder root unless future requirements explicitly request promotion to the containing repository.
- Opening a regular folder sets the active root to that selected folder as a folder root.
- Opening a file preserves existing file-selection behavior while using classification only to choose the correct containing active root.
- Missing or unsupported paths return `ok: false` and a user-readable error.

## GET /api/info

Returns active-root metadata after a path has been opened.

### Repository Root Result

```json
{
  "name": "app-repo",
  "path": "/runtime/path/projects/app-repo",
  "currentBranch": "main",
  "isGitRepo": true,
  "pickerMode": false,
  "version": "0.8.1",
  "hasCommits": true,
  "rootEntryCount": 12,
  "gitContext": null
}
```

### Folder Root Result

```json
{
  "name": "docs",
  "path": "/runtime/path/projects/app-repo/docs",
  "currentBranch": "",
  "isGitRepo": false,
  "pickerMode": false,
  "version": "0.8.1",
  "hasCommits": false,
  "rootEntryCount": 4,
  "gitContext": null
}
```

### Rules

- `isGitRepo` is true only for active roots classified as `repository-root`.
- `currentBranch`, `hasCommits`, and `gitContext` are repository-only fields.
- Regular folders and folders inside repositories both disable repository-only UI through `isGitRepo: false`.

## Picker UI Contract

- The single Open action opens repository-root rows as repositories and folder rows as folders.
- Double-clicking a repository-root row follows the same behavior as Open.
- Double-clicking a non-repository folder row may browse into that folder.
- Repository badges are shown only for `repository-root` rows.
