# Research: Manual Local File Editing

## Decision 1: Restrict file mutations to the current working tree only

- **Decision**: Allow create, update, and delete actions only when the user is operating on the repository's current working-tree branch, and block mutation attempts for historical or non-current branch views.
- **Rationale**: Existing writeable file access in GitLocal comes from the local filesystem for the current branch, while non-current branches are read through git object data. Limiting mutations to the working tree avoids the complexity and risk of trying to write into historical git snapshots and matches the feature's purpose as a lightweight local editing aid.
- **Alternatives considered**:
  - Allow edits on any viewed branch by writing to git objects or checking out branches behind the scenes: rejected because it would turn a small manual edit feature into branch-management behavior with much higher risk.
  - Allow edits whenever a file is visible in the UI: rejected because files shown from non-current branches are not directly backed by the working tree.

## Decision 2: Represent the working-tree browser from the filesystem, not tracked-git files alone

- **Decision**: For the current working tree, list repository files and directories from the filesystem inside the repository root while continuing to exclude `.git` internals and paths outside the repository boundary.
- **Rationale**: The current tree helpers derive working-tree entries only from tracked git paths, which would hide newly created untracked files immediately after creation and make deletion refresh behavior inconsistent. A filesystem-backed view better matches the user's expectation that successful local file changes appear right away.
- **Alternatives considered**:
  - Keep using tracked-git listings and wait for users to stage files externally: rejected because new files would not appear after a successful create operation, violating the spec.
  - Maintain a client-side shadow list of created files: rejected because it would drift from the true local filesystem state and complicate refresh logic.

## Decision 3: Use server-issued file revision tokens to guard update and delete actions

- **Decision**: Include a lightweight revision token with editable file reads and require that token on update and delete requests so the server can reject stale operations when the file changed on disk after it was opened.
- **Rationale**: The spec explicitly calls out the edge case where a file changes on disk during editing. A revision token derived from the current file snapshot allows the server to detect this cleanly and return a conflict response instead of silently overwriting or deleting newer content.
- **Alternatives considered**:
  - Always overwrite the file on save: rejected because it can destroy changes made by the user or an AI tool outside the app.
  - Lock files while open in the UI: rejected because it is brittle across local tools and inconsistent with GitLocal's lightweight, local-first workflow.

## Decision 4: Refresh the UI from server truth after each successful mutation instead of relying on optimistic local state

- **Decision**: Treat the server as the source of truth after create, update, and delete actions by invalidating file and tree queries, clearing or redirecting stale selections when needed, and rebuilding any cached directory children from fresh responses.
- **Rationale**: The file tree currently caches expanded directory children in component state, and the content panel fetches file content through React Query. Server-truth refresh keeps the UI aligned with the actual filesystem state without inventing a second local mutation model.
- **Alternatives considered**:
  - Optimistically patch file tree and content state in multiple UI components: rejected because it increases coupling and makes correctness harder, especially for nested directories and deletes.
  - Force a full page reload after every mutation: rejected because it would be disruptive and out of step with the existing SPA behavior.
