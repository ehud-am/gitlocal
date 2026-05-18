# Quickstart: Folder and Repository Capabilities

## Prerequisites

- Node.js 22+
- Project dependencies installed at the repository root and in `ui/`
- A temporary local folder that is not inside a git repository
- A local git repository with at least one configured remote for repository-context checks

## Verify Regular Folder Browsing

1. Start GitLocal against a regular local folder.
2. Confirm the app opens without requiring git initialization.
3. Expand the folder tree and verify all immediate files and folders are visible.
4. Open a text or markdown file and confirm its contents render.
5. Open an image or binary file and confirm it is presented as non-editable.
6. Confirm file and folder rows do not show `local` or `local-only` badges in the regular-folder view.

## Verify Regular Folder File Mutations

1. Create a new text file in the regular folder.
2. Confirm the file appears in the file tree.
3. Open the new file and edit its contents.
4. Refresh or navigate away and back, then confirm the edited content persists.
5. Delete the file after confirmation.
6. Confirm the deleted file no longer appears in the tree.

## Verify Path Safety and Errors

1. Attempt to create a file using a path that escapes the selected folder.
2. Confirm the operation is blocked with a user-readable message.
3. Attempt to create a file where one already exists.
4. Confirm the operation returns a conflict-style outcome.
5. Change or remove a file outside the app while it is open, then attempt to save.
6. Confirm the app reports a conflict or missing-file outcome clearly.

## Verify Expanded Git Repository Context

1. Start GitLocal against a git repository with a configured remote.
2. Confirm the compact repository row still shows the current branch.
3. Expand the repository context.
4. Confirm the first expanded row shows the local repository path and the selected remote repository together.
5. Confirm the expanded area does not repeat current branch.
6. Confirm the expanded area does not show "Upstream sync".
7. Confirm commit and remote sync check actions are not offered.
8. Confirm the repository viewer shell and file tree appear before remote repository and git identity decoration are required to finish loading.

## Verify SSH Key Path Editing

1. Open git identity details for the active repository.
2. Confirm the SSH key path field is visible.
3. Save a repository-specific SSH key path.
4. Close and reopen identity details.
5. Confirm the saved path is displayed.
6. Clear the SSH key path and save.
7. Confirm the identity view shows the key path as unset.

## Suggested Verification Commands

```sh
npm test
npm run lint
npm run build
```
