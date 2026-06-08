# Feature Specification: Share and Copy Regression Patch

**Feature Branch**: `023-share-copy-regressions`  
**Created**: 2026-06-08  
**Status**: Draft  
**Input**: User description: "we need to solve few bugs and regressions: 1. the \"copy\" option should be an icon + label button (right now it is just a link). 2. The copy button should be available for all text based files, including the raw data and the rendered data for everything. 3. let's remove the email and slack options. 4. let's add an icon for share. 5. \"save pdf\" did not work. 6. let's remove \"print\". 7. \"find in file\", \"refresh\", \"light/dark theme\" let's add icons to each button. 8. when opening a git folder, somehow the system does not recognize it. Please check what happened and suggest a fix. This is a patch, bug fixes release."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy Text From Any Text View (Priority: P1)

As a reader or lightweight reviewer, I want a clear Copy button wherever I am viewing text-based file content, so I can copy source text or rendered text without hunting for a link or switching tools.

**Why this priority**: Copying file content is a core lightweight intervention workflow, and the current link presentation makes the action look secondary and inconsistent.

**Independent Test**: Can be fully tested by opening multiple text-based file types, including files with rendered and raw views, and confirming that Copy is visible as an icon-and-label button and copies the currently intended text content.

**Acceptance Scenarios**:

1. **Given** a user opens a text-based file in raw view, **When** the user looks at the file actions, **Then** Copy appears as a button with both an icon and the label "Copy".
2. **Given** a user opens a text-based file with a rendered view, **When** the user switches between rendered and raw views, **Then** Copy remains available for the active text representation.
3. **Given** a user activates Copy from a rendered text view, **When** the copy completes, **Then** the copied content matches the visible rendered text in a useful text form.
4. **Given** a user activates Copy from a raw text view, **When** the copy completes, **Then** the copied content matches the source text of the file.

---

### User Story 2 - Use Focused Share and Export Actions (Priority: P1)

As a user sharing local file content, I want the share area to show only supported and working actions, so I do not waste time on broken or unavailable destinations.

**Why this priority**: Broken Save PDF and unsupported Email, Slack, and Print options undermine trust in the share surface.

**Independent Test**: Can be fully tested by opening a share-capable text file and verifying that unsupported actions are absent, Share has an icon, and Save PDF completes successfully for rendered text content.

**Acceptance Scenarios**:

1. **Given** a user opens a share-capable text file, **When** the user views share actions, **Then** Email and Slack options are not shown.
2. **Given** a user opens a share-capable text file, **When** the user views share actions, **Then** Print is not shown.
3. **Given** a user sees the Share action, **When** the action is displayed, **Then** it includes a recognizable icon in addition to its label.
4. **Given** a user opens rendered text content, **When** the user chooses Save PDF, **Then** the user can successfully save a PDF containing the rendered content.
5. **Given** Save PDF cannot complete because of an environment limitation, **When** the user attempts the action, **Then** the app clearly reports that the PDF could not be saved and preserves the user's current view.

---

### User Story 3 - Recognize Opened Git Folders Reliably (Priority: P1)

As a user opening an existing git project folder, I want GitLocal to recognize it as a git folder, so repository-aware browsing and actions are available immediately.

**Why this priority**: Failing to identify git folders blocks the product's primary use case and may be a regression from recent folder capability changes.

**Independent Test**: Can be fully tested by opening known git repositories, non-git folders, and nested folders inside repositories, then verifying the app classifies each folder correctly and documents the diagnosed regression cause with the proposed fix.

**Acceptance Scenarios**:

1. **Given** a user opens a folder that is the root of a git repository, **When** the folder loads, **Then** the app recognizes it as a git folder and enables repository-aware behavior.
2. **Given** a user opens a nested folder inside a git repository, **When** the folder loads, **Then** the app recognizes the containing repository when that behavior is already supported by the product.
3. **Given** a user opens a folder that is not inside a git repository, **When** the folder loads, **Then** the app does not falsely classify it as a git folder.
4. **Given** the regression is investigated, **When** the patch is planned, **Then** the team has a documented cause and proposed fix before implementation proceeds.

---

### User Story 4 - Scan Toolbar Actions Quickly (Priority: P2)

As a user navigating file content, I want common toolbar actions to include recognizable icons, so I can scan and use controls faster.

**Why this priority**: Find, Refresh, and Theme are frequent controls, but this is less blocking than copy, export, and git-folder recognition.

