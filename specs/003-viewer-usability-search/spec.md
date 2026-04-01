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

## Clarifications

### Session 2026-03-31

- Q: Should the top-of-viewer search redesign be clarified under this existing viewer/search feature or tracked as a separate feature? → A: Clarify it under this existing viewer/search feature.
- Q: When search is not actively being used, should the top-of-viewer area stay fully visible or collapse to a compact trigger? → A: Collapse to a compact trigger that expands the full search UI on demand.
- Q: What should the compact search trigger include to keep it lightweight but discoverable? → A: An icon-only trigger, plus keyboard shortcut support with Command+F on macOS and Control+F on Windows and Linux.
- Q: When the left navigation is collapsed, should it disappear entirely or remain as a slim rail with the reopen control inside it? → A: Collapse it into a slim left rail with the reopen icon at the rail's upper-right corner.
- Q: What visual direction should the expanded search UI take once opened? → A: A more prominent floating card or overlay that visually stands above the page content.
- Q: Should the left-panel open and close interaction differ between the repository viewer and folder-selection page? → A: No. The left-panel open and close interaction should feel consistent across both pages.
- Q: Should repository search continue to support both file-name and file-content modes in this iteration? → A: No. Remove the mode switch and make the floating search panel a file-name-only quick finder.
- Q: When should the search panel begin showing results? → A: Once the user types at least 3 characters, automatically expand the active result area and show matching file names live as the query changes.
- Q: Should the floating quick finder sit in the normal page flow or visually overlay the repository content? → A: It should visually overlay the viewer content and must not push the content downward when opened.
- Q: Should the page include a persistent footer, and what should it display? → A: Yes. Add a fixed footer showing the current year, a GitLocal link to the GitHub repository, and the currently running app version.
- Q: When GitLocal is launched with no explicit path from inside an existing git repository, should it open picker mode or the repository viewer? → A: It should open the current working directory directly in the repository viewer.
- Q: What should happen if the URL still contains a saved branch from a different repository that does not exist in the newly opened repo? → A: GitLocal should automatically fall back to the current branch of the newly opened repository and keep loading instead of failing.
- Q: What should happen if the viewer still has a saved file or folder path from a previously opened repository? → A: GitLocal should clear that saved location when the repository changes and fall back to the new repository's default landing context instead of reusing the old relative path.

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
4. **Given** the folder-selection page includes a left-side panel, **When** the user collapses or reopens it, **Then** the control placement, icon language, and overall interaction feel consistent with the repository viewer page.
5. **Given** GitLocal is launched with no explicit path while the current working directory is already a git repository, **When** startup completes, **Then** the repository viewer opens immediately instead of dropping the user into picker mode.

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
7. **Given** the left navigation is collapsed, **When** the panel enters its compact state, **Then** it remains visible as a slim left rail with the reopen control inside that rail near the upper-right corner.
8. **Given** the left navigation is collapsed, **When** the user chooses to expand it again, **Then** the previous navigation context is restored without losing the current file or search state.
9. **Given** a saved URL branch does not exist in the currently opened repository, **When** the viewer hydrates state, **Then** it automatically resets to a valid current branch for that repository and continues loading.
10. **Given** the user opens a different repository while URL state still points at a file or folder from the previous repository, **When** the new repository loads, **Then** GitLocal clears that stale location and falls back to the new repository's default landing context instead of trying to open the same relative path there.

---

### User Story 4 - Find Files Quickly From the Viewer (Priority: P2)

When a user needs to jump to a file in a repository, they can use a compact top-of-viewer quick finder that stays lightweight when idle and becomes a focused, narrower floating panel with live file-name matches once the query is specific enough.

**Why this priority**: Quick navigation is high-frequency behavior. A simpler file-name finder reduces visual complexity, preserves space, and gets users to the right file faster than a broader but heavier search surface.

**Independent Test**: Open the repository viewer, activate the compact search trigger, type fewer than 3 characters and confirm no result list is shown, then type at least 3 characters and verify that matching file names appear live, narrow as more characters are entered, and navigate directly to the chosen file in both the tree and content view.

