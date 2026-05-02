# Feature Specification: Unified Action Menus

**Feature Branch**: `013-unified-action-menus`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "let's be more consistent in the experience of the optional commands. Right now we have these three different behaviors: 1. for folder that is not under git we have a setup icon on the right side with list of options. for a file we have 3-dots drop down menu. 3. for folder that is under git we have a list of buttons. Let's implement in the three cases a 3-dots menu with list of options. in all cases delete is in red text, and has confirmation page that is not just \"approve\" button but instead ask for the file/folder name to be typed as approval (github style)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use One Action Menu Pattern (Priority: P1)

As a user browsing files and folders, I want optional commands to appear behind the same three-dots action menu pattern so that I do not have to learn a different control style for each item type or location.

**Why this priority**: The current experience uses different affordances for non-git folders, files, and git folders. Unifying the entry point reduces confusion and makes commands easier to discover consistently.

**Independent Test**: Can be fully tested by viewing a non-git folder in setup/browse context, a file, and a git-tracked folder, then confirming each exposes optional commands through a three-dots menu instead of a separate setup icon, standalone button list, or inconsistent action surface.

**Acceptance Scenarios**:

1. **Given** a non-git folder has setup actions available, **When** the user views that folder action area, **Then** the actions are available from a three-dots menu.
2. **Given** a file has optional actions available, **When** the user opens the file action control, **Then** the same three-dots menu pattern is used.
3. **Given** a git folder has optional actions available, **When** the user views the folder action area, **Then** the actions are grouped in a three-dots menu instead of appearing as a row of standalone buttons.

---

### User Story 2 - Recognize Destructive Actions (Priority: P2)

As a cautious user, I want delete actions inside any action menu to be styled in red text so that destructive options stand out before I choose them.

**Why this priority**: A consistent menu pattern is useful only if dangerous commands remain visually distinct and hard to confuse with safe actions.

**Independent Test**: Can be fully tested by opening action menus that include delete options and confirming each delete option uses red text while non-destructive options do not.

**Acceptance Scenarios**:

1. **Given** an action menu contains a delete file option, **When** the menu opens, **Then** the delete file option is shown in red text.
2. **Given** an action menu contains a delete folder option, **When** the menu opens, **Then** the delete folder option is shown in red text.
3. **Given** an action menu contains setup or creation actions, **When** the menu opens, **Then** non-destructive options keep normal menu styling.

---

### User Story 3 - Confirm File And Folder Deletes By Typing The Name (Priority: P3)

As a user deleting a file or folder, I want a GitHub-style confirmation that requires typing the exact file or folder name so that accidental deletion is less likely.

**Why this priority**: Folder deletion already requires strong confirmation, but file deletion must be brought to the same safety standard and all delete entry points must preserve that pattern.

**Independent Test**: Can be fully tested by starting file deletion and folder deletion, confirming the final delete action remains unavailable until the exact displayed name is typed, then confirming deletion proceeds only after a matching typed value.

**Acceptance Scenarios**:

1. **Given** a user starts deleting a file, **When** the confirmation appears, **Then** the user must type the exact file name before the final delete action is available.
2. **Given** a user starts deleting a folder, **When** the confirmation appears, **Then** the user must type the exact folder name before the final delete action is available.
3. **Given** the typed value does not exactly match the displayed file or folder name, **When** the user views the confirmation, **Then** the final delete action remains unavailable and no content is deleted.

### Edge Cases

- A menu has only one available option; it still uses the three-dots menu pattern for consistency.
- A file or folder name appears more than once in different locations; the confirmation must show enough context to identify the target.
- A file or folder name contains spaces, punctuation, or mixed case; the typed confirmation must require the exact displayed name.
- The current view is repository root; root deletion remains unavailable.
- A menu contains no available actions; no empty three-dots menu should be shown.
- A user cancels a delete confirmation; no content is deleted and the previous view remains usable.
- Content changes or disappears before confirmation; deletion must remain blocked or fail clearly according to the existing safety model.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present optional commands for non-git folders, files, and git folders through a consistent three-dots action menu.
- **FR-002**: The system MUST replace the non-git folder setup icon action entry point with the three-dots menu pattern.
- **FR-003**: The system MUST keep file optional commands in a three-dots menu and align its appearance and behavior with the folder menus.
- **FR-004**: The system MUST replace standalone git-folder action buttons with a three-dots menu containing those actions.
- **FR-005**: The system MUST hide the three-dots menu when no optional commands are available.
- **FR-006**: Delete menu items MUST use red text wherever they appear.
- **FR-007**: Non-destructive menu items MUST keep normal menu styling.
- **FR-008**: File deletion MUST require a confirmation step where the user types the exact displayed file name before deletion can proceed.
- **FR-009**: Folder deletion MUST continue to require a confirmation step where the user types the exact displayed folder name before deletion can proceed.
- **FR-010**: Delete confirmations MUST identify the target by name and location before the user can confirm.
- **FR-011**: The final delete action MUST remain unavailable until the typed confirmation exactly matches the required file or folder name.
- **FR-012**: Cancelling a delete confirmation MUST leave the file or folder unchanged.
- **FR-013**: Repository root deletion MUST remain unavailable.
- **FR-014**: Existing setup, creation, edit, view, and navigation actions MUST remain available after being moved into menus.
- **FR-015**: The menu pattern MUST be keyboard accessible and screen-reader understandable.

### Key Entities

- **Action Menu**: A three-dots control that groups optional commands for the current file, git folder, or non-git folder.
- **Menu Item**: A selectable command inside an action menu, categorized as destructive or non-destructive.
- **Delete Confirmation**: A safety step that identifies a target file or folder and requires exact typed-name confirmation.
- **Action Target**: The file or folder that a selected menu item will affect, including its display name and location.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of optional commands for non-git folders, files, and git folders are opened from a three-dots menu in validation.
- **SC-002**: 100% of delete menu items use red text in validation.
- **SC-003**: 100% of file and folder deletion attempts require exact typed-name confirmation before content is deleted.
- **SC-004**: Users can find optional actions for each supported item type in under 10 seconds during validation.
- **SC-005**: No existing non-destructive command is lost when action entry points are unified.
- **SC-006**: Keyboard-only validation can open each action menu, choose a command, and cancel any delete confirmation without deleting content.

## Assumptions

- "Optional commands" means item-level commands that are not the primary action of opening or navigating to the item.
- The existing folder delete impact and stale-preview safety behavior remains in scope and must not be weakened.
- File deletion currently exists and should be upgraded to typed-name confirmation rather than removed.
- Non-git folder setup actions remain available, but their entry point changes to the shared three-dots menu.
