# Feature Specification: UI Density & Navigation Fixes

**Feature Branch**: `033-ui-density-navigation-fixes`
**Created**: 2026-08-09
**Status**: Draft
**Input**: User description: "Next patch release 0.10.1 will focus on small bug fixes and minor UI changes, mostly about better information density and navigation. 1) terminal font size is 2 points too big, make it smaller. 2) top toolbar: color the Refresh button gray or plain and Terminal as a secondary button; move the Parent Folder button up to this top-level toolbar since it should always be there. 3) repository block: move tags to a second line so smaller displays do not cut off the repo name; keep search and branch selection on line 1 right side; move root and readme buttons to line 2 right side; reduce vertical margins and spacing for a denser layout; make root and readme buttons smaller. 4) current folder view: reduce margins and spacing between lines for a denser layout; remove the redundant block within a block nested container, keep just one block. 5) terminal panel collapsed state: fix the expand button position so it never falls outside the viewport requiring a scroll."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Repository block fits on smaller displays without clipping (Priority: P1)

A user browsing a repository on a laptop-width or narrower window currently sees the repo name get cut off because tags share the first line with it. The repository block is restructured into two lines: line 1 has the repo name on the left and search + branch selection on the right; line 2 has tags on the left and the root/readme buttons on the right. The repo name is always fully readable regardless of window width, and the block takes less vertical space overall.

**Why this priority**: This is the most concrete correctness bug in the request (content is currently clipped/hidden on smaller displays) and it affects the page nearly every session starts on.

**Independent Test**: Open a repository with several tags at a laptop-width viewport (e.g. 1280px) and confirm the full repo name is visible, unclipped, with tags wrapped to a second line below it; confirm search and branch selection stay on line 1, and root/readme buttons appear on line 2.

**Acceptance Scenarios**:

1. **Given** a repository with tags and a long name, **When** the window is narrowed to a typical laptop width, **Then** the repo name renders in full on line 1 and tags wrap to line 2 instead of sharing space with the name.
2. **Given** the repository block at any supported width, **When** it renders, **Then** search and branch selection appear on line 1 (right side) and root/readme buttons appear on line 2 (right side).
3. **Given** the repository block, **When** compared to the current layout, **Then** vertical margins/padding between its internal rows are visibly reduced and the root/readme buttons render at a smaller size, without the block feeling cramped or misaligned.

---

### User Story 2 - Parent Folder navigation is always reachable from the top toolbar (Priority: P1)

A user browsing deep into a folder or repository wants to go up a level. Today the Parent Folder control lives inside the repository block, which means it's easy to lose track of and isn't available in a consistent, predictable location. The control moves to the persistent top-level toolbar, alongside Terminal and Refresh, so it's always in the same place regardless of what content is showing.

**Why this priority**: Navigation controls that move around or disappear undermine trust in the UI; this is a small change with an outsized effect on perceived usability, and it's independent of the repository block's internal layout changes in User Story 1.

**Independent Test**: From any content type (folder view, git view, file view), confirm a Parent Folder control is present in the top toolbar (not just the repository block), and that activating it navigates up one level and is disabled/inert at the root with no parent.

**Acceptance Scenarios**:

1. **Given** any page showing folder or repository content with a parent available, **When** the user looks at the top toolbar, **Then** a Parent Folder control is present alongside Terminal and Refresh.
2. **Given** the user is at a root with no parent folder, **When** the top toolbar renders, **Then** the Parent Folder control is disabled rather than hidden, consistent with existing disabled-state conventions elsewhere in the toolbar.
3. **Given** the Parent Folder control in the top toolbar, **When** activated, **Then** the app navigates to the parent folder exactly as the previous repository-block control did.

---

### User Story 3 - Top toolbar buttons communicate priority through color (Priority: P2)

A user scanning the top toolbar today sees Terminal and Refresh rendered identically, giving no visual cue about which is more central to the current task. Refresh becomes a plain/gray, low-emphasis action; Terminal (and the newly relocated Parent Folder) keep a secondary, more visible treatment.

**Why this priority**: A visual/cosmetic refinement that improves scanability but changes no behavior; it depends on User Story 2 having already placed Parent Folder in the toolbar.

**Independent Test**: View the top toolbar and confirm Refresh is visually distinct (lower-emphasis/gray) from Terminal and Parent Folder (secondary-style), using the app's existing button variant system rather than one-off styling.

**Acceptance Scenarios**:

