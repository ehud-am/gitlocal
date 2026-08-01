# Feature Specification: Navigation Concepts Improvements

**Feature Branch**: `030-navigation-improvements`
**Created**: 2026-07-31
**Status**: Draft
**Input**: User description: "improve the navigation concepts. 1. The '..' options should be removed. 2. Instead we should have a button 'parent folder'. Make sure to disable that button when we are at the root of the file system. This should be available in all types of display: regular os folder, git repos folder, a folder within a repo, a file display or edit within an os folder or git repos, etc. 3. A second button should be available only for git repos and allow quick navigation to the git repos home folder. Label it 'git home' or 'home'. This should be available in every git repo hierarchy, including git repos sub folder, or file view/edit within repo. 4. Readme button, quick link to view the readme of a git repo. Always the readme within the home folder of a git repo and not any readme within the sub folders. Special care for aesthetic, usability, and minimizing the real estate taken for navigation items — keep as much as possible for the actual content area."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Replace ".." rows with a dedicated Parent Folder button (Priority: P1)

A user browsing any folder listing — a plain OS folder, a git repository's root, a subfolder inside a repository — currently sees a ".." row mixed in with the regular file/folder entries to go up one level (and, at a repository root, a differently-labeled ".." row to leave the repo scope entirely). Going forward, there is no ".." row at all. Instead, a single, always-in-the-same-place "Parent Folder" button lets the user step up one level, and it is available not only in folder listings but also while viewing or editing a file.

**Why this priority**: Parent navigation is the single most-used navigation action in the app and currently the most inconsistent — it appears as a fake row in a table with two different labels/behaviors ("Parent" vs "Browse") and disappears entirely once a file is open. Fixing this is foundational to every other change in this feature.

**Independent Test**: Can be fully tested by opening a subfolder (in both a git repo and a plain OS folder), opening a file within that subfolder, and confirming a single "Parent Folder" control is present and behaves identically (steps up one filesystem level) in the folder listing, the file viewer, and the file editor — with no ".." row present anywhere.

**Acceptance Scenarios**:

