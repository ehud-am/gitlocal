# Feature Specification: Viewer Usability Upgrades

**Feature Branch**: `025-viewer-usability-upgrades`  
**Created**: 2026-06-11  
**Status**: Draft  
**Input**: User description: "Build a spec for all 15 usability-review recommendations for GitLocal UI. Target user is a semi-technical product manager using Codex or another AI coding agent, with high-frequency local file and Markdown viewing, low-frequency edits, and repository-aware support while files may change in the background."

## Clarifications

### Session 2026-06-11

- Q: Which root-view tab should be selected by default when a repository README exists? → A: Default to README.
- Q: How should folder tabs and changed-files entry points be simplified? → A: README then Tree only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read Markdown Clearly in the Normal Viewer (Priority: P1)

A semi-technical product manager opens a local repository and reads Markdown-heavy files such as README, AGENTS, specs, plans, and task documents in the standard repository viewer.

**Why this priority**: Markdown reading is the highest-frequency job. The product should feel like a document viewer first, while preserving repository context and quick access to actions.

**Independent Test**: Can be fully tested by opening a Markdown file, using relative links, finding text in the rendered document, copying or sharing output, and continuing to see normal repository context without changing files.

**Acceptance Scenarios**:

1. **Given** a Markdown file in a nested folder contains a relative link, **When** the user follows the link, **Then** the target resolves relative to the current Markdown file's folder.
2. **Given** the user searches within the current Markdown file, **When** matches are found, **Then** matches are highlighted in the rendered document and the active match is visible.
3. **Given** the user needs to export or reuse rendered Markdown, **When** they use read-oriented actions, **Then** they can copy rendered content directly while save-to-PDF and share remain discoverable from the file actions menu without entering edit mode.

---

### User Story 2 - Notice and Review Background Agent Changes (Priority: P1)

A product manager watches a repository while Codex or another tool edits files in the background. They need to understand what changed, whether their current file refreshed, and where to focus review.

**Why this priority**: The product's core context assumes background file mutation. Users need confidence that the viewer reflects the live working tree and that changes are not hidden.

**Independent Test**: Can be fully tested by opening a repository, changing files externally, and confirming that visible indicators, changed-file lists, current-file updates, and refresh behavior make the change understandable without manual page reloads.

**Acceptance Scenarios**:

1. **Given** a file changes outside GitLocal while it is open, **When** GitLocal detects the change, **Then** the user sees a clear but non-disruptive indicator that the current file changed and when it was last refreshed.
2. **Given** repository files are modified, added, deleted, or renamed outside GitLocal, **When** the user opens the changed-files view, **Then** they can see the changed paths grouped by meaningful status.
3. **Given** the currently viewed file is deleted or moved externally, **When** GitLocal detects the missing path, **Then** the user is moved to the nearest valid context and shown an explanation.
4. **Given** the user manually refreshes, **When** new content or status is found, **Then** GitLocal explains what changed at a user-readable level.

---

### User Story 3 - Search Without Losing Reading Context (Priority: P1)

A user searches a repository for terms, files, or Markdown content while keeping their current document available and avoiding noisy generated results.

**Why this priority**: Search is central to codebase understanding, but large local repositories can contain generated, ignored, or low-value files that overwhelm semi-technical users.

**Independent Test**: Can be fully tested by opening search from a file, running scoped searches, selecting results, dismissing search, and confirming the document context remains recoverable.

**Acceptance Scenarios**:

1. **Given** a file is open, **When** the user opens repository search, **Then** search appears in a separate surface that does not permanently push the active document out of view.
2. **Given** a common query returns many results, **When** results are displayed, **Then** the user sees result counts, clear categories, and an explicit way to load more or narrow scope.
3. **Given** generated or local-only folders exist, **When** the user searches, **Then** they can include or exclude these folders intentionally.
4. **Given** the user selects a result, **When** the result opens, **Then** the active file path, selected match context, and prior search are understandable.
5. **Given** the user closes search, **When** they return to reading, **Then** their previous file and reading position remain available where practical.

---

### User Story 4 - Navigate Repository Documents Efficiently (Priority: P2)

A user wants GitLocal to surface important documents and recent activity instead of requiring manual tree scanning every time.

**Why this priority**: Semi-technical users often know the task but not the repository layout. They need high-signal entry points into docs and recent work.

**Independent Test**: Can be fully tested by opening a repository root and using suggested document shortcuts, recent files, recently changed files, collapsed navigation, and folder views.

**Acceptance Scenarios**:

1. **Given** a repository has common Markdown files or folders, **When** the user opens the repository root, **Then** GitLocal surfaces likely entry points such as README, agent instructions, specs, docs, and recent Markdown files.
2. **Given** files were recently viewed or changed, **When** the user uses recent navigation, **Then** they can return to those files without scanning the tree.
3. **Given** navigation is collapsed, **When** the user uses the collapsed rail, **Then** they can still reach search, changed files, recent files, key docs, and the current folder.
4. **Given** any Git repository or non-Git folder has a README, **When** the user opens that folder, **Then** GitLocal shows README and Tree view tabs in that order and selects README by default for reading.

