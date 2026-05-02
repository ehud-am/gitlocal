# Feature Specification: Folder Delete Action And Compact Tags

**Feature Branch**: `012-folder-delete-action-tags`
**Created**: 2026-05-02
**Status**: Ready for v0.6.1 release
**Input**: User description: "move the delete folder option from the x icon on the left panel to the main view of the folder on the right side, similar to the new file button, with alert button style (red font and red border). Also, on the left side, let's make the various tags smaller. E.g. instead of \"local only\" we could just say \"local\""

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete Folder From Main View (Priority: P1)

As a user viewing a folder, I want the folder deletion action to live in the main folder view near the other creation actions so that destructive actions are easier to understand in context and are not presented as a small icon in the navigation panel.

**Why this priority**: The delete-folder action is destructive and should be discoverable in the area where the user is already reviewing the selected folder, not as a terse icon in the left tree.

**Independent Test**: Can be fully tested by opening a deletable folder, confirming the left panel no longer shows the delete icon for that folder, and confirming the main folder view shows a delete-folder action with destructive styling.

**Acceptance Scenarios**:

1. **Given** a user is viewing a deletable folder, **When** they look at the main folder view actions, **Then** they see a delete-folder action near the new-file action.
2. **Given** a user is browsing the left navigation panel, **When** a folder row is shown, **Then** the row does not expose the delete-folder x icon.
3. **Given** the user activates the delete-folder action from the main view, **When** the confirmation opens, **Then** the existing typed-name destructive confirmation flow is used before anything is deleted.

---

### User Story 2 - Recognize Destructive Folder Action (Priority: P2)

As a cautious user, I want the delete-folder action to have alert styling so that I can immediately distinguish it from constructive actions like creating a new file or folder.

**Why this priority**: Moving the action improves placement, but the action must remain visually differentiated because it can remove content recursively.

**Independent Test**: Can be fully tested by viewing the main folder actions and confirming the delete-folder action uses red text and a red border while non-destructive actions keep their normal styling.

**Acceptance Scenarios**:

1. **Given** the main folder view contains action buttons, **When** a deletable folder is selected, **Then** the delete-folder action uses red text and a red border.
2. **Given** the user compares delete-folder with new-file and new-folder actions, **When** the actions are displayed together, **Then** the destructive action is clearly visually distinct without relying only on its label.

---

### User Story 3 - Scan Smaller Left-Panel Tags (Priority: P3)

As a user browsing the left navigation panel, I want status tags to be shorter and smaller so that folder and file names remain easier to scan.

**Why this priority**: Compact tags reduce visual noise in a dense navigation surface while preserving important status information.

**Independent Test**: Can be fully tested by viewing left-panel rows with status tags and confirming tag text is abbreviated and takes less visual space.

**Acceptance Scenarios**:

1. **Given** a left-panel item has a local-only status, **When** the tag is displayed, **Then** the tag says "local" instead of "local only".
2. **Given** any status tag appears in the left panel, **When** the row is displayed, **Then** the tag uses a compact visual treatment that occupies less space than the current tag style.

### Edge Cases

- Repository root is visible in the main view; root deletion remains unavailable.
- The selected folder is read-only or otherwise not eligible for folder deletion; the main view must not offer a misleading enabled delete action.
- A file is selected instead of a folder; this change must not introduce a folder delete action for files.
- Narrow left-panel widths must keep item names readable and avoid tag overlap.
- Existing local-only, modified, ignored, or other status tags must remain understandable after shortening.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST remove the folder deletion x icon from folder rows in the left navigation panel.
- **FR-002**: The system MUST show a delete-folder action in the main folder view for folders that can be deleted.
- **FR-003**: The delete-folder action MUST appear in the same action area as the existing new-file and folder-management actions.
- **FR-004**: The delete-folder action MUST use alert styling with red text and a red border.
- **FR-005**: The delete-folder action MUST use the existing strong typed-name confirmation flow before deletion can occur.
- **FR-006**: The system MUST keep repository root deletion unavailable.
- **FR-007**: The system MUST not show a folder delete action when the current main view is not a deletable folder.
- **FR-008**: Left navigation status tags MUST use shorter labels where a shorter label preserves meaning; "local only" MUST become "local".
- **FR-009**: Left navigation status tags MUST use a smaller visual treatment than the current tag presentation.
- **FR-010**: Compact tags MUST remain readable and must not overlap file or folder names in the left navigation panel.
- **FR-011**: The change MUST preserve existing status meaning for local-only, modified, ignored, and other visible item states.

### Key Entities

- **Folder Action**: A user-facing command available for the currently viewed folder, including constructive actions and the destructive delete-folder action.
- **Left Navigation Tag**: A compact status label attached to a left-panel item that communicates local or sync state without dominating the row.
- **Deletable Folder**: A repository subfolder that is eligible for the existing recursive deletion confirmation flow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of folder deletion attempts start from the main folder view rather than a left-panel x icon.
- **SC-002**: 100% of folder deletion attempts still require exact typed-name confirmation before any content is deleted.
- **SC-003**: Users can locate the delete-folder action in the main folder view in under 10 seconds during validation.
- **SC-004**: The local-only tag text is reduced from "local only" to "local" everywhere it appears in the left navigation panel.
- **SC-005**: Left-panel rows with status tags remain readable at common narrow sidebar widths without text overlap.
- **SC-006**: In review, destructive folder actions are visually distinguishable from non-destructive actions without relying only on button text.

## Assumptions

- The main folder view already has an action area containing the new-file action and related folder actions.
- This change repositions the entry point for folder deletion; it does not change the existing deletion confirmation rules or deletion behavior.
- "Various tags" refers to status tags shown on items in the left navigation panel.
- Shorter status labels should be introduced conservatively where meaning remains clear to users.
