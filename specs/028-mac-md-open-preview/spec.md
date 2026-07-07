# Feature Specification: Mac Markdown Open Preview

**Feature Branch**: `028-mac-md-open-preview`  
**Created**: 2026-07-05  
**Status**: Draft  
**Input**: User description: "let's add the registration so that on mac double click on md file will activate the gitlocal with the local folder and open the md file in the preview section. Problem we want to fix: the tabs of tree view and the readme as to nuanced, customers do not notice the treeview tab and overall this impact usability. review that design and suggest something better."

## Clarifications

### Session 2026-07-06

- Q: Should GitLocal make itself the default Markdown reader automatically? → A: No; ask the user on first run and change the default only after explicit opt-in.
- Q: How should dotfiles be handled in the GitHub-like folder tree layout? → A: Show dotfiles by default, with a checkbox to hide `.*` files.
- Q: Should users be able to make GitLocal the default Markdown reader after install if they declined or skipped first-run setup? → A: Yes; expose an explicit macOS native app menu action and still require user initiation before changing the default.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask Before Becoming Default Markdown Reader (Priority: P1)

A macOS user launches GitLocal for the first time and can choose whether GitLocal should become the default app for Markdown files. GitLocal does not change the system default Markdown reader unless the user explicitly agrees.

**Why this priority**: Becoming a default file handler is an operating-system-level preference. Users must stay in control of that choice before the Finder double-click workflow is enabled as the default behavior.

**Independent Test**: Can be fully tested by launching the macOS app in a fresh user state and confirming the product asks before changing the Markdown file association, then validating both opt-in and decline paths.

**Acceptance Scenarios**:

1. **Given** a macOS user launches GitLocal for the first time, **When** GitLocal offers to become the default Markdown reader, **Then** no default-reader change occurs until the user explicitly opts in.
2. **Given** the user declines the first-run default-reader prompt, **When** the user later double-clicks a Markdown file in Finder, **Then** GitLocal is not forced as the default app by this feature.
3. **Given** the user accepts the first-run default-reader prompt, **When** the user later double-clicks a Markdown file in Finder, **Then** GitLocal opens the containing folder and renders the selected file in preview.
4. **Given** the user declined, skipped, or wants to configure default-reader setup after install, **When** they choose `GitLocal > Set as Default Markdown Reader`, **Then** GitLocal attempts the association only because of that explicit menu action and reports success or failure.

---

### User Story 2 - Open Markdown From Finder Into Reading Workspace (Priority: P1)

A macOS user double-clicks a Markdown file in Finder and GitLocal opens the containing local folder with that Markdown file selected and rendered in the preview area.

**Why this priority**: After the user opts in to default-reader setup, this creates the shortest path from a document in a local project to the GitLocal reading experience, and directly addresses users missing the current navigation affordance.

**Independent Test**: Can be fully tested by opting in to GitLocal as the Markdown reader, double-clicking a Markdown file from Finder, and confirming GitLocal opens the correct local folder with the chosen document visible in preview without requiring the user to find a hidden tab.

**Acceptance Scenarios**:

1. **Given** GitLocal is installed on macOS and the user has opted in to GitLocal as the Markdown reader, **When** the user double-clicks a local Markdown file in Finder, **Then** GitLocal opens the file's containing folder and shows the selected file in rendered preview.
2. **Given** GitLocal is already running, **When** the user double-clicks another Markdown file from Finder, **Then** GitLocal switches to the file's containing folder when needed and shows the newly selected file in preview.
3. **Given** the Markdown file lives in a folder that is also a repository, **When** the file opens in GitLocal, **Then** the workspace exposes the repository context and file navigation for that folder.

---

### User Story 3 - Make Folder Navigation Obvious Above README (Priority: P1)

A user opening a folder sees a GitHub-like page where the folder tree appears first and the folder README follows below it, without discovering a separate tree-view tab or choosing between README and tree.

**Why this priority**: The current tab design hides navigation behind a nuanced choice, which causes customers to miss the tree view and reduces usability.

**Independent Test**: Can be fully tested by opening a folder or Markdown file and confirming the first visible workspace presents the folder tree first, shows a quick link to the README when one exists, and renders the README below the tree on the same page.

