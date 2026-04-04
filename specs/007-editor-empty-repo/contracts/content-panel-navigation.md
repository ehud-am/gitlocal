# Content Panel Navigation Contract

## Repository Info Contract

- `GET /api/info` continues to return the current repository identity and viewer mode payload.
- The payload includes lightweight repository-state metadata:
  - `hasCommits`: whether the opened repository has at least one reachable commit.
  - `rootEntryCount`: number of immediate repository-root entries available for browsing.
- Success expectations:
  - Freshly initialized repositories with no commits return `hasCommits: false`.
  - Repositories with browseable root content return `rootEntryCount > 0` even when no `README` is present.

## README Discovery Contract

- `GET /api/readme` continues to return `{ path: string }`.
- An empty `path` means no default `README` was found for the repository.
- The absence of a `README` must not force a dedicated custom recovery panel in the main content area.

## Main Panel Folder View Contract

- When no file is selected, the main content area renders the current folder's immediate child files and folders.
- When the selected path is a folder, the main content area renders that folder using the same folder-list presentation model.
- The folder list must:
  - List immediate children only.
  - Provide an explicit `Open` action on the right side of each row.
  - Support opening a row item by double-clicking it.
  - Reuse a similar visual style and interaction feel to the existing non-git folder browser.
  - Show an intentional empty-folder message when there are no visible child entries.
- Recursive expansion remains the responsibility of the left tree; the main panel stays single-level for the active folder.

## Main Panel Recovery Behavior Contract

- The main content area must not render the prior "Pick up where you left off" recovery message or an equivalent dedicated recovery panel.
- If repository-switch logic clears a stale file selection, the main panel falls back to the current folder list instead of a custom recovery state.
- Any existing status or reset banner outside the main panel may remain, but it must not block or replace the folder list.

## Edit Workspace Layout Contract

- Entering edit mode keeps the user in the main content panel.
- The edit workspace must:
  - Use most of the panel width available in desktop layouts.
  - Present the textarea at a substantially larger default height than the previous implementation.
  - Keep cancel and save controls visible and understandable.
- The responsive layout may stack controls differently on smaller screens, but it must not regress to the previous cramped presentation at common desktop widths.

## Rendered Markdown Contract

- Rendered markdown presentation must not display markdown comments or other hidden comment-style content.
- Raw mode continues to show the original markdown source unchanged.
- Comment suppression applies only to rendered presentation, not to file storage or raw viewing.

## Test Coverage Contract

- UI tests must cover:
  - Expanded editor presentation and visible action controls.
  - Main-panel folder list as the default fallback when no file is selected.
  - Folder list row behavior for explicit `Open` actions and double-click navigation.
  - Visual/structural consistency expectations with the existing non-git folder browser.
  - Empty-folder messaging in the main content area.
  - Hidden-comment suppression in rendered markdown while raw mode remains unchanged.
- Backend tests must cover:
  - Repository info metadata for repos with and without commits.
  - Root entry counting for repositories with browseable content.
  - Directory-list behavior needed by the main-panel folder view.
