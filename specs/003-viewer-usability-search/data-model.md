# Data Model: Viewer Usability and Search

## Overview

This feature adds no persistent database. Its model is composed of browser-visible viewer state, local repository synchronization state, picker activation state, and repository search state.

## Entities

### Viewer Context

- **Purpose**: Represents the active location and presentation state of the repository viewer.
- **Fields**:
  - `repoPath`: The currently open local repository root.
  - `selectedBranch`: The branch currently selected in the viewer.
  - `selectedPath`: The current file or folder path in focus.
  - `viewMode`: Whether the content area is showing rendered or raw content.
  - `sidebarState`: Whether the left navigation is expanded or collapsed.
  - `searchPresentation`: Whether search is currently collapsed to a trigger or expanded into the full search UI.
  - `searchMode`: Whether search is targeting names or file contents.
  - `searchQuery`: The current search text, if any.
  - `caseSensitive`: Whether search matching is case-sensitive.
- **Validation rules**:
  - `selectedBranch` must resolve to a branch visible to the repository viewer.
  - `selectedPath` may be empty only when the viewer is intentionally showing a placeholder state.
  - `viewMode` may be `rendered` only for file types that support rendered display.
  - `sidebarState` changes must not clear `selectedPath` or active search settings.
  - `searchPresentation` may collapse only when doing so does not silently discard active search intent without user action.
- **State transitions**:
  - `uninitialized -> derived-from-url`: Page loads with explicit URL state.
  - `uninitialized -> derived-from-defaults`: Page loads without explicit URL state.
  - `active -> refreshed`: Browser reload restores the same valid state.
  - `active -> recovered`: Current state becomes invalid and falls back to the nearest valid location.

### Copy Target

- **Purpose**: Represents a discrete visible content region that can be copied with one action.
- **Fields**:
  - `targetType`: Markdown code block or raw file.
  - `sourcePath`: File path currently displayed.
  - `content`: Exact text to copy.
  - `status`: Idle, copying, copied, or failed.
  - `feedbackMessage`: User-visible copy confirmation or error text.
- **Validation rules**:
  - A markdown code-block target must copy only the content of that block.
  - A raw-file target must copy the entire raw file content currently shown.
  - Copy feedback must correspond to the target the user activated.
- **State transitions**:
  - `idle -> copying -> copied`
  - `idle -> copying -> failed`
  - `copied -> idle`

### Selection Entry

- **Purpose**: Represents a row in folder-selection mode that can be selected or activated.
- **Fields**:
  - `path`: Absolute local path to the folder entry.
  - `name`: Display label for the row.
  - `entryType`: Regular folder or git repository.
  - `selectionState`: Idle, selected, or loading.
  - `activationMode`: Single-click select or double-click primary action.
- **Validation rules**:
  - Repository entries must transition to repository-open behavior on activation.
  - Folder entries must transition to browse-deeper behavior on activation.
  - Single-click selection must remain available when double-click activation is added.
- **State transitions**:
  - `idle -> selected`
  - `selected -> opening`
  - `selected -> browsing`
  - `selected -> error`

### Repository Sync Snapshot

- **Purpose**: Represents the backend's current understanding of whether the open repository view is still valid and whether visible data needs to be refreshed.
- **Fields**:
  - `repoPath`: Repository root being observed.
  - `workingTreeRevision`: Lightweight revision token for the current working tree state.
  - `treeStatus`: Whether the visible tree is unchanged, changed, or invalid.
  - `fileStatus`: Whether the current file is unchanged, changed, deleted, or unavailable.
  - `resolvedPath`: The nearest valid current path after validation.
  - `statusMessage`: User-facing explanation when recovery is required.
  - `checkedAt`: Time the snapshot was generated.
- **Validation rules**:
  - `resolvedPath` must always point to a valid remaining location when recovery is possible.
  - `fileStatus` cannot be `changed` or `deleted` when no file is currently selected.
  - The snapshot must reflect the currently open repository only.
- **State transitions**:
  - `stable -> changed`
  - `stable -> invalid`
  - `changed -> acknowledged`
  - `invalid -> recovered`

### Search Session

- **Purpose**: Represents an active search request and result set within the open repository.
- **Fields**:
  - `query`: Search text entered by the user.
  - `mode`: Name search or content search.
  - `caseSensitive`: Matching option for the current query.
  - `presentationState`: Collapsed trigger, expanded idle, or expanded active.
  - `openedBy`: Trigger click, keyboard shortcut, or restored URL state.
  - `branch`: Branch context for the search request.
  - `results`: Ordered list of matching files, folders, or content hits.
  - `status`: Idle, loading, complete, empty, or failed.
- **Validation rules**:
  - `mode` must be explicit so unlike result types are not mixed ambiguously.
  - Case-sensitivity options must be applied consistently to the returned results.
  - Result items must support direct navigation to the matched repository location.
  - Keyboard-shortcut activation must move `presentationState` to an expanded state with the query input ready for typing.
  - `presentationState` must remain expanded while the session still has active query intent or visible results unless the user dismisses it.
- **State transitions**:
  - `collapsed -> expanded-idle`
  - `expanded-idle -> loading -> complete`
  - `expanded-idle -> loading -> empty`
  - `expanded-idle -> loading -> failed`
  - `complete -> loading` when the query, mode, branch, or matching options change
  - `complete -> expanded-idle` when the user clears or dismisses search

## Relationships Summary

- One Viewer Context can expose zero or more Copy Targets depending on the current content.
- One Viewer Context can own one active Search Session at a time.
- One Viewer Context determines whether the Search Session is collapsed into a trigger or expanded into the full search surface.
- One Selection Entry exists for each visible row in folder-selection mode.
- One Repository Sync Snapshot is evaluated against one active Viewer Context.
- A Repository Sync Snapshot can force a Viewer Context transition from `active` to `recovered`.
