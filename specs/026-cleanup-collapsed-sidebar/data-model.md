# Data Model: Clean Up Collapsed Sidebar

This feature does not introduce persistent business data or new API data structures. It uses existing viewer state and UI concepts.

## Entity: Sidebar Presentation State

**Represents**: Whether the left side panel is expanded or collapsed for the current viewer session.

**Fields**:

- `sidebarCollapsed`: Boolean preference indicating whether the left side panel is collapsed.
- `availablePanelFunctions`: Existing set of functions reachable when the panel is expanded or from main page controls.

**Validation rules**:

- When `sidebarCollapsed` is true, the collapsed rail exposes exactly one user action: expand navigation.
- When `sidebarCollapsed` is false, the normal left panel contents and controls are available.
- Collapsed presentation must not expose direct shortcuts for search, changed files, recent files, key documents, current folder, settings, or repository actions.

**State transitions**:

- Expanded -> Collapsed: User activates collapse navigation; normal panel contents are hidden and one reopen control is shown.
- Collapsed -> Expanded: User activates expand navigation; normal panel contents return.
- Collapsed -> Navigation change: The collapsed state may persist, but the rail remains one reopen control.

## Entity: Collapsed Reopen Control

**Represents**: The single visible control available when the left side panel is collapsed.

**Fields**:

- `accessibleName`: Clear name indicating that the control expands or opens navigation.
- `visibleAffordance`: Icon or compact visual that remains understandable in the rail.
- `operation`: Expands the left side panel in one action.

**Validation rules**:

- Must be keyboard reachable.
- Must be exposed with an assistive-technology name.
- Must not rely on clipped visible text.
- Must not share the collapsed rail with any other action controls.

## Entity: Collapsed Rail

**Represents**: The narrow left-side container shown while the side panel is collapsed.

**Fields**:

- `roleDescription`: Navigation-related landmark or label for the collapsed state.
- `childControls`: The visible interactive controls inside the rail.

**Validation rules**:

- `childControls` count must be exactly 1.
- The only child control must be the collapsed reopen control.
- The rail must remain visually stable across supported repository views and window widths.
