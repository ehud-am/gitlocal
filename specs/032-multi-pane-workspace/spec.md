# Feature Specification: Multi-Pane Workspace

**Feature Branch**: `032-multi-pane-workspace`
**Created**: 2026-08-05
**Status**: Clarified
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

### User Story 3 - See terminal and code together in a live layout (Priority: P3)

A user is running an AI coding agent (or any long-lived command) in a terminal pane and wants to watch its output while simultaneously reviewing the code it's changing — for example, one tile runs the agent, an adjacent tile shows the file it's currently editing. They open one or more terminal panes and place them into a tiled layout alongside content panes, all visible and live at once.

**Why this priority**: This is the concrete driving use case behind terminal support (per product direction: watching an agent run while reviewing its output). It's a distinct, higher-complexity pane type (a live shell) layered on top of the tab/tile mechanics from Stories 1-2, and is explicitly scoped as an experimental capability — GitLocal is not becoming a general IDE, but this workflow is valuable enough to build and evaluate.

**Independent Test**: Open a terminal pane and a content pane together in the 2-column layout, run a long-lived command (e.g. an agent or watch process) in the terminal pane, and confirm its output keeps streaming live while the content pane remains independently viewable/scrollable; open a second terminal pane and confirm both run independent sessions.

**Acceptance Scenarios**:

1. **Given** the workspace is open, **When** the user opens a new terminal pane, **Then** a live shell session starts, scoped to the current repository's working directory.
2. **Given** a terminal pane is open, **When** the user runs a command, **Then** the command's output streams into that pane live, including long-running/continuous output.
3. **Given** two or more terminal panes are open, **When** the user runs commands in each, **Then** each terminal's session, input, and output are fully independent of the others.
4. **Given** a terminal pane is open, **When** the user closes its tab/tile, **Then** the underlying shell session is terminated and any running process in it is stopped.
5. **Given** one or more terminal panes and one or more content panes are open, **When** the user selects a 2-column, 4-tile, or 6-tile layout, **Then** terminal and content panes can occupy tiles side by side in the same layout, each remaining live and independently usable.

---

### Edge Cases

- What happens when the user tries to open more tabs than reasonably fit (e.g. 20+)? The tab strip must remain usable (e.g. via scrolling or overflow) rather than becoming unusable or overlapping content.
- What happens if the user closes the last remaining open pane? The workspace should return to a clear empty/default state (e.g. "open a file to get started") rather than an error or blank screen.
- What happens when a user switches layouts (e.g. 2-column to 6-tile) while a terminal pane has an actively running, long-lived command? The running command/session must survive the layout change unaffected.
- What happens on narrow/small viewport sizes where a 4-tile or 6-tile layout cannot reasonably render side by side? The system must degrade to a usable arrangement (e.g. stacked, or restrict which layouts are offered) rather than rendering illegibly small tiles.
- What happens when the same file is opened into more than one pane at once (e.g. two file panes both showing `README.md`)? Both panes should reflect the same underlying file and stay in sync with on-disk changes/edits, consistent with existing single-pane file behavior.
- What happens when a terminal pane's shell process exits or crashes on its own (not via user-initiated close)? The pane must show a clear "session ended" state rather than a frozen or blank pane.
- What happens to open panes, layout selection, and terminal sessions when the user reloads the page or the app restarts? Per FR-014, nothing persists — the workspace resets to the default single-file view and all terminal sessions end.

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
- **FR-010**: Terminal panes MUST be eligible to appear as tabs or occupy tiles in any of the layouts defined in FR-004, mixed freely alongside content panes (e.g. one tile running a terminal, an adjacent tile showing code).
- **FR-011**: System MUST handle a tiled layout with fewer open panes than the layout's tile capacity by showing an empty/"open a file" placeholder in unused tiles, not an error.
- **FR-012**: System MUST handle more open panes than a selected layout's tile capacity by keeping the excess panes accessible (e.g. via tabs/overflow) rather than closing them.
- **FR-013**: System MUST continue to support all existing single-file, single-view behavior unchanged for users who never open a second tab or pane.
- **FR-014**: Open panes and the selected layout MUST NOT persist across a page reload or app restart; each session starts fresh with the existing default single-file view, consistent with the app's current lack of cross-session UI state persistence.

### Key Entities

- **Pane**: A single viewable unit within the workspace. Has a type (Content Pane or Terminal Pane) and can be displayed either as one tab among several (tabbed view, one visible at a time) or as one tile within a tiled layout (multiple visible simultaneously).
- **Content Pane**: A pane bound to one file, showing that file's content using the existing per-file-type viewer (matches today's single-file view). This is what the source request calls a "file window" once placed into a tiled layout.
- **Terminal Pane**: A pane bound to one live shell session scoped to the repository's working directory.
- **Workspace Layout**: The current arrangement mode for all open panes — Tabbed Mode (one active pane visible at a time, switched via tabs) or one of the tiled/windowed presets (2-column, 4-tile, 6-tile), where multiple panes of any mix of types are visible simultaneously.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can have at least 6 panes open at once (any mix of content and terminal panes) without errors or degraded responsiveness.
- **SC-002**: A user can switch between tabbed view and any tiled layout in one action, with all open panes preserved every time.
- **SC-003**: A user can go from "single file open" to "comparing two files side by side" in two actions or fewer (open second file as tab, select 2-column layout).
- **SC-004**: Each open terminal pane behaves as a fully independent session — commands, output, and process lifecycle in one terminal pane never affect another.
- **SC-005**: A user can watch a long-running terminal session (e.g. an AI coding agent) and a content pane showing the file it's editing simultaneously, both live, in a single tiled layout — the concrete "agent workflow" scenario motivating this feature.
- **SC-006**: 100% of existing single-file viewing/editing behavior is unaffected for users who do not use tabs, tiling, or terminal panes (zero regressions in existing test suite).

## Assumptions

- Two distinct viewing modes are in scope: **Tabbed Mode** (switch between open panes, one visible at a time) and **Layout Mode** (2-column/4-tile/6-tile presets, multiple panes visible simultaneously). The source request's "tabs" and "file windows" map to these two modes for the same underlying Content Panes, not to two different pane types — confirmed with product direction.
- The 2-column, 4-tile, and 6-tile layouts are fixed presets (not a freeform/resizable grid); exact tile grid shape for 6-tile (e.g. 3x2 vs 2x3) is a design/plan-level decision, not specified here.
- Terminal panes provide direct shell access to the local machine running GitLocal. This is explicitly accepted as an experimental step toward IDE-adjacent territory (confirmed with product direction), not an oversight against the project constitution's browsing/reading-first UX philosophy — scope and risk should be re-evaluated after initial delivery.
- Terminal panes are local-only, matching the existing constitution's local-first principle — no new remote/network services are introduced by this feature.
- Open panes, layout selection, and terminal sessions do not persist across reload or restart (see FR-014) — a deliberate simplification for the initial version, not a gap requiring further clarification.
- This feature targets the same browser-based and macOS native app distributions GitLocal already ships; no new distribution channel is introduced.
