# Feature Specification: Ignored Local File Visibility

**Feature Branch**: `008-ignored-files-visibility`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "our next feature is about showing files that are in the gitignore list. The idea is that we still want to show these in the gitlocal ui, but we also want to have a visual queue suggesting this is a local file only that will not be sent to remote"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse ignored local items in GitLocal (Priority: P1)

When a user opens a repository in GitLocal's current local working-tree view, they can see ignored local files and folders in the same browsing experience as other repository items so they do not have to leave the app to understand what is present on disk.

**Why this priority**: The core need is visibility. If ignored local items remain hidden, users cannot rely on GitLocal as an accurate picture of the files they are actively working with.

**Independent Test**: Open a repository whose working tree contains a mix of tracked items and ignored local items, then verify that ignored items appear in the repository tree, current-folder listing, and working-tree search results.

**Acceptance Scenarios**:

1. **Given** the current working tree contains an ignored local file or folder, **When** the repository browser loads that location, **Then** the ignored item appears alongside other visible repository items instead of being omitted.
2. **Given** a user expands folders in the current working-tree tree view, **When** an ignored child item exists in that folder, **Then** the ignored child can be discovered through normal browsing.
3. **Given** a user searches the current working tree for a name that matches an ignored local item, **When** search results are shown, **Then** that ignored item appears in the results.

---

### User Story 2 - Understand that ignored items stay local (Priority: P1)

When a user sees an ignored item in GitLocal, they can immediately tell that it is local-only content and is not currently part of what reaches the remote repository.

**Why this priority**: Visibility without context would be misleading. Users need a fast, trustworthy signal that these items are intentionally different from normal tracked repository content.

**Independent Test**: View ignored items in a mixed repository and confirm that users can identify them as local-only from the visible UI treatment without opening extra help or documentation.

**Acceptance Scenarios**:

1. **Given** an ignored item is shown in a repository listing, **When** a user scans the row or tree entry, **Then** a visible cue distinguishes it from normal tracked content.
2. **Given** a repository view contains both tracked and ignored items, **When** a user compares them, **Then** the ignored items are still readable and usable while remaining clearly marked as local-only.
3. **Given** a user opens an ignored file or folder from a repository listing, **When** the selected item becomes the active context, **Then** the local-only state remains understandable in that active view.

---

### User Story 3 - Avoid false empty states for ignored-only content (Priority: P2)

When a repository or folder contains only ignored local items, GitLocal shows that content instead of presenting the location as empty or broken.

**Why this priority**: Repositories often keep generated, personal, or machine-local files under ignore rules. Hiding those items can make a live local workspace look empty even when useful content is present.

**Independent Test**: Open a repository root or folder that contains only ignored local items and verify that GitLocal presents those items as visible local content rather than showing an empty-state message.

**Acceptance Scenarios**:

1. **Given** a repository root contains ignored local items but no other browseable items, **When** the default working-tree view loads, **Then** GitLocal shows those ignored items instead of treating the repository as empty.
2. **Given** a folder contains only ignored local items, **When** that folder view opens, **Then** GitLocal shows the ignored contents instead of an empty-folder message.
3. **Given** a user switches from the current working tree to a non-current branch or historical view, **When** ignored local items do not exist in that repository state, **Then** those ignored local items no longer appear in the browser.

### Edge Cases

- How does GitLocal handle ignore rules that match entire folders rather than a single file?
- What happens when an ignored item's status changes during the session because the ignore rule changes or the user starts tracking that item?
- How does the repository root behave when the only visible local content is ignored and all other root items are hidden dotfiles?
- What happens when a user searches for a term that matches both tracked items and ignored local items in the same result set?
- How does the active view behave if an ignored item is deleted or moved on disk after GitLocal has already listed it?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST include ignored local files and folders in the current working-tree repository browsing experience instead of filtering them out.
- **FR-002**: The system MUST apply a clear visual cue to ignored local items indicating that they are local-only content and are not currently part of what reaches the remote repository.
- **FR-003**: The system MUST present that local-only cue in user-facing language that is understandable without requiring prior knowledge of git ignore rules.
- **FR-004**: The system MUST apply ignored-item visibility and the local-only cue consistently across all current working-tree UI surfaces that list repository items, including the repository tree, folder listings, and working-tree search results.
- **FR-005**: Users MUST be able to open a visible ignored file or folder through the same basic browsing actions available for other visible local items.
- **FR-006**: The system MUST keep ignored local items scoped to the current working-tree view and MUST NOT show them in non-current branch or historical repository views unless those views independently contain matching content.
- **FR-007**: The system MUST treat ignored local items as visible repository content when determining whether the current repository root or folder should appear empty.
- **FR-008**: The system MUST support ignored directories and nested ignored items, not only single ignored files at the repository root.
- **FR-009**: The system MUST refresh ignored-item visibility and local-only labeling when the repository view refreshes after an item's ignore status changes.
- **FR-010**: The system MUST avoid wording or presentation that suggests an ignored local item is already tracked, committed, or available on the remote repository.
- **FR-011**: The system MUST continue to hide repository internals that are intentionally excluded from browsing, such as the repository metadata directory, even while other ignored local items become visible.
- **FR-012**: If an ignored item is shown in a listing but becomes unavailable before the user opens it, the system MUST provide a clear unavailable outcome rather than leaving the interface in a broken or misleading state.

### Key Entities *(include if feature involves data)*

- **Ignored Local Item**: A file or folder present in the local working tree that matches the repository's ignore rules and is therefore local-only unless its status changes.
- **Local-Only Cue**: The visible label, iconography, or text treatment that tells users an ignored item stays local and is not currently part of the remote-facing repository state.
- **Working-Tree Browse Surface**: Any GitLocal screen element that lists current local repository items for browsing, such as the repository tree, folder content lists, and search results.
- **Repository Content State**: GitLocal's user-facing understanding of whether a repository root or folder contains visible local content worth showing instead of an empty-state message.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of ignored local items in the current working tree appear in the designated browsing surfaces for their location.
- **SC-002**: In usability review, at least 90% of participants can correctly identify an ignored item as local-only within 5 seconds of seeing it.
- **SC-003**: In validation testing, 100% of repositories or folders that contain only ignored visible items are presented as containing browseable content rather than as empty or broken states.
- **SC-004**: In validation testing, 100% of ignored local items disappear from the browser when the user switches from the current working-tree view to a non-current branch or historical view where those items are not present.
- **SC-005**: In task-based validation, users can open an ignored visible file or folder in the same number of interaction steps required for a comparable non-ignored item in the same view.

## Assumptions

- The initial feature scope covers user-facing repository browsing surfaces in the current working-tree view, including search results, but does not add new git status management workflows.
- "Will not be sent to remote" is communicated to users as a local-only state, while the actual act of changing ignore rules or tracking an item remains outside this feature.
- Existing file-viewing and lightweight local-file actions that already apply to local working-tree files may continue to apply to ignored items when those actions are otherwise valid.
- Ignored directories should be treated consistently with ignored files so that users can understand complete local-only areas of a repository.
- Repository internals that are intentionally excluded from browsing, such as the repository metadata directory, remain hidden even though other ignored local items become visible.