**Acceptance Scenarios**:

1. **Given** a user opens a folder with Markdown content, **When** the workspace loads, **Then** the folder tree appears before the README and the README renders below the tree on the same page.
2. **Given** a user selects a different Markdown file from the tree, **When** the selection changes, **Then** the preview updates to that file and the tree continues to show location context.
3. **Given** a folder has no README-style default document, **When** the workspace opens, **Then** the user still sees the folder tree prominently and receives a clear main-area state that no README is available.
4. **Given** a folder has a README-style document, **When** the workspace loads, **Then** a quick link near the top lets the user scroll directly to the README.
5. **Given** a folder contains dotfiles, **When** the workspace loads, **Then** dotfiles are visible by default and a checkbox lets the user hide `.*` files.

---

### User Story 4 - Preserve Lightweight Browsing For Non-Technical Users (Priority: P2)

A less-technical builder can move between the current Markdown preview and neighboring project files without feeling like they entered a full editor.

**Why this priority**: GitLocal's product direction prioritizes codebase browsing, Markdown reading, review, and lightweight intervention over full-IDE workflows.

**Independent Test**: Can be fully tested by navigating from a Markdown preview to nearby files and back while confirming the interface remains reader-oriented and does not require editor concepts.

**Acceptance Scenarios**:

1. **Given** a user opens a Markdown file from Finder, **When** they scan the workspace, **Then** the primary emphasis remains on reading the document while navigation and file context are readily available.
2. **Given** a user opens a non-Markdown neighboring file from the tree, **When** the file loads, **Then** GitLocal presents the file in the existing appropriate viewer without losing the surrounding folder context.

---

### User Story 5 - Handle Unsupported Or Problem Files Gracefully (Priority: P3)

A user gets understandable guidance when macOS cannot open the file, the file is unavailable, or the selected item is outside a readable local folder.

**Why this priority**: Error cases should not block the main workflow, but they must avoid confusing users when file association or local file access fails.

**Independent Test**: Can be fully tested by trying to open moved, deleted, inaccessible, and non-Markdown files through the same entry path.

**Acceptance Scenarios**:

1. **Given** a Markdown file was moved or deleted after the user attempted to open it, **When** GitLocal receives the open request, **Then** the user sees a clear message that the file is unavailable and can still open a local folder manually.
2. **Given** the selected file cannot be read because of local permissions, **When** GitLocal opens, **Then** the user sees a plain-language permission message and the app does not show stale content.
3. **Given** macOS sends a supported open request while GitLocal is not running, **When** GitLocal starts, **Then** the requested file remains the target once startup completes.

### Edge Cases