---

### User Story 5 - Understand Repository State in Plain Language (Priority: P2)

A user needs a quick, plain-language understanding of branch, remote, and local change state without needing to interpret technical badges.

**Why this priority**: Git state matters in local repositories, but the target user may not understand terse labels like "ahead", "remote", or "local only" without context.

**Independent Test**: Can be fully tested by opening repositories with different branch, remote, and local-change states and confirming that plain-language summaries and filters are visible.

**Acceptance Scenarios**:

1. **Given** a repository is on a branch with a remote, **When** the user views the repository header, **Then** they see a concise sentence explaining branch and remote status.
2. **Given** local changes exist, **When** the repository header is visible, **Then** the summary includes a clear count and a single way to open changed files.
3. **Given** the changed-files panel is open, **When** the user finishes reviewing it, **Then** they can close the panel without navigating away.
3. **Given** local-only or generated files exist, **When** the user views the tree or folder list, **Then** they can tell whether these files are part of the repository or only present locally.

---

### User Story 6 - Make Rare Edits Safely (Priority: P3)

A user occasionally edits, creates, or deletes files, but these controls should not dominate the viewing workflow.

**Why this priority**: Editing remains useful, but it is lower frequency than reading and review. The product should keep write actions discoverable, reversible where possible, and clearly separated from read actions.

**Independent Test**: Can be fully tested by opening editable files and folders, finding edit/create/delete actions, making a small change, cancelling a dirty edit, and confirming that read actions remain more prominent.

**Acceptance Scenarios**:

1. **Given** a file is open for reading, **When** the user looks for edit actions, **Then** edit/delete controls are discoverable but visually secondary to read, find, copy, and share actions.
2. **Given** the user starts editing and the file changes externally, **When** they attempt to save, **Then** GitLocal prevents accidental overwrite and explains the conflict in user-readable language.
3. **Given** the user creates or deletes a file or folder, **When** the operation completes, **Then** the repository view, changed-files view, and status summary update consistently.

---

### Edge Cases

- A repository has thousands of files, many generated folders, or very large text files.
- Search returns zero results, hundreds of results, or results only in generated/local-only files.
- A background process modifies the active file while the user is scrolled deep in the document.
- A background process deletes, renames, or moves the active file or its parent folder.
- A Markdown document has duplicate headings, malformed links, links containing spaces, anchor links, links to missing files, or links outside the repository.
- A repository has no remote, no commits, detached HEAD state, multiple remotes, or unavailable remote status.
- A user opens a non-current branch where edits are not allowed.
- A user collapses navigation on a small screen and still needs search, changed files, and key docs.
- A folder has no README and no obvious docs.
- A user has unsaved edits and tries to navigate, refresh, switch branch, or follow a search result.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GitLocal MUST keep Markdown reading in the normal repository viewer so repository identity, path, branch/status, search, and navigation remain available.
- **FR-002**: GitLocal MUST preserve normal repository context while Markdown files are being read.
- **FR-003**: GitLocal MUST resolve relative Markdown links from the folder containing the current Markdown document.
- **FR-004**: GitLocal MUST preserve support for same-document anchors, external links, email links, missing targets, and links that cannot be opened safely.
- **FR-005**: GitLocal MUST provide find-in-file for rendered Markdown with visible in-document highlighting and active-match navigation.
- **FR-006**: GitLocal MUST keep rendered Markdown actions such as copy, save, and share discoverable without requiring edit mode, with copy visible in the reading toolbar and save-to-PDF/share placed in the file actions menu.
- **FR-007**: GitLocal MUST detect background changes to the active file and communicate that the visible content was refreshed or is no longer available.
- **FR-008**: GitLocal MUST provide a changed-files view that includes modified, added, deleted, renamed, untracked, local-only, and remote-relevant states when those states are known.
- **FR-009**: GitLocal MUST provide a concise changed-files entry point from the repository header or another always-visible repository context area.
- **FR-010**: GitLocal MUST explain automatic navigation caused by deleted or missing active paths.
- **FR-011**: GitLocal MUST separate repository search from the main document reading flow so search results do not permanently displace the active document.
- **FR-012**: GitLocal MUST support repository search scopes for current folder, repository-wide, tracked files, local-only/generated files, file names, file contents, and Markdown-focused content.
- **FR-013**: GitLocal MUST show search result count, active scope, loading state, empty state, and a clear way to refine or load more results when many matches exist.
- **FR-014**: GitLocal MUST preserve the user's active file context when search is opened, scrolled, dismissed, or used to open a result.
- **FR-015**: GitLocal MUST allow users to hide or show generated/local-only folders in tree, folder list, and search surfaces.
- **FR-016**: GitLocal MUST provide prominent shortcuts to high-value documents and locations, including README, agent instructions, specs, docs, recently viewed files, and recently changed files when available.
- **FR-017**: GitLocal MUST provide README and Tree view tabs, in that order, for any Git repository or non-Git folder with a README, defaulting to README while preserving direct access to raw folder browsing through Tree view.
- **FR-018**: GitLocal MUST make collapsed navigation useful by exposing quick access to search, changed files, recent files, key docs, current folder, and navigation expansion.
- **FR-019**: GitLocal MUST provide a plain-language repository status summary covering branch, remote availability, sync direction, and local changes.
- **FR-020**: GitLocal MUST keep raw technical badges available as supporting detail without relying on them as the only explanation of repository state.
- **FR-021**: GitLocal MUST keep edit, create, and delete actions available for permitted contexts while making read, find, copy, share, and review actions more visually prominent.
- **FR-022**: GitLocal MUST warn before discarding unsaved edits during navigation, search result selection, refresh, or branch change.
- **FR-023**: GitLocal MUST prevent accidental overwrite when a file changes outside GitLocal while the user has unsaved edits.
- **FR-024**: GitLocal MUST remember user preferences for local/generated visibility, search scope, and collapsed navigation where doing so improves repeated use.
- **FR-025**: GitLocal MUST provide user-readable empty and error states for missing docs, unavailable folders, unavailable branches, failed searches, and unsupported file previews.
- **FR-026**: GitLocal MUST support keyboard-friendly access to search, find-in-file, refresh, changed files, and repository navigation.
- **FR-027**: GitLocal MUST keep the current file path and repository identity visible enough that users can orient themselves after scrolling, searching, or switching views.
- **FR-028**: GitLocal MUST avoid exposing destructive actions as primary actions in high-frequency reading surfaces.
- **FR-029**: GitLocal MUST support repositories that are local-only, remote clones, empty, or actively changing in the background.
- **FR-030**: GitLocal MUST make external background changes understandable without requiring users to read terminal output.
- **FR-031**: GitLocal MUST keep the raw Markdown/text copy action on the same toolbar row as find-in-file and the file actions menu to reduce vertical space usage.
- **FR-032**: GitLocal MUST avoid duplicate changed-files buttons in the repository header and MUST provide a close control for the changed-files panel.

