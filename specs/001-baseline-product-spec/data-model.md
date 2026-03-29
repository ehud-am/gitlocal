# Data Model: Current Product Baseline

## Overview

The current product does not maintain a persistent domain database. Its working model is a set of runtime view objects derived from the selected local repository and the currently selected branch.

## Entities

### Repository Session

- **Purpose**: Represents the active repository context for the running GitLocal process.
- **Fields**:
  - `name`: Human-readable repository name shown in the header.
  - `path`: Absolute or user-supplied local repository path.
  - `currentBranch`: Branch name used as the default branch context when available.
  - `isGitRepo`: Whether the selected path resolves to a valid git working tree.
  - `pickerMode`: Whether the product is waiting for the user to choose a repository.
- **Validation rules**:
  - `path` may be empty only when the product starts in picker mode.
  - `isGitRepo` must be false for missing or invalid repositories.
  - `currentBranch` may be empty for valid repositories with no resolved branch yet.
- **State transitions**:
  - `pickerMode -> loaded`: A valid picker submission sets the repository path and reloads the UI.
  - `loaded -> error view`: An invalid repository path results in a non-repository error state.

### Branch View

- **Purpose**: Represents a branch that can be displayed in the viewer.
- **Fields**:
  - `name`: Branch identifier shown in the selector.
  - `isCurrent`: Whether this branch is the current branch for the loaded repository metadata.
- **Validation rules**:
  - Branch names must be unique within the selector list after local/remote deduplication.
  - At most one branch should be marked current in a populated branch list.
- **Relationships**:
  - One Repository Session can expose many Branch View entries.

### Commit Summary

- **Purpose**: Represents one recent commit shown in the sidebar history list.
- **Fields**:
  - `hash`: Full commit identifier.
  - `shortHash`: Abbreviated commit identifier for quick scanning.
  - `author`: Commit author display name.
  - `date`: Commit timestamp in a machine-readable format.
  - `message`: Commit subject line.
- **Validation rules**:
  - `shortHash` is derived from `hash`.
  - Commit lists are bounded to a limited recent-history window in the default view.
- **Relationships**:
  - Many Commit Summary entries belong to the selected Branch View.

### Repository Tree Node

- **Purpose**: Represents one visible folder or file in the repository browser.
- **Fields**:
  - `name`: Display label for the node.
  - `path`: Repository-relative path.
  - `type`: Either `dir` or `file`.
- **Validation rules**:
  - Root requests return only immediate children, not recursive descendants.
  - Nodes are grouped with directories before files and sorted alphabetically within each group.
- **Relationships**:
  - Tree nodes form a hierarchy within a Repository Session and selected Branch View.

### File View

- **Purpose**: Represents the selected file and its presentation state in the content panel.
- **Fields**:
  - `path`: Repository-relative file path.
  - `content`: File payload in text, base64 image data, or empty content for binary placeholders.
  - `encoding`: Content transfer mode used by the viewer.
  - `type`: Presentation category such as markdown, text, image, or binary.
  - `language`: Optional display hint for syntax-aware rendering.
- **Validation rules**:
  - `path` is required for a file fetch.
  - Binary content uses an empty payload with a placeholder presentation.
  - Image content uses base64 payloads for inline display.
- **Relationships**:
  - A File View is selected from a Repository Tree Node within a Branch View.

### Picker Submission

- **Purpose**: Represents a user request to load a repository from the picker screen.
- **Fields**:
  - `path`: User-entered local filesystem path.
  - `ok`: Whether the request was accepted.
  - `error`: User-facing failure message when the request is rejected.
- **Validation rules**:
  - `path` must be non-empty after trimming.
  - The path must exist locally and resolve to a git repository for a successful load.
- **State transitions**:
  - `submitted -> accepted`: Repository session is updated.
  - `submitted -> rejected`: Error message is shown inline and no repository change occurs.

## Relationships Summary

- One Repository Session has many Branch View entries.
- One Repository Session exposes a tree of Repository Tree Node entries for the selected branch.
- One Branch View has many Commit Summary entries.
- One Repository Tree Node of type `file` can produce one File View at a time in the content area.
- One Picker Submission can replace the active Repository Session when validation succeeds.