**Acceptance Scenarios**:

1. **Given** the user is not currently searching, **When** they view the top area of the repository viewer, **Then** search is represented by a compact trigger instead of a fully expanded search panel.
2. **Given** the user activates the compact search trigger, **When** the floating quick finder opens, **Then** it appears as a visually distinct but narrower overlay above the page content with the search input immediately available.
3. **Given** the user has entered fewer than 3 characters, **When** they pause typing, **Then** the quick finder does not yet show a live result list.
4. **Given** the user has entered at least 3 characters, **When** matching file names exist, **Then** the quick finder expands its active result area and shows matching file names live as the query changes.
5. **Given** the user continues typing after the first 3 characters, **When** the query becomes more specific, **Then** the visible file-name result list narrows accordingly without requiring an explicit submit action.
6. **Given** the user selects a file from the quick finder results, **When** navigation completes, **Then** the repository tree highlights the file and the content panel opens that file automatically.
7. **Given** the repository contains no file-name matches for the current query, **When** the quick finder updates, **Then** it shows a clear empty state without losing the user's current repository context.
8. **Given** the user is in the repository viewer, **When** they press Command+F on macOS or Control+F on Windows or Linux, **Then** the viewer opens the floating quick finder and focuses the search input.
9. **Given** the floating quick finder opens, **When** it becomes visible, **Then** it overlays the viewer content instead of shifting the breadcrumb or content panel downward.

### User Story 5 - Keep Product Context Visible (Priority: P3)

When a user is in GitLocal, they can always see a small fixed footer that identifies the product and version without distracting from the main browsing experience.

**Why this priority**: A lightweight footer helps orient users, reinforces product identity, and makes the running version easy to verify during testing and support.

**Independent Test**: Open GitLocal in both folder-selection mode and repository-view mode and confirm a fixed footer remains visible at the bottom of the window, shows the current year, links GitLocal to the GitHub repository, and displays the running application version.

**Acceptance Scenarios**:

1. **Given** the user is anywhere in the application, **When** the page is visible, **Then** a fixed footer remains anchored at the bottom of the viewport.
2. **Given** the footer is rendered, **When** the current year changes in the system clock, **Then** the footer year reflects that current year rather than a hardcoded value.
3. **Given** the footer shows the product name, **When** the user activates the GitLocal text, **Then** it opens the project's GitHub repository URL.
4. **Given** the application is running a specific version, **When** the footer is shown, **Then** it displays that currently running version string.

### Edge Cases

