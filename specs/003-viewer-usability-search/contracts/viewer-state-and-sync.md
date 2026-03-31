# Viewer State and Sync Contract: Viewer Usability and Search

## Purpose

Defines how GitLocal preserves repository context across refresh and how it reacts to local filesystem changes.

## Viewer State Contract

- The browser URL encodes the current viewer context needed to recover the page after refresh.
- The recovered context includes the selected branch, current path, raw-versus-rendered mode, sidebar state, and active search mode.
- On refresh, GitLocal restores the previous context when it still points to a valid repository location.
- If the previous context is no longer valid, GitLocal falls back to the nearest valid location and shows a clear explanatory status.

## Sync Contract

- GitLocal monitors the currently open repository for local filesystem changes relevant to the visible tree or current file.
- When a visible tree location changes, GitLocal refreshes the affected tree view automatically.
- When the currently displayed file changes, GitLocal refreshes the file content automatically.
- When the currently displayed file or current navigation path is deleted, GitLocal removes stale content and recovers to the nearest valid location.
- Sidebar collapse or expand actions do not clear the recovered context or active search state.

## Backend Interface Expectations

- The backend provides a lightweight synchronization endpoint that lets the UI determine whether the current tree or file view is stale, changed, or invalid.
- The synchronization response includes enough recovery information for the UI to update the URL state and the visible selection safely.
- The synchronization interface is inexpensive enough to poll regularly during an open viewing session.

## Non-Goals

- This contract does not require multi-user collaboration state.
- This contract does not require real-time push transport if polling satisfies the refresh goals.