1. **Given** the top toolbar, **When** rendered, **Then** the Refresh button uses a plain/gray, low-emphasis visual style distinct from its current appearance.
2. **Given** the top toolbar, **When** rendered, **Then** the Terminal button and the relocated Parent Folder button keep a secondary-level visual treatment, visually distinguishable from Refresh.
3. **Given** the restyled buttons, **When** interacted with (hover, focus, disabled), **Then** they use the app's existing button variant states rather than introducing new one-off styles.

---

### User Story 4 - Denser, single-layer current folder view (Priority: P2)

A user browsing a folder's contents today sees more vertical whitespace between rows than necessary, and an extra nested container wrapping the listing that serves no visible purpose. The view is tightened up: reduced spacing between rows/sections, and the redundant wrapper collapsed so there's a single visible block around the folder contents.

**Why this priority**: A density/polish improvement to the single most-used view in the app (the folder listing), independent of the repository block and toolbar changes above.

**Independent Test**: Open a folder with several entries and confirm rows are more tightly spaced than before, and that visually there is exactly one bordered block around the listing rather than a block inside a block.

**Acceptance Scenarios**:

1. **Given** a folder with multiple entries, **When** the listing renders, **Then** the vertical spacing between rows and between the header and the row list is visibly reduced compared to the current layout.
2. **Given** the folder view's container structure, **When** inspected, **Then** there is a single bordered/background container around the listing, not a nested container producing a visible double border or double background.
3. **Given** the denser layout, **When** rows are scanned, **Then** all content remains fully readable and clickable targets remain easy to hit (no regression in usability from tightening spacing).

---

### User Story 5 - Terminal panel expand control is always reachable (Priority: P1)

A user collapses the terminal panel to reclaim screen space, then wants to bring it back. Today the expand control can end up positioned such that it requires scrolling the page to reach — defeating the purpose of a persistent, always-accessible terminal. The collapsed panel's expand control stays within the visible viewport at all times, regardless of window size or other panel state.

**Why this priority**: This is a functional bug, not a cosmetic one — a control that becomes unreachable without scrolling means the collapsed terminal can effectively get "stuck" for a user who doesn't know to scroll. It's independent of the other UI changes.

**Independent Test**: Collapse the terminal panel at a range of window heights (including short windows / high zoom levels), and confirm the expand control is visible without scrolling the page in every case.

**Acceptance Scenarios**:

1. **Given** the terminal panel is collapsed, **When** the browser window is short (e.g. a small laptop display or a zoomed-in browser), **Then** the expand control remains visible within the viewport without requiring the user to scroll.
2. **Given** the terminal panel is collapsed, **When** the user resizes the window smaller after collapsing, **Then** the expand control remains reachable without scrolling.
3. **Given** the expand control is visible per the above, **When** the user activates it, **Then** the terminal panel returns to its prior expanded height exactly as it does today.

---

### User Story 6 - Terminal text is appropriately sized (Priority: P3)

A user opens the terminal panel and finds the text noticeably larger than expected for a dense, IDE-like terminal. The terminal's font size is reduced to a more typical size, giving more visible lines/columns without the user needing to change any settings.

**Why this priority**: Lowest-risk, purely cosmetic change with no interaction/behavior implications; easy to validate visually and safe to ship independently of everything else in this release.

**Independent Test**: Open the terminal panel and confirm the rendered text is visibly smaller than the current default and that more lines fit in the same panel height.

**Acceptance Scenarios**:

1. **Given** the terminal panel is open, **When** text is rendered, **Then** the font size is smaller than the current xterm.js default in effect today.
2. **Given** the terminal panel at a fixed height, **When** compared before and after this change, **Then** more lines of scrollback are visible at once after the change.
3. **Given** the resized font, **When** the panel is resized (drag-resize or fit-to-container), **Then** the terminal still reflows/fits correctly at the new font size with no clipped or overlapping glyphs.

---

### Edge Cases

