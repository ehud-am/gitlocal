# Feature Specification: Multi-Pane Workspace

**Feature Branch**: `032-multi-pane-workspace`
**Created**: 2026-08-05
**Status**: Draft
**Input**: User description: "1. Create an option to open 1 or more tabs. each can view a different file. 2. have an easy way to arrange these file in 2 columns, 4 tiles, and 6 tiles. 3. Ability to open one or more terminal windows. 4. Ability to open one or more file windows."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open multiple files as tabs (Priority: P1)

A user browsing a repo wants to keep more than one file open at once — for example a source file and the README it relates to — without losing their place in either. They open a file, then open a second file as a new tab alongside it, and can switch between open tabs without re-navigating the folder tree each time.

**Why this priority**: This is the foundational capability everything else in this feature builds on. Without the ability to hold multiple open files at once, there is nothing to arrange or tile.

**Independent Test**: Open two different files as separate tabs, confirm both remain open and switching between them preserves each file's scroll position/view state, and confirm closing one tab leaves the other open.

**Acceptance Scenarios**:

1. **Given** a file is open in the workspace, **When** the user opens a second file "as a new tab" (rather than replacing the current view), **Then** both files remain open and accessible as separate tabs.
2. **Given** two or more tabs are open, **When** the user selects a tab, **Then** that file's content becomes the active view and other open tabs remain open in the background.
3. **Given** two or more tabs are open, **When** the user closes one tab, **Then** the remaining tab(s) stay open and one of them becomes active.
4. **Given** a tab for a file that has since been deleted or moved on disk, **When** the user selects that tab, **Then** the system shows a clear "file no longer available" state instead of an error or blank pane.

---

### User Story 2 - Arrange open panes into a tiled layout (Priority: P2)

A user with several tabs open wants to see more than one at a time — for example comparing two files side by side — instead of switching back and forth. They pick a layout (2-column, 4-tile, or 6-tile) and the workspace rearranges the open panes into that grid so multiple panes are visible simultaneously.

**Why this priority**: Delivers the comparison/multi-view value on top of User Story 1; depends on multiple tabs already being open but is a distinct, separately valuable capability (viewing many at once vs. switching between many).

**Independent Test**: With 3+ tabs open, switch from single/tabbed view to the 2-column layout and confirm two panes render side by side; switch to 4-tile and 6-tile and confirm the corresponding number of panes render simultaneously; switch back to tabbed view and confirm no panes or content are lost.

**Acceptance Scenarios**:

1. **Given** two or more panes are open, **When** the user selects the 2-column layout, **Then** the workspace displays two panes side by side, each independently scrollable.
2. **Given** four or more panes are open, **When** the user selects the 4-tile layout, **Then** the workspace displays four panes in a grid simultaneously.
3. **Given** six or more panes are open, **When** the user selects the 6-tile layout, **Then** the workspace displays six panes in a grid simultaneously.
4. **Given** fewer open panes than a selected layout's capacity (e.g. 2 panes open but 4-tile selected), **When** that layout is applied, **Then** the remaining tiles show an empty/"open a file" placeholder rather than an error.
5. **Given** more open panes than a selected layout's capacity (e.g. 8 panes open but 4-tile selected), **When** that layout is applied, **Then** the layout shows the capacity it supports and the remaining open panes stay accessible (e.g. via a tab strip or overflow list) rather than being closed or lost.
6. **Given** a tiled layout is active, **When** the user switches back to single/tabbed view, **Then** all previously open panes are still open and available as tabs.

---

### User Story 3 - Open one or more terminal panes (Priority: P3)

A user needs to run a command against the repo (e.g. `git status`, a test command) without leaving the app. They open a terminal pane, which behaves like any other pane — it can be viewed alone, opened alongside file panes as a tab, or included in a tiled layout — and they can open additional terminal panes (e.g. one per task) as needed.

**Why this priority**: Adds a distinct, higher-complexity pane type (a live shell) on top of the tab/tile mechanics established by Stories 1-2. It is independently valuable but depends on the pane/tab/tile framework already existing.

**Independent Test**: Open a terminal pane, run a simple command, confirm output renders; open a second terminal pane and confirm both run independent sessions; close one and confirm the other's session and output are unaffected.

**Acceptance Scenarios**:

