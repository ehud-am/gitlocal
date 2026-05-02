# Data Model: Folder Delete Action And Compact Tags

## Folder View Action

- **Description**: A user-facing command shown in the main folder view for the currently selected folder.
- **Fields**:
  - `label`: User-visible action text.
  - `kind`: Whether the action is constructive, neutral, or destructive.
  - `targetPath`: Repository-relative folder path the action applies to.
  - `availability`: Whether the action is shown, disabled, or hidden for the current view.
- **Validation rules**:
  - Delete-folder action is available only for a deletable repository subfolder.
  - Delete-folder action is not available for the repository root.
  - Delete-folder action is not available when a file view is selected.
  - Delete-folder action must hand off to the existing typed confirmation flow.
- **Relationships**:
  - Belongs to the main folder view.
  - Uses the existing folder deletion preview and confirmation flow.

## Left Navigation Tag

- **Description**: A compact status label shown on a left-panel item.
- **Fields**:
  - `status`: Underlying item status represented by the tag.
  - `label`: Short user-visible text.
  - `visualWeight`: Compact presentation size for the tag.
- **Validation rules**:
  - Local-only status must display as `local`.
  - Shortened labels must preserve the meaning of the underlying status.
  - Tags must not overlap or obscure file and folder names.
  - Tags must remain readable at common narrow sidebar widths.
- **Relationships**:
  - Attached to repository tree or folder-list entries in the left navigation panel.
  - Communicates status without replacing the item name.

## Deletable Folder

- **Description**: A repository subfolder eligible for recursive deletion through the existing safety flow.
- **Fields**:
  - `name`: Folder display name.
  - `path`: Repository-relative path.
  - `parentPath`: Repository-relative parent path.
  - `eligibleForDeletion`: Whether the folder can expose the main delete-folder action.
- **Validation rules**:
  - Repository root is not a deletable folder.
  - Non-folder views are not deletable folders for this action.
  - Eligibility must align with existing folder deletion rules.
- **State transitions**:
  - `viewed` -> `previewing-delete` when the user activates the main delete action.
  - `previewing-delete` -> `confirming-delete` when delete impact preview succeeds.
  - `confirming-delete` -> `deleted` only after exact typed-name confirmation and successful deletion.
  - `confirming-delete` -> `viewed` when the user cancels or deletion is blocked.
