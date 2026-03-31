# Feature Specification: Viewer Usability and Search

**Feature Branch**: `003-viewer-usability-search`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "for the next iteration we will start with fixing few known issues:
1. In md files, when there is a code block, please add on the top right of that code segment, and option to copy the code in one click.
2. in view raw mode, add on the top right of the file content box, an option to copy the entire file content.
3. in the file selection mode, make double click on a line actionable. If this is a non git folder then drill down to the list of folders within the file, if it is git then open the local git viewer.
4. In git view mode. Fix the browser lost context problem when the page is refreshed. Currently click on refresh page in the browser, resets the page view. Navigation within the git folder structure is lost and the file content is shwing again the readme.
5. Monitor changes to the file system and auto-refresh the file structure and the current file view. handle gracefully cases where current file is deleted or navigation location of the folder tree is deleted.
6. add ability to minimize or expand back the left side navigation in git view.
7. develop a way to search within folder/file names.
8. develop a way to search within content of files.
9. make sure the search has multiple options such as case insensitive search vs. case sensitive. use best practices for desinging this expereince."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy Relevant Content Quickly (Priority: P1)

When a user is reading rendered repository content, they can copy code snippets or whole raw files directly from the viewer without selecting text manually.

**Why this priority**: Copying content is a frequent task during review and troubleshooting. Reducing friction here immediately improves day-to-day usefulness for both markdown and raw file views.

**Independent Test**: Open a markdown file with one or more code blocks and a raw file view, trigger the copy actions from the visible controls, and confirm the copied text exactly matches the displayed snippet or full file content.

**Acceptance Scenarios**:

1. **Given** a markdown document contains a code block, **When** the user hovers over or views that block, **Then** a visible one-click copy action appears in the top-right area of the code block.
2. **Given** the user activates the copy action for a markdown code block, **When** the copy completes, **Then** the copied clipboard content matches only the text of that code block.
3. **Given** the user is viewing a file in raw mode, **When** the file content panel is shown, **Then** a visible one-click copy action appears in the top-right area of that panel.
4. **Given** the user activates the raw-view copy action, **When** the copy completes, **Then** the copied clipboard content matches the entire raw file content currently shown.

---

### User Story 2 - Navigate Repositories Faster (Priority: P1)

When a user browses folders before entering a repository, double-clicking a listed item performs the expected primary action so they can drill into folders or open a repository without extra clicks.

**Why this priority**: Folder selection is a gateway interaction. Double-click behavior aligns the experience with common desktop file-browsing expectations and reduces unnecessary steps.

**Independent Test**: Start from file-selection mode in a non-repository folder and in a folder containing a repository, double-click entries, and confirm that folders open into their contents while repository entries open the repository viewer directly.

**Acceptance Scenarios**:

1. **Given** the user is in file-selection mode inside a non-repository folder, **When** they double-click a listed folder row, **Then** the browser drills into that folder and shows its contents.
2. **Given** the user is in file-selection mode and a listed row represents a repository, **When** they double-click that row, **Then** the application opens the local repository viewer for that repository.
3. **Given** the user single-clicks an item in file-selection mode, **When** no second click follows, **Then** the existing single-click behavior remains available and is not broken by the new action.

---

### User Story 3 - Keep Context While the Repository Changes (Priority: P1)

When a user refreshes the page or the filesystem changes underneath the viewer, the application keeps the user oriented by preserving their location when possible and recovering gracefully when it is not.

**Why this priority**: Losing context on refresh or after file changes makes the product feel unreliable. Preserving location and handling deletions gracefully protects trust and prevents re-navigation work.

**Independent Test**: Navigate to a nested location in a repository, refresh the browser, then create, rename, and delete files and folders under the viewed location. Confirm the viewer preserves the current context when it still exists, refreshes the tree and content automatically, and falls back safely when the current location is removed.

**Acceptance Scenarios**:

1. **Given** the user is viewing a nested folder or file in a repository, **When** the browser page is refreshed, **Then** the viewer restores the same repository context instead of resetting to the default landing file.
2. **Given** the filesystem changes while the repository viewer is open, **When** the changes affect the visible folder tree, **Then** the tree updates automatically without requiring a manual page reload.
3. **Given** the currently viewed file changes on disk, **When** the update is detected, **Then** the file view refreshes to reflect the latest available content.
4. **Given** the currently viewed file is deleted, **When** the deletion is detected, **Then** the viewer removes the stale content, explains that the file is no longer available, and moves the user to the nearest valid location.
5. **Given** the currently open folder or any ancestor in the navigation path is deleted, **When** the deletion is detected, **Then** the viewer falls back to the nearest valid folder context and keeps the interface usable.
6. **Given** the user prefers more reading space, **When** they collapse the left navigation, **Then** the main content expands while still allowing the navigation panel to be restored easily.
7. **Given** the left navigation is collapsed, **When** the user chooses to expand it again, **Then** the previous navigation context is restored without losing the current file or search state.

---

### User Story 4 - Search the Repository Intentionally (Priority: P2)

When a user needs to find something in a repository, they can search both by file or folder name and by file content, with clear options that help them control how matches are interpreted.

**Why this priority**: Search is a major productivity feature, but it must feel predictable. Supporting both path-based and content-based search with explicit matching controls makes the experience powerful without being confusing.

**Independent Test**: Search for known folder names, file names, and text strings across repository content, change match options such as case sensitivity, and verify that results update clearly and accurately for each mode.

**Acceptance Scenarios**:

1. **Given** the user wants to locate a file or folder by name, **When** they use name search, **Then** matching folder and file names are returned in a way that can be used to navigate directly to the selected result.
2. **Given** the user wants to locate text inside files, **When** they use content search, **Then** matching files are returned with enough surrounding context to understand why each result matched.
3. **Given** the user changes the search matching option between case-sensitive and case-insensitive modes, **When** the search reruns, **Then** the results reflect the chosen matching behavior.
4. **Given** the repository contains no matches for the current search, **When** the search completes, **Then** the interface shows a clear empty state and preserves the current repository context.
5. **Given** the user switches between name search and content search, **When** the search mode changes, **Then** the interface makes the active mode obvious and avoids mixing unlike results in a confusing way.

### Edge Cases

- A markdown file contains multiple code blocks close together, and each block must expose the correct copy action without ambiguity.
- A raw file is empty, very large, or temporarily unavailable, and the copy action must fail gracefully without copying stale or partial content.
- A double-click occurs on an item that becomes unavailable between the first and second click.
- A browser refresh happens while the application is already loading a nested repository location.
- A watched file changes repeatedly in quick succession, and the viewer must avoid flicker or misleading intermediate states.
- The current file, current folder, and part of the surrounding tree are deleted at once, and the viewer must recover to the nearest remaining valid location.
- The user collapses the navigation while a search is active, and search state must remain recoverable when the panel is reopened.
- Name search and content search produce many matches, and the interface must remain understandable without overwhelming the user.
- A case-sensitive search yields no results immediately after a case-insensitive search for the same text, and the difference must be clear to the user.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a one-click copy action for each code block displayed in rendered markdown content.
- **FR-002**: The code-block copy action MUST copy only the text contained in the selected code block.
- **FR-003**: The system MUST provide a one-click copy action for the full file content when a file is shown in raw view.
- **FR-004**: The raw-view copy action MUST copy the entire raw file content currently displayed to the user.
- **FR-005**: In file-selection mode, users MUST be able to activate a listed row by double-clicking it.
- **FR-006**: When a double-clicked row represents a regular folder, the system MUST open that folder's contents in file-selection mode.
- **FR-007**: When a double-clicked row represents a repository, the system MUST open the repository viewer for that repository.
- **FR-008**: The new double-click behavior MUST preserve the existing single-click behavior for selection and focus.
- **FR-009**: The repository viewer MUST preserve the user's current repository, folder, and file context across a browser refresh whenever that context is still valid.
- **FR-010**: When the preserved context is no longer valid after refresh, the system MUST recover to the nearest valid repository location and explain the fallback state.
- **FR-011**: The system MUST detect filesystem changes relevant to the currently open repository and refresh the visible folder tree automatically.
- **FR-012**: The system MUST refresh the current file view automatically when the displayed file changes on disk.
- **FR-013**: When the displayed file is deleted, the system MUST remove stale content, notify the user that the file is unavailable, and move to the nearest valid remaining location.
- **FR-014**: When the current navigation path or part of it is deleted, the system MUST recover to the nearest valid remaining folder context without forcing a full reset.
- **FR-015**: The repository viewer MUST allow the left-side navigation panel to be collapsed and expanded on demand.
- **FR-016**: Collapsing or expanding the navigation panel MUST NOT clear the user's current file, folder, or active search context.
- **FR-017**: The system MUST let users search by folder and file name within the currently open repository.
- **FR-018**: The system MUST let users search within file contents within the currently open repository.
- **FR-019**: The search experience MUST make the active search mode clear when users search by name versus by file content.
- **FR-020**: The search experience MUST provide at least case-sensitive and case-insensitive matching options.
- **FR-021**: Search results MUST update according to the selected matching option.
- **FR-022**: Search results MUST support direct navigation to the selected file, folder, or matching content result.
- **FR-023**: When no search results are found, the system MUST show a clear empty state without losing the user's existing repository context.
- **FR-024**: Search controls and results MUST remain understandable and usable when many matches are returned.

### Key Entities *(include if feature involves data)*

- **Viewer Context**: The active repository location shown to the user, including repository identity, open folder path, selected file, raw-versus-rendered mode, and navigation panel state.
- **Copy Target**: A user-visible unit of content that can be copied in one action, such as a rendered code block or the full contents of a raw file view.
- **Selection Entry**: A file-selection row representing a folder or repository candidate, including its label, type, and action when activated.
- **Repository Change Event**: A detected change to repository files or folders that may require updates to the tree, the current file view, or fallback navigation.
- **Search Session**: The user's active repository search, including search mode, query text, matching options, result set, and chosen result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of copy actions for rendered code blocks and raw file views place the expected text on the clipboard on the first attempt.
- **SC-002**: In task-based usability testing, at least 90% of users can open a target folder or repository from file-selection mode using double-click without additional instruction.
- **SC-003**: In refresh testing, 95% of page refreshes from nested repository locations restore the same folder and file context when those locations still exist.
- **SC-004**: In repository change testing, 95% of detected file or folder changes are reflected in the visible tree or current file view within 3 seconds without a manual reload.
- **SC-005**: In deletion recovery testing, 100% of cases where the current file or navigation path is removed leave the viewer in a valid fallback location with a clear user-facing status message.
- **SC-006**: In usability testing, at least 85% of users can collapse and restore the left navigation while maintaining orientation in the current repository view.
- **SC-007**: In search validation, users can find a known target by name and by file content in under 10 seconds for repositories included in the test set.
- **SC-008**: In search option testing, 100% of case-sensitivity toggles produce result sets consistent with the selected matching mode.

## Assumptions

- Copy actions will be offered only for content currently visible in the main viewer, not for hidden or unloaded content.
- Search is limited to the repository that is currently open in the viewer and does not span multiple repositories at once.
- Name search and content search may share a common entry area as long as the active mode and matching options are clearly distinguished.
- Filesystem monitoring will focus on keeping the current repository view accurate rather than acting as a full system-wide file browser.
- When a current location is deleted, recovering to the nearest valid remaining repository location is preferable to forcing the user back to the application start state.
