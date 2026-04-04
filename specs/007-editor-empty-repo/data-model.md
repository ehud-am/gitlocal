# Data Model: Editor Workspace, Folder-First Main View, and Markdown Comment Hiding

## Edit Workspace State

- **Description**: The UI state that controls how the content panel presents an editable file and how much of the viewport is allocated to the editing surface.
- **Fields**:
  - `mode`: `view`, `edit`, `create`, or `confirm-delete`.
  - `selectedPath`: Repository-relative file path currently shown in the panel.
  - `canMutateFiles`: Whether file-editing actions are allowed in the current repository context.
  - `busy`: Whether a save, create, or delete action is in progress.
  - `error`: User-displayable error copy for the current editing session.
- **Validation rules**:
  - Expanded editor layout applies only when `mode` is `edit` or `create`.
  - Primary save and cancel actions remain visible in supported desktop widths.
- **Relationships**:
  - Owned by the content panel UI.
  - Uses existing file read and mutation flows.

## Repository Summary

- **Description**: Lightweight server-provided metadata used to describe the currently opened repository and seed folder-first navigation behavior.
- **Fields**:
  - `name`: Repository display name.
  - `path`: Opened repository path.
  - `currentBranch`: Current working-tree branch name, if any.
  - `isGitRepo`: Whether the opened folder is a valid git repository.
  - `pickerMode`: Whether the app is currently in folder-picker mode.
  - `version`: Running application version.
  - `hasCommits`: Whether the repository has at least one reachable commit.
  - `rootEntryCount`: Count of immediate browseable entries at the repository root.
- **Validation rules**:
  - `rootEntryCount` excludes `.git` internals and any path outside the repository boundary.
  - `hasCommits` remains false for a freshly initialized repository with no commits.
- **Relationships**:
  - Returned by the repository info contract.
  - Combined with current folder data to determine sensible default main-panel behavior.

## Main Panel Directory View State

- **Description**: The normalized content-panel state shown when no file is selected or when the selected path is a folder.
- **Fields**:
  - `folderPath`: Repository-relative folder path currently represented in the main panel.
  - `entries`: Immediate child files and folders visible inside that folder.
  - `empty`: Whether the folder has no visible child entries.
  - `origin`: `default-folder-view` or `selected-folder-view`.
  - `supportsDoubleClick`: Whether row double-click opens the underlying item.
  - `rowActionLabel`: Visible action text shown on each row, expected to be `Open`.
- **Validation rules**:
  - `entries` include only immediate children, not recursive descendants.
  - Hidden repository internals must not appear.
  - Each entry exposes both row-level double-click behavior and an explicit action button.
  - Empty folders render an intentional empty state instead of an error presentation.
- **Relationships**:
  - Derived from tree or directory-list data for the current folder context.
  - Rendered by the content panel when the main view should show browseable items instead of a file.

## Directory Entry

- **Description**: A single browseable item shown in the main-panel folder list.
- **Fields**:
  - `path`: Repository-relative path for the item.
  - `name`: Display name shown in the row.
  - `type`: `file` or `dir`.
  - `openTarget`: The path that should be opened when the row action or double-click is used.
- **Validation rules**:
  - `name` is the final path segment of `path`.
  - `openTarget` must resolve within the current repository boundary.
- **Relationships**:
  - Produced from server tree/directory data.
  - Consumed by the content panel folder list and its row interactions.

## Rendered Markdown View

- **Description**: The presentation-only version of markdown content shown when the user chooses rendered mode instead of raw mode.
- **Fields**:
  - `sourceContent`: Original markdown file text.
  - `renderContent`: Sanitized markdown text or AST used for rendered presentation.
  - `rawVisible`: Whether the viewer is currently showing raw source instead of rendered markdown.
- **Validation rules**:
  - Markdown comments intended to stay hidden must not appear in `renderContent`.
  - Raw mode continues to show the original source unchanged.
- **Relationships**:
  - Produced by the markdown rendering path.
  - Used only for rendered markdown presentation.
