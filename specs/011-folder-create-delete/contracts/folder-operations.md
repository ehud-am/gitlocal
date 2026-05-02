# Folder Operations Contract

## Scope

Folder operations are available only for the current working tree of the opened repository. Historical branch views and non-working-tree contexts must not expose mutation controls and must reject mutation requests.

## Create Folder Contract

- `POST /api/folder` creates one direct child folder inside an existing repository folder.
- Request body:
  - `parentPath`: repository-relative parent folder path. Empty string means repository root.
  - `name`: direct child folder name to create.
- Success behavior:
  - Returns `ok: true`, `operation: "create-folder"`, `status: "created"`, `path`, `parentPath`, and a user-facing message.
  - The created folder appears in the next tree or folder-list response for the parent.
- Failure behavior:
  - Returns `status: "blocked"` for invalid names, duplicate paths, unsafe paths, missing parent folders, repository-boundary violations, or non-working-tree contexts.
  - Returns `status: "failed"` when the request is valid but filesystem creation cannot complete.

## Delete Folder Preview Contract

- `GET /api/folder/delete-preview` returns the impact summary required before deletion confirmation.
- Query parameters:
  - `path`: repository-relative folder path selected for deletion.
- Success behavior:
  - Returns `ok: true`, `operation: "preview-delete-folder"`, `status: "previewed"`, `path`, `name`, `parentPath`, `fileCount`, `folderCount`, and a user-facing warning message.
  - `fileCount` includes all nested files inside the selected folder, including tracked, untracked, ignored, hidden, modified, and deeply nested files.
  - `folderCount` includes nested folders inside the selected folder and excludes the selected folder itself.
- Failure behavior:
  - Blocks missing folders, repository root, unsafe paths, repository-boundary violations, and non-working-tree contexts.
  - Preview does not authorize deletion and must be revalidated when deletion is confirmed.

## Delete Folder Contract

- `DELETE /api/folder` recursively deletes one selected subfolder after typed confirmation.
- Request body:
  - `path`: repository-relative folder path selected for deletion.
  - `confirmationName`: exact folder name typed by the user.
- Success behavior:
  - Revalidates the selected folder and recounts nested impact before deletion.
  - Deletes the selected folder and all nested contents.
  - Returns `ok: true`, `operation: "delete-folder"`, `status: "deleted"`, `path`, `parentPath`, `fileCount`, `folderCount`, and a user-facing message.
  - The UI navigates to or refreshes `parentPath` and the deleted folder is absent from refreshed listings.
- Failure behavior:
  - Returns `status: "blocked"` when the confirmation name does not exactly match the selected folder name.
  - Blocks repository root deletion, unsafe paths, missing selected folder, and non-working-tree contexts.
  - Returns `status: "failed"` when deletion cannot complete due to permissions, file locks, or external filesystem changes.
  - The UI must not claim deletion success unless the selected folder is gone.

## Tree And Folder List Contract

- `GET /api/tree` remains the source for repository tree and folder-list entries.
- After successful folder creation or deletion, clients refresh relevant tree/folder data from the server.
- Folder operation controls are shown only for working-tree folders that are valid operation targets.
- Repository root may show create-folder controls but must not show root delete controls.

## UI Interaction Contract

- Create-folder interaction:
  - Starts from the current folder browsing context.
  - Accepts one direct child folder name.
  - Shows validation errors without changing repository contents.
  - Refreshes the current folder when creation succeeds.
- Delete-folder interaction:
  - Starts from a visible folder row or selected folder context.
  - Opens a confirmation dialog that displays folder name, folder location, recursive file count, and destructive warning text.
  - Keeps the final delete action disabled until the user types the exact folder name.
  - Allows canceling without sending a delete request.
  - Refreshes or navigates to the nearest remaining parent folder after successful deletion.

## Test Coverage Contract

- Backend tests must cover:
  - Creating a valid direct child folder.
  - Blocking duplicate, empty, nested, absolute, traversal, and out-of-repository folder names.
  - Blocking create requests when the parent is missing or not a folder.
  - Generating delete previews with recursive file counts for tracked, untracked, ignored, hidden, and nested files.
  - Blocking repository root deletion.
  - Blocking delete confirmation when the typed name does not match.
  - Revalidating impact at confirmation time.
  - Reporting failed deletion without claiming success.
- UI tests must cover:
  - Create-folder controls from the current folder view.
  - Successful create refresh behavior.
  - Delete preview dialog content, including folder identity and file count.
  - Disabled delete action until exact typed name matches.
  - Canceling without mutation.
  - Successful delete navigation or refresh to the parent folder.
