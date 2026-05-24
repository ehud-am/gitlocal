# Feature Specification: Git Identity Settings

**Feature Branch**: `017-git-identity-settings`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "we need to revise and mature the implementation of the git identity section (name, email, path to ssh key file). few items: from ui perspective, ssh should be a file picker of a sort, on a mac starting with ~/.ssh folder, listing only files with valid ssh private key. I don't know if there is equavalent in windows, but let's use it if it exists. It should allow me to provide an arbitrary path as well. second topic is that i want the values to be presistent for a project, should we use .env for this? third we need to ensure that .env files are not sent to remote, so we need to see that the repo inlcudes a .gitignore and if it does, that the gitignore includes the .env file. if this is not the case, show a wanrning and be able to create or add .env to the gitignore upon uset approvale."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a Valid SSH Key for a Project (Priority: P1)

As a user configuring git identity for a project, I want to choose an SSH private key from a file-oriented selector that starts in my normal SSH key folder and filters out non-key files, so I can avoid typing paths and avoid selecting the wrong file.

**Why this priority**: The SSH key path is the riskiest and most error-prone field in the identity section; making valid key selection easy directly improves successful git operations.

**Independent Test**: Can be tested by opening the git identity settings for a project on a machine with SSH keys and confirming that the key selector starts in the expected SSH folder, lists only valid private key files, and saves a selected key.

**Acceptance Scenarios**:

1. **Given** a project with git identity settings open on macOS and the user has valid SSH private keys under the user's SSH folder, **When** the user opens the SSH key selector, **Then** the selector starts in the user's SSH folder and shows only valid SSH private key files.
2. **Given** a project with git identity settings open on a platform with a conventional user SSH folder, **When** the user opens the SSH key selector, **Then** the selector starts in that conventional SSH folder when it exists.
3. **Given** the user needs a key outside the suggested folder, **When** the user enters an arbitrary path, **Then** the system accepts the path only after confirming it points to a valid SSH private key file.

---

### User Story 2 - Persist Git Identity per Project (Priority: P2)

As a user working across multiple projects, I want each project to remember its git author name, email, and SSH key path, so I do not have to re-enter identity details every time I return to a project.

**Why this priority**: Project-specific persistence makes the settings practical for repeated use and prevents accidental reuse of identity values across unrelated repositories.

**Independent Test**: Can be tested by setting identity values for one project, leaving and reopening the project, and confirming the same values are restored without affecting another project.

**Acceptance Scenarios**:

1. **Given** a user enters a name, email, and valid SSH key path for a project, **When** the user saves the settings and later returns to the same project, **Then** the previously saved values are shown.
2. **Given** two projects have different identity settings, **When** the user switches between projects, **Then** each project shows its own saved values.
3. **Given** a project has no saved identity settings, **When** the user opens the identity section, **Then** the fields are empty or show existing project-derived defaults without silently copying values from another project.

---

### User Story 3 - Prevent Private Settings from Being Sent to Remote (Priority: P3)

As a user saving identity settings that may include private file paths or local secrets, I want the app to warn me when the project does not protect private settings from being committed, and I want a clear approval flow to add that protection.

**Why this priority**: Persisted identity settings can expose local environment details; users need visible protection before those values can accidentally be pushed to a remote.

**Independent Test**: Can be tested by opening identity settings in projects with no ignore file, an ignore file that omits private settings, and an ignore file that already protects private settings.

**Acceptance Scenarios**:

1. **Given** a project has no ignore file and the user saves persistent identity settings, **When** the system detects that private settings are not protected, **Then** it shows a warning and offers to create the ignore file with the required private-settings entry after user approval.
2. **Given** a project has an ignore file that does not protect private settings, **When** the user saves persistent identity settings, **Then** the system shows a warning and offers to add the required entry after user approval.
3. **Given** a project already protects private settings from being committed, **When** the user saves identity settings, **Then** no warning is shown.
4. **Given** the user declines to update the ignore file, **When** identity settings are saved or remain unsaved, **Then** the system clearly communicates that private settings are still not protected from commit until the ignore file is updated.

### Edge Cases

