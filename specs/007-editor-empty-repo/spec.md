# Feature Specification: Editor Workspace and Empty Repo UX

**Feature Branch**: `007-editor-empty-repo`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: User description: "Improve the file edit experience so the edit window is larger and makes better use of the available space, and improve the empty repository experience for newly initialized local git repos with no README so the page feels intentional instead of broken."

## Clarifications

### Session 2026-04-04

- Q: When a user opens a folder, should GitLocal show an in-panel directory view with buttons, double-click navigation, or one interaction only? → A: Show an in-panel directory view with both explicit action buttons and double-click support.
- Q: Should GitLocal show the "Pick up where you left off" recovery message in the main view after repository context resets? → A: No, remove that message from the main view.
- Q: What should the main content area show by default while browsing repository folders? → A: Show a list view of the current folder's files and subfolders in the main view.
- Q: What visual style should the in-repo folder list use? → A: Use a similar look and feel to the existing non-git folder browser.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit comfortably in-place (Priority: P1)

As a person editing a file in GitLocal, I want the edit view to use the available page space well so I can read and modify longer files without feeling constrained by a small editing area.

**Why this priority**: Editing files is a core workflow. When the editor appears cramped inside a large window, the product feels harder to use even when the rest of the page has ample room.

**Independent Test**: Open an existing file in edit mode on a desktop-sized window and verify that the editing surface expands to fill most of the available content area while keeping save and cancel actions visible and usable.

**Acceptance Scenarios**:

1. **Given** a user opens a file for editing in a wide desktop window, **When** the edit screen is shown, **Then** the editable area occupies most of the main content region rather than appearing as a small box surrounded by unused whitespace.
2. **Given** a user is editing a long file, **When** they scroll within the editor, **Then** they can view and edit a large amount of content at once without the page layout making the experience feel cramped.
3. **Given** a user enters edit mode from a file page, **When** the layout expands, **Then** the file title and primary actions remain easy to find and do not overlap or disappear.

---

### User Story 2 - Land gracefully in an empty repository (Priority: P2)

As a person opening a newly initialized repository with little or no content, I want the initial view to clearly explain the repository state and suggest useful next actions so the interface feels intentional and welcoming.

**Why this priority**: First impressions matter. A sparse repository without a README is a common early-project state, and a blank-looking page can make the product seem broken or incomplete.

**Independent Test**: Open a local repository that has been initialized but has no README file and verify that the primary content area shows a purposeful empty-state message with guidance instead of a visually awkward blank screen.

**Acceptance Scenarios**:

1. **Given** a user opens a repository that has no README file, **When** the default repository view loads, **Then** the page explains that no README is available and presents the repository as empty or newly initialized rather than broken.
2. **Given** a user opens a repository that contains files but still has no README file, **When** the default view loads, **Then** the empty-state message distinguishes the missing README from an entirely empty repository and still guides the user toward browsing files.
3. **Given** a user switches from one repository to another and the saved file context no longer applies, **When** GitLocal resets context, **Then** the main view falls back to the current folder list without showing a custom recovery message in the content area.

---

### User Story 3 - Recover quickly from the default landing state (Priority: P3)

As a person exploring a repository from its default landing state, I want the main view to immediately show the current folder contents so I can continue browsing without extra explanation screens.

**Why this priority**: The fastest way to recover from a default or reset state is to put useful repository content in front of the user immediately, instead of asking them to interpret a special recovery message.

**Independent Test**: Open a repository in the default landing state and confirm that the main view shows the current folder contents in a list layout that allows the user to open files or folders immediately.

**Acceptance Scenarios**:

1. **Given** a user lands in a repository state with no primary document to display, **When** they look at the main content area, **Then** they see the current folder's files and folders in a list they can act on immediately.
2. **Given** a user is unfamiliar with GitLocal, **When** they see the folder list in the main view, **Then** they can understand how to continue browsing without a separate explanatory recovery panel.

---

### User Story 4 - Browse folders in the content area (Priority: P2)

As a person opening a folder in GitLocal, I want the main content area to show the folder contents and let me open items from there so the app feels complete instead of broken when no file is selected.

**Why this priority**: Folder selection is a basic browsing action. Showing an error or blank state for folders breaks the core repository-navigation experience and makes the product feel unreliable.

**Independent Test**: Open a folder from the tree and verify the content panel lists child files and folders in the same general style as the non-git folder browser, allows activation with a button, and supports double-click navigation.

**Acceptance Scenarios**:

1. **Given** a user selects a folder in the repository tree, **When** the folder view opens, **Then** the main content area lists the folder's immediate files and folders in a list view instead of showing an error state.
2. **Given** a user views a folder in the content area, **When** they click the provided action button for a child item, **Then** GitLocal opens that file or folder.
3. **Given** a user views a folder in the content area, **When** they double-click a child item, **Then** GitLocal opens that file or folder without requiring the action button.
4. **Given** a folder view is shown in the main content area, **When** the user compares it to the existing non-git folder browser, **Then** the row layout, action placement, and overall presentation feel visually consistent.
5. **Given** a folder has no visible children, **When** its folder view opens, **Then** the content area shows an intentional empty-folder message rather than a broken or generic error state.

### Edge Cases

- What happens when the user opens a repository that has no commits yet and therefore little metadata to display?
- What happens when a repository contains a README in a non-default location or casing that is not selected as the landing file?
- How does the system behave when the editor is opened on a very small window so the layout cannot expand to the same degree as on desktop?
- How does the empty state behave when a context-reset banner is shown at the same time?
- How does the content panel behave when a folder contains many entries or a mix of files and folders?
- What happens when markdown source includes commented lines or hidden comment blocks that should not be shown in rendered output?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present file editing in a layout that uses the majority of the main content area available for the current window size.
- **FR-002**: The system MUST size the editable region so that users can work with long file contents without excessive unused whitespace around the editor.
- **FR-003**: The system MUST keep primary editing actions visible and understandable while the edit workspace is expanded.
- **FR-004**: The system MUST provide a deliberate empty-state experience when the repository landing view cannot show a README file.
- **FR-005**: The system MUST explain whether the current repository appears newly initialized, lacks a README, or has had its saved file context reset.
- **FR-006**: The system MUST present at least one clear next step from the empty repository state, such as browsing files, creating a first file, or moving to a parent folder.
- **FR-007**: The system MUST avoid layouts in the empty repository state that visually resemble a broken or unfinished screen.
- **FR-008**: The system MUST preserve the user’s ability to navigate the repository while showing the empty-state guidance.
- **FR-009**: The system MUST suppress markdown comments or commented source lines that are intended to stay hidden from rendered markdown output.
- **FR-010**: The system MUST use the current folder list as the default main-view fallback when no primary file is selected.
- **FR-011**: The system MUST NOT show the "Pick up where you left off" recovery message or an equivalent custom recovery panel in the main content area.
- **FR-012**: The system MUST render a directory list view in the main content area when the selected path is a folder.
- **FR-013**: The system MUST list the selected folder's immediate child files and folders in that directory view.
- **FR-014**: The system MUST let users open listed folder items through both an explicit open button and a double-click interaction.
- **FR-015**: The system MUST style the in-repository directory list view similarly to the existing non-git folder browser in the app.
- **FR-016**: The system MUST show an intentional empty-folder state when a selected folder has no visible child items.

### Key Entities *(include if feature involves data)*

- **Edit Workspace**: The file editing view, including the editable content region, file context, and primary actions needed to complete or cancel an edit.
- **Repository Landing State**: The default content shown when a repository is opened and no primary document is available for display.
- **Empty Repository Guidance**: The explanatory content and next-step actions shown when the landing state has no README or other default file to render.
- **Directory View**: The content-panel presentation of a selected folder, including its visible child files/folders and the interactions used to open them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a standard desktop window, users can see substantially more file content in edit mode than before, with the editing region occupying most of the available main content space.
- **SC-002**: In usability checks, at least 90% of users can identify how to proceed from a newly initialized repository state within 10 seconds.
- **SC-003**: During manual review of newly initialized repositories, reviewers consistently describe the landing screen as intentional and understandable rather than broken or empty.
- **SC-004**: Support or feedback reports specifically calling out the cramped editor or confusing no-README landing state decrease after the feature is released.
- **SC-005**: In manual validation, 100% of tested folder selections open a usable in-panel directory view instead of a broken or error-like presentation.
- **SC-006**: In manual validation, markdown files containing hidden comments no longer display those comments in rendered markdown output.
- **SC-007**: In manual validation, the main-view directory list feels visually consistent with the existing non-git folder browser and exposes a visible open action on every listed row.

## Assumptions

- Most editing sessions happen in desktop or laptop windows where there is enough horizontal space for the editor to expand noticeably.
- The improved empty-state behavior is limited to repository browsing and editing flows; it does not introduce new repository setup workflows beyond clearer guidance.
- Users may open repositories that are valid git folders but have no commits, no README, or very little content, and GitLocal should still present a coherent landing experience.
- Existing navigation controls remain available and continue to be the primary way to move through repository content.
- Folder browsing remains repository-scoped and should expose only the selected folder's immediate child items in the content-area directory view.
- When no file is selected, showing the current folder's contents is preferable to showing a dedicated recovery message in the main content area.
