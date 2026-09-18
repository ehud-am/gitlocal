# Feature Specification: Simplify Terminal Panel

**Feature Branch**: `044-simplify-terminal-panel`
**Created**: 2026-09-18
**Status**: Draft
**Input**: User description: "let's revise the terminal functionality and clean it up. 1. It is enough to have simple terminal, we do not need to support codex and claude (the user can type it in the terminal). Let's remove this functioanlity. 2. let's add option to see the terminal at the bottom, or on the left, or on the right. The default is on the right. 3. let's review the ui of opening new terminal - there is something not right there"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Just a plain terminal (Priority: P1)

A user opens the terminal panel to run shell commands. Today they're first asked to choose between "Regular", "Claude", and "Codex" tab kinds, even though they almost always just want a shell — and can already launch `claude` or `codex` themselves by typing the command. This choice adds friction and confusion with no real benefit, so it is removed: every terminal tab is a plain, generic shell.

**Why this priority**: This is the core cleanup the user asked for and simplifies every other terminal interaction (fewer states, fewer decisions, less code to maintain).

**Independent Test**: Open the terminal panel and create a new tab — no kind/type choice is presented, a plain shell opens immediately, and the user can type `claude` or `codex` in it manually to launch those tools if desired.

**Acceptance Scenarios**:

1. **Given** the terminal panel is closed with no tabs open, **When** the user opens a new terminal, **Then** a single plain shell session starts with no prompt to choose a terminal kind.
2. **Given** one or more terminal tabs are already open, **When** the user opens another new terminal, **Then** it is also a plain shell, labeled distinctly from existing tabs (e.g., by sequence number), with no kind selector shown anywhere in the panel.
3. **Given** a plain terminal tab, **When** the user types `claude` or `codex` and presses enter, **Then** the command runs exactly as it would in any other shell (no special panel behavior is required or expected).

---

### User Story 2 - Choose where the terminal panel docks (Priority: P2)

A user wants the terminal panel positioned where it best fits their workflow: docked to the bottom (current behavior), the left, or the right of the app window. The default position is the right side.

**Why this priority**: Improves usability for users who want to see file/folder content and the terminal side-by-side rather than stacked, without blocking on the P1 simplification.

**Independent Test**: With the terminal panel open, switch its position among bottom, left, and right and confirm the panel visibly relocates and remains usable (resizable, all tabs and content intact) in each position.

**Acceptance Scenarios**:

1. **Given** a user has never set a terminal position preference, **When** they open the app and show the terminal panel for the first time, **Then** it docks to the right side of the window.
2. **Given** the terminal panel is docked to the right, **When** the user chooses "bottom" or "left" from the position control, **Then** the panel immediately relocates to that edge and resizes appropriately (height-based resize handle at the bottom, width-based resize handle at the left/right).
3. **Given** the user has open terminal tabs with live sessions and scrollback, **When** they change the dock position, **Then** all open tabs, their running sessions, and scrollback are preserved unchanged — only the panel's location and orientation change.
4. **Given** the user picked a non-default position in a previous visit, **When** they return to the app later, **Then** the terminal panel remembers and uses that same position.

---

### User Story 3 - A clear, unambiguous way to open a new terminal (Priority: P3)

The current "new terminal" control is confusing: it combines a kind selector with the action of creating a tab, and behaves slightly differently depending on whether any tabs are already open. This is cleaned up into one clear, consistent action for opening a new terminal, available the same way whether the panel is empty or already has tabs.

**Why this priority**: A polish/usability fix that becomes simpler to do correctly once User Story 1 removes the kind selector, and further improves an interaction the user flagged as "not right."

**Independent Test**: From both the empty terminal panel and a panel with existing tabs, locate and use the "new terminal" control and confirm it looks and behaves the same way in both cases, with no ambiguity about what will happen when clicked.

**Acceptance Scenarios**:

1. **Given** the terminal panel is open with no tabs, **When** the user looks for how to start a terminal, **Then** there is a single, clearly labeled action (e.g., a "New Terminal" button) and no additional choices to make.
2. **Given** the terminal panel already has one or more tabs open, **When** the user wants another terminal, **Then** the same clearly labeled action is available in the tab strip and produces the same result as the empty-state action.
3. **Given** the user clicks "New Terminal" repeatedly, **When** each new tab is created, **Then** each tab is immediately usable and distinctly labeled (e.g., "Terminal 1", "Terminal 2", ...) with no visual glitches or mislabeling.