- A markdown file contains multiple code blocks close together, and each block must expose the correct copy action without ambiguity.
- A raw file is empty, very large, or temporarily unavailable, and the copy action must fail gracefully without copying stale or partial content.
- A double-click occurs on an item that becomes unavailable between the first and second click.
- A browser refresh happens while the application is already loading a nested repository location.
- A watched file changes repeatedly in quick succession, and the viewer must avoid flicker or misleading intermediate states.
- The current file, current folder, and part of the surrounding tree are deleted at once, and the viewer must recover to the nearest remaining valid location.
- The user collapses the navigation while a search is active, and search state must remain recoverable when the panel is reopened.
- The user collapses the navigation and still needs a clear, low-friction way to restore it without relying on a control placed outside the collapsed panel area.
- The folder-selection page and repository viewer use different left-panel contents, but the collapse and restore interaction should still feel like the same product pattern.
- The user types only 1 or 2 characters in the quick finder, and the panel must avoid opening an oversized or noisy result list too early.
- Many file-name matches exist for a short query, and the live result list must remain readable without visually overwhelming the page.
- The user has not started a search yet, and the compact state must remain discoverable without consuming the same amount of space as the fully expanded search UI.
- The user uses the browser or operating-system find shortcut out of habit, and the viewer must route that shortcut into the repository search experience instead of leaving the user uncertain about where to search.
- The expanded search UI is visually more prominent, and it must still feel intentional rather than covering content in a confusing or heavy-handed way.
- The quick finder overlays the content area, and it must not cover critical controls so aggressively that navigation feels blocked or ambiguous.
- The footer remains fixed at the bottom of the viewport, and the main content must stay readable without being obscured behind it.
- GitLocal starts with no explicit path from inside a git repository, and startup must prefer the repository viewer over the folder picker without requiring a manual re-selection step.
- The user opens a different repository while stale URL state still points at a branch name from the previous repository, and the viewer must recover instead of showing a broken loading state.
- The user opens a different repository while stale URL state still points at a file or folder path from the previous repository, and the viewer must not reuse that path in the newly opened repo even if a similarly named relative path exists there.

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
- **FR-017**: When collapsed, the left navigation panel MUST remain present as a slim rail rather than disappearing entirely.
- **FR-018**: The collapsed navigation rail MUST place the reopen control inside the rail near its upper-right corner.
- **FR-019**: Left-panel collapse and restore behavior MUST use a consistent interaction pattern across the repository viewer page and the folder-selection page, even if the panel contents differ.
- **FR-020**: The system MUST let users search by file name within the currently open repository.
- **FR-021**: The quick finder MUST NOT expose a radio-button mode switch between file-name and file-content search.
- **FR-022**: The repository viewer MUST represent search with a compact trigger when the user is not actively using search.
- **FR-023**: Activating the compact search trigger MUST expand the search UI to expose the quick-finder input on demand.
- **FR-024**: The inactive search presentation MUST consume less top-of-viewer space than the expanded quick finder UI.
- **FR-025**: The compact search trigger MUST be icon-only in its inactive state.
- **FR-026**: The repository viewer MUST open the expanded quick finder when the user presses Command+F on macOS or Control+F on Windows or Linux.
- **FR-027**: When the keyboard shortcut opens search, the query input MUST receive focus immediately.
- **FR-028**: The expanded search UI MUST render as a visually distinct floating card or overlay above the page content rather than as a flat inline bar.
- **FR-029**: The floating quick finder SHOULD be visually narrower than the earlier full-width search presentation while remaining readable and usable.
- **FR-030**: The quick finder MUST wait until the user has entered at least 3 characters before showing live file-name results.
- **FR-031**: Once the query length reaches 3 or more characters, the quick finder MUST update matching file-name results live as the query changes without requiring an explicit submit action.
- **FR-032**: Quick-finder results MUST support direct navigation to the selected file.
- **FR-033**: When a result is selected, the repository tree and content panel MUST update to the same file so the user lands in a synchronized viewer state.
- **FR-034**: When no file-name matches are found, the quick finder MUST show a clear empty state without losing the user's existing repository context.
- **FR-035**: Quick-finder controls and results MUST remain understandable and usable when many file-name matches are returned.
- **FR-036**: Opening the floating quick finder MUST overlay the repository content area rather than pushing the visible content downward.
- **FR-037**: The application MUST render a fixed footer at the bottom of the viewport in both folder-selection and repository-view modes.
- **FR-038**: The footer MUST display the current year derived from runtime date information.
- **FR-039**: The footer MUST render `GitLocal` as a hyperlink to `https://github.com/ehud-am/gitlocal`.
- **FR-040**: The footer MUST display the currently running application version.
- **FR-041**: When GitLocal is launched without an explicit path and the current working directory is inside a git repository, the application MUST initialize directly into repository-view mode for that working directory.
- **FR-042**: When saved URL state references a branch that is not available in the currently opened repository, the viewer MUST fall back to a valid branch from that repository automatically.
- **FR-043**: When saved URL state references a file or folder path from a previously opened repository, the viewer MUST clear that stale location when the repository changes instead of reusing the same relative path in the newly opened repository.

### Key Entities *(include if feature involves data)*

