# Feature Specification: Folder Create And Delete

**Feature Branch**: `011-folder-create-delete`  
**Created**: 2026-05-02  
**Status**: Draft  
**Input**: User description: "minro release. Add the ability to create and delete folders. The use case: I'm in a git folder and i want to create a new subfolder, i should be able to do that from gitlocal directly. a second use case, i'm in a folder and i want to delete the folder and all of the content inside it. In this case we need a strong confirmation that explains what will happen, how many files (that are inside the folder) will be deleted, and the confirmation is not just a click of a button, but something that actually requires me to type the name of the content (similar to how you delete a repo in github)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Subfolder (Priority: P1)

As a user browsing a git repository in gitlocal, I want to create a new subfolder inside the folder I am currently viewing so that I can organize work without leaving gitlocal.

**Why this priority**: Folder creation is the lowest-risk and most common folder management action, and it enables users to continue organizing repository content directly in the product.

**Independent Test**: Can be fully tested by opening a repository folder, creating a named subfolder, and confirming the new folder appears in the current location and can be opened.

**Acceptance Scenarios**:

1. **Given** a user is viewing a folder in a git repository, **When** they create a subfolder with a valid unused name, **Then** the new folder is created inside the current folder and appears in the folder listing.
2. **Given** a user starts creating a subfolder, **When** they provide an empty name, reserved name, unsafe path, or name already used in the current folder, **Then** no folder is created and the user sees a clear reason they can correct.

---

### User Story 2 - Delete a Folder With Strong Confirmation (Priority: P2)

As a user browsing a folder in gitlocal, I want to delete that folder and everything inside it only after a strong confirmation step so that I can remove unwanted content while being protected from accidental data loss.

**Why this priority**: Recursive folder deletion is valuable but destructive. It must be intentionally gated before it is safe enough to expose.

**Independent Test**: Can be fully tested by opening a folder containing files and nested folders, starting deletion, reviewing the warning, typing the required folder name, confirming deletion, and verifying the folder and all nested content are gone.

**Acceptance Scenarios**:

1. **Given** a user is viewing or selecting a folder, **When** they choose to delete it, **Then** gitlocal shows a confirmation that identifies the folder, explains that the folder and all contents will be deleted, and states how many files inside the folder will be deleted.
2. **Given** the deletion confirmation is displayed, **When** the user has not typed the exact required folder name, **Then** the destructive confirmation action remains unavailable and no content is deleted.
3. **Given** the user types the exact required folder name and confirms deletion, **When** deletion completes, **Then** the folder and all nested contents are removed and the user is returned to the nearest remaining parent folder.
4. **Given** a deletion cannot be completed for any item inside the folder, **When** the user confirms deletion, **Then** gitlocal preserves any content it cannot safely remove and reports what prevented completion.

---

### User Story 3 - Understand Delete Impact Before Confirming (Priority: P3)

As a cautious user, I want the delete confirmation to make the consequences obvious before I type the folder name so that I can decide whether to continue or cancel.

**Why this priority**: Users need enough context to avoid deleting the wrong folder, especially when folder names are similar or nested deeply.

**Independent Test**: Can be fully tested by opening the delete confirmation for folders with different depths and file counts, then verifying the displayed folder identity and deletion count match the selected folder.

**Acceptance Scenarios**:

1. **Given** a folder contains nested folders and files, **When** the deletion confirmation opens, **Then** the displayed file count includes files at all nested levels inside the folder.
2. **Given** a folder contains no files, **When** the deletion confirmation opens, **Then** the confirmation clearly states that zero files will be deleted while still requiring typed confirmation for the folder itself.

### Edge Cases