1. **Given** the workspace is open, **When** the user opens a new terminal pane, **Then** a live shell session starts, scoped to the current repository's working directory.
2. **Given** a terminal pane is open, **When** the user runs a command, **Then** the command's output streams into that pane.
3. **Given** two or more terminal panes are open, **When** the user runs commands in each, **Then** each terminal's session, input, and output are fully independent of the others.
4. **Given** a terminal pane is open, **When** the user closes its tab/tile, **Then** the underlying shell session is terminated and any running process in it is stopped.
5. **Given** one or more terminal panes are open, **When** the user arranges panes into a 2-column, 4-tile, or 6-tile layout, **Then** terminal panes can occupy tiles alongside file panes in the same layout.

---

### User Story 4 - Open one or more dedicated file browser panes (Priority: P4)

A user working across a tiled layout wants a pane dedicated to navigating the repo's folder tree — distinct from the content panes showing individual file contents — so they can browse and open files into other panes without losing their current tiled arrangement. They open one or more file browser panes, which can also be tiled alongside content and terminal panes.

**Why this priority**: Rounds out the pane system with a navigation-focused pane type. It is the least essential of the four capabilities on its own (the existing sidebar already provides folder navigation) but becomes valuable once tiling exists, since it lets navigation live inside the tiled layout itself rather than only in the fixed sidebar.

**Independent Test**: Open a file browser pane, navigate the folder tree within it, open a file from it into another pane, and confirm the file browser pane's own navigation state persists independently of the content pane it opened.

**Acceptance Scenarios**:

1. **Given** the workspace is open, **When** the user opens a new file browser pane, **Then** a pane showing the repository's folder tree appears, independent of the existing fixed sidebar.
2. **Given** a file browser pane is open, **When** the user selects a file within it, **Then** that file opens in a content pane (a new tab, or a target tile if one is designated) without closing the file browser pane.
3. **Given** two or more file browser panes are open, **When** the user navigates in one, **Then** the other's navigation state (current folder, scroll position) is unaffected.
4. **Given** one or more file browser panes are open, **When** the user arranges panes into a 2-column, 4-tile, or 6-tile layout, **Then** file browser panes can occupy tiles alongside content and terminal panes in the same layout.

---

### Edge Cases

- What happens when the user tries to open more tabs than reasonably fit (e.g. 20+)? The tab strip must remain usable (e.g. via scrolling or overflow) rather than becoming unusable or overlapping content.
- What happens if the user closes the last remaining open pane? The workspace should return to a clear empty/default state (e.g. "open a file to get started") rather than an error or blank screen.
- What happens when a user switches layouts (e.g. 2-column to 6-tile) while a terminal pane has an actively running, long-lived command? The running command/session must survive the layout change unaffected.
- What happens on narrow/small viewport sizes where a 4-tile or 6-tile layout cannot reasonably render side by side? The system must degrade to a usable arrangement (e.g. stacked, or restrict which layouts are offered) rather than rendering illegibly small tiles.
- What happens when the same file is opened into more than one pane at once (e.g. two file panes both showing `README.md`)? Both panes should reflect the same underlying file and stay in sync with on-disk changes/edits, consistent with existing single-pane file behavior.
- What happens when a terminal pane's shell process exits or crashes on its own (not via user-initiated close)? The pane must show a clear "session ended" state rather than a frozen or blank pane.
- What happens to open panes, layout selection, and terminal sessions when the user reloads the page or the app restarts? See Assumptions — this needs explicit product direction on what, if anything, persists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the user to open a file "as a new tab" in addition to the existing single-file view, so multiple files can be open at once.
- **FR-002**: System MUST allow switching between open tabs, with the selected tab's file becoming the active/visible view.
- **FR-003**: System MUST allow closing an individual open tab without affecting other open tabs.
- **FR-004**: System MUST provide a layout control offering at least three tiled arrangements — 2-column, 4-tile, and 6-tile — in addition to the existing single/tabbed view.
- **FR-005**: When a tiled layout is selected, the system MUST render that many panes simultaneously, each independently viewable and scrollable.
- **FR-006**: System MUST preserve all open panes when switching between tabbed view and any tiled layout (no pane is closed or loses state as a side effect of changing layout).
- **FR-007**: System MUST allow the user to open one or more terminal panes, each running an independent live shell session scoped to the current repository's working directory.
- **FR-008**: System MUST stream a terminal pane's command output live and accept user input directed at that specific session.
- **FR-009**: System MUST terminate a terminal pane's underlying shell session (and any process it is running) when that pane is closed.
- **FR-010**: Terminal panes MUST be eligible to appear as tabs or occupy tiles in any of the layouts defined in FR-004, alongside file content panes.
- **FR-011**: System MUST allow the user to open one or more dedicated file browser panes showing the repository folder tree, independent of the existing fixed sidebar.
- **FR-012**: Selecting a file within a file browser pane MUST open that file into a content pane without closing the file browser pane itself.
- **FR-013**: File browser panes MUST be eligible to appear as tabs or occupy tiles in any of the layouts defined in FR-004, alongside content and terminal panes.
- **FR-014**: System MUST handle a tiled layout with fewer open panes than the layout's tile capacity by showing an empty/"open a file" placeholder in unused tiles, not an error.
- **FR-015**: System MUST handle more open panes than a selected layout's tile capacity by keeping the excess panes accessible (e.g. via tabs/overflow) rather than closing them.
- **FR-016**: System MUST continue to support all existing single-file, single-view behavior unchanged for users who never open a second tab or pane.