### Key Entities *(include if feature involves data)*

- **Reading Preference**: User-facing display choices such as sidebar state, generated/local-only visibility, and preferred search scope.
- **Repository Status Summary**: Plain-language status describing repository identity, branch, remote relationship, local changes, and sync posture.
- **Changed File Item**: A repository path with a user-readable change state, file or folder type, local-only/generated status, and optional relationship to the active file.
- **Search Scope**: User-selected boundaries that determine whether search covers names, contents, Markdown, current folder, whole repository, tracked files, or local/generated files.
- **Recent Item**: A file or folder that was recently viewed, recently changed, or highlighted as a key document.
- **Background Change Notice**: A transient or persistent cue that explains a detected external modification, deletion, or refresh affecting the current view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A target user can open a repository, read a long Markdown file in the normal viewer, use rendered find, and follow a relative Markdown link in under 30 seconds.
- **SC-002**: In usability testing, at least 85% of target users can identify what changed after an external file modification without using the terminal.
- **SC-003**: At least 90% of repository searches with 100 or more matches show usable first results, result counts, and scope controls within 3 seconds for a typical project repository.
- **SC-004**: A target user can find and open README, agent instructions, specs, or recently changed files from the root view in under 20 seconds, and any folder README is visible by default when available.
- **SC-005**: At least 85% of target users correctly explain whether local changes exist and whether the branch is in sync after viewing the repository status summary.
- **SC-006**: Users can hide generated/local-only folders from navigation and search, then restore visibility, without losing the active file.
- **SC-007**: Find-in-file on rendered Markdown highlights the active match and enables next/previous navigation for files with at least 25 matches.
- **SC-008**: Users can complete a small edit while preserving conflict protection when the same file changes externally.
- **SC-009**: Navigation and search preference changes persist across app reloads for repeated use.
- **SC-010**: The root view reduces time-to-first-useful-document by at least 40% compared with scanning the raw tree alone in moderated testing.

## Assumptions

- The feature is scoped to the existing GitLocal viewer experience for local folders and local Git repositories.
- The primary target user is a semi-technical product manager using AI coding tools, with reading and review occurring more often than manual edits.
- The feature should improve both browser-based and native app distributions where the shared viewer surface is used.
- Mobile-specific redesign is not required for the first version, but narrow desktop and small-window behavior should remain usable.
- Generated/local-only means files that are ignored, untracked, build artifacts, dependency folders, coverage output, or otherwise not useful by default for review.
- GitLocal may use existing local repository metadata and filesystem state to infer change and repository status.
- Search can use pragmatic limits and progressive disclosure as long as users understand when results are partial.
- The changed-files view is a review/navigation aid, not a full diff or merge tool.
- Edit workflows remain lightweight and should not become a full IDE replacement.
