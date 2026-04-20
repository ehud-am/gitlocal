# Feature Specification: Shadcn GitHub-Style Browser Refresh

**Feature Branch**: `009-shadcn-github-browser`  
**Created**: 2026-04-19  
**Status**: Draft  
**Input**: User description: "Switch GitLocal to a shadcn-based design system across the whole app, restyle the right panel closer to GitHub, support light and dark themes, make branch switching change the local working tree with dirty-state confirmation, always show a parent-folder entry, show folder files before the README, and replace setup with a true modal that can create folders, initialize git, or clone into a subfolder."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse repository context in a GitHub-like right panel (Priority: P1)

When a user opens a file or folder in GitLocal, the interface gives them the same kind of fast orientation they expect from GitHub: a strong title, the full path, repository context, branch context, consistent shadcn-based controls, and a predictable folder-content view in both light and dark themes.

**Why this priority**: This is the everyday browsing surface. If the panel remains hard to scan, the rest of the enhancements do not land as a coherent improvement.

**Independent Test**: Open a repository with nested folders and a README, then verify that the right panel shows the last path segment as the title, the complete path as supporting text, repository metadata, branch controls, a `..` parent entry for folder views, and folder contents before any README preview.

**Acceptance Scenarios**:

1. **Given** a user opens a file or folder, **When** the right panel renders, **Then** the primary title is the last path segment and the complete path remains visible nearby.
2. **Given** the active context is inside a git repository, **When** the panel header renders, **Then** it shows that the location is a git-backed repository, the configured developer identity, the current branch, and remote information when available.
3. **Given** the active context is a folder, **When** the folder view is shown, **Then** a `..` entry is available to move up one level unless the user is already at the topmost allowed location.
4. **Given** the active context is a git-backed folder that has both child entries and a README, **When** the panel renders, **Then** the file and folder listing appears before the README content.
5. **Given** the user switches between the supported app themes, **When** the same repository view is rendered, **Then** the GitHub-like information hierarchy remains legible and coherent in both light and dark modes.

---

### User Story 2 - Switch branches by changing the local working tree safely (Priority: P1)

When a user changes branches from GitLocal, the application performs a real local branch switch instead of only changing the read context, while protecting the user from accidentally losing uncommitted work and handling both local and remote-tracking branches.

**Why this priority**: A branch selector that only changes the viewer is weaker than what the user asked for. The value here is direct repository control with guardrails.

**Independent Test**: Open a repository with multiple branches, switch branches with a clean working tree, then repeat with uncommitted changes and verify the user can commit, discard, or cancel before the branch switch continues.

**Acceptance Scenarios**:

1. **Given** a repository has more than one branch and the working tree is clean, **When** the user selects a different local branch, **Then** GitLocal checks out that branch locally and refreshes the visible file tree and content to match it.
2. **Given** the working tree contains uncommitted changes, **When** the user attempts to change branches, **Then** GitLocal blocks the switch and shows options to commit the changes, discard the changes, or cancel.
3. **Given** the user chooses to cancel a branch change, **When** the dialog closes, **Then** the current branch and local working tree remain unchanged.
4. **Given** the user chooses to commit changes before switching, **When** the commit succeeds, **Then** GitLocal completes the branch change and refreshes the UI against the newly checked-out branch.
5. **Given** the user chooses to discard changes before switching, **When** the discard succeeds, **Then** GitLocal completes the branch change and refreshes the UI against the newly checked-out branch.
6. **Given** the user selects a remote-tracking branch that does not yet have a local branch, **When** the branch switch succeeds, **Then** GitLocal creates or checks out the corresponding local tracking branch and refreshes the UI against it.

---

### User Story 3 - Start repositories from a more capable setup flow (Priority: P2)

When a user is choosing where GitLocal should work, they can do the setup work from a true setup modal instead of leaving GitLocal to create folders or prepare a repository first.

**Why this priority**: The current setup flow is a dead end for common next steps. Adding creation and repository bootstrap actions makes first-run and repo selection much smoother.

**Independent Test**: From the setup experience, create a new folder, initialize a regular folder as a git repository, and clone a repository into a chosen subfolder, then verify the resulting location can be opened in GitLocal.

**Acceptance Scenarios**:

1. **Given** the setup modal is open, **When** the user wants a new destination folder, **Then** they can create a new folder without leaving GitLocal.
2. **Given** the user has selected a regular filesystem folder that is not yet a git repository, **When** setup actions are shown, **Then** the user can initialize that folder with `git init`.
3. **Given** the user has selected a regular filesystem folder that is not yet a git repository, **When** setup actions are shown, **Then** the user can clone a repository into a new subfolder beneath that location.
4. **Given** a setup action fails because the destination is invalid or already conflicts with existing content, **When** GitLocal reports the result, **Then** the user receives a clear error and remains in the setup flow.

## Edge Cases

