# Data Model: Manual Local File Editing

## Editable File Snapshot

- **Description**: The server-provided representation of a local text file that can be shown in the content panel and, when allowed, edited inline.
- **Fields**:
  - `path`: Repository-relative file path.
  - `content`: Current text content.
  - `type`: Textual presentation type used by the viewer.
  - `language`: Optional language hint for display.
  - `editable`: Whether inline editing is allowed for this file in the current context.
  - `revisionToken`: Snapshot token representing the file state at read time.
- **Validation rules**:
  - `path` must stay inside the opened repository boundary.
  - `editable` is false for non-text files and non-working-tree contexts.
  - `revisionToken` must change when the underlying file content changes on disk.
- **Relationships**:
  - Returned by the file-read contract.
  - Used to initialize an inline edit session.

## New File Draft

- **Description**: The in-progress user input collected before creating a new file.
- **Fields**:
  - `path`: Proposed repository-relative file path.
  - `content`: Initial file content.
- **Validation rules**:
  - `path` must not be empty.
  - `path` must resolve inside the repository boundary.
  - `path` must not already exist as a file or directory.
- **Relationships**:
  - Submitted through the create-file contract.
  - On success, becomes an editable file snapshot.

## File Mutation Request

- **Description**: A create, update, or delete action sent from the UI to the server.
- **Fields**:
  - `operation`: `create`, `update`, or `delete`.
  - `path`: Target repository-relative file path.
  - `content`: New text content for create/update operations.
  - `revisionToken`: Required for update and delete operations against an existing file snapshot.
- **Validation rules**:
  - `create` requires `path` and allows optional empty `content`.
  - `update` requires `path`, `content`, and `revisionToken`.
  - `delete` requires `path`, `revisionToken`, and explicit user confirmation before the request is sent.
- **Relationships**:
  - Processed by server-side file mutation handlers.
  - Produces either a successful file operation result or a conflict/error result.

## File Operation Result

- **Description**: The normalized server response after a file mutation attempt.
- **Fields**:
  - `ok`: Whether the operation succeeded.
  - `operation`: `create`, `update`, or `delete`.
  - `path`: The affected repository-relative path.
  - `status`: `created`, `updated`, `deleted`, `conflict`, `blocked`, or `failed`.
  - `message`: User-displayable outcome summary.
- **Validation rules**:
  - Failed results must not imply a filesystem change when none occurred.
  - Conflict results must be used when the stored `revisionToken` no longer matches the on-disk file snapshot.
- **Relationships**:
  - Drives status messaging, query invalidation, and selection updates in the UI.

## Inline Edit Session

- **Description**: The UI-only state for a lightweight manual editing flow.
- **Fields**:
  - `mode`: `view`, `edit`, `create`, or `confirm-delete`.
  - `draftPath`: Current path input for file creation.
  - `draftContent`: Current unsaved content.
  - `dirty`: Whether the user has unsaved changes.
  - `baseRevisionToken`: Revision token captured from the last successful file read.
- **Validation rules**:
  - `dirty` becomes true after user changes content or a new-file path.
  - Leaving a dirty session requires a warning or explicit discard action.
- **Relationships**:
  - Initialized from an editable file snapshot or an empty new file draft.
  - Cleared or reset after successful save, delete, or discard.
