# UI Contract: Markdown Toolbar and README Logo

## README Logo

### Contract

When the README is rendered in the primary hosted repository view or from a local checkout, the GitLocal logo appears above the status badges.

### Required Observables

- README markup references a repository-tracked logo asset.
- The referenced logo asset exists in the repository.
- The logo has meaningful alternate text.
- The README does not rely on generated build output for the logo.

## Rendered Markdown Toolbar

### Contract

When a rendered Markdown file is open, the file-level find control and Markdown share actions are available from the same toolbar row or toolbar region. A dedicated sharing-only row is not displayed.

### Required Controls

- Find in File
- Copy rendered/text fallback action where already available
- Share action where supported by the environment
- Save/download fallback actions where already available

### Removed Copy

The visible sentence below the share buttons must not appear:

```text
Sharing uses the saved Markdown content.
```

### Accessibility Requirements

- Every action remains reachable by keyboard.
- Every icon-only control has an accessible name.
- Removing helper text must not remove necessary accessible labels, live status updates, or action-result messages.
- The toolbar must not visually overlap the Markdown document content.

## Non-Markdown Views

### Contract

Readable non-Markdown files keep their existing file-level find behavior and do not show Markdown-only share actions.

## Responsive Behavior

At representative desktop and narrow-window widths:

- Controls remain visible or accessible.
- Text is not clipped in a way that hides the action meaning.
- The toolbar may wrap cleanly, but it must not create a separate dedicated sharing row that recreates the removed layout.
