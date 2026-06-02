# Data Model: Native App Shortcuts

This feature does not introduce persistent data entities or a database. The relevant state is transient command/session state.

## Native Command

Represents a user-invoked app command from a menu item or keyboard shortcut.

**Fields**:

- `command`: One of Copy, Cut, Paste, Find, Refresh.
- `source`: Menu action or keyboard shortcut.
- `enabledState`: Whether the command can be handled by the currently focused content.
- `targetContext`: Preview content, editable field, app view, modal/dialog, or no eligible target.

**Validation rules**:

- Copy may operate on selectable preview or editable text.
- Cut and Paste may operate only on editable text contexts.
- Find targets preview content only.
- Refresh targets the current app view.

## Preview Find Session

Represents an active search within the currently visible preview panel.

**Fields**:

- `query`: User-entered search text.
- `matchCount`: Number of matches in preview content.
- `activeMatchIndex`: Current match position when matches exist.
- `previewTarget`: The currently visible rendered or code preview.

**Validation rules**:

- Matches must exclude sidebar, toolbar, menu, modal, and navigation text.
- Closing Find must not change selected repository or file.
- When preview content changes, stale matches must be cleared or recomputed.

**State transitions**:

```text
inactive -> active(query empty)
active(query empty) -> active(matches computed)
active(matches computed) -> active(active match changed)
active -> inactive
active -> inactive/recomputed when selected preview changes
```

## Refresh Session

Represents one request to reload the current repository view from local state.

**Fields**:

- `requestedAt`: When the user invoked Refresh.
- `currentRepository`: Repository or folder context before refresh.
- `currentFile`: Selected file before refresh, when present.
- `resultState`: Preserved current file, preserved repository with different selection, empty state, or error state.

**Validation rules**:

- Refresh must preserve current repository and selected file when still available.
- If the selected file no longer exists, the app must show a coherent available state.
- Concurrent refresh requests must resolve to one coherent current state.