- The conventional SSH folder does not exist or is unreadable.
- The SSH folder contains public keys, config files, known hosts files, directories, broken links, or other non-private-key files.
- A private key is valid but passphrase-protected.
- The user enters a path that does not exist, points to a directory, points to a public key, or points to an unreadable file.
- The project is not a git repository or has no writable working tree.
- The ignore file exists but is unreadable, unwritable, or contains an equivalent private-settings pattern using project-specific formatting.
- The saved SSH key path later becomes invalid because the file was moved, deleted, or permissions changed.
- The user's home directory cannot be determined.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The git identity section MUST include editable project-level fields for author name, author email, and SSH private key path.
- **FR-002**: Users MUST be able to save and later retrieve git identity values independently for each project.
- **FR-003**: Saved identity values for one project MUST NOT appear as saved values for another project unless the user explicitly sets the same values there.
- **FR-004**: The SSH key selection experience MUST provide a file-oriented picker or browser that starts in the user's conventional SSH folder when that folder exists.
- **FR-005**: On macOS, the default SSH key browsing location MUST be the user's `~/.ssh` folder when it exists.
- **FR-006**: On Windows, the default SSH key browsing location MUST be the user's conventional SSH folder when it exists.
- **FR-007**: The SSH key selector MUST list only files that are valid SSH private keys and MUST exclude public keys, known hosts files, config files, directories, and unrelated files.
- **FR-008**: Users MUST be able to provide an arbitrary SSH key file path even when the file is outside the suggested folder.
- **FR-009**: The system MUST validate an arbitrary SSH key path before saving or using it as an SSH private key path.
- **FR-010**: The system MUST allow valid passphrase-protected private keys as valid key files without requiring the user to enter the passphrase in the identity settings.
- **FR-011**: The system MUST show a clear validation error when the SSH key path is missing, unreadable, not a file, or not a valid SSH private key, if the user attempts to save or use that key path.
- **FR-012**: The system MUST persist project identity values in project-local private settings that are intended to stay out of remote repositories.
- **FR-013**: Before or during persistence of private project settings, the system MUST check whether the project protects the private settings file from being committed.
- **FR-014**: If the project has no ignore file protecting private settings, the system MUST warn the user and offer to create one with the required private-settings entry.
- **FR-015**: If the project has an ignore file but it does not protect private settings, the system MUST warn the user and offer to add the required private-settings entry.
- **FR-016**: The system MUST update or create the ignore file only after explicit user approval.
- **FR-017**: If the user declines the ignore-file update, the system MUST keep the warning visible or otherwise clearly indicate that private project settings are not protected from being committed.
- **FR-018**: The system MUST recognize when the private-settings entry is already covered by the ignore file and MUST avoid adding duplicate entries.
- **FR-019**: The system MUST report clear, actionable errors if it cannot read or update the ignore file.
- **FR-020**: The system MUST avoid exposing the contents of the SSH private key in the identity settings, warnings, logs, or confirmation messages.

### Key Entities

- **Project Git Identity**: Project-specific author name, author email, SSH private key path, persistence status, and validation state.
- **SSH Private Key Candidate**: A local file that may be shown or accepted as an SSH private key, with attributes including file path, readability, and private-key validity.
- **Private Settings Protection State**: Whether the project has ignore-file coverage that prevents the private project settings file from being committed.
- **Ignore File Update Request**: A user-approved action to create or update the project's ignore file with the required private-settings entry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a machine with a conventional SSH folder, users can select and save a valid SSH private key for a project in under 30 seconds without typing the full path.
- **SC-002**: 95% of valid SSH private key files in the conventional SSH folder are shown in the selector, while public keys and non-key files are excluded.
- **SC-003**: After reopening a project, saved git identity values are restored correctly in 100% of tested project-switching scenarios.
- **SC-004**: In projects where private settings are not protected from commit, users see a warning before or at the time private settings are persisted in 100% of tested scenarios.
- **SC-005**: When users approve ignore-file protection, the project is updated so the private settings file is protected from commit in 100% of successful update attempts.
- **SC-006**: No tested warning, settings view, or message displays the contents of a private SSH key file.

## Assumptions

- Project-level persistence should use a project-local private settings file; `.env` is an acceptable default private settings file if it fits the existing product behavior.
- The private settings file that stores git identity values should be excluded from git history and remote pushes.
- A valid SSH private key includes common OpenSSH-compatible private key formats, including encrypted keys, as long as the file can be identified without requiring the passphrase.
- Windows users typically have a conventional SSH folder under their user profile; if it does not exist, the picker can fall back to manual path entry.
- The feature protects private settings from future commits; it does not remove files that were already committed before the warning or ignore-file update.