1. **Given** a folder listing (git repo or plain OS folder) that is not at the filesystem root, **When** the user views the listing, **Then** no ".." row appears among the entries, and a "Parent Folder" button is present and enabled.
2. **Given** the user clicks "Parent Folder" while browsing a subfolder inside a git repository, **When** that subfolder is the repository root, **Then** the app navigates up one level to the folder containing the repository (leaving the repository's scope), exactly as stepping up one filesystem level would.
3. **Given** a user is viewing or editing a file (inside a repo or in a plain OS folder), **When** they look for parent navigation, **Then** the same "Parent Folder" button is available and, when clicked, closes the file view and navigates to the folder containing that file.
4. **Given** the user is at the root of the file system, **When** the folder listing, file view, or file edit screen is displayed, **Then** the "Parent Folder" button is visibly disabled and cannot be activated.

---

### User Story 2 - Quick jump to a git repository's home folder (Priority: P1)

A user working several levels deep inside a git repository — browsing a nested subfolder, or viewing/editing a specific file — wants to get back to the repository's top-level (home) folder without repeatedly stepping up one level at a time. A second navigation button, shown only when the current location is inside a git repository, jumps directly to that repository's home folder in one action.

**Why this priority**: Deep navigation within larger repositories is common, and repeatedly clicking "Parent Folder" to climb back to the repo root is a direct, easily-fixed usability cost. This is independent of, but complements, Story 1.

**Independent Test**: Can be fully tested by opening a git repository, navigating several subfolders deep (and separately, opening a file at that depth), and confirming a "Home" (repo home) button is visible, and clicking it from any of those locations returns the user to the repository's top-level folder view in one step.

**Acceptance Scenarios**:

1. **Given** the user is browsing any subfolder within a git repository, **When** they view the navigation controls, **Then** a button to jump to the repository's home folder is visible and enabled.
2. **Given** the user is viewing or editing a file inside a git repository (at any depth), **When** they click the repository-home button, **Then** the app navigates directly to the repository's top-level folder listing.
3. **Given** the user is already at the repository's home folder, **When** they view the navigation controls, **Then** the repository-home button is either disabled or omitted (it must not be an active no-op control sitting next to an already-disabled Parent Folder-style state), consistent with how the rest of the toolbar communicates "already here."
4. **Given** the user is browsing a plain OS folder that is not a git repository, **When** they view the navigation controls, **Then** no repository-home button is shown.

---

### User Story 3 - Quick access to the repository's home README (Priority: P2)

A user anywhere inside a git repository — a nested subfolder, or a specific file view/edit — wants to quickly check the project's main README without navigating away from what they're doing and without accidentally opening a different README that happens to live in a subfolder. A "Readme" button, shown only when inside a git repository, always opens the README located in that repository's home (top-level) folder, regardless of how deep the user currently is or whether the current subfolder has its own README.

**Why this priority**: This is a convenience feature building on the same repo-awareness as Story 2, valuable but secondary to establishing correct, consistent core navigation first.

**Independent Test**: Can be fully tested by opening a git repository whose home folder contains a README, navigating into a subfolder that contains a different README (or no README), and confirming the "Readme" button always opens the home folder's README — never the subfolder's.

**Acceptance Scenarios**:

1. **Given** a git repository whose home folder contains a README file, **When** the user is anywhere inside that repository (any subfolder, or a file view/edit screen), **Then** a "Readme" button is visible and, when clicked, displays the home folder's README.
2. **Given** the user is inside a subfolder that itself contains a README file, **When** the user clicks the "Readme" button, **Then** the repository's home README is shown, not the subfolder's README.
3. **Given** a git repository whose home folder does not contain a README file, **When** the user views the navigation controls, **Then** the "Readme" button is disabled (or omitted), rather than leading to an empty or error state.
4. **Given** the user is browsing a plain OS folder that is not a git repository, **When** they view the navigation controls, **Then** no "Readme" button is shown.

---

### Edge Cases

- What happens when the current folder or file is not inside a git repository and not at the filesystem root? Only the "Parent Folder" button should be available; no repo-home or Readme button should appear.
- What happens at the exact boundary of stepping from a repository's home folder up to its parent — should the repo-home and Readme buttons disappear immediately at that new (non-repo) location? Yes; button visibility must always reflect the current location, not the previously visited one.
- What happens if a folder several levels deep is itself the root of a *nested* git repository (a sub-repository)? The repo-home and Readme buttons must target the nearest enclosing repository's home folder (the sub-repository's own root, if the user is inside the sub-repository), not the outer repository.
- What happens if the repository's home README is renamed, deleted, or added while the user is deep in a subfolder? The next time the Readme button's state is evaluated (e.g., on navigation or refresh) it must reflect the current on-disk state, not a stale assumption.
- How do these buttons behave on narrow/mobile viewports where horizontal toolbar space is especially constrained? The design must degrade gracefully (e.g., icon-only buttons with labels available via tooltip/accessible name) rather than overflowing or wrapping awkwardly.
- What happens when the user is at the filesystem root of a location that is itself a git repository home folder (rare, but possible)? "Parent Folder" is disabled per the filesystem-root rule; the repo-home and Readme buttons remain available per their own rules (repo-home may be disabled/omitted since the user is already there, consistent with Story 2's "already here" behavior).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST remove the ".." row from every folder listing view (both the "Parent" and "Browse"/leave-repo-scope variants) and MUST NOT reintroduce parent navigation as a synthetic row among file/folder entries.
- **FR-002**: The system MUST provide a single "Parent Folder" navigation control that steps up exactly one filesystem level from the current location.
- **FR-003**: The "Parent Folder" control MUST be present and functional in every display mode: a plain OS folder listing, a git repository's home folder listing, a subfolder listing within a repository, a file being viewed, and a file being edited.
- **FR-004**: The "Parent Folder" control MUST be visibly disabled (not hidden) whenever the current location is the root of the file system, so its availability is predictable rather than appearing/disappearing.
- **FR-005**: Activating "Parent Folder" from a file view or edit screen MUST close that file and navigate to its containing folder's listing.
- **FR-006**: Activating "Parent Folder" from a git repository's home folder MUST navigate to that repository's containing folder, exiting the repository's scope, with the same single control and no separate "leave repository" affordance.
- **FR-007**: The system MUST provide a second navigation control ("repository home") that navigates directly to the current git repository's top-level (home) folder, usable from any subfolder or any file view/edit screen within that repository, regardless of nesting depth.
- **FR-008**: The "repository home" control MUST be shown only when the current location is inside a git repository, and MUST NOT be shown when browsing a plain, non-git OS folder.
- **FR-009**: When the current location is inside a nested (sub-)repository, the "repository home" control MUST target the home folder of the nearest enclosing repository (the sub-repository), not any outer repository.
- **FR-010**: The system MUST provide a third navigation control ("Readme") that opens the README file located in the current git repository's home folder, usable from any subfolder or any file view/edit screen within that repository, regardless of nesting depth.
- **FR-011**: The "Readme" control MUST always resolve to the home folder's README, never a README located in a subfolder, even when the user is currently viewing a subfolder that contains its own README.
- **FR-012**: The "Readme" control MUST be shown only when the current location is inside a git repository, and MUST NOT be shown when browsing a plain, non-git OS folder.
- **FR-013**: The "Readme" control MUST be disabled (or omitted) when the current repository's home folder does not contain a README file, rather than leading to an empty or error result when activated.
- **FR-014**: The navigation controls (Parent Folder, repository home, Readme) MUST be presented compactly — using minimal vertical/horizontal space (e.g., an icon-forward toolbar with accessible labels/tooltips rather than always-expanded text buttons) — so the amount of screen space taken from the main content area is kept to a practical minimum.
- **FR-015**: The navigation controls MUST remain in a single, consistent, predictable location across all display modes described in FR-003, so the user does not need to search for them when switching between folder listing, file view, and file edit.
- **FR-016**: Existing navigation behavior not covered by this feature (breadcrumb path navigation, sidebar file tree navigation, branch switching) MUST continue to function unchanged.

### Key Entities *(include if feature involves data)*

- **Parent Folder Target**: The filesystem folder that directly contains the current folder or file. Undefined/absent when the current location is already the filesystem root, in which case the Parent Folder control is disabled.
- **Repository Home Folder**: The top-level folder of the git repository (or nested sub-repository) that contains the user's current location. Absent when the current location is not inside any git repository.
- **Repository Home README**: The README file, if any, located directly in the Repository Home Folder (not in any subfolder). Its presence/absence determines whether the Readme control is enabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of folder listing views (plain OS folders, repository home folders, repository subfolders) render with zero ".." rows.
- **SC-002**: A user browsing any subfolder up to 10 levels deep inside a git repository can reach the repository's home folder in exactly one click, from either a folder listing or a file view/edit screen.
- **SC-003**: A user anywhere inside a git repository can open that repository's home README in exactly one click, and this action opens the correct file in 100% of tested cases, including when the current subfolder has its own differently-named or same-named README.
- **SC-004**: The combined navigation toolbar (Parent Folder, repository home, Readme) occupies no more vertical height than the current single-row header area it replaces/augments, measured before and after the change.
- **SC-005**: The Parent Folder control's enabled/disabled state correctly matches "not at filesystem root" / "at filesystem root" in 100% of tested locations, with no case where it is clickable at the root or disabled anywhere else.

## Assumptions

- "Root of the file system" means the true OS filesystem root (e.g. `/` on macOS/Linux, a drive root on Windows) that the app process can still see, not merely the app's initially-opened folder — consistent with today's ".." behavior already allowing navigation out of the initially-opened repository/folder.
- "Git repos home folder" means the top-level folder of the nearest enclosing git repository as GitLocal already detects it today (the same root used by existing repository detection and sub-repository detection), not necessarily the outermost repository if repositories are nested.
- Only one README is considered authoritative per repository for the Readme button: the one located directly in that repository's home folder, matched using the same README-detection rule the app already uses elsewhere (case-insensitive `README.md`). Other README-like files in the home folder (e.g. `README.txt`) are out of scope for this button unless the existing detection logic already covers them.
- Icon-based, compact controls are acceptable (and preferred) to satisfy the "minimize real estate" requirement, provided each control remains identifiable (via tooltip or visible label on hover/focus) and accessible (via accessible name for assistive technology).
- This feature changes navigation controls and their placement only; it does not change how folder listings, file contents, breadcrumbs, or the sidebar file tree are fetched or rendered, beyond removing the ".." synthetic row.
- Exact button labels beyond "Parent Folder" and "Readme" are open: the repository-home control is referred to here as "repository home" / "Home"; final label/icon/tooltip wording is a design decision for the planning phase, not fixed by this specification.
