# Feature Specification: Clean Up Collapsed Sidebar

**Feature Branch**: `026-cleanup-collapsed-sidebar`  
**Created**: 2026-06-12  
**Status**: Draft  
**Input**: User description: "when the left side panel is collased it looks like a bug. Multiple buttons that have one letter. I think this is not useful. Let's get back to the way it was before, just one button to open the left side. No need for direct buttons for various functions like search that are reachable anyway from the main page. Please clean up the collased left side panel."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reopen the Collapsed Sidebar (Priority: P1)

As a GitLocal user who has collapsed the left side panel to make more room for reading or reviewing files, I want the collapsed state to show only one clear control for reopening the panel so the interface does not look broken or cluttered.

**Why this priority**: The current collapsed panel makes the product appear buggy because several narrow buttons show only one letter. Restoring a single reopen control directly addresses the visible usability regression.

**Independent Test**: Collapse the left side panel from any repository view and confirm the collapsed area contains one clearly identifiable control that reopens the panel, with no separate shortcut buttons for search or other functions.

**Acceptance Scenarios**:

1. **Given** the left side panel is expanded, **When** the user collapses it, **Then** the collapsed panel shows a single control for opening the left side panel again.
2. **Given** the left side panel is collapsed, **When** the user activates the reopen control, **Then** the left side panel expands and restores access to its normal contents.
3. **Given** the left side panel is collapsed, **When** the user looks at the collapsed area, **Then** they do not see multiple one-letter buttons or direct shortcut controls for functions such as search.

---

### User Story 2 - Preserve Access to Existing Functions (Priority: P2)

As a GitLocal user, I want search and other left-panel functions to remain available through the normal expanded panel or main page so removing collapsed shortcuts does not remove capability.

**Why this priority**: The cleanup should simplify the collapsed state without making users lose access to important actions.

**Independent Test**: Collapse and reopen the left side panel, then confirm the normal panel and main page still provide access to the same primary repository browsing and search workflows.

**Acceptance Scenarios**:

1. **Given** the collapsed panel no longer shows direct shortcut buttons, **When** the user reopens the left side panel, **Then** previously available panel functions are reachable from their normal locations.
2. **Given** a user wants to search while the left panel is collapsed, **When** they use the main page or reopen the panel, **Then** search remains discoverable and usable without relying on collapsed shortcut buttons.

---

### User Story 3 - Keep the Collapsed State Visually Intentional (Priority: P3)

As a GitLocal user, I want the collapsed left side panel to look intentional and stable across common window sizes so it does not appear like missing content, clipped text, or a rendering bug.

**Why this priority**: Visual polish reduces confusion, especially for less-technical users who may interpret broken-looking controls as product instability.

**Independent Test**: Review the collapsed state across common desktop and narrow window widths and confirm the single reopen control remains visible, legible, and non-overlapping.

**Acceptance Scenarios**:

1. **Given** the window is resized while the left side panel is collapsed, **When** the user views the collapsed area, **Then** the reopen control remains visible and does not overlap file content or other page controls.
2. **Given** the user navigates between repository pages while the left side panel is collapsed, **When** each page loads, **Then** the collapsed panel remains visually consistent and still provides one reopen control.

### Edge Cases

- If the app opens with the left side panel already collapsed from a remembered preference, the collapsed state must still show only the reopen control.
- If the user collapses the panel while focus is inside a left-panel control, focus must move to an appropriate visible control so keyboard users are not left on hidden actions.
- If the repository has no files, no search results, or an empty main page state, the collapsed panel behavior must remain the same.
- If the available width is very narrow, the reopen control must remain understandable and must not turn into clipped text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The collapsed left side panel MUST display exactly one primary control whose purpose is to reopen the left side panel.
- **FR-002**: The collapsed left side panel MUST NOT display separate shortcut buttons for search, file navigation, settings, repository actions, or other panel functions.
- **FR-003**: The collapsed left side panel MUST NOT display controls whose visible label is only a clipped single letter from a longer action name.
- **FR-004**: Users MUST be able to reopen the left side panel from the collapsed state in one action.
- **FR-005**: Reopening the left side panel MUST restore access to the normal left-panel contents and controls that were available before collapse.
- **FR-006**: Search and other primary repository actions MUST remain reachable from the expanded panel or main page after collapsed shortcuts are removed.
- **FR-007**: The collapsed state MUST remain visually stable across common repository views and window sizes, without overlapping primary content or adjacent controls.
- **FR-008**: The collapsed-state reopen control MUST be accessible to users who navigate with keyboard or assistive technologies.
- **FR-009**: Existing user preference behavior for whether the panel is expanded or collapsed MUST be preserved unless the user changes it.
- **FR-010**: The cleanup MUST apply consistently wherever the left side panel can be collapsed in the product.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the collapsed state, 100% of tested repository views show exactly one reopen control and zero additional collapsed shortcut buttons.
- **SC-002**: Users can reopen the left side panel from the collapsed state in one action in 100% of tested views.
- **SC-003**: 0 visible collapsed-panel controls display as single-letter labels caused by clipping or truncation.
- **SC-004**: 95% of usability test participants can correctly identify how to reopen the left side panel within 5 seconds.
- **SC-005**: 100% of primary workflows available before this change remain reachable after reopening the panel or from the main page.
- **SC-006**: Keyboard and assistive-technology checks confirm the collapsed-state reopen control is reachable, named, and operable.

## Assumptions

- The intended product behavior is to restore the earlier collapsed-panel model: one control to reopen the left side panel.
- Removing collapsed shortcut buttons is acceptable because search and related functions are already reachable through the main page or expanded panel.
- The change is limited to the collapsed presentation of the left side panel; it does not redesign the expanded panel or remove underlying product capabilities.
- The collapsed state may keep its current width if it looks intentional and supports the single reopen control.
