# Data Model: README Logo and Markdown Toolbar Polish

This feature does not introduce persistent data, server-side state, or new domain entities.

## UI State Concepts

### README Logo Reference

- **Purpose**: Points README renderers to the GitLocal logo.
- **Fields**:
  - `path`: repository-relative image path used in README markup
  - `assetExists`: whether the referenced file is committed in the repository
- **Validation rules**:
  - Path must be repository-relative.
  - Path must not depend on generated build output.
  - Referenced asset must exist in the repository.

### Markdown Action Toolbar

- **Purpose**: Presents rendered Markdown actions in a compact row.
- **Fields**:
  - `findControlVisible`: whether file-level find is available for the current file
  - `shareActionsVisible`: whether Markdown share actions are available for the current rendered Markdown file
  - `helpTextVisible`: whether redundant sharing helper copy is visible
  - `controlsAccessible`: whether controls have labels or accessible names
- **Validation rules**:
  - Rendered Markdown views must expose find and share actions in the same toolbar region.
  - `helpTextVisible` must be false for the sentence "Sharing uses the saved Markdown content."
  - Controls must remain keyboard and screen-reader identifiable.
  - Non-Markdown views must not gain Markdown-only share actions.

## State Transitions

```text
Readable non-Markdown file loaded
  -> file-level find is available
  -> Markdown share actions are not shown

Rendered Markdown file loaded
  -> file-level find is available
  -> Markdown share actions are shown in the same toolbar row
  -> redundant saved-content helper sentence is hidden

Window width constrained
  -> toolbar may wrap or compact cleanly
  -> all primary controls remain accessible
```
