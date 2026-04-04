# Quickstart: Manual Local File Editing

## Prerequisites

- Install dependencies with `npm ci` and `npm --prefix ui ci`.
- Start GitLocal against a local git repository that contains text files and at least one nested directory.

## Validation Flow

1. Start the app in a local repository and open a text file on the current branch.
2. Enter inline edit mode, change a small piece of text, save, and confirm the updated content is shown afterward.
3. Begin another edit, modify the content without saving, then navigate away and confirm GitLocal warns before discarding the unsaved change.
4. Create a new file in an existing folder, save it, and confirm the new file appears in the file tree and opens immediately.
5. Attempt to create a file at a path that already exists and confirm the app blocks the action with a clear explanation.
6. Delete an existing file, confirm the deletion in the confirmation step, and verify the file disappears from the tree and content view.
7. Trigger a delete flow and cancel it, then confirm the file remains available.
8. Change a file outside the app after opening it in edit mode, then try to save or delete from GitLocal and confirm the app reports a conflict instead of overwriting silently.
9. Open a binary or image file and confirm inline text editing is not offered.
10. Switch to a non-current branch view, if available, and confirm create, update, and delete actions are unavailable there.

## Automated Checks

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
