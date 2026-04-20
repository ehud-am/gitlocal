# Research: Shadcn GitHub-Style Browser Refresh

## Decision 1: Adopt an app-wide shadcn/Tailwind foundation with GitHub-style theme tokens

- **Decision**: Introduce Tailwind CSS plus shadcn/ui as the shared UI foundation for the whole app, backed by GitHub-like light and dark CSS variables and a persisted app-wide theme preference.
- **Rationale**: The request is for a whole-app migration, not a one-panel patch. A shadcn/Tailwind foundation provides reusable primitives for buttons, selects, dialogs, inputs, dropdowns, and sheet/modal structures while still allowing GitLocal-specific GitHub-inspired theming through local variables.
- **Alternatives considered**:
  - Keep the current global `App.css` and only restyle selected screens: rejected because it would create two design systems and make the whole-app migration incomplete.
  - Use shadcn component code without Tailwind utilities: rejected because it would fight the intended composition model and add maintenance friction.
  - Support only a light theme: rejected because the user explicitly asked for dark-theme support.

## Decision 2: Extend existing repository metadata routes instead of inventing a parallel context API

- **Decision**: Keep `GET /api/info` and `GET /api/branches` as the primary metadata sources, but extend them with richer git context and branch-option metadata, then add a dedicated branch-switch mutation endpoint for checkout operations.
- **Rationale**: The current app already boots off `/api/info` and `/api/branches`. Extending those payloads keeps the data flow recognizable, reduces client fetch fragmentation, and isolates the truly new behavior in a single mutation route.
- **Alternatives considered**:
  - Create a separate repo-context endpoint just for the right-panel header: rejected because it would duplicate metadata already conceptually owned by `/api/info`.
  - Keep the current flat branch list and infer local/remote behavior in the client: rejected because the server already knows the repository state and should own branch/ref normalization.
  - Handle branch switching entirely in the client: rejected because git checkout, commit, and discard operations belong on the local server side.

## Decision 3: Make branch switching a server-authoritative two-stage workflow

- **Decision**: Model branch switching as a mutation that can either complete immediately on a clean working tree or return a structured confirmation-required payload when tracked or untracked changes would block or be lost. The commit path stages all changes and requires a message; the discard path reverts tracked/staged changes first and only offers untracked deletion if that deletion is still required.
- **Rationale**: This matches the user request for commit, lose, or cancel behavior while avoiding silent destructive actions. A server-authoritative workflow also centralizes git error handling for checkout conflicts, remote-tracking branch creation, and commit failures.
- **Alternatives considered**:
  - Attempt checkout directly and parse git stderr ad hoc in the client: rejected because it would create inconsistent UX and brittle error handling.
  - Auto-stash before switching: rejected because the user asked for commit/discard/cancel, not hidden stash management.
  - Treat tracked and untracked discards the same: rejected because deleting untracked files is materially riskier.

## Decision 4: Keep `..` as a synthetic UI row and make README lookup folder-aware

- **Decision**: Keep `GET /api/tree` focused on actual repository items, synthesize the `..` navigation row in the client, and extend README discovery so the client can request the README for the currently viewed folder and render it below the folder list.
- **Rationale**: The parent row is a navigation affordance, not repository content, so it should not pollute tree/search contracts. README lookup, however, depends on current-vs-historical branch behavior and should remain server-authoritative.
- **Alternatives considered**:
  - Inject `..` into `GET /api/tree`: rejected because it would blur repository data with UI-only affordances and complicate tests for tree consumers.
  - Create a composite folder endpoint that returns both entries and README content: rejected because the current tree/file/readme endpoints already cover the needed pieces with less churn.
  - Continue using root-only README discovery: rejected because the request covers folder content views, not just repository landing.

## Decision 5: Replace picker-first startup with a modal setup/bootstrap flow

- **Decision**: Rework the current picker screen into an app-owned setup modal that can browse folders, open repositories, create a child folder, initialize git in the selected folder, and clone into a new child folder.
- **Rationale**: The request explicitly calls for a true modal and a more capable setup flow. Extending the existing `/api/pick` family keeps repository-open behavior familiar while allowing setup/bootstrap actions to live beside browse/open actions.
- **Alternatives considered**:
  - Keep the picker as a standalone page and only add more buttons: rejected because it does not satisfy the true-modal requirement and would keep setup visually separate from the rest of the app.
  - Use native OS folder dialogs for creation/init/clone: rejected because the feature needs structured bootstrap actions, not just path selection.
  - Keep setup limited to opening existing repositories: rejected because it fails the requested create/init/clone workflows.

## Decision 6: Allow remote git actions only through the local git executable

- **Decision**: Keep clone and any future remote-sync actions inside a narrow remote-git lane: they must be user-initiated and must execute through the locally installed `git` binary, while the rest of the app remains fully usable in local-only mode.
- **Rationale**: This matches the updated constitution. It preserves GitLocal's local-first identity while allowing repositories with remotes to participate in remote workflows without introducing custom network integrations.
- **Alternatives considered**:
  - Add direct HTTP/API integrations for repository hosting services: rejected because the constitution allows only remote activity that goes through local Git commands.
  - Remove clone from the plan entirely: rejected because it would ignore an explicit requirement.
  - Limit clone support to `file://` or local-path sources from the start: rejected because the updated constitution now allows remote Git activity through local Git commands.
