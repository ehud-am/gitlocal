# Quickstart: Folder Delete Action And Compact Tags

## Setup

1. Open GitLocal against a local git repository on the current working branch.
2. Prepare a subfolder named `docs` with at least one file inside it.
3. Prepare at least one local-only file or folder so the left navigation panel can show a local-only tag.
4. Open the repository root and then browse into `docs`.

## Validation Flow

1. Confirm the left navigation panel no longer shows a delete-folder x icon on folder rows.
2. In the main folder view for `docs`, confirm a delete-folder action appears near the existing new-file and folder actions.
3. Confirm the delete-folder action uses red text and a red border.
4. Activate the main delete-folder action and confirm the existing delete preview and typed-name confirmation dialog opens.
5. Confirm deletion remains disabled until exactly `docs` is typed.
6. Cancel the dialog and confirm `docs` remains in the repository.
7. Return to repository root and confirm no root delete-folder action is available.
8. Open a file view and confirm no folder delete action is shown for the file.
9. Confirm the left navigation local-only tag says `local`.
10. Narrow the left panel and confirm compact tags remain readable without overlapping item names.

## Implementation Validation

- UI tests cover the moved delete-folder action, root/file exclusions, destructive outline styling, and compact local tags.
- Search result local-only labels keep the longer wording because this feature scopes the shorter `local` label to left-panel and folder-view tags.
