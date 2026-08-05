# UI Contract: Multi-Pane Workspace

## Scope

This contract defines the user-visible behavior of the workspace's tabs, tiled layouts, and terminal panes. It applies to both GitLocal distributions (npm-served browser UI and the macOS native app wrapper), since both host the same React UI.

## Opening And Managing Tabs

Given the workspace, the UI must:

- Allow opening a file as a new tab in addition to (not replacing) any already-open tabs.
- Show all open tabs in a tab strip, with the active tab visually distinguished.
- Switch the active/visible pane immediately when a different tab is selected, leaving all other open tabs open in the background.
- Allow closing any individual tab without affecting other open tabs; if the closed tab was active, another remaining tab becomes active automatically.
- Keep the tab strip usable when many tabs are open (20+): via horizontal scrolling and/or an overflow affordance, never by overlapping or clipping content unreadably.
- Show a clear "file no longer available" state (not an error or blank pane) when a tab's underlying file has been deleted or moved.

## Switching Layouts

Given one or more open panes, the UI must:

- Offer a layout control with at least four choices: Tabbed (default), 2-column, 4-tile, 6-tile.
- On selecting a tiled layout, render that many panes simultaneously in a grid, each independently scrollable/usable.
- Preserve every open pane across any layout switch — no pane is closed, reset, or loses its state as a side effect of changing layout (tabbed → tiled, tiled → tabbed, or between tiled presets).
- Show an empty/"open a file" placeholder in any tile that has no pane assigned to it (fewer open panes than the layout's capacity).
- Keep any panes beyond a tiled layout's capacity reachable (e.g. via a tab strip or overflow list shown alongside the grid), never closed or hidden without access.
- Degrade to a usable arrangement on narrow/small viewports where a 4-tile or 6-tile grid cannot reasonably render side by side (e.g. stacking, or limiting which layouts are offered), rather than rendering illegibly small tiles.

## Terminal Panes

Given the workspace, the UI must:

- Allow opening one or more new terminal panes, each starting a live shell session scoped to the current repository's working directory.
- Stream a terminal pane's output live, including continuous/long-running output, with input the user types directed only at that pane's own session.
- Keep every open terminal pane's session, input, and output fully independent of every other open terminal pane.
- Allow terminal panes to be tabs or occupy tiles in any layout, mixed freely alongside content panes (e.g. a terminal tile next to a code tile).
- Terminate the underlying shell session (and any process running in it) when a terminal pane is closed by the user.
- Show a clear "session ended" state (not a frozen or blank pane) when a terminal's shell process exits or crashes on its own.
- Keep a running terminal session alive and unaffected across a layout switch.

## Empty And Boundary States

- Closing the last remaining open pane returns the workspace to a clear empty/default state (e.g. "open a file to get started"), not an error or blank screen.
- Opening the same file into more than one pane at once is allowed; both panes reflect the same underlying file and stay in sync with on-disk changes, matching existing single-pane file behavior.

## Non-Regression For Existing Single-File Behavior

With exactly one pane open (the default state, e.g. immediately after opening the app), the workspace must behave exactly as it does today: the same single-file view, raw/pretty toggle, inline editing, unsaved-changes confirmation, and revision-conflict handling, with no new UI elements required to use it (the tab strip and layout switcher are additive, not obstructive, for single-file use).

## Persistence

- Open panes, the selected layout mode, and all terminal sessions do not persist across a page reload or app restart (FR-014); each fresh session starts at the default single-file view.
- This is unchanged from — and consistent with — today's existing behavior of restoring only the single most-recently-viewed file on reload.

## Accessibility

The tab strip and layout switcher must:

- Be keyboard-navigable (tab focus order, activation via keyboard, closable via keyboard).
- Have accessible names identifying tabs, the active tab, and the layout control's current selection.
- Be screen-reader usable: tab count, active tab, and layout mode must be discoverable, not just visually indicated.

Terminal panes must:

- Have an accessible name identifying them as a terminal/shell session distinct from content panes.
- Clearly expose their `connectionState` (connecting/connected/ended/error) in a way assistive technology can discover, not only via visual styling.

## Regression Samples

Implementation must include coverage for:

- Opening 2+ files as tabs; switching; closing one tab while others remain open.
- Opening a tab for a file that is then deleted/moved; selecting that tab shows the unavailable state.
- Switching between Tabbed Mode and each tiled layout with 3+ panes open; confirming no panes are lost.
- Fewer open panes than tile capacity (empty placeholder tiles) and more open panes than tile capacity (overflow access).
- Opening 2+ terminal panes and confirming independent input/output/lifecycle.
- Closing a terminal pane (session terminated) vs. a terminal's shell exiting on its own ("session ended" state) vs. a dropped connection (error state) — three distinct, distinguishable outcomes.
- A terminal pane and a content pane together in a tiled layout, with the terminal actively streaming output, per SC-005's agent-monitoring scenario.
- Single-pane use (open the app, view/edit one file) exercising no regression against pre-existing ContentPanel test coverage.
