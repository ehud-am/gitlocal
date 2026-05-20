# Feature Specification: Fix Nested Repository Detection

**Feature Branch**: `016-fix-subrepo-detection`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "there are still cases where a folder is misclassified as a regular folder while it is a git repo. I think one such scenario is when i am currently in a regular filesystem folder and in some cases sub-folders that have .git folders are not recognized correctly and open as a regular filesystem folder. The same repo, when started gitlocal from that working directory, is displayed correctky as a git repo. This is perhaps another bug and requires another path release. Can you find the problem?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Repository Child From Plain Folder (Priority: P1)

A user starts GitLocal from a regular filesystem folder, sees a subfolder that is itself a git repository, and opens that subfolder as a repository with git-specific functionality available immediately.

**Why this priority**: This is the reported regression. A repository should not lose repository behavior just because it is discovered from a non-repository parent folder.

**Independent Test**: Can be tested by starting GitLocal from a plain parent folder that contains at least one repository child, opening that child from the folder browser, and verifying repository mode is active on the first open action.

**Acceptance Scenarios**:

1. **Given** GitLocal is started in a regular filesystem folder that is not a repository, **When** the folder browser lists a direct child that is a git repository, **Then** that child is labeled as a repository.
2. **Given** a repository child is listed from a regular filesystem folder, **When** the user opens the child by double-clicking or using the Open action, **Then** GitLocal opens the child in repository mode.
3. **Given** the repository child opens from the regular filesystem folder, **When** the main viewer loads, **Then** repository-specific context and controls are available according to the repository state.

---

### User Story 2 - Preserve Plain Folder Behavior Beside Repository Children (Priority: P2)

A user browsing a regular filesystem folder can still open neighboring non-repository folders as regular folders without repository controls or misleading labels.

**Why this priority**: The patch must fix missed repository children without causing every child folder in a plain parent to appear as a repository.

**Independent Test**: Can be tested by placing a regular child folder and a repository child folder under the same plain parent, then confirming each child opens in the correct mode.

**Acceptance Scenarios**:

1. **Given** a regular filesystem folder contains both plain child folders and repository child folders, **When** GitLocal lists the children, **Then** only the repository children are labeled as repositories.
2. **Given** a plain child folder is opened from the same parent, **When** the viewer loads, **Then** it remains in regular-folder mode.
3. **Given** a repository child and a plain child share the same parent, **When** either child is selected, **Then** the selected path shown to the user matches the selected child and does not inherit the sibling's classification.

---

### User Story 3 - Consistent Classification Across Entry Points (Priority: P3)

A user sees the same repository classification whether they start GitLocal directly in the repository folder, browse to it from a parent folder, paste its path, or open it from a folder action.

**Why this priority**: The user reported that direct startup correctly recognizes the repository while parent browsing does not, which indicates inconsistent entry-point behavior.

**Independent Test**: Can be tested by opening the same repository through all supported entry points and comparing the resulting mode, labels, and repository context.

**Acceptance Scenarios**:

1. **Given** a folder is a valid git repository, **When** GitLocal is started from that folder, **Then** it is treated as a repository.
2. **Given** the same folder is opened from a parent folder browser, **When** the user opens it, **Then** it is treated as the same repository.
3. **Given** the same folder path is typed or pasted into the open path field, **When** the user submits it, **Then** it is treated as the same repository.

### Edge Cases

- A plain parent folder contains several repository children and several regular folder children.
- A repository child has no commits, no remote, or no configured git identity.
- A repository child uses repository metadata stored as a file rather than a directory.
- A repository child is nested more than one level below the initial plain browse root.
- A regular folder inside a repository remains a folder unless it is itself an independent repository.
- A folder cannot be inspected because of filesystem permissions.
- A repository child is opened through single selection plus Open, double-click, and any folder action that opens the current path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GitLocal MUST classify a selected folder as a repository whenever that folder is itself a valid repository root, regardless of whether its parent folder is a repository.
- **FR-002**: GitLocal MUST label repository child folders as repositories when they are listed from a regular filesystem parent.
- **FR-003**: GitLocal MUST open repository child folders in repository mode from every supported folder-browser opening path.
- **FR-004**: GitLocal MUST keep non-repository child folders in regular-folder mode when listed beside repository child folders.
- **FR-005**: GitLocal MUST produce the same repository classification for the same folder across startup, browsing from a parent, typed path entry, and folder actions.
- **FR-006**: GitLocal MUST recognize valid repositories with no commits, no remote, or missing git identity as repositories while showing appropriate empty states for unavailable details.
- **FR-007**: GitLocal MUST avoid labeling ordinary folders as repositories solely because they are near, beside, or inside another repository.
- **FR-008**: GitLocal MUST show a clear non-blocking error when a folder cannot be inspected, while preserving the ability to browse other entries in the same parent.
- **FR-009**: The patch release MUST be limited to correcting repository child detection, labeling, and open routing, with no unrelated product behavior changes.

### Key Entities

- **Browse Root**: The local folder currently shown in the folder browser; it may be a regular folder or a repository.
- **Repository Child Folder**: A child folder under the browse root that is itself a valid repository root and should open in repository mode.
- **Regular Child Folder**: A child folder under the browse root that is not itself a repository root and should open in regular-folder mode.
- **Folder Entry Classification**: The user-visible label and intended open behavior for a listed folder entry.
- **Repository Capability State**: The repository-specific context and controls available after a repository folder opens.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid repository child folders under a plain parent are labeled as repositories in the folder browser.
- **SC-002**: 100% of repository child folders opened from a plain parent enter repository mode on the first open action.
- **SC-003**: 100% of regular child folders under the same parent remain in regular-folder mode.
- **SC-004**: The same repository opened through startup, parent browsing, typed path entry, and folder actions produces the same repository-vs-folder classification.
- **SC-005**: The patch is validated with automated coverage for a plain parent containing at least one repository child and one regular child.
- **SC-006**: Manual verification can demonstrate the reported failure path and confirm the corrected behavior in under 60 seconds.

## Assumptions

- This is a patch bug fix; scope is limited to local folder classification, labels, and open behavior.
- A repository child means the child folder itself is the repository root, not merely a folder contained inside an ancestor repository.
- Existing repository controls remain the source of truth for which git-specific capabilities are shown after a repository opens.
- Existing regular-folder browsing, creation, editing, and deletion behavior remains in scope and must not be reduced.
- The likely failure area is inconsistent classification between direct repository startup and repository discovery from a parent folder; planning should first reproduce that difference before changing behavior.