- A user attempts to create a folder with a name that is blank, whitespace-only, already used, reserved by the operating environment, or contains path traversal.
- A user attempts to create a folder in a location that is no longer available or cannot be changed.
- A user attempts to delete the repository root; the action is blocked because this feature is limited to deleting subfolders.
- A user opens deletion confirmation, then the folder contents change before confirmation; gitlocal must refresh or revalidate the impact before deleting.
- A folder contains ignored, untracked, modified, hidden, or nested files; the deletion warning and delete action treat them as content inside the folder.
- A user cancels the confirmation; no files or folders are deleted.
- A deletion is partially blocked by permissions, file locks, or external changes; gitlocal reports the failure without claiming a complete deletion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a new subfolder inside the repository folder they are currently viewing.
- **FR-002**: The system MUST validate new folder names before creation and reject names that are empty, duplicate an existing item in the target folder, represent unsafe paths, or cannot be created in the current environment.
- **FR-003**: After a folder is created successfully, the system MUST update the current folder view so the new folder is visible without requiring the user to manually refresh.
- **FR-004**: Users MUST be able to initiate deletion for a subfolder from a folder browsing context.
- **FR-005**: The system MUST block deletion of the repository root through this feature.
- **FR-006**: Before deleting a folder, the system MUST show a strong confirmation that includes the folder name, its location, a plain-language statement that the folder and all contents will be deleted, and the number of files contained inside the folder across all nested levels.
- **FR-007**: The system MUST require the user to type the exact folder name shown in the confirmation before the final deletion action is enabled.
- **FR-008**: The system MUST NOT delete any folder contents from the initial delete prompt alone; deletion can occur only after the typed confirmation requirement is satisfied and the user explicitly confirms.
- **FR-009**: The system MUST revalidate the folder's existence and deletion impact at confirmation time so the user does not confirm against stale information.
- **FR-010**: When deletion completes, the system MUST remove the selected folder and all contents inside it, including nested files and folders that belong to that folder.
- **FR-011**: After successful deletion, the system MUST navigate to or refresh the nearest remaining parent folder and show that the deleted folder is no longer present.
- **FR-012**: If folder creation or deletion fails, the system MUST preserve existing content and present a clear, actionable error message.
- **FR-013**: The system MUST treat tracked, untracked, ignored, hidden, and modified files inside the selected folder as content that will be counted and deleted when the user completes the confirmation.

### Key Entities

- **Repository Folder**: A folder inside the currently opened git repository. Key attributes include name, location, parent folder, child folders, and contained files.
- **Folder Creation Request**: A user's intent to add a new subfolder at the current location. Key attributes include target parent folder, requested folder name, validation result, and completion status.
- **Folder Deletion Request**: A user's intent to delete a selected subfolder recursively. Key attributes include selected folder, displayed folder identity, nested file count, required typed confirmation value, confirmation status, and completion result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users can create a valid subfolder from the current folder view in under 30 seconds.
- **SC-002**: 100% of folder deletion attempts require exact typed folder-name confirmation before any content is deleted.
- **SC-003**: 100% of deletion confirmations display the selected folder identity and nested file count before the user can confirm.
- **SC-004**: Users can cancel 100% of deletion confirmations without changing repository contents.
- **SC-005**: After successful create or delete actions, the folder view reflects the changed folder structure within 2 seconds for typical repositories.
- **SC-006**: In usability testing, at least 90% of users can correctly identify what folder will be deleted and how many files are affected before confirming.

## Assumptions

- "minro release" is interpreted as "minor release"; the feature is limited to folder creation and folder deletion rather than broader file management.
- Folder creation targets the folder currently being viewed, not arbitrary paths outside the visible repository context.
- Folder deletion applies only to subfolders inside the opened repository, not the repository root itself.
- The typed confirmation value is the selected folder's exact displayed name, matching the user's GitHub-style confirmation expectation.
- The file count shown for deletion includes files at all nested levels inside the folder and excludes folders from that numeric file count unless separately presented.
- Deletion is intended to remove local working tree content; any later git staging, committing, or syncing behavior is outside this feature's scope unless provided by existing product flows.
