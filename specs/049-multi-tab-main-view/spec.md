# Feature Specification: Multi-Tab Main View

**Feature Branch**: `049-multi-tab-main-view`
**Created**: 2026-09-29
**Status**: Implemented
**Release**: 0.13.8 (patch)
**Input**: User description: "We will make the main view area a multi-tab area. 1. The start is as today, the user lands on a 'GitHub like' view and can see the current tree followed by the readme file. 2. When the user opens the first file, this continues to be as before and a view only of the file will be shown. 3. The change: the user can close this tab and get back to the folder 'GitHub' view. 4. The user can also open another file and have two or more file views open as two or more tabs. This part behaves more like Visual Studio Code."

Note: the request named release "0.8.1". The repository is at 0.13.7, so the next patch release is 0.13.8 [assumption: "0.8.1" was shorthand for "the next patch"].

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Close a file and return to the folder view (Priority: P1)

A user browsing a repository opens a file. Today the only ways back to the folder ("GitHub-like") view are the tree, the breadcrumb, or Parent Folder. With tabs, the opened file appears as a tab next to a permanent folder tab, and closing the file tab returns to the folder view the user was on.

**Independent Test**: Land on the repository root (tree listing + README, no tab strip). Open `README.md` from the tree. A tab strip appears with a folder tab and a `README.md` tab. Close the `README.md` tab; the strip disappears and the root folder view is shown.

**Acceptance Scenarios**:

1. **Given** the app has just opened a repository, **When** the main view renders, **Then** it shows the folder view (listing + README) exactly as before, with no tab strip.
2. **Given** the folder view, **When** the user opens a file, **Then** the file is shown read-only as before and a tab strip appears with a folder tab followed by one tab for the file, the file tab active.
3. **Given** exactly one file tab is open and active, **When** the user closes it, **Then** the strip disappears and the last-browsed folder view is shown.

---

### User Story 2 - Keep several files open as tabs (Priority: P1)

A user reviewing changes wants to flip between several files without re-finding each in the tree.

**Independent Test**: Open `README.md`, then `docs/guide.md`. Both appear as tabs; clicking a tab switches the view; the folder tab shows the last folder browsed.

**Acceptance Scenarios**:

1. **Given** one file tab is open, **When** the user opens another file (tree, search result, changed-files list, Markdown link, key-document shortcut), **Then** a second tab is added and activated; the first tab remains.
2. **Given** a file is already open in a tab, **When** the user opens it again, **Then** the existing tab is activated and no duplicate is added.
3. **Given** a file tab is active, **When** the user opens a new file, **Then** the new tab is inserted directly after the active tab. **Given** the folder tab is active, **Then** the new tab is appended at the end.
4. **Given** several tabs, **When** the user closes the active tab, **Then** the tab to its right becomes active, else the one to its left, else the folder view.
5. **Given** several tabs, **When** the user closes an inactive tab, **Then** the current view does not change.
6. **Given** several tabs, **When** the user clicks the folder tab or selects a folder in the tree, **Then** the folder view is shown and all file tabs stay open.
7. **Given** two open files share a name (e.g. `README.md` and `docs/README.md`), **Then** each tab shows its parent folder as a suffix so they can be told apart.

---

### User Story 3 - Tabs survive a reload (Priority: P3)

**Acceptance Scenarios**:

1. **Given** open tabs, **When** the page is reloaded (or the URL is shared), **Then** the same tabs are restored in the same order with the same active file.
2. **Given** the user opens a different repository or folder, **Then** tabs from the previous repository are not carried over.

---

### Edge Cases

- **Unsaved edits**: closing or switching away from the active tab while it has unsaved inline edits asks for confirmation (same prompt as today's navigation); declining keeps the tab open and active. The active tab shows a dot while it has unsaved edits.
- **File deleted inside GitLocal**: its tab closes and the view moves to the parent folder (existing behavior).
- **File deleted outside GitLocal** (detected by the existing sync poll while active): its tab closes and the view moves to the nearest folder (existing behavior).
- **Folder deleted inside GitLocal**: every tab under that folder closes.
- **Branch switch where the active file does not exist on the target branch**: its tab closes (existing fallback applies). Other tabs stay; each is re-checked when activated.
- **Restored tab no longer exists**: handled by the existing missing-file reconciliation when it becomes active.
- **Many tabs**: the strip scrolls horizontally; restoring from the URL is capped at 50 tabs.
- **Startup open target failure**: the error panel is shown without the tab strip.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The main view MUST show no tab strip while no file tab is open, preserving the current landing experience.
- **FR-002**: Opening a file by any route MUST open (or activate) a tab for it.
- **FR-003**: The tab strip MUST begin with a non-closable folder tab labeled with the last-browsed folder's name (repository name at the root).
- **FR-004**: Each file tab MUST have a close control; middle-click MUST also close it; a "Close all" control MUST close every file tab and show the folder view.
- **FR-005**: Closing the active tab MUST activate the right neighbor, else the left neighbor, else the folder view.
- **FR-006**: Tabs MUST follow the WAI-ARIA tabs pattern: `role="tab"`, `aria-selected`, roving focus with Left/Right/Home/End, Enter/Space to activate, Delete/Backspace to close a focused file tab.
- **FR-007**: Open tabs MUST be persisted in the page URL (`tab` query parameters, in order) and restored on reload.
- **FR-008**: Unsaved-edit confirmation MUST apply to closing the active tab, switching tabs, and "Close all".
- **FR-009**: Tabs for deleted files/folders MUST be closed as described in Edge Cases.
- **FR-010**: No server/API change; both distributions (npm, macOS app) get the feature from the shared UI.

### Out of Scope (this patch)

- Preview ("italic") tabs that are replaced by the next single-click, as in VS Code.
- Preserving per-tab scroll position and raw/preview toggle when switching tabs.
- Drag-to-reorder tabs, split editors, pinning.
- Keyboard shortcuts for close/next tab (Ctrl/Cmd+W and Ctrl+Tab are reserved by browsers); native macOS menu items for tabs.

## Success Criteria *(mandatory)*

- **SC-001**: First load of a repository renders identically to 0.13.7 (no tab strip).
- **SC-002**: A user can go from a file back to the folder view with one click (tab close).
- **SC-003**: With N files open, switching to any of them takes one click and no tree navigation.
- **SC-004**: UI per-file coverage gate (≥90% lines/branches/functions/statements) stays green, including the new files.
