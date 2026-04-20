# Setup Modal Bootstrap Contract

## Setup Entry Contract

- Missing-repository startup and explicit "open parent/setup" actions present the repository chooser as a true modal instead of a dedicated full-screen page.
- When the app has no open repository, the setup modal is the primary required surface.
- When the app already has an open repository and the user moves to setup, the modal can be dismissed back to the active repository state.
- The modal traps focus, exposes meaningful dialog labels, and supports keyboard navigation.

## Browse Contract

- `GET /api/pick/browse` remains the folder-browse source and adds current-folder capability metadata:
  - `isGitRepo`
  - `canOpen`
  - `canCreateChild`
  - `canInitGit`
  - `canCloneIntoChild`
- The response still includes:
  - `currentPath`
  - `parentPath`
  - `homePath`
  - `roots`
  - `entries`
  - `error`
- Browse entries remain directory-only and continue distinguishing git repositories from normal folders.

## Create Folder Contract

- `POST /api/pick/create-folder` creates a child folder inside the selected setup location.
- Request body:
  - `parentPath`
  - `name`
- Success behavior:
  - Returns `ok: true`, the created `path`, and a success `message`.
- Failure behavior:
  - Blocks empty names, invalid names, paths outside the selected parent, and existing conflicting child paths.

## Git Init Contract

- `POST /api/pick/init` initializes the selected non-git folder as a git repository.
- Request body:
  - `path`
- Success behavior:
  - Returns `ok: true`, the initialized repository `path`, and a success `message`.
  - The resulting path becomes eligible for immediate open in GitLocal.
- Failure behavior:
  - Blocks requests against missing folders, already-git folders, or folders the server cannot initialize.

## Clone Contract

- `POST /api/pick/clone` clones into a new child folder beneath the selected setup location.
- Request body:
  - `parentPath`
  - `name`
  - `repositoryUrl`
- Success behavior:
  - Returns `ok: true`, the cloned repository `path`, and a success `message`.
- Failure behavior:
  - Blocks empty URLs, invalid child names, conflicting child targets, and clone failures surfaced from the local git executable.
- Governance note:
  - Clone execution is always user-initiated from the modal.
  - Local-path and `file://` clones remain fully local.
  - Remote clone URLs are allowed only through the locally installed `git` executable and must not be replaced with custom remote-service API calls.

## Open Repository Contract

- `POST /api/pick` remains the final repository-open action.
- After a successful open, the modal closes and the app refreshes into the selected repository context.

## Test Coverage Contract

- Backend tests must cover:
  - browse capability flags for git and non-git folders;
  - create-folder validation and success cases;
  - `git init` success/failure flows;
  - clone validation, local clone success, and clone error reporting.
- UI tests must cover:
  - modal accessibility and focus management;
  - inline create-folder, init, and clone flows;
  - open/cancel transitions between repository view and setup modal;
  - inline error handling without losing setup context.
