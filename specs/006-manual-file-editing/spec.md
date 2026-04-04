# Feature Specification: Manual Local File Editing

**Feature Branch**: `006-manual-file-editing`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: User description: "Let's create an option to create/update/delete local files. The goal is not to replace an IDE, but instead for code development done primarily with tools like codex or claude code, add the ability to do minor changes manually."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Make a Small File Fix Inline (Priority: P1)

When a user notices a small issue while browsing a repository in GitLocal, they can make a focused edit to an existing local file without leaving the app or switching to a full IDE.

**Why this priority**: The core value of this feature is reducing context switching for quick corrections during AI-assisted development. Updating an existing file is the most common and immediate manual intervention.

**Independent Test**: Open an existing editable local file, make a short content change, save it, and confirm the file reflects the update afterward.

**Acceptance Scenarios**:

1. **Given** a user is viewing an existing local text file, **When** they enter edit mode, modify the content, and save, **Then** the updated file content is written to that same local file.
2. **Given** a user has unsaved edits to an existing file, **When** they attempt to leave the editing flow, **Then** the system warns them before discarding those unsaved changes.
3. **Given** a user saves a valid change to an existing file, **When** the save completes, **Then** the interface shows that the edit succeeded and returns the user to a readable view of the updated file.
4. **Given** a user is viewing a non-current branch or historical file state, **When** they view that file, **Then** manual editing actions are unavailable for that non-working-tree context.

---

### User Story 2 - Add a Missing File Quickly (Priority: P2)

When a user realizes a small supporting file is missing, they can create a new local file from inside the app so they can keep momentum during a coding session.

**Why this priority**: Creating a file is valuable for lightweight workflows, but it is secondary to editing because it happens less often and usually follows the same lightweight editing pattern.

**Independent Test**: Start a file-creation flow, provide a valid new file path and initial content, save it, and confirm the new file appears in the repository view with the saved contents.

**Acceptance Scenarios**:

1. **Given** a user is browsing a local repository, **When** they choose to create a new file, enter a valid file path and content, and save, **Then** the new file is created in that local repository location.
2. **Given** a user chooses a file path that already exists, **When** they attempt to create the new file, **Then** the system prevents accidental overwrite and explains that the path is already in use.
3. **Given** a user successfully creates a new file, **When** the save completes, **Then** the new file is visible in the app and can be opened immediately.
4. **Given** a user provides a valid new file path whose parent folders do not yet exist inside the opened repository, **When** they save the file, **Then** the system creates the needed parent folders as part of the same successful file-creation action.

---

### User Story 3 - Remove an Unneeded File Safely (Priority: P3)

When a user identifies an obsolete or mistaken local file, they can delete it from inside the app with a clear confirmation step so cleanup does not require a separate tool.

**Why this priority**: Deletion is useful for lightweight cleanup, but it is less frequent than editing and creation and carries more risk, so it follows after the primary authoring flows.

**Independent Test**: Select an existing local file, trigger delete, confirm the deletion, and verify that the file is removed from the repository view and local filesystem.

**Acceptance Scenarios**:

1. **Given** a user selects an existing local file, **When** they choose delete and confirm the action, **Then** the system removes that file from the local repository and updates the visible file list.
2. **Given** a user selects delete for a file, **When** they cancel at the confirmation step, **Then** the file remains unchanged and available.
3. **Given** the system cannot complete a requested deletion, **When** the delete action fails, **Then** the user sees that the file was not removed and receives a clear failure message.

### Edge Cases

- What happens when a user tries to edit, create, or delete a path outside the currently opened local repository?
- How does the system handle an attempt to save or delete a file that changed on disk after the user opened it in the app?
- What happens when a user tries to create an empty-named file, a file in a missing parent path, or a path that resolves to a folder instead of a file?
- How does the system handle binary or otherwise non-text files that are not suitable for lightweight inline editing?
- What happens when the user starts creating a new file or editing an existing file and then refreshes, navigates away, or switches to another file before saving?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to open an inline editing flow for an existing local text file within the currently opened repository.
- **FR-002**: The system MUST allow users to save manual content changes back to that same local file.
- **FR-003**: The system MUST warn users before they lose unsaved manual edits through navigation, closing, refresh, or mode changes.
- **FR-003a**: Those unsaved-change warnings MAY be delivered through in-app confirmation UI for in-app navigation and browser-native confirmation behavior for page refresh or tab-close scenarios.
- **FR-004**: The system MUST allow users to start a new-file flow from within the currently opened local repository.
- **FR-005**: Users MUST be able to specify the intended file path and initial file content before creating a new file.
- **FR-006**: The system MUST prevent creation when the requested file path already exists as a file or folder and explain why the action was blocked.
- **FR-006a**: When a requested new file path is otherwise valid but includes missing parent folders within the currently opened repository, the system MUST create those parent folders as part of the successful file-creation flow.
- **FR-007**: The system MUST allow users to delete an existing local file from within the currently opened repository.
- **FR-008**: The system MUST require an explicit user confirmation step before permanently deleting a local file.
- **FR-009**: The system MUST limit create, update, and delete actions to files inside the currently opened local repository and MUST block attempts to act on paths outside that boundary.
- **FR-009a**: The system MUST allow create, update, and delete actions only for the currently opened repository's working-tree view and MUST NOT offer those mutation actions while the user is viewing a non-current branch or historical file state.
- **FR-010**: The system MUST provide clear success feedback after a file is created, updated, or deleted.
- **FR-011**: The system MUST provide clear failure feedback when a requested file action cannot be completed and MUST leave the existing file state unchanged when the action fails.
- **FR-012**: The system MUST refresh the visible repository/file view after a successful create, update, or delete so the user can immediately see the resulting file state.
- **FR-013**: The system MUST treat this feature as a lightweight manual editing aid and MUST NOT require users to manage multiple open files, complex project-wide editing workflows, or IDE-style editing sessions.
- **FR-014**: The system MUST only offer inline content editing for files that can be reasonably presented and modified as text in a lightweight editor.

### Key Entities *(include if feature involves data)*

- **Editable Local File**: A file inside the currently opened repository that can be shown and modified as lightweight text content.
- **New File Draft**: The in-progress file path and initial content a user enters before creating a new file.
- **Pending File Change**: Unsaved user-entered content modifications or a requested delete action awaiting confirmation or completion.
- **Repository Boundary**: The currently opened local repository scope that defines which file paths are allowed for manual create, update, and delete actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of successful manual edits to existing text files are reflected in the local file content immediately after save.
- **SC-002**: In validation testing, 100% of successful new-file actions create the requested file in the selected repository location without overwriting an existing path.
- **SC-003**: In validation testing, 100% of delete actions require explicit confirmation before the file is removed.
- **SC-004**: In validation testing, 100% of attempted file actions targeting paths outside the opened repository are blocked.
- **SC-005**: In usability review, users can complete a small file create, update, or delete task without leaving the app for an external editor.

## Assumptions

- The feature is intended for local repositories already opened in GitLocal and does not need to support remote-only repositories.
- Lightweight editing is limited to minor text-based file work and does not need to match the breadth of a full IDE editing experience.
- The initial version can focus on whole-file editing rather than advanced editing tools such as multi-file tabs, refactor workflows, or live collaboration.
- Users still rely on tools such as Codex, Claude Code, or a full IDE for larger authoring tasks, with this feature covering only quick manual interventions.
- Missing parent folders for a valid new file path may be created automatically as part of file creation, as long as the resulting path stays inside the opened repository boundary.