- **Viewer Context**: The active repository location shown to the user, including repository identity, open folder path, selected file, raw-versus-rendered mode, and navigation panel state.
- **Copy Target**: A user-visible unit of content that can be copied in one action, such as a rendered code block or the full contents of a raw file view.
- **Selection Entry**: A file-selection row representing a folder or repository candidate, including its label, type, and action when activated.
- **Repository Change Event**: A detected change to repository files or folders that may require updates to the tree, the current file view, or fallback navigation.
- **Search Session**: The user's active repository quick-finder state, including query text, whether the live result list is active, the current file-name result set, and the chosen result.
- **Application Identity**: The runtime metadata shown in the footer, including the current year, product link target, and running version string.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of copy actions for rendered code blocks and raw file views place the expected text on the clipboard on the first attempt.
- **SC-002**: In task-based usability testing, at least 90% of users can open a target folder or repository from file-selection mode using double-click without additional instruction.
- **SC-003**: In refresh testing, 95% of page refreshes from nested repository locations restore the same folder and file context when those locations still exist.
- **SC-004**: In repository change testing, 95% of detected file or folder changes are reflected in the visible tree or current file view within 3 seconds without a manual reload.
- **SC-005**: In deletion recovery testing, 100% of cases where the current file or navigation path is removed leave the viewer in a valid fallback location with a clear user-facing status message.
- **SC-006**: In usability testing, at least 85% of users can collapse and restore the left navigation while maintaining orientation in the current repository view.
- **SC-011**: In usability review, users can identify the restore-navigation control from the collapsed left rail without searching outside the panel area.
- **SC-007**: In usability review, users recognize the left-panel collapse and restore pattern as the same interaction on both the folder-selection page and the repository viewer page.
- **SC-008**: In search validation, users can find and open a known target file by name in under 10 seconds for repositories included in the test set.
- **SC-009**: In usability review, users can identify how to open search from the compact top-of-viewer state without instruction.
- **SC-010**: In validation testing on macOS, Windows, and Linux, 100% of supported keyboard shortcut activations open the repository search UI and focus the query input on the first attempt.
- **SC-012**: In usability review, users describe the expanded search UI as clearly separated from the page content without finding it visually distracting or confusing.
- **SC-013**: In quick-finder validation, 100% of queries shorter than 3 characters avoid rendering the live result list, and 100% of queries with 3 or more characters render live file-name results when matches exist.
- **SC-014**: In navigation validation, selecting a quick-finder result updates both the file tree highlight and the content panel to the same file on the first attempt.
- **SC-015**: In visual validation, opening the quick finder does not shift the breadcrumb or content panel vertically.
- **SC-016**: In footer validation, 100% of tested screens show a fixed footer with the current year, the GitHub link, and the running version string.
- **SC-017**: In startup validation, launching GitLocal with no explicit path from inside a git repository opens the repository viewer on the first attempt without requiring picker navigation.
- **SC-018**: In cross-repository validation, stale URL branch state from a previously opened repository does not prevent a newly opened repository from loading.
- **SC-019**: In cross-repository validation, stale URL file or folder state from a previously opened repository never causes GitLocal to open the same relative path automatically in a different repository.

## Assumptions

- Copy actions will be offered only for content currently visible in the main viewer, not for hidden or unloaded content.
- Search is limited to the repository that is currently open in the viewer and does not span multiple repositories at once.
- The compact trigger and expanded search UI both live in the top area of the repository viewer rather than moving search to a separate page.
- The browser-based app can safely intercept Command+F and Control+F while the repository viewer is active to open the in-app search experience.
- The floating expanded search surface can temporarily visually rise above the page content as long as it keeps repository context obvious.
- The floating quick finder can overlay the content area as long as users still retain enough visual context to continue browsing confidently.
- Filesystem monitoring will focus on keeping the current repository view accurate rather than acting as a full system-wide file browser.
- When a current location is deleted, recovering to the nearest valid remaining repository location is preferable to forcing the user back to the application start state.
- The collapsed left navigation can remain visually minimal as long as it still anchors the restore control inside the panel region.
- The live quick finder can focus on file-name matches only for this iteration, even though deeper content search may be revisited later in a separate refinement.
- The running application version can be surfaced through existing local application metadata rather than requiring a separate network lookup.
- When no explicit path is provided at startup, using the current working directory as the first repo-detection candidate is preferable to forcing picker mode.
- When saved URL branch state is incompatible with a newly opened repository, preferring that repository's current branch is better than preserving the stale branch name.
- When saved URL path state belongs to a different repository, resetting to the new repository's default landing context is preferable to preserving the stale relative path.