- The requested Markdown file is in a folder that is not a git repository.
- The requested Markdown file is in a nested folder inside a repository.
- Multiple Markdown files are opened from Finder in close succession.
- GitLocal is already displaying a different folder when a new Finder-open request arrives.
- The last-opened folder or startup preference conflicts with the file macOS asked GitLocal to open.
- The selected file is very large, empty, malformed, or contains front matter.
- The file path contains spaces, Unicode characters, or symlinked folder segments.
- The user declines default-reader setup on first run and later wants to either keep using GitLocal without changing Markdown defaults or explicitly configure GitLocal from the native app menu.
- The user accepts default-reader setup, but macOS denies or fails the association change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST ask macOS users on first run whether GitLocal should become the default Markdown reader.
- **FR-002**: The product MUST NOT change the user's default Markdown reader unless the user explicitly opts in.
- **FR-003**: If the user declines default-reader setup, the product MUST remain usable without repeatedly blocking normal GitLocal use.
- **FR-004**: The product MUST allow opted-in macOS users to open Markdown files directly from Finder into GitLocal.
- **FR-005**: When opened from a Markdown file, the product MUST use the file's containing local folder as the active browsing context.
- **FR-006**: When opened from a Markdown file inside a repository, the product MUST expose the relevant repository context for that file's folder.
- **FR-007**: When opened from Finder, the product MUST select the requested Markdown file and show its rendered preview as the primary content.
- **FR-008**: A Finder-open request MUST take precedence over last-opened-folder state, default README selection, and startup preferences for the initial workspace target.
- **FR-009**: If macOS cannot complete the default-reader association change after the user opts in, the product MUST explain the failure without pretending the setup succeeded.
- **FR-010**: The first visible workspace for a folder or Markdown file MUST make file navigation discoverable without requiring users to switch between top-level tree and README tabs.
- **FR-011**: The product MUST replace the hidden or nuanced tree-versus-README choice with a GitHub-like folder page where the folder tree appears first and the folder README, when present, appears below it on the same scrollable page.
- **FR-012**: Users MUST be able to select a different file from the visible navigation and see the main preview update without losing folder context.
- **FR-013**: If there is no default Markdown document for a folder, the product MUST still present visible file navigation and a clear main-area state that no README is available.
- **FR-014**: The product MUST distinguish user-facing open failures, including unavailable file, unreadable file, unsupported item, and folder unavailable.
- **FR-015**: The product MUST avoid showing stale preview content after a failed Finder-open request.
- **FR-016**: The product MUST preserve existing local folder browsing and Markdown preview behavior for users who open GitLocal normally rather than from Finder.
- **FR-017**: The product MUST preserve current lightweight browsing orientation and MUST NOT turn the first-run workspace into a full-IDE-style editing environment.
- **FR-018**: The product MUST provide enough visible state for users to understand which folder is active and which file is selected.
- **FR-019**: If a folder has a README-style document, the product MUST provide a quick link near the top of the folder page that scrolls to the README section.
- **FR-020**: The folder tree MUST show dotfiles by default and MUST provide a checkbox that hides or shows `.*` files without changing the active folder or selected file.
- **FR-021**: The macOS native app MUST provide an explicit post-install action to make GitLocal the default Markdown reader, and this action MUST require user initiation rather than running automatically.

### Key Entities

- **Open Request**: A user-initiated request from macOS to open a local file in GitLocal. Includes the requested item, timing, and whether GitLocal was already running.
- **Default Reader Preference**: The user's explicit first-run choice about whether GitLocal should become the default macOS app for Markdown files. It can be accepted, declined, or not yet answered.
- **Active Folder Context**: The local folder GitLocal is browsing, including whether it is a repository and what file tree should be shown.
- **Selected File**: The file currently highlighted in navigation and displayed in the main content area.
- **Document Preview**: The rendered reading view for Markdown files and the appropriate existing viewer for other file types.
- **Workspace Layout State**: The visible arrangement of folder tree, README jump link, README section, selected-file context, dotfile visibility, and main preview.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of usability-test participants can double-click a local Markdown file and identify both the rendered document and surrounding file navigation within 10 seconds.
- **SC-002**: At least 90% of usability-test participants can switch from the opened Markdown file to a neighboring file without being told to look for a tree-view tab.
- **SC-003**: A Markdown file opened from Finder appears in preview with the correct containing folder context within 5 seconds for representative local projects.
- **SC-004**: Finder-open requests correctly select the requested file in 100% of test cases covering repository folders, non-repository folders, nested folders, paths with spaces, and already-running app state.
- **SC-005**: Support or feedback reports indicating that users cannot find the file tree decrease by at least 50% after release, compared with the prior comparable period.
- **SC-006**: In first-run validation, 100% of users are asked before GitLocal changes the default Markdown reader, and declining users see no default-reader change.
- **SC-007**: At least 90% of usability-test participants can locate the README quick link and jump from the folder tree area to the README within 5 seconds when a README exists.

## Assumptions

- The Finder double-click behavior applies to Markdown file types commonly associated with `.md` files, with other Markdown-like extensions considered only if already supported by the product.
- Default-reader setup is optional and opt-in. Opening a Markdown file by double-click should activate the macOS GitLocal app distribution only after the user has chosen GitLocal as the Markdown reader, either through GitLocal's first-run prompt, the native app menu action, or macOS system controls.
- The recommended design is a GitHub-like folder page: folder tree first, README below, and no top-level tabs that hide either surface.
- If the opened file is inside a repository, the repository root or most relevant repository context should be used while still selecting the exact requested file.
- Existing manual folder-open flows remain valid and should benefit from the same clearer navigation-and-preview layout where applicable.
