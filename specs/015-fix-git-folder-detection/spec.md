# Feature Specification: Fix Git Folder Detection

**Feature Branch**: `015-fix-git-folder-detection`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "I see a major problem. folders that are git repo are not treated like they are git repos. As a result a lot of the git specific functionality is turned off. Please treat this as a bug fix and a patch release. Can you find the reason and spec the solution"

## Bug Analysis

Repository folders can be discovered in the folder picker, but the current folder-opening behavior can keep the user in folder browsing mode instead of entering repository mode. When that happens, repository-specific capabilities such as branch context, repository search, git identity, remote details, and git-specific file status are unavailable even though the selected folder is a git repository.

The likely behavioral cause is that directory navigation is handled before repository intent: selecting or double-clicking a directory that is marked as a git repository can browse into that directory like a plain folder instead of opening it as the active repository. The detection model also needs to distinguish a true repository root from an ordinary subfolder inside a repository so only actual repository folders receive repository routing and badges.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Git Repository Folders as Repositories (Priority: P1)

A user browsing local folders selects a folder that is a git repository and GitLocal opens it directly in repository mode, with git-specific functionality available immediately.

**Why this priority**: This is the reported bug. If repository folders open as regular folders, the main repository experience is unavailable and the app appears broken for normal project folders.

**Independent Test**: Can be tested by browsing to a parent folder that contains a git repository, opening that repository folder from the picker, and verifying the repository view shows branch and git context without requiring any additional navigation.

**Acceptance Scenarios**:

1. **Given** the folder picker is showing a directory entry that is a git repository, **When** the user opens that entry, **Then** GitLocal enters repository mode for that folder.
2. **Given** a repository folder is opened from the picker, **When** the main viewer loads, **Then** repository-specific controls and context are available according to the repository's state.
3. **Given** a repository folder is opened from the picker, **When** the repository has no commits or no remote configured, **Then** GitLocal still treats it as a repository and shows appropriate empty states for unavailable git details.

---

### User Story 2 - Preserve Plain Folder Browsing (Priority: P2)

A user browsing local folders opens a normal folder and GitLocal continues to show folder browsing and file editing capabilities without incorrectly enabling repository-only functionality.

**Why this priority**: The patch must fix repository folders without regressing the regular-folder capabilities recently added to the product.

**Independent Test**: Can be tested by opening a plain folder next to a repository folder and confirming the plain folder remains in folder mode while the repository folder opens in repository mode.

**Acceptance Scenarios**:

1. **Given** the folder picker is showing a directory entry that is not a git repository, **When** the user opens that entry, **Then** GitLocal opens it as a regular folder root.
2. **Given** a regular folder is opened, **When** the main viewer loads, **Then** repository-only controls are not shown.
3. **Given** a regular folder contains files and subfolders, **When** the user browses and edits files, **Then** the regular-folder workflow remains available.

---

### User Story 3 - Distinguish Repository Roots from Nested Folders (Priority: P3)

A user sees repository badges and repository routing only for actual git repository roots, not for every ordinary folder that happens to be inside a working tree.

**Why this priority**: Accurate labeling prevents false positives in the picker and keeps the open behavior predictable.

**Independent Test**: Can be tested by browsing inside a repository that contains nested folders and confirming nested folders are treated as folders unless they are independent repository roots.

**Acceptance Scenarios**:

1. **Given** the folder picker is showing a nested folder inside a repository, **When** that nested folder is not itself a repository root, **Then** it is labeled and opened as a folder.
2. **Given** the folder picker is showing a nested folder that is its own independent repository root, **When** the user opens it, **Then** it is labeled and opened as a repository.
3. **Given** the user opens a path that is inside a repository but not the repository root, **When** GitLocal determines the active root, **Then** it preserves the user's folder intent unless the selected path is itself a repository root.

### Edge Cases

- A repository folder has no commits yet.
- A repository folder has no remote configured.
- A repository folder has a `.git` file rather than a `.git` directory, such as a worktree or submodule checkout.
- A plain folder exists inside another repository's working tree.
- A parent folder contains a mix of files, plain folders, repository folders, and inaccessible folders.
- A repository folder is opened by typing or pasting its path rather than selecting it from the picker.
- A repository folder is opened through a single click plus Open action, double-click, and any folder action menu entry that opens the current folder.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GitLocal MUST classify a selected folder as a git repository when the selected folder is the repository root.
- **FR-002**: GitLocal MUST open a selected repository folder in repository mode from every picker-supported opening path.
- **FR-003**: GitLocal MUST show repository-specific context and controls after a repository folder is opened, including branch context when available, repository search, git identity, remote details, and git-specific file status where applicable.
- **FR-004**: GitLocal MUST keep selected folders that are not repository roots in regular-folder mode.
- **FR-005**: GitLocal MUST avoid labeling ordinary nested folders as repositories solely because they are inside another repository.
- **FR-006**: GitLocal MUST recognize repository roots that use either a repository metadata directory or a repository metadata file.
- **FR-007**: GitLocal MUST preserve existing regular-folder file browsing and mutation capabilities for non-repository folders.
- **FR-008**: GitLocal MUST preserve appropriate empty states for repository-specific details that are unavailable, such as missing commits, missing remotes, or missing git identity.
- **FR-009**: GitLocal MUST provide clear error feedback when a selected path cannot be opened or classified.
- **FR-010**: The patch release MUST be scoped to correcting repository-folder detection and routing, with no unrelated product behavior changes.

### Key Entities

- **Selected Folder**: A local folder the user chooses to open from the picker, typed path, or folder action.
- **Repository Folder**: A selected folder that is itself the root of a git repository and should enter repository mode.
- **Regular Folder**: A selected folder that is not itself a git repository root and should enter regular-folder mode.
- **Repository Capability State**: The set of git-specific capabilities and empty states exposed after a repository folder is opened.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of repository folders opened from the picker enter repository mode on the first open action.
- **SC-002**: 100% of plain folders opened from the picker remain in regular-folder mode.
- **SC-003**: Repository-specific controls are visible within the first loaded viewer screen for a repository folder when those controls are applicable to the repository state.
- **SC-004**: No ordinary nested folder inside a repository is labeled as a repository unless it is itself a repository root.
- **SC-005**: The patch can be validated with automated coverage for repository folder opening, regular folder opening, and nested folder classification.
- **SC-006**: Manual verification can open a repository folder and confirm branch context or repository empty state in under 30 seconds.

## Assumptions

- This is a bug fix and patch release, so the scope is limited to detection, labeling, and open routing for local folders.
- A git repository root includes standard repositories, worktrees, and submodule-style checkouts represented by repository metadata at the selected folder.
- Existing regular-folder capabilities remain in scope and must not be reduced.
- Existing repository capabilities remain the source of truth for which git controls are available once a repository is opened.
