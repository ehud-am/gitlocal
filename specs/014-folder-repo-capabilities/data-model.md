# Data Model: Folder and Repository Capabilities

## Regular Folder

Represents a selected local folder that is not part of a git repository.

**Fields**:
- `name`: Display name derived from the folder path.
- `path`: Absolute local path used at runtime only.
- `isGitRepo`: Always `false`.
- `pickerMode`: Indicates whether the folder is being browsed as the active app root.
- `rootEntryCount`: Count of immediate entries visible at the folder root.
- `capabilities`: User-facing operations available for the folder, including file browse, view, create, update, and delete.

**Validation rules**:
- The folder must exist and be readable.
- File operations must be limited to paths inside the selected folder.
- Git-only fields must show empty or unavailable states rather than stale repository data.

## File Entry

Represents a file or folder within the active local root.

**Fields**:
- `name`: Entry display name.
- `path`: Root-relative path.
- `type`: `file` or `dir`.
- `localOnly`: `true` for regular-folder entries and for git working-tree entries not tracked by git.
- `syncState`: Present only when git metadata can provide meaningful file sync state.

**Validation rules**:
- Paths are normalized and root-relative.
- Entries outside the active root are never returned.
- Hidden files and ignored-looking names are regular entries unless existing product rules exclude them.

## File Content

Represents the content returned for a selected file.

**Fields**:
- `path`: Root-relative file path.
- `content`: Text content, base64 image content, or an empty string for binary files.
- `encoding`: `utf-8`, `base64`, or `none`.
- `type`: `markdown`, `text`, `image`, or `binary`.
- `language`: Display language for syntax highlighting when known.
- `editable`: Whether the file can be changed through the app.
- `revisionToken`: Token used to detect stale edits where available.

**Validation rules**:
- Missing files return a clear not-found outcome.
- Binary and unsupported files are viewable as non-editable states.
- Updates require a current revision token when one is available.

## File Operation Result

Represents the outcome of creating, updating, or deleting a file.

**Fields**:
- `ok`: Whether the operation succeeded.
- `operation`: `create`, `update`, or `delete`.
- `path`: Root-relative target path.
- `status`: `created`, `updated`, `deleted`, `conflict`, `blocked`, or `failed`.
- `message`: User-readable outcome.

**Validation rules**:
- Create is blocked when the target already exists.
- Update is blocked for non-editable files and conflicts when the revision is stale.
- Delete requires explicit user confirmation in the UI before the request is sent.
- Any permission or filesystem failure returns a visible user-readable message.

## Git Repository Summary

Represents repository identity and context shown in compact and expanded views.

**Fields**:
- `name`: Repository display name.
- `path`: Local repository path.
- `currentBranch`: Current branch shown in the compact row.
- `isGitRepo`: Always `true`.
- `gitContext.remote`: Selected remote repository context.
- `gitContext.user`: Git identity details.

**Validation rules**:
- Expanded view must not repeat `currentBranch`.
- Expanded view must not show an "Upstream sync" field.
- Expanded actions must not expose commit or remote sync checks.
- Missing remote context shows an explicit empty state.

## Remote Repository Context

Represents the selected remote repository for comparison with the local repository.

**Fields**:
- `name`: Remote name such as `origin`.
- `fetchUrl`: Configured fetch URL.
- `webUrl`: Browser-friendly URL when derivable.
- `selectionReason`: Why this remote was selected for display.

**Validation rules**:
- Prefer the branch upstream remote when available, then `origin`, then the first configured remote.
- When no remote exists, show a no-remote empty state.
- Multiple remotes do not block display; the selected remote must be deterministic.

## Git Identity

Represents repository-scoped git identity information.

**Fields**:
- `name`: Git user name.
- `email`: Git user email.
- `source`: `local`, `global`, or `mixed`.
- `sshKeyPath`: Optional path to the SSH key used for this repository.

**Validation rules**:
- Name and email remain required when saving identity fields.
- SSH key path can be empty to represent no repository-specific key path.
- SSH key path edits are scoped to the selected repository.
- Invalid or inaccessible paths show a clear outcome without corrupting other identity fields.

## State Transitions

### Regular Folder File Operations

1. `missing` -> `created` when a valid new file path is saved.
2. `editable` -> `updated` when content is saved with a current revision.
3. `editable` -> `conflict` when content is saved with a stale revision.
4. `existing` -> `deleted` when deletion is confirmed and succeeds.
5. `existing` -> `blocked` or `failed` when validation, permission, or filesystem errors occur.

### Git Identity SSH Key Path

1. `unset` -> `set` when the user saves a non-empty SSH key path.
2. `set` -> `changed` when the user saves a different SSH key path.
3. `set` -> `unset` when the user clears the repository-specific SSH key path.
4. Any state -> `failed` when validation or persistence fails.