**Independent Test**: Can be fully tested by opening the content view and confirming that Find in File, Refresh, and Light/Dark Theme each display an appropriate icon with their existing labels or accessible names.

**Acceptance Scenarios**:

1. **Given** a user views the file toolbar, **When** Find in File is available, **Then** the control includes an appropriate icon.
2. **Given** a user views the file toolbar, **When** Refresh is available, **Then** the control includes an appropriate icon.
3. **Given** a user views the file toolbar, **When** Light/Dark Theme is available, **Then** the control includes an appropriate icon that reflects theme switching.

### Edge Cases

- Text-based files with no rendered mode still show Copy for the raw text only.
- Empty text files can be copied and produce empty clipboard content without an error.
- Very large text files do not cause the toolbar to become unusable or block the current view while preparing copy or PDF output.
- Files with rendered content that differs from source text make it clear which representation is being copied or saved.
- Clipboard or PDF permission failures produce a clear failure state without navigating away or losing the active file selection.
- Git folders with unusual but valid repository layouts are recognized consistently with the product's existing repository support.
- Non-git folders and ignored folders are not misidentified as repositories.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST present Copy as a button with both a recognizable icon and the visible label "Copy" wherever Copy is available.
- **FR-002**: The app MUST make Copy available for every supported text-based file view.
- **FR-003**: The app MUST support copying raw source text for text-based files.
- **FR-004**: The app MUST support copying rendered text output when a text-based file has a rendered representation.
- **FR-005**: The app MUST provide clear feedback when copying succeeds or fails.
- **FR-006**: The app MUST remove Email and Slack options from the share surface.
- **FR-007**: The app MUST show a recognizable icon for the Share action.
- **FR-008**: The app MUST make Save PDF complete successfully for supported rendered text content.
- **FR-009**: The app MUST provide a clear failure message if Save PDF cannot complete in the user's environment.
- **FR-010**: The app MUST remove Print from the visible action surface for this patch release.
- **FR-011**: The app MUST add recognizable icons to Find in File, Refresh, and Light/Dark Theme controls while preserving their current purpose.
- **FR-012**: The app MUST correctly classify opened git repository root folders as git folders.
- **FR-013**: The app MUST preserve correct classification for non-git folders.
- **FR-014**: The app MUST verify nested git-folder behavior against the product's existing expectations and prevent regressions for supported nested repository use cases.
- **FR-015**: The patch plan MUST document the diagnosed cause of the git-folder recognition regression and the proposed fix before implementation.
- **FR-016**: The patch MUST preserve the existing local-first behavior and must not add hosted sharing, email-provider, Slack-provider, or print-service integrations.

### Key Entities

- **Text-Based File View**: A readable file view whose content can be represented as text, including raw source text and, when available, rendered text.
- **Rendered Text Output**: User-facing transformed text content, such as rendered Markdown, that can be copied or saved separately from the raw source.
- **Share Action Surface**: The visible group of actions users use to copy, share, or export content.
- **Folder Classification**: The app's determination of whether an opened folder is a git repository, inside a git repository, or not associated with git.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In supported text-file views, users can identify and activate Copy within 5 seconds without relying on hidden menus.
- **SC-002**: Copy succeeds for raw text and rendered text in at least 95% of manual QA attempts across representative text-based files.
- **SC-003**: Email, Slack, and Print are absent from the share/action surface in 100% of affected views.
- **SC-004**: Save PDF succeeds for representative rendered text files during patch validation, including at least one multi-section document.
- **SC-005**: Known git repository root folders are classified correctly in 100% of regression test cases.
- **SC-006**: Known non-git folders are not falsely classified as git folders in 100% of regression test cases.
- **SC-007**: Find in File, Refresh, Light/Dark Theme, Share, and Copy all have recognizable icons with no loss of keyboard or screen-reader usability.

## Assumptions

- The patch release is scoped to fixing and polishing existing share, copy, export, toolbar, and folder-recognition behavior rather than adding new sharing destinations.
- "All text based files" means file types the app already treats as readable text, not binary files or unsupported encodings.
- Rendered copy and Save PDF apply only where the app has a rendered text representation available.
- Removing Print means removing the explicit visible Print action; users may still use operating-system or browser-level print commands outside GitLocal's in-app action surface.
- The git-folder issue should be investigated during planning and implementation, with the cause and proposed fix captured in the planning artifacts or release review.
