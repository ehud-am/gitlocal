# Data Model: File Sync Indicators and Commit/Remote Actions

## File Sync State

- **Description**: The sync state for one file on the current working branch.
- **Values**:
  - `clean`: No local or upstream indicator should be shown.
  - `local-uncommitted`: The file differs from `HEAD` in the working tree or index.
  - `local-committed`: The file changed in local commits not yet pushed to the upstream.
  - `remote-committed`: The file changed in upstream commits not yet present locally.
  - `diverged`: The file changed in both local-only and upstream-only commits.
- **Validation rules**:
  - `local-uncommitted` takes precedence over commit-level states when the working tree currently differs from `HEAD`.
  - `diverged` is used only when both local-only and upstream-only commit sets include the same file path.
  - Remote-derived values are omitted when no upstream branch is configured.
- **Relationships**:
  - Included on tree/folder file entries.
  - Included on selected-path sync metadata.

## Repository Sync Summary

- **Description**: The upstream relationship for the current working branch.
- **Fields**:
  - `mode`: `local-only`, `up-to-date`, `ahead`, `behind`, `diverged`, or `unavailable`.
  - `aheadCount`: Number of local commits not yet pushed.
  - `behindCount`: Number of upstream commits not yet pulled.
  - `hasUpstream`: Whether the current branch tracks an upstream branch.
  - `upstreamRef`: Upstream short ref when known.
  - `remoteName`: Chosen remote name when known.
- **Validation rules**:
  - `aheadCount` and `behindCount` are both zero for `up-to-date`.
  - `diverged` requires both counts to be greater than zero.
  - `local-only` is used when the repo or branch has no upstream tracking configuration.
- **Relationships**:
  - Returned by sync polling.
  - Drives header badges and sync-action enablement.

## Commit Changes Request and Outcome

- **Description**: The explicit local commit flow initiated from the repository header.
- **Request fields**:
  - `message`: Non-empty commit message.
- **Outcome fields**:
  - `ok`: Whether the action completed.
  - `status`: `committed`, `blocked`, or `failed`.
  - `message`: User-facing result text.
  - `commitHash`: Full commit hash when a commit is created.
  - `shortHash`: Short commit hash when a commit is created.
- **Validation rules**:
  - Empty commit messages are rejected.
  - Empty working trees are rejected instead of creating empty commits.

## Remote Sync Outcome

- **Description**: The result of one user-triggered sync action against the current branch upstream.
- **Fields**:
  - `ok`: Whether the action completed.
  - `status`: `pushed`, `pulled`, `up-to-date`, `blocked`, or `failed`.
  - `message`: User-facing result text.
  - `aheadCount`: Post-check counts when available.
  - `behindCount`: Post-check counts when available.
- **Validation rules**:
  - Dirty working trees are blocked.
  - Diverged branches are blocked.
  - Sync runs only for the current working branch and only through local Git commands.
