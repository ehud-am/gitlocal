# UI Contract: Unified Action Menus

## Scope

This contract covers optional command entry points for non-git folder setup contexts, files, and git folders in the GitLocal UI. It also covers destructive menu styling and delete confirmation behavior for files and folders.

## Shared Action Menu Contract

- Optional item-level commands are opened from a three-dots trigger.
- The trigger label must identify the target, such as "Open actions for README.md" or "Open folder actions".
- The menu must be keyboard accessible through the shared dropdown menu primitive.
- A target with no available optional commands must not render an empty menu trigger.
- Existing commands must keep their current behavior after moving into a menu.

## Non-Git Folder Setup Menu

- The existing setup icon entry point is replaced by a three-dots menu.
- Setup actions remain available from the menu when supported by the current folder state:
  - Create subfolder
  - Run git init
  - Clone into subfolder
  - Open this repository when available
- Disabled setup actions may remain visible only when the existing UI already provides a meaningful disabled state.

## File Action Menu

- File optional commands continue to use a three-dots menu.
- The file menu must visually align with folder menus in trigger shape, menu spacing, focus behavior, and destructive item styling.
- Delete file is shown in red text.
- Selecting delete file opens the typed-name delete confirmation before any delete request is sent.

## Git Folder Action Menu

- Standalone git-folder optional action buttons move into a three-dots menu.
- Existing create, edit/view, navigation, and delete commands remain available when allowed by the current folder state.
- Delete folder is shown in red text.
- Repository root deletion remains unavailable and must not appear as a menu item.
- Selecting delete folder opens the existing folder delete confirmation flow.

## Delete Confirmation Contract

- File and folder delete confirmations must display the target name and containing location.
- The final delete button must be disabled until the user types the exact displayed target name.
- Exact matching is case-sensitive and includes spaces, punctuation, and file extensions.
- The confirmation copy must make clear that deletion affects the selected file or folder.
- Folder delete confirmation must preserve recursive impact information, including the count of files that would be deleted.
- Folder delete confirmation must preserve stale-preview and filesystem failure handling.
- Cancel closes the confirmation and leaves the target unchanged.

## Test Coverage Contract

- Component tests must cover menu rendering for non-git folder setup, file, and git folder contexts.
- Tests must verify empty menus are hidden.
- Tests must verify delete menu items use destructive styling and non-destructive items do not.
- Tests must verify file delete cannot be confirmed until the exact file name is typed.
- Tests must verify folder delete still cannot be confirmed until the exact folder name is typed and still shows impact information.
- Tests must verify repository root deletion remains unavailable.