---

### Edge Cases

- What happens to a Claude or Codex tab that is still open (from before this change) when the app is upgraded? System MUST treat any previously-persisted "claude"/"codex" tab state as a plain terminal going forward (no crash, no special relaunch behavior).
- What happens if the user resizes the terminal panel and then changes its dock position? The panel MUST use a sensible size for the new orientation (e.g., a remembered/default width when moving to left/right, a remembered/default height when moving to bottom) rather than an unusable sliver.
- What happens if the terminal panel is docked left or right on a very narrow window? The panel MUST remain usable and not fully obscure the main content area (e.g., enforce a minimum main-content width or a maximum panel width).
- What happens to the Ctrl+` toggle shortcut and the native macOS "Toggle Terminal" menu item after this change? Both MUST continue to show/hide the panel regardless of which position it is docked to.
- What happens on the very first run (no stored preference at all)? The panel MUST default to the right position, matching User Story 2.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support only a single, generic terminal tab type; the "Claude" and "Codex" terminal kinds and their selection UI MUST be removed.
- **FR-002**: System MUST remove the automatic launch-command behavior and any Claude/Codex-specific CLI detection that existed solely to support those tab kinds.
- **FR-003**: Users MUST be able to set the terminal panel's dock position to bottom, left, or right.
- **FR-004**: The terminal panel MUST default to the right dock position when the user has no previously saved preference.
- **FR-005**: System MUST remember the user's chosen dock position and reuse it the next time the terminal panel is shown, including after restarting the app.
- **FR-006**: Changing the dock position MUST preserve all currently open terminal tabs, their running sessions, and their scrollback content.
- **FR-007**: The panel's resize control MUST match its orientation: a height-adjusting handle when docked at the bottom, and a width-adjusting handle when docked at the left or right.
- **FR-008**: System MUST provide a single, clearly labeled action for opening a new terminal tab, presented consistently whether the panel currently has zero or more tabs.
- **FR-009**: New terminal tabs MUST be labeled distinctly and consistently (e.g., sequential "Terminal N" naming) with no leftover kind-based labeling or icons.
- **FR-010**: The existing terminal show/hide toggle (keyboard shortcut and, on macOS, the native app menu item) MUST continue to function identically regardless of the panel's dock position.
- **FR-011**: The terminal panel MUST remain fully usable (readable, interactive, not clipped or overlapping essential controls) in all three dock positions across supported window sizes.
- **FR-012**: A terminal tab that was previously a "Claude" or "Codex" kind (e.g., from state carried over across an app upgrade) MUST be treated as a plain terminal, with no error or broken state.

### Key Entities

- **Terminal Tab**: A single terminal session shown in the panel — has an identifier, a sequential display label, a live shell process, and scrollback output. No longer has a "kind" distinguishing Claude/Codex/regular.
- **Terminal Panel Preference**: The user's remembered dock position (bottom, left, or right) for the terminal panel, persisted across sessions, independent of any specific tab's state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening a new terminal takes exactly one user action (no intermediate choice screen), down from the current two-step kind-then-create flow.
- **SC-002**: Zero terminal-kind selection controls, labels, or icons referencing "Claude" or "Codex" remain anywhere in the terminal panel UI.
- **SC-003**: Users can switch the terminal panel among all three dock positions and see the change reflected in under 2 seconds, with the choice still in effect the next time they open the app.
- **SC-004**: 100% of existing open terminal sessions and their scrollback survive a dock-position change with no visible interruption or data loss.
- **SC-005**: The terminal panel is fully usable (no clipped controls, no overlapping content) in all three positions when manually checked against the app's supported minimum window size.

## Assumptions

- Users who want the convenience of auto-launching `claude` or `codex` in a terminal will simply type the command themselves; no replacement automation is required.
- The dock position is a single global preference for the terminal panel (not a per-tab or per-page setting), consistent with how other view preferences (e.g., dotfile visibility, tracked/all/local selector) are already remembered in this app.
- "Something not right" in the current new-terminal UI refers to the inconsistent/combined kind-selector-plus-create control called out in User Story 3; this spec resolves it by requiring one consistent, unambiguous action rather than prescribing a specific visual design.
- No new terminal capabilities (e.g., split panes, multiple simultaneous dock positions) are in scope — this is a simplification and repositioning of the existing single-panel terminal.
- This applies identically to both GitLocal distributions (npm/browser and the macOS app), consistent with the project's shared-codebase approach.
