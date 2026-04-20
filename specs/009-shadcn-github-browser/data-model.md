# Data Model: Shadcn GitHub-Style Browser Refresh

## Theme Preference

- **Description**: The app-wide presentation mode applied to the shadcn/Tailwind shell and all viewer/setup surfaces.
- **Fields**:
  - `value`: `light` or `dark`.
  - `source`: `saved`, `default`, or `fallback`.
- **Validation rules**:
  - Only the two supported modes are persisted.
  - The saved mode must hydrate before the first meaningful paint to avoid a visible flash between themes.
  - Missing or invalid stored values fall back to the app default.
- **Relationships**:
  - Read by the app shell and setup modal.
  - Reflected in document-level theme classes and shared CSS variables.

## Repository Context Header

- **Description**: The header state rendered at the top of the right panel for the active file or folder.
- **Fields**:
  - `itemTitle`: Last segment of the selected path, or a root label when no child path is selected.
  - `itemPath`: Full repository-relative path for the active item, or an empty string for repository root.
  - `isGitRepo`: Whether the current browse context belongs to a git repository.
  - `gitUserName`: Preferred git user name for the repository context.
  - `gitUserEmail`: Preferred git user email for the repository context.
  - `gitUserSource`: `local`, `global`, or `missing`.
  - `remoteName`: Selected remote name when one exists.
  - `remoteFetchUrl`: Configured fetch/push URL for the selected remote.
  - `remoteWebUrl`: Browser-openable URL derived from the selected remote when conversion is possible.
  - `remoteSelectionReason`: `upstream`, `origin`, `first-configured`, or `none`.
  - `currentBranch`: Currently checked-out local branch name.
- **Validation rules**:
  - `itemTitle` is derived from the final path segment and must remain non-empty for non-root views.
  - Repository-local git config wins over global config for user name/email.
  - `remoteWebUrl` may be empty even when `remoteFetchUrl` is present if the remote is not browser-convertible.
  - Missing git user data must be represented explicitly instead of silently omitted.
- **Relationships**:
  - Built from the enriched repository info payload plus client-side selection state.
  - Consumed by the content-panel header and related tests.

## Branch Option

- **Description**: A selectable branch/ref option shown in the branch dropdown.
- **Fields**:
  - `name`: Canonical branch name used for display and selection.
  - `displayName`: User-facing label for the dropdown row.
  - `scope`: `local` or `remote`.
  - `remoteName`: Remote namespace for remote-tracking branches when available.
  - `trackingRef`: Full tracking ref used for remote-only checkout, such as `origin/feature-x`.
  - `hasLocalCheckout`: Whether a local branch already exists for this option.
  - `isCurrent`: Whether the option matches the currently checked-out local branch.
- **Validation rules**:
  - Local branches remain unique by `name`.
  - Remote-tracking options exclude symbolic refs such as `origin/HEAD`.
  - If a local branch already represents the same short branch name, the local option is the primary selectable row and remote metadata remains supplemental.
- **Relationships**:
  - Returned by the branches endpoint.
  - Consumed by the branch selector and branch-switch dialog.

## Branch Switch Request and Outcome

- **Description**: The server-owned workflow state for changing the local working tree to another branch/ref.
- **Request fields**:
  - `target`: Selected branch option name or tracking ref.
  - `resolution`: `preview`, `commit`, `discard`, `delete-untracked`, or `cancel`.
  - `commitMessage`: Commit message used when `resolution` is `commit`.
  - `allowDeleteUntracked`: Explicit acknowledgement that untracked blockers may be removed.
- **Outcome fields**:
  - `status`: `switched`, `confirmation-required`, `second-confirmation-required`, `blocked`, or `failed`.
  - `currentBranch`: Final current branch after the operation, when known.
  - `createdTrackingBranch`: Name of a local branch created from a remote-tracking branch, when applicable.
  - `trackedChangeCount`: Number of tracked or staged changes involved in the decision.
  - `untrackedChangeCount`: Number of untracked blockers involved in the decision.
  - `blockingPaths`: Representative changed paths when the server needs confirmation or reports failure.
  - `suggestedCommitMessage`: Editable default message for the commit flow.
  - `message`: User-facing result or error message.
- **Validation rules**:
  - `commitMessage` is required when the user chooses the commit path.
  - `delete-untracked` may only be accepted after the server has already explained why untracked files still block the switch.
  - `cancel` never mutates repository state.
- **Relationships**:
  - Produced by the branch-switch mutation route.
  - Drives the branch-switch confirmation dialog and post-switch UI refresh behavior.

## Folder View State

- **Description**: The right-panel folder presentation state for repository and folder browsing.
- **Fields**:
  - `path`: Current folder path, or empty string for repository root.
  - `parentPath`: Parent folder path when one exists within the active browse context.
  - `entries`: Immediate child entries returned by `GET /api/tree`.
  - `showParentEntry`: Whether the UI should prepend the synthetic `..` row.
  - `readmePath`: Path to the folder-scoped README when one exists.
  - `readmeContent`: Renderable README content loaded after discovery.
  - `isGitBacked`: Whether the current folder belongs to a git repository view.
- **Validation rules**:
  - The `..` row is synthetic UI state and is never returned by the tree endpoint.
  - The README section renders only after the file/folder list and only when a folder-scoped README exists.
  - Non-git filesystem folders may show child entries without a README section.
- **Relationships**:
  - Built from `GET /api/tree`, folder-aware README discovery, and the selected path.
  - Consumed by the content panel.

## Setup Location and Setup Action

- **Description**: The modal state used when browsing folders and bootstrapping a repository location.
- **Location fields**:
  - `currentPath`: The folder currently shown in the setup modal.
  - `parentPath`: Parent folder path when available.
  - `homePath`: Home directory shortcut used by the modal.
  - `entries`: Immediate child folders under the current path.
  - `isGitRepo`: Whether the selected/current folder is already a git repository.
  - `canOpen`: Whether the selected/current folder can be opened directly in GitLocal.
  - `canCreateChild`: Whether a new child folder can be created beneath the current folder.
  - `canInitGit`: Whether `git init` is valid for the selected/current folder.
  - `canCloneIntoChild`: Whether clone actions are valid for the selected/current folder.
- **Action fields**:
  - `type`: `create-folder`, `init-git`, or `clone`.
  - `parentPath`: Parent folder chosen for the action.
  - `name`: New child folder name when required.
  - `repositoryUrl`: Clone source URL or local source path for clone actions.
  - `status`: `idle`, `success`, `blocked`, or `failed`.
  - `message`: Result or error copy shown in the modal.
- **Validation rules**:
  - Created or cloned child names must resolve inside the selected folder.
  - `git init` is only valid for existing non-git folders.
  - Clone targets must not overwrite an existing non-empty child folder.
  - Clone actions may use local or remote git URLs, but any remote activity must execute through the local `git` binary rather than through custom network integrations.
- **Relationships**:
  - Produced by `GET /api/pick/browse` plus the new setup action routes.
  - Consumed by the setup modal and repository-open flow.
