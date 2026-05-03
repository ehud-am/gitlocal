# Quickstart: Unified Action Menus

## Setup

1. Start the app from the repository root.
2. Open a local git repository that has at least one folder and one file.
3. In the picker, navigate to a folder that is not currently a git repository.

## Validate Non-Git Folder Setup Actions

1. Confirm the setup actions are opened from a three-dots menu, not a setup icon.
2. Open the menu and confirm setup actions such as creating a subfolder, running git init, cloning into a subfolder, or opening a repository are still available when supported.
3. Confirm no empty three-dots trigger appears when the folder has no optional actions.

## Validate File Actions

1. Open a file in the content view.
2. Confirm file optional commands use the same three-dots menu pattern as folder actions.
3. Open the file menu and confirm delete file is red text.
4. Choose delete file.
5. Confirm the dialog shows the file name and containing location.
6. Type a non-matching value and confirm the final delete action stays disabled.
7. Type the exact displayed file name and confirm the final delete action becomes available.
8. Cancel and confirm the file remains unchanged.

## Validate Git Folder Actions

1. Open a non-root folder in a git repository.
2. Confirm create file, create folder, and delete folder are available from a three-dots menu instead of standalone buttons.
3. Confirm delete folder is red text.
4. Choose delete folder.
5. Confirm the dialog shows the folder name, containing location, and recursive impact information.
6. Type a non-matching value and confirm the final delete action stays disabled.
7. Type the exact displayed folder name and confirm the final delete action becomes available.
8. Cancel and confirm the folder and its contents remain unchanged.

## Validate Root And Accessibility Behavior

1. Open the repository root.
2. Confirm delete folder is not available for the root.
3. Use keyboard navigation to focus a three-dots trigger, open the menu, choose a safe command, and cancel a delete confirmation without deleting content.

## Implementation Validation

- `npm test` passed with coverage after implementation.
- `npm run build` passed after implementation.
- `npm run verify` passed after implementation, including dependency audits.
