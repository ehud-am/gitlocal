# Data Model: Folder Create And Delete

## Repository Folder

- **Description**: A folder inside the currently opened repository working tree.
- **Fields**:
  - `name`: Display name of the folder.
  - `path`: Repository-relative folder path.
  - `parentPath`: Repository-relative parent folder path, or empty for repository root.
  - `type`: Folder entry type, always `dir`.
  - `localOnly`: Whether the folder exists only in the local working tree.
  - `syncState`: Optional file sync indicator already used by tree entries.
- **Validation rules**:
  - Folder paths must resolve inside the repository boundary.
  - Repository root is browseable but is not a valid delete target.
  - Folder operations are allowed only for the current working tree.
- **Relationships**:
  - Contains child repository folders and files.
  - Is the target parent for a folder creation request.
  - May be the target of a folder deletion request when it is not the repository root.

## Folder Creation Request

- **Description**: A user's request to create one direct child folder under the current folder.
- **Fields**:
  - `parentPath`: Repository-relative parent folder path.
  - `name`: Requested direct child folder name.
- **Validation rules**:
  - `parentPath` must identify an existing folder inside the current working tree.
  - `name` must be non-empty after trimming.
  - `name` must be a single path segment, not an absolute path and not a nested path.
  - `name` must not contain path traversal or reserved current/parent directory tokens.
  - The target child path must not already exist as a file or folder.
- **State transitions**:
  - `draft` -> `blocked` when validation fails.
  - `draft` -> `created` when the folder is created.
  - `draft` -> `failed` when filesystem creation cannot complete.

## Folder Deletion Preview

- **Description**: The impact summary shown before the user can confirm recursive folder deletion.
- **Fields**:
  - `path`: Repository-relative folder path selected for deletion.
  - `name`: Exact folder name the user must type.
  - `parentPath`: Repository-relative parent folder path.
  - `fileCount`: Number of files contained recursively inside the folder.
  - `folderCount`: Number of nested folders contained recursively inside the folder, excluding the selected folder.
  - `message`: User-facing explanation of what will be deleted.
- **Validation rules**:
  - `path` must resolve to an existing subfolder inside the current working tree.
  - `fileCount` includes tracked, untracked, ignored, hidden, modified, and nested files.
  - Preview data must not authorize deletion by itself.
- **Relationships**:
  - Supplies the required typed confirmation value for a folder deletion request.

## Folder Deletion Request

- **Description**: A user's confirmed request to recursively delete one subfolder.
- **Fields**:
  - `path`: Repository-relative folder path selected for deletion.
  - `confirmationName`: User-entered folder name.
- **Validation rules**:
  - `path` must still resolve to an existing subfolder at confirmation time.
  - `confirmationName` must exactly match the selected folder's displayed name.
  - The selected folder's impact must be recalculated at confirmation time before deletion.
  - Repository root deletion is always blocked.
- **State transitions**:
  - `previewed` -> `blocked` when the confirmation name does not match or the folder is no longer valid.
  - `previewed` -> `deleted` when recursive deletion completes and the selected folder is gone.
  - `previewed` -> `failed` when deletion cannot complete.

## Folder Operation Result

- **Description**: Shared user-facing outcome for folder create, preview, and delete operations.
- **Fields**:
  - `ok`: Whether the operation completed.
  - `operation`: `create-folder`, `preview-delete-folder`, or `delete-folder`.
  - `path`: Repository-relative path affected by the operation.
  - `status`: `created`, `previewed`, `deleted`, `blocked`, or `failed`.
  - `message`: Clear result or corrective guidance.
  - `parentPath`: Parent folder to refresh or navigate to after success.
  - `fileCount`: Present for deletion preview and deletion results.
  - `folderCount`: Present for deletion preview and deletion results.
- **Validation rules**:
  - Failed or blocked operations must not be represented as successful UI updates.
  - Successful delete results point the UI to the nearest remaining parent folder.
