# UI Contract: Collapsed Left Side Panel

## Scope

This contract defines the user-visible behavior of the collapsed left side panel in GitLocal's main repository viewer.

## Contract Requirements

### Collapsed State

When the left side panel is collapsed:

- The collapsed navigation area is visible.
- Exactly one interactive control appears inside the collapsed navigation area.
- The single control expands or opens the left side panel.
- No collapsed shortcuts appear for search, changed files, recent files, key documents, current folder, settings, or repository actions.
- No control appears as a clipped single-letter label.

### Expand Action

When the user activates the single collapsed control:

- The left side panel expands in one action.
- The repository file tree and normal left-panel controls are available again.
- Existing search and repository workflows remain reachable from their normal locations.

### Accessibility

The collapsed reopen control must:

- Be reachable by keyboard navigation.
- Have an accessible name that communicates the expand/open navigation action.
- Be operable without pointer input.
- Preserve focus in a visible, usable location after the panel changes state.

### Visual Stability

The collapsed rail must:

- Avoid overlapping primary content.
- Avoid clipped text labels.
- Remain stable when moving between common repository views.
- Remain understandable at narrow desktop widths.

## Regression Test Expectations

Automated UI tests should verify:

- Collapsing the main viewer panel renders one button in the collapsed navigation area.
- The one button is the expand/open navigation control.
- Queries for former collapsed shortcuts are absent.
- Activating the expand/open navigation control restores the repository file tree.
- The picker collapsed rail continues to satisfy the same one-button pattern.