- What happens to the Parent Folder control in the top toolbar when the current view has no folder/repo context at all (e.g. an app-level settings or empty state)? It should be disabled or omitted consistently with how Terminal/Refresh already handle such states, not left in a confusing half-enabled state.
- How does the two-line repository block behave when a repository has zero tags — does line 2 collapse away entirely, or remain as empty space? It should collapse rather than leave a visibly empty second line.
- How does the two-line repository block behave with a very large number of tags — do tags wrap within line 2, and does line 2 grow taller than a single row if needed?
- On the narrowest supported viewport, do line 1's right-side controls (search, branch selection) wrap/stack sensibly rather than overflowing or clipping, matching the same "never clip the repo name" goal that motivates this change?
- Does collapsing the redundant folder-view container change any existing hover/selection/focus-ring styling that depended on the removed wrapper element?
- On very short viewports, does the always-visible terminal expand control ever need to overlap other bottom-of-screen UI (e.g. the app footer), and if so which takes visual priority?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository block MUST render as two rows: row 1 with the repository name on the left and search plus branch selection on the right; row 2 with tags on the left and the root and readme controls on the right.
- **FR-002**: The repository block MUST keep the repository name fully visible (not truncated or overlapped by tags) at all supported viewport widths, including widths where the current single-line layout clips it today.
- **FR-003**: The repository block's internal vertical spacing (margins/padding between its rows and around its edges) MUST be reduced from current values, while keeping all controls legibly separated and easy to target.
- **FR-004**: The root and readme controls MUST render at a visually smaller size than their current size, while remaining clickable/tappable per the app's existing accessible target-size conventions.
- **FR-005**: The Parent Folder control MUST be available in the top-level toolbar (alongside Terminal and Refresh) on every page/content type where it is currently available in the repository block.
- **FR-006**: The Parent Folder control MUST be removed from the repository block once it is available in the top toolbar, so it is not duplicated in two places at once.
- **FR-007**: The Parent Folder control in the top toolbar MUST preserve its existing enabled/disabled behavior (disabled when there is no parent to navigate to) and its existing navigation behavior.
- **FR-008**: The top toolbar's Refresh control MUST use a plain/low-emphasis (gray) visual style, distinct from its current styling.
- **FR-009**: The top toolbar's Terminal control and the relocated Parent Folder control MUST use a secondary-level visual style, visually distinct from the Refresh control's plain/gray style.
- **FR-010**: The current folder view MUST reduce vertical spacing between its header and its row listing, and between individual rows, from current values, while keeping all row content fully readable.
- **FR-011**: The current folder view MUST present its listing inside a single visible container (border/background), removing the currently redundant nested container that produces a block-within-a-block appearance.
- **FR-012**: The terminal panel MUST render its text at a smaller font size than the current default, applied consistently across all terminal tab kinds (Regular, Claude, Codex).
- **FR-013**: The terminal panel's font-size change MUST NOT break the existing fit-to-container/resize behavior — text must still reflow without clipping or overlap after a panel resize.
- **FR-014**: When the terminal panel is collapsed, its expand control MUST remain within the visible viewport at all times, across supported window sizes, without requiring the page to be scrolled to reach it.
- **FR-015**: None of the above changes MUST regress existing keyboard operability or accessible naming (aria-label/title) already present on the affected controls (Parent Folder, Refresh, Terminal, root, readme, terminal expand/collapse).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 1280px-wide viewport with a repository that has 3 or more tags, the full repository name renders without truncation or visual overlap with tags, where it is currently clipped.
- **SC-002**: The repository block's total rendered height (for a repo with a typical 2-4 tags) is measurably shorter than the current layout's height at the same viewport width.
- **SC-003**: The Parent Folder control is reachable from the top toolbar on 100% of page/content types where it is available today, with zero duplication (it no longer also appears in the repository block).
- **SC-004**: The current folder view's listing shows measurably more rows within the same viewport height than the current layout, without reducing row text below existing legibility.
- **SC-005**: The terminal panel's expand control remains within the viewport (zero scroll required to reach it) across the full range of window sizes the app already supports today.
- **SC-006**: The terminal's default font size is smaller than today's default, and a fixed-height terminal panel displays more lines of scrollback than it does today.
- **SC-007**: No existing automated test (unit, integration, or accessibility) regresses as a result of this release; overall test coverage stays at or above the project's enforced per-file branch coverage threshold.

## Assumptions

- This release is UI/layout-only: no server-side API, data model, or terminal session-management behavior changes are required to satisfy any of the above.
- "2 points too big" for the terminal font is treated as directional guidance (reduce the current default by roughly 2px in xterm.js's `fontSize` terms) rather than a hard pixel-exact requirement; the actual chosen value should read as comfortably smaller in a side-by-side comparison.
- The app's existing `Button` component variant system (e.g. `secondary`, `ghost`/plain) is reused for the Refresh/Terminal/Parent Folder styling changes rather than introducing new one-off variants, consistent with the codebase's existing design system.
- "Root" and "readme" in the repository block refer to the existing controls for navigating to the repository root and opening its README, already present in the repository block today.
- The redundant "block within a block" in the current folder view refers to the existing nested container structure around the directory listing; the fix is presentational (CSS/markup) only and does not change what data is shown or how rows behave.
- No new user-facing settings/preferences are introduced (e.g. no user-configurable terminal font size) — these are fixed default adjustments.
- This spec covers the UI changes only; whether they ship under version `0.10.1` or another version number is a release-process decision made separately from this spec.