*Marking unclear requirements:*

- **FR-017**: System MUST distinguish "tabs" (User Story 1) from "file windows" (User Story 4) in the interaction model exposed to the user [NEEDS CLARIFICATION: the source request lists "open 1+ tabs, each viewing a different file" and, separately, "ability to open one or more file windows" as two distinct capabilities. This spec currently interprets the former as content tabs/panes showing file contents, and the latter as a distinct dedicated file-browser/navigation pane type. Confirm this is the intended distinction, versus "file windows" simply meaning the same content panes once they are tiled.]
- **FR-018**: Persistence of open panes/layout/terminal sessions across page reloads or app restarts is [NEEDS CLARIFICATION: not specified by the source request — should open tabs and the selected layout survive a reload? Should terminal sessions be restored, or always start fresh?]

### Key Entities

- **Pane**: A single viewable unit within the workspace. Has a type (Content Pane, Terminal Pane, or File Browser Pane) and can be displayed either as one tab among several (tabbed view) or as one tile within a tiled layout.
- **Content Pane**: A pane bound to one file, showing that file's content using the existing per-file-type viewer (matches today's single-file view).
- **Terminal Pane**: A pane bound to one live shell session scoped to the repository's working directory.
- **File Browser Pane**: A pane showing the repository's folder tree for navigation, independent of the fixed sidebar; selecting a file within it opens a Content Pane.
- **Workspace Layout**: The current arrangement mode for all open panes — tabbed (one active pane at a time) or one of the tiled presets (2-column, 4-tile, 6-tile).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can have at least 6 panes open at once (any mix of content, terminal, and file browser panes) without errors or degraded responsiveness.
- **SC-002**: A user can switch between tabbed view and any tiled layout in one action, with all open panes preserved every time.
- **SC-003**: A user can go from "single file open" to "comparing two files side by side" in two actions or fewer (open second file as tab, select 2-column layout).
- **SC-004**: Each open terminal pane behaves as a fully independent session — commands, output, and process lifecycle in one terminal pane never affect another.
- **SC-005**: 100% of existing single-file viewing/editing behavior is unaffected for users who do not use tabs, tiling, terminal panes, or file browser panes (zero regressions in existing test suite).

## Assumptions

- "Tabs" (User Story 1) and "file windows" (User Story 4) are treated as two distinct concepts per the FR-017 clarification note above; this spec proceeds on that interpretation but flags it for confirmation before planning.
- The 2-column, 4-tile, and 6-tile layouts are fixed presets (not a freeform/resizable grid); exact tile grid shape for 6-tile (e.g. 3x2 vs 2x3) is a design/plan-level decision, not specified here.
- Terminal panes provide direct shell access to the local machine running GitLocal. This is a materially different capability than GitLocal's current local-first, non-IDE positioning (see the project constitution's Target Audience & UX Philosophy, which optimizes for browsing/reading over terminal/IDE workflows) and is called out here as a deliberate scope expansion requiring explicit product sign-off, not an oversight.
- Terminal and file browser panes are local-only, matching the existing constitution's local-first principle — no new remote/network services are introduced by this feature.
- Persistence behavior (FR-018) defaults to "no persistence across reload" (fresh workspace each session) unless product direction specifies otherwise, consistent with the app's current lack of cross-session UI state persistence.
- This feature targets the same browser-based and macOS native app distributions GitLocal already ships; no new distribution channel is introduced.
