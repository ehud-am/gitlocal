# Quickstart: Folder Create And Delete

## Setup

1. Open GitLocal against a local git repository on the current working branch.
2. Prepare a folder named `docs` with at least:
   - one tracked file;
   - one untracked file;
   - one ignored file;
   - one nested subfolder containing a file.
3. Prepare another folder that should remain untouched for comparison.

## Validation Flow

1. Browse to the repository root or another folder and create a new subfolder named `notes`.
2. Confirm the new `notes` folder appears in the current folder view without a manual refresh.
3. Try to create another `notes` folder in the same parent and confirm GitLocal blocks the duplicate with a clear message.
4. Try invalid folder names such as empty input, `../escape`, and `a/b`; confirm no folder is created.
5. Open the delete action for `docs` and confirm the dialog displays:
   - the folder name;
   - the folder location;
   - a warning that all contents will be deleted;
   - the recursive file count.
6. Confirm the final delete action is disabled until exactly `docs` is typed.
7. Cancel the dialog and verify the `docs` folder and all nested contents remain.
8. Reopen the delete action, type `docs`, confirm deletion, and verify GitLocal returns to the nearest remaining parent folder.
9. Verify `docs` is absent after refresh and the comparison folder remains untouched.
10. Confirm the repository root has no delete control in the UI, then verify the folder delete API/helper blocks an empty root path.
