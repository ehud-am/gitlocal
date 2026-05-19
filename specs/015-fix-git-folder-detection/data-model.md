# Data Model: Git Folder Detection

## Local Path Classification

Represents the authoritative classification of a user-selected local path.

**Fields**:
- `inputPath`: The path supplied by the user or picker.
- `canonicalPath`: The resolved local path used for comparisons when the path exists.
- `exists`: Whether the path exists.
- `pathType`: `file`, `directory`, `missing`, or `unsupported`.
- `gitState`: `repository-root`, `inside-repository`, or `outside-repository`.
- `repositoryRootPath`: Canonical repository root path when the path is inside a git worktree.
- `openMode`: `repository`, `folder`, `file`, or `blocked`.
- `message`: Optional user-readable classification or error message.

**Validation rules**:
- Missing paths cannot be opened.
- Files open as files and may use the containing repository root only when existing file-opening behavior requires that root.
- Directories classified as `repository-root` open in repository mode.
- Directories classified as `inside-repository` open or browse as folders unless the selected directory is itself a separate repository root.
- Directories classified as `outside-repository` open as regular folders.
- Canonical path comparison must be used before deciding exact root equality or descendant relationship.

## Repository Folder

Represents a selected directory that is itself the root of a git repository.

**Fields**:
- `path`: Canonical repository root path.
- `displayName`: Folder name shown to the user.
- `isGitRepo`: `true`.
- `gitState`: `repository-root`.
- `availableGitCapabilities`: Repository capabilities derived after opening, such as branch context, repository search, git identity, remote details, and git-specific file status.

**Validation rules**:
- A repository folder remains a repository even when it has no commits, no remote, or no identity configured.
- Repository capability empty states must be shown for missing optional git metadata.

## Folder Inside Repository

Represents a selected directory that is inside a git worktree but is not that worktree's root.

**Fields**:
- `path`: Canonical folder path.
- `repositoryRootPath`: Canonical containing repository root path.
- `displayName`: Folder name shown to the user.
- `isGitRepo`: `false`.
- `gitState`: `inside-repository`.
- `openMode`: `folder`.

**Validation rules**:
- Must not be badged or opened as a repository solely because Git reports it is inside a worktree.
- If this folder is also an independent repository root, `gitState` becomes `repository-root`.
- User-visible regular-folder browse and file mutation behavior remains available when opened as the active folder root.

## Regular Folder

Represents a selected directory that is not inside any git worktree.

**Fields**:
- `path`: Canonical folder path.
- `displayName`: Folder name shown to the user.
- `isGitRepo`: `false`.
- `gitState`: `outside-repository`.
- `openMode`: `folder`.

**Validation rules**:
- Must not show repository-only controls or repository badges.
- Existing regular-folder browse, view, create, update, and delete capabilities remain available.

## Picker Entry

Represents a file or folder shown while the user chooses what to open.

**Fields**:
- `name`: Entry name.
- `path`: Absolute local path used at runtime.
- `type`: `file` or `dir`.
- `isGitRepo`: Compatibility boolean derived from `gitState === repository-root`.
- `gitState`: Optional classification for directories: `repository-root`, `inside-repository`, or `outside-repository`.
- `openMode`: Type-aware target behavior for the single Open action.

**Validation rules**:
- Repository root entries display repository labeling and open as repositories.
- Folders inside repositories display folder labeling and do not open as repositories.
- Files continue to open through existing file-opening behavior.

## State Transitions

### Picker Entry Opening

1. `repository-root` -> `repository` when the user opens the entry.
2. `inside-repository` -> `folder` when the user opens the entry as a folder root.
3. `outside-repository` -> `folder` when the user opens the entry as a folder root.
4. `file` -> `file` when the user opens the entry and the viewer selects that file.
5. `missing` or `unsupported` -> `blocked` with a user-readable message.

### Active Root Capability State

1. `repository` -> git capabilities enabled according to available repository metadata.
2. `folder` -> regular-folder capabilities enabled and repository-only controls disabled.
3. `file` -> containing root loaded and selected file shown.
4. Any state -> `blocked` when path classification or open validation fails.