- How should the `..` entry behave when the user is already at the repository root versus when they are outside a git repository in the setup flow?
- What should GitLocal do when the configured git user name or email is missing?
- How should remote links be shown when the remote URL is SSH-based, local-path based, or not convertible to a browser URL?
- What should happen when a branch switch fails because checkout is blocked by untracked files, merge conflicts, or branch protection on the local clone?
- How should the setup flow behave when a clone target subfolder already exists or is non-empty?
- Should the README preview appear for non-git folders too, or only for git-backed folder views?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST restyle the whole app using shadcn-based components and a GitHub-like information hierarchy for spacing, typography, controls, and panel structure.
- **FR-002**: The system MUST support a GitHub-like light theme and a coherent dark theme across the whole app.
- **FR-003**: The right panel MUST show the last path segment as the primary title for the active file or folder.
- **FR-004**: The right panel MUST show the complete active path near the title in a secondary presentation.
- **FR-005**: The right panel MUST indicate whether the active context belongs to a git repository.
- **FR-006**: If the active context belongs to a git repository, the panel MUST show the configured developer name and email when they are available and a clear fallback state when they are not configured.
- **FR-007**: Developer identity lookup MUST prefer repository-local git config and fall back to global git config when local values are absent.
- **FR-008**: If the active repository has a configured remote, the panel MUST indicate that remote presence, show the selected remote name, and present a user-openable link when GitLocal can derive one safely.
- **FR-009**: SSH remotes that map cleanly to a browser URL MUST be converted to an HTTPS-style link for display.
- **FR-010**: The panel MUST show the current branch and provide a branch selector for switching to another available branch.
- **FR-011**: The branch selector MUST include both local branches and eligible remote-tracking branches that can be checked out locally.
- **FR-012**: Changing branches from the branch selector MUST perform a real local branch switch for the repository rather than only changing the file-view query context.
- **FR-013**: If the user attempts a branch switch while the working tree has uncommitted or untracked changes that would be lost or blocked, the system MUST present a blocking confirmation flow with options to commit changes, discard changes, or cancel.
- **FR-014**: If the user chooses to commit changes before switching branches, the system MUST stage all changes, collect a commit message in the confirmation flow, create the commit successfully, and only then attempt the branch change.
- **FR-015**: If the user selects a remote-tracking branch that does not yet have a local counterpart, the system MUST create or check out a corresponding local tracking branch as part of the branch switch.
- **FR-016**: If the user chooses to discard changes before switching branches, the system MUST clearly communicate what local content will be lost before the discard happens.
- **FR-017**: The system MUST NOT silently delete untracked files as part of a standard discard action; if untracked files still block the checkout, the system MUST present a second, more explicit confirmation before deleting them.
- **FR-018**: If the user cancels the branch switch flow, the repository state and current branch selection MUST remain unchanged.
- **FR-019**: After a successful branch switch, GitLocal MUST refresh the local file tree, right-panel content, and related repository metadata to match the newly checked-out branch.
- **FR-020**: Folder-content views MUST always offer a `..` entry for moving to the parent folder whenever a parent location exists within the current browsing context.
- **FR-021**: In a git-backed folder view that has a README, the system MUST render the file and folder listing before the README preview.
- **FR-022**: The setup experience MUST be presented as a true modal rather than only a dedicated standalone page.
- **FR-023**: The setup experience MUST always allow the user to create a new folder from within GitLocal.
- **FR-024**: When the selected setup location is a regular folder that is not a git repository, the setup experience MUST offer an action to initialize it as a git repository.
- **FR-025**: When the selected setup location is a regular folder that is not a git repository, the setup experience MUST offer an action to clone a repository into a new subfolder beneath that location.
- **FR-026**: Setup actions that create folders, initialize git, or clone repositories MUST surface success and failure results clearly without forcing the user to restart the setup flow.
- **FR-027**: The branch selector, setup controls, theme controls, and confirmation dialogs introduced by this feature MUST be accessible by keyboard and expose meaningful labels to assistive technology.
- **FR-028**: The feature MUST preserve current local-file browsing and editing capabilities after the shadcn-based visual refresh.
- **FR-029**: The feature MUST NOT silently discard uncommitted repository changes during branch-switch actions.
- **FR-030**: The feature MUST continue to support repositories that do not yet have a remote configured.

### Key Entities *(include if feature involves data)*

- **Repository Context Header**: The right-panel summary area that presents the active item title, full path, git status, identity, remote details, and branch controls.
- **Branch Switch Decision**: The user-confirmed choice to commit, discard, or cancel when local repository changes would affect a real branch checkout.
- **Setup Action**: A user-triggered operation in the setup flow that creates a folder, initializes a git repository, or clones a repository into a child folder.
- **Folder Content View**: The right-panel representation of a folder, including parent navigation, child entries, and README preview ordering.
- **Theme Mode**: The active app-wide presentation mode, including the GitHub-like light theme and the corresponding dark theme.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of file and folder views show the last path segment as the primary title and the full path as supporting context.
- **SC-002**: In validation testing, 100% of successful branch changes initiated from GitLocal update the local working tree and visible UI to the selected branch.
- **SC-003**: In validation testing, 100% of branch-switch attempts with blocking local changes present an explicit commit, discard, or cancel decision before repository state changes.
- **SC-004**: In validation testing, 100% of eligible folder views include an actionable parent-navigation row.
- **SC-005**: In validation testing, 100% of git-backed folder views with a README render the child listing before the README preview.
- **SC-006**: In setup-flow validation, users can complete folder creation, git initialization, and repository cloning from the setup modal without leaving GitLocal.
- **SC-007**: In validation testing, the same primary browse and setup workflows remain usable in both light and dark themes.

## Assumptions

- The shadcn migration covers the whole app rather than only the surfaces directly touched by the feature.
- A "formal link" for the remote means a browser-openable remote URL when one can be derived safely from the configured remote.
- When multiple remotes exist, GitLocal will show the remote associated with the current branch's upstream configuration when available, otherwise `origin`, otherwise the first configured remote.
- Branch switching is intended for normal local branches in the currently opened repository and does not introduce advanced git flows such as stash management, rebasing, or selective file preservation.
- The setup experience is an actual modal container, even if some fallback full-screen behavior remains necessary for unusually small viewports.
- The branch-switch commit flow stages all current changes and uses a message field in the confirmation dialog, prefilling an editable default message if no custom message is provided.
- The default discard flow removes staged and tracked working-tree changes first, and only offers untracked-file deletion when those untracked files still block the requested checkout.
- The README placement requirement applies to folder browsing in repositories and does not require README previews for every non-git filesystem folder by default unless requested later.
