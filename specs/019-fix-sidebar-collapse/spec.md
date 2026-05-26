# Feature Specification: Fix Sidebar Collapse

**Feature Branch**: `019-fix-sidebar-collapse`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "in 0.9.0 we introduced a new bug - the left side panel collapse expend stopped working (both native app and browser app). Can you find the issue and fix"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Collapse the Left Panel (Priority: P1)

As a GitLocal user reviewing code or reading Markdown, I can collapse the left side panel so the main content area has more usable space.

**Why this priority**: The regression directly blocks a previously available layout control used in both product distributions.

**Independent Test**: Open GitLocal with a repository loaded, activate the left panel collapse control, and verify the left panel hides while the main content expands.

**Acceptance Scenarios**:

1. **Given** the left side panel is visible, **When** the user activates the collapse control, **Then** the left side panel is hidden and the main content remains usable.
2. **Given** the left side panel is visible in the native app, **When** the user activates the collapse control, **Then** the native app shows the same collapsed layout as the browser app.
3. **Given** the left side panel is visible in the browser app, **When** the user activates the collapse control, **Then** the browser app shows the collapsed layout without requiring a page reload.

---

### User Story 2 - Expand the Left Panel Again (Priority: P1)

As a GitLocal user who has hidden the left panel, I can expand it again so I can return to repository navigation.

**Why this priority**: Collapse without reliable expansion can trap users away from navigation and makes the control unsafe to use.

**Independent Test**: Start from a collapsed left panel, activate the expand control, and verify repository navigation returns.

**Acceptance Scenarios**:

1. **Given** the left side panel is collapsed, **When** the user activates the expand control, **Then** the left side panel becomes visible again with repository navigation available.
2. **Given** the user collapses and expands the left panel repeatedly, **When** each action completes, **Then** the visible layout always matches the latest action.

---

### User Story 3 - Preserve Normal Navigation While Toggling (Priority: P2)

As a GitLocal user, I can continue browsing files, reading diffs, and using the selected view after toggling the left panel.

**Why this priority**: The fix should restore layout control without disrupting the active review or reading flow.

**Independent Test**: Select a file or Markdown document, toggle the left panel closed and open, and verify the selected content remains available.

**Acceptance Scenarios**:

1. **Given** a file or document is selected, **When** the user collapses or expands the left panel, **Then** the selected content remains selected and visible.
2. **Given** a repository has an active view, **When** the user toggles the left panel, **Then** the app does not navigate away, reset the repository, or show an empty state incorrectly.

### Edge Cases

- The control is activated immediately after app load while repository data is still appearing.
- The app is resized while the left panel is collapsed.
- The user toggles the panel multiple times in quick succession.
- The active repository is empty or has no selected file.
- The same behavior is needed in both the browser app and the native app shell.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to collapse the left side panel when it is visible.
- **FR-002**: Users MUST be able to expand the left side panel when it is collapsed.
- **FR-003**: The collapse and expand controls MUST work in both the browser app and the native app.
- **FR-004**: The main content area MUST remain visible and usable after the left panel is collapsed.
- **FR-005**: Repository navigation MUST remain available after the left panel is expanded again.
- **FR-006**: Toggling the left panel MUST NOT change the active repository, selected file, selected route, or visible content except for the intended layout change.
- **FR-007**: Repeated or rapid toggles MUST leave the left panel in the state matching the user's latest action.
- **FR-008**: The fix MUST restore the behavior that existed before the 0.9.0 regression without introducing a new user-facing setting.

### Key Entities

- **Left Side Panel**: The repository navigation area that users can show or hide.
- **Panel Toggle State**: Whether the left side panel is currently expanded or collapsed.
- **Active Content View**: The current repository, file, document, or review content shown outside the side panel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In manual verification, users can collapse and expand the left side panel successfully in the browser app on the first attempt.
- **SC-002**: In manual verification, users can collapse and expand the left side panel successfully in the native app on the first attempt.
- **SC-003**: Across at least 10 consecutive toggle actions, the final visible panel state matches the final user action every time.
- **SC-004**: The selected repository content remains unchanged after collapse and expand actions in all verified scenarios.
- **SC-005**: Existing automated verification for the app passes after the fix.

## Assumptions

- The intended behavior is to restore the pre-0.9.0 collapse and expand interaction, not redesign the sidebar.
- Both product distributions share the affected app behavior, so one app-level fix should cover both unless distribution-specific verification reveals otherwise.
- The existing control placement, visual style, and accessible label should remain consistent unless the regression is caused by those attributes.
