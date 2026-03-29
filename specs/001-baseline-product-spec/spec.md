# Feature Specification: Current Product Baseline

**Feature Branch**: `001-baseline-product-spec`  
**Created**: 2026-03-28  
**Status**: Draft  
**Input**: User description: "please create a baseline from the readme, constitution, and the code itself. I would like to see a full list of use cases and features"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open and Understand a Repository (Priority: P1)

A user can open a local repository, land in a readable browser view, and immediately understand what project they are looking at without using a terminal or IDE.

**Why this priority**: This is the core value of the product. If users cannot open a repository and orient themselves quickly, the rest of the experience does not matter.

**Independent Test**: Can be fully tested by launching the product with a valid repository path or selecting a repository from the picker and confirming the repository name, active branch context, and an initial content view appear.

**Acceptance Scenarios**:

1. **Given** a user launches the product with a valid local Git repository path, **When** the viewer opens, **Then** the user sees the repository name, the active branch, and the repository file tree.
2. **Given** a repository contains a top-level README file, **When** the repository loads, **Then** that README is shown automatically as the initial content.
3. **Given** a user launches the product without a repository path, **When** the viewer opens, **Then** the user sees a repository picker that accepts a local path and loads the selected repository without restarting the application.
4. **Given** a user enters a path that is missing or is not a Git repository, **When** they try to open it, **Then** the product explains the problem in plain language and does not pretend the repository loaded successfully.

---

### User Story 2 - Browse and Read Repository Contents (Priority: P1)

A user can move through the repository structure, open files, and read different content types in a format that feels natural and easy to scan.

**Why this priority**: The main job of the product is to make repository contents readable for people who do not want a full development environment.

**Independent Test**: Can be fully tested by expanding folders, opening several file types, using in-content navigation, and confirming each content type is displayed appropriately.

**Acceptance Scenarios**:

1. **Given** a loaded repository, **When** the user expands folders in the tree, **Then** the product reveals only the selected folder's immediate children and keeps folders listed before files.
2. **Given** the user selects a Markdown file, **When** the file opens, **Then** the product shows a rendered reading view and allows the user to switch to a raw text view.
3. **Given** the user selects a source or text file, **When** the file opens, **Then** the product shows the file as readable text with language-appropriate presentation when recognizable.
4. **Given** the user selects an image file, **When** the file opens, **Then** the product displays the image inline.
5. **Given** the user selects a binary file that cannot be previewed meaningfully, **When** the file opens, **Then** the product shows a clear placeholder instead of unreadable output.
6. **Given** the user is reading a file within nested folders, **When** they use the breadcrumb or a relative link in rendered Markdown, **Then** the product navigates to the requested location inside the same repository view.

---

### User Story 3 - Review Git Context Without Changing the Repository (Priority: P2)

A user can understand where they are in Git history by reviewing the active branch, available branches, and recent commits, while staying in a read-only experience.

**Why this priority**: Git context helps users review and understand a repository, but it supports the main browsing experience rather than replacing it.

**Independent Test**: Can be fully tested by loading a repository with multiple branches and commits, switching the branch view, and confirming the commit list updates while the repository remains read-only.

**Acceptance Scenarios**:

1. **Given** a loaded repository, **When** the sidebar Git information is shown, **Then** the user sees the current branch and a list of available branches.
2. **Given** a repository has recent history, **When** the Git information panel loads, **Then** the user sees a list of recent commits with author, short identifier, message, and human-friendly recency information.
3. **Given** the user selects a different branch from the branch selector, **When** the branch changes, **Then** the file tree, file reading context, and commit list reflect the selected branch's contents.
4. **Given** the user is using the product, **When** they browse files and branches, **Then** the product does not modify repository contents, history, or branch state as part of the viewing experience.

---

### User Story 4 - Recover Gracefully from Missing Content and Loading Failures (Priority: P3)

A user receives clear feedback when the repository lacks expected content or when specific data cannot be loaded.

**Why this priority**: Helpful failure handling keeps the product approachable for non-developers and prevents confusing dead ends.

**Independent Test**: Can be fully tested by using repositories with no README, invalid paths, missing files, empty history, and load failures and confirming each state is understandable.

**Acceptance Scenarios**:

1. **Given** a repository does not contain a top-level README, **When** the repository loads, **Then** the content area explains that no README was found and invites the user to choose another file.
2. **Given** a file cannot be loaded because it no longer exists on the selected branch, **When** the user attempts to open it, **Then** the product shows a clear file-load failure state.
3. **Given** the file tree cannot be loaded, **When** the sidebar requests repository contents, **Then** the product shows a visible tree-load failure state rather than an empty tree with no explanation.
4. **Given** no repository is loaded yet, **When** the product is opened, **Then** repository-dependent data views remain empty until the user chooses a repository.

### Edge Cases

