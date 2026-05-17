# Feature Specification: Folder and Repository Capabilities

**Feature Branch**: `014-folder-repo-capabilities`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: User description: "let's make few changes: 1. let's add more capabilities for regular folders that are not under a git. Including see the full list of files, ability to view update delete create new file, etc. 2. for git repos the expanded view is a bit confusing, let's clean it up. presenting the current branch is not relevant as it is part of the short view already. instead in the right column of the first expanded view, let's move there the remote repo, so we can see the local repo against the remote repo in a single line. 3. the field \"Upstream sync\" is not needed. 4. the option for commit and check remote sync are not needed (for these i use a different tool). under the git identity let's add the path to the ssh key. i should be able to view that and edit it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Non-Git Folders (Priority: P1)

A user opens a regular folder that is not a git repository and can inspect the complete file list, open file contents, create a new file, edit an existing file, and delete a file from the same viewer experience.

**Why this priority**: Regular folders currently expose less capability than git repositories, which limits the product's value as a local project browser and editor.

**Independent Test**: Can be tested by opening a non-git folder with nested files, viewing the file list, opening a file, creating a file, editing a file, and deleting a file without initializing git.

**Acceptance Scenarios**:

1. **Given** a selected folder that is not under git, **When** the user expands or opens it, **Then** the user sees the full browsable list of files and folders.
2. **Given** a selected non-git folder with a text file, **When** the user opens the file, **Then** the file contents are shown in a readable view.
3. **Given** a selected non-git folder, **When** the user creates a new file with a valid path and content, **Then** the new file appears in the folder list and can be opened.
4. **Given** a selected non-git folder with an editable text file, **When** the user changes and saves the file content, **Then** reopening the file shows the updated content.
5. **Given** a selected non-git folder with a file, **When** the user deletes the file and confirms the action, **Then** the file is removed from the folder list.

---

### User Story 2 - Compare Local and Remote Repository Identity (Priority: P2)

A user expands a git repository and immediately sees the local repository path and the remote repository side by side in the first expanded row, without repeated branch information or upstream sync status.

**Why this priority**: The expanded repository view should reduce confusion and emphasize the relationship between the local checkout and its remote source.

**Independent Test**: Can be tested by expanding a git repository with a configured remote and verifying the first expanded view presents local path and remote repository in a single readable row while omitting redundant or unused fields.

**Acceptance Scenarios**:

1. **Given** a git repository with a remote configured, **When** the user expands the repository, **Then** the first expanded view shows the local repository and remote repository in the same row.
2. **Given** the repository branch is already visible in the compact row, **When** the user expands the repository, **Then** the expanded view does not repeat the current branch field.
3. **Given** a git repository is expanded, **When** the user reviews synchronization details, **Then** no "Upstream sync" field is shown.

---

### User Story 3 - Manage SSH Key Path in Git Identity (Priority: P3)

A user reviews a git repository's identity settings and can see and edit the SSH key path associated with that repository's git identity.

**Why this priority**: The SSH key path is relevant to repository access and identity, while commit and remote-sync actions are handled by another tool and should not distract from configuration review.

**Independent Test**: Can be tested by opening git identity details for a repository, viewing the configured SSH key path, updating it, and confirming the new path is shown afterward.

**Acceptance Scenarios**:

1. **Given** a git repository is selected, **When** the user opens git identity details, **Then** the SSH key path is visible with the rest of the identity information.
2. **Given** a git repository identity has an SSH key path, **When** the user edits and saves the path, **Then** the updated SSH key path is displayed in git identity details.
3. **Given** a git repository is expanded, **When** the user opens available actions, **Then** commit and remote sync check actions are not offered.

---

### Edge Cases

- A selected non-git folder is empty.
- A non-git folder contains nested folders, ignored-looking filenames, hidden files, binary files, or very large files.
- A requested file operation targets a path that no longer exists because it was changed outside the app.
- A user attempts to create a file where a file or folder already exists.
- A user attempts to edit or delete a file without filesystem permission.
- A git repository has no remote configured.
- A git repository has multiple remotes configured.
- A git repository has no SSH key path configured yet, or the configured path does not exist.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to browse the full file and folder list for a selected regular folder that is not part of a git repository.
- **FR-002**: Users MUST be able to open and view readable file contents from a selected regular folder.
- **FR-003**: Users MUST be able to create a new file in a selected regular folder, including in nested locations within that folder.
- **FR-004**: Users MUST be able to update the contents of an editable file in a selected regular folder.
- **FR-005**: Users MUST be able to delete a file from a selected regular folder after an explicit confirmation.
- **FR-006**: The system MUST prevent regular-folder file operations from targeting paths outside the selected folder.
- **FR-007**: The system MUST clearly report file operation failures, including missing paths, duplicate paths, permission issues, unsupported file types, and files changed outside the app.
- **FR-008**: The first expanded view for a git repository MUST show the local repository path and remote repository in the same row.
- **FR-009**: The expanded git repository view MUST omit current branch information when that information is already shown in the compact repository row.
- **FR-010**: The expanded git repository view MUST omit the "Upstream sync" field.
- **FR-011**: Git repository action menus MUST omit commit actions and remote sync check actions.
- **FR-012**: Git identity details MUST show the SSH key path associated with the repository.
- **FR-013**: Users MUST be able to edit and save the SSH key path shown in git identity details.
- **FR-014**: When no remote repository or SSH key path is available, the system MUST show a clear empty state rather than misleading or stale values.
- **FR-015**: Changes to regular-folder files and git identity SSH key path MUST be visible after refresh or after leaving and returning to the affected folder or repository.

### Key Entities *(include if feature involves data)*

- **Regular Folder**: A selected local folder that is not part of a git repository; includes a display name, absolute path, nested file and folder entries, and operation eligibility.
- **File Entry**: A file or folder within a regular folder; includes name, relative path, type, size or readability status when available, and last-known operation state.
- **Git Repository Summary**: The compact and expanded presentation of a local git repository; includes local path, current branch in the compact row, remote repository in the expanded view, and available actions.
- **Git Identity**: Repository identity information; includes user-facing identity fields and the editable SSH key path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open a non-git folder and locate a known file in under 30 seconds for folders containing up to 500 visible entries.
- **SC-002**: A user can create, edit, and delete a text file in a non-git folder in under 2 minutes without leaving the app.
- **SC-003**: In usability review, at least 90% of users correctly identify the local repository and remote repository relationship from the first expanded git repository view.
- **SC-004**: In usability review, at least 90% of users report that the expanded git repository view contains no redundant branch or upstream sync information.
- **SC-005**: A user can view and update a repository SSH key path in under 60 seconds from the git identity area.
- **SC-006**: 100% of unavailable or failed file and identity operations produce a visible, user-readable outcome explaining what happened.

## Assumptions

- "Regular folders" means selected local folders that are not inside a git worktree and are not themselves git repositories.
- File viewing and editing is limited to file types the app can safely present as editable text; unsupported or binary files should be identified clearly.
- Folder creation and folder deletion are not expanded by this feature beyond what already exists elsewhere in the product.
- Deleting a file requires explicit confirmation because it changes local filesystem contents.
- For repositories with multiple remotes, the primary remote shown in the first expanded view is the default remote used by the existing repository summary conventions.
- Removing commit and remote sync check actions means removing them from this app's repository actions; external tools remain the user's workflow for those tasks.
