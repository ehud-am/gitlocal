# Contract: Nested Repository Detection and Open Routing

This patch tightens existing local API behavior for folder browsing and repository opening. Paths are local runtime paths supplied by the user, the picker, or startup arguments.

## Classification Terms

- `repository-root`: The selected directory is exactly the root of a git worktree.
- `inside-repository`: The selected directory is inside a git worktree but is not the worktree root.
- `outside-repository`: The selected directory is not inside any git worktree.

Existing `isGitRepo` fields remain compatibility booleans and mean `gitState === "repository-root"`.

## GET /api/folder/browse?path={path}

Returns folder picker metadata for the current browse root and its entries.

### Mixed Plain Parent Response

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
      "openMode": "repository",
      "repositoryRootPath": "/runtime/path/projects/app-repo"
    },
    {
      "name": "notes",
      "path": "/runtime/path/projects/notes",
      "type": "dir",
      "isGitRepo": false,
      "gitState": "outside-repository",
      "openMode": "folder"
    }
  ],
  "error": "",
  "isGitRepo": false,
  "gitState": "outside-repository",
  "openMode": "folder",
  "canOpen": true,
  "canCreateChild": true,
  "canInitGit": true,
  "canCloneIntoChild": true
}
```

### Rules

- Each child entry is classified independently from the browse root and sibling entries.
- A repository child listed from a plain parent has `isGitRepo: true`, `gitState: "repository-root"`, and `openMode: "repository"`.
- A regular child listed beside a repository child has `isGitRepo: false` and `openMode: "folder"`.
- A folder inside a repository remains `isGitRepo: false` unless that folder is itself an independent repository root.
- Inaccessible entries may be omitted or surfaced through existing browse error behavior without blocking other entries.

## POST /api/repo/open

Opens the selected local path using the same classification semantics as folder browsing and startup.

### Request

```json
{
  "path": "/runtime/path/projects/app-repo"
}
```

### Repository Child Response

```json
{
  "ok": true,
  "error": "",
  "path": "/runtime/path/projects/app-repo",
  "rootPath": "/runtime/path/projects/app-repo",
  "selectedPath": "",
  "selectedPathType": "none",
  "openMode": "repository",
  "gitState": "repository-root",
  "repositoryRootPath": "/runtime/path/projects/app-repo"
}
```

### Regular Child Response

```json
{
  "ok": true,
  "error": "",
  "path": "/runtime/path/projects/notes",
  "rootPath": "/runtime/path/projects/notes",
  "selectedPath": "",
  "selectedPathType": "none",
  "openMode": "folder",
  "gitState": "outside-repository"
}
```

### Rules

- Opening a repository child sets the active root to that child and returns repository mode.
- Opening the same repository child by typed path returns the same classification as opening it from browse metadata.
- Opening a regular child folder sets the active root to that child and returns folder mode.
- Missing or unsupported paths return `ok: false` with a user-readable error.

## GET /api/info

Returns active-root metadata after startup or open routing.

### Repository Child Active Root

```json
{
  "name": "app-repo",
  "path": "/runtime/path/projects/app-repo",
  "currentBranch": "main",
  "isGitRepo": true,
  "pickerMode": false,
  "version": "0.7.2",
  "hasCommits": true,
  "rootEntryCount": 12,
  "gitContext": null
}
```

### Regular Child Active Root

```json
{
  "name": "notes",
  "path": "/runtime/path/projects/notes",
  "currentBranch": "",
  "isGitRepo": false,
  "pickerMode": false,
  "version": "0.7.2",
  "hasCommits": false,
  "rootEntryCount": 3,
  "gitContext": null
}
```

### Rules

- The same repository child started directly or opened from a parent folder reports `isGitRepo: true`.
- Regular folder children report `isGitRepo: false`.
- Repository-only fields are populated only for repository active roots.

## Picker UI Contract

- Repository child rows show the repository badge and kind.
- The Open action opens repository child rows as repositories.
- Double-clicking a repository child row opens it as a repository.
- Double-clicking a regular folder child may browse into the folder.
- The selected path field reflects the selected child path and does not alter classification.