- A repository path is supplied, but the folder is not a Git working tree.
- A repository is valid but has no commits yet, so the current branch name cannot be resolved.
- A repository contains no top-level README file.
- The selected branch has no recent commits to show.
- A requested branch, directory, or file no longer exists by the time the user asks to view it.
- A folder contains many nested paths, but only the immediate children of the opened folder should be shown at each step.
- A file type is unrecognized; it should still open as readable text when safe to do so.
- A selected file is binary or otherwise unsuitable for inline preview.
- The repository picker receives malformed input, an empty path, or a non-existent path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let users start a viewing session either by providing a local repository path at launch or by selecting a repository path from an in-product picker.
- **FR-002**: The system MUST identify whether the selected path is a valid local Git repository and present a clear error state when it is not.
- **FR-003**: The system MUST display the repository name and currently selected branch context for a loaded repository.
- **FR-004**: The system MUST present repository files and folders in a browsable tree with folders listed before files and names sorted alphabetically within each group.
- **FR-005**: The system MUST load folder contents on demand rather than requiring the user to expand the full repository tree at once.
- **FR-006**: Users MUST be able to select a file from the tree and view its contents in the main content area.
- **FR-007**: The system MUST automatically open a top-level README file when one is present and no other file has been selected yet.
- **FR-008**: The system MUST provide a meaningful empty-state message when no README is available for automatic opening.
- **FR-009**: The system MUST render Markdown files as formatted reading content and support navigation through relative links within the repository view.
- **FR-010**: The system MUST allow users to switch between rendered and raw views for readable text-based files.
- **FR-011**: The system MUST display recognized source and text files in a readable text view.
- **FR-012**: The system MUST display image files inline within the content area.
- **FR-013**: The system MUST show a non-destructive placeholder for binary files that cannot be previewed meaningfully.
- **FR-014**: The system MUST provide breadcrumb navigation that lets users move back to parent locations from the currently selected file path.
- **FR-015**: The system MUST show the list of available branches for the loaded repository and indicate which branch is currently active in the view.
- **FR-016**: Users MUST be able to change the viewed branch from the branch selector.
- **FR-017**: The system MUST show a recent commit list for the selected branch, including commit identifier, author, timestamp, and summary message.
- **FR-018**: The system MUST limit recent commit results to a bounded list appropriate for quick review and prevent unbounded history loading in the default view.
- **FR-019**: The system MUST keep repository interactions read-only and must not modify tracked files, repository history, or branch state as part of normal viewing.
- **FR-020**: The system MUST operate fully on the user's local machine without requiring accounts, telemetry, or internet connectivity for core viewing tasks.
- **FR-021**: The system MUST present clear, human-readable error messages for invalid repository paths, invalid picker submissions, missing files, and repository content load failures.
- **FR-022**: The system MUST continue to provide a usable viewer even when some repository metadata is unavailable, such as a repository with no resolved current branch name.
- **FR-023**: The system MUST preserve a clean browser-based reading experience for non-developers who want repository understanding without using a full IDE.

### Key Entities *(include if feature involves data)*

- **Repository Session**: The currently loaded local repository context, including whether a repository is loaded, whether it is valid, the displayed repository name, and the active branch being viewed.
- **Repository Tree Node**: A single visible entry in the repository browser, representing either a folder or a file, with a display name, a repository-relative path, and its type.
- **File View**: The currently opened repository item, including its path, display mode, content category, and the presentation state shown in the content panel.
- **Branch View**: The branch currently selected for browsing, plus the available branch choices shown to the user.
- **Commit Summary**: A single recent history entry containing an identifier, author, date, and message for quick branch-level review.
- **Picker Submission**: A user-entered local path that requests loading a different repository into the current viewing session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In baseline validation, 100% of currently supported user-visible repository viewing flows are described by at least one acceptance scenario in this specification.
- **SC-002**: A first-time user can open a valid repository and reach either an automatically opened README or another selected file in under 2 minutes without using terminal commands after launch.
- **SC-003**: In usability review, at least 90% of representative file-viewing attempts across Markdown, text, image, and binary content result in an appropriate display state rather than a confusing or blank screen.
- **SC-004**: A user can switch to another available branch and see updated repository history and content context in under 30 seconds.
- **SC-005**: In review of defined failure scenarios, 100% of invalid-path, no-README, missing-file, and non-repository cases produce an explicit user-facing explanation.

## Assumptions

- Users are working on a local machine that already has access to the repository contents they want to browse.
- The baseline describes the product's currently implemented behavior rather than proposing new capabilities beyond what is already supported.
- The product's branch selector changes the viewed repository context for browsing, not the repository's checked-out working state.
- Recent history is intended for quick orientation rather than exhaustive auditing in the default experience.
- Repository interactions remain read-only for normal use, even if future roadmap work introduces editing capabilities outside this baseline.
- The target audience is comfortable using a browser and entering a filesystem path, but may not be comfortable with Git commands or IDE workflows.
