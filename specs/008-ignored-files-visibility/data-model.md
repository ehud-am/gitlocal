# Data Model: Ignored Local File Visibility

## Browse Entry

- **Description**: A single repository item returned for current working-tree browsing and rendered in the left tree or content-panel directory list.
- **Fields**:
  - `path`: Repository-relative path for the item.
  - `name`: Display name derived from the final path segment.
  - `type`: `file` or `dir`.
  - `localOnly`: Whether the item is visible only in the local working tree and is not currently part of the tracked remote-facing repository state.
- **Validation rules**:
  - `path` must remain inside the opened repository boundary.
  - `localOnly` is `true` only for current working-tree items that match ignore rules.
  - Repository internals such as `.git` must never be returned as browse entries.
  - Ignored directories may appear as a single `dir` entry even when their descendants are also ignored.
- **Relationships**:
  - Returned by the tree browsing contract.
  - Consumed by the file tree and the content-panel directory list.

## Search Match

- **Description**: A repository item returned from working-tree or historical search.
- **Fields**:
  - `path`: Repository-relative match path.
  - `type`: `file` or `dir`.
  - `matchType`: `name` or `content`.
  - `line`: Matching line number for content matches when available.
  - `snippet`: Short matching text for content matches when available.
  - `localOnly`: Whether the matched item is a visible ignored local item.
- **Validation rules**:
  - Current working-tree searches may return `localOnly: true`.
  - Non-current branch or historical searches always return `localOnly: false`.
  - `snippet` and `line` remain optional and are present only for content matches.
- **Relationships**:
  - Produced by the search handler.
  - Consumed by the quick-search UI and any future content-search UI using the same response shape.

## Repository Summary

- **Description**: Lightweight repository metadata used to decide initial landing behavior and other top-level UI state.
- **Fields**:
  - `name`: Repository display name.
  - `path`: Opened repository path.
  - `currentBranch`: Current working-tree branch name.
  - `isGitRepo`: Whether the opened folder is a valid git repository.
  - `pickerMode`: Whether the app is in repository-picker mode.
  - `version`: Running application version.
  - `hasCommits`: Whether the repository has at least one reachable commit.
  - `rootEntryCount`: Count of immediate visible root entries used for landing-state decisions.
- **Validation rules**:
  - `rootEntryCount` includes visible ignored local items at the repository root.
  - `rootEntryCount` excludes `.git` and hidden dotfiles that are still intentionally omitted from the landing-state count.
- **Relationships**:
  - Returned by the repository info contract.
  - Used by the app shell and content panel to avoid false empty states.

## Local-Only Presentation State

- **Description**: The presentation metadata that keeps the local-only explanation consistent wherever an ignored item is shown or selected.
- **Fields**:
  - `label`: Short visible copy presented to users, expected to communicate "Local only".
  - `supportingText`: Optional explanatory copy for surfaces with more room, clarifying that the item is not part of the remote-facing repository state.
  - `emphasisLevel`: Lightweight visual treatment that distinguishes the item without presenting it as an error.
- **Validation rules**:
  - The label must be understandable without assuming git expertise.
  - The cue must remain readable beside normal browse metadata and actions.
  - Selected ignored items continue showing the cue in their active context.
- **Relationships**:
  - Derived from `BrowseEntry.localOnly` and `SearchMatch.localOnly`.
  - Consumed by tree, folder-list, search-result, and active-item presentation components.
