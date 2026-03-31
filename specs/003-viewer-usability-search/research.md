# Research: Viewer Usability and Search

## Decision 1: Persist viewer context in the URL instead of only component state

- **Decision**: Store the active repository view context in browser URL query parameters, including selected branch, open path, raw-versus-rendered mode, sidebar visibility, and active search mode.
- **Rationale**: Browser refresh already preserves the URL automatically, which makes refresh recovery deterministic without adding storage dependencies or hidden state. It also keeps context restoration simple for direct reloads and future deep-linking.
- **Alternatives considered**:
  - Browser `localStorage`. Rejected because it creates hidden per-browser state and is harder to reconcile when the repository path or current branch changes.
  - Server-only session state. Rejected because refresh recovery should not depend on reconstructing opaque per-tab state on the backend.

## Decision 2: Use backend repository change snapshots plus lightweight polling for auto-refresh

- **Decision**: Add a backend synchronization surface that tracks repository change signals and exposes lightweight sync metadata for the UI to poll, then refetch the tree or current file only when visible state is affected.
- **Rationale**: This keeps change detection local to the server process that already knows the active repository path, avoids introducing persistent socket infrastructure, and allows the UI to stay consistent with React Query's refetch model. Polling a cheap sync endpoint also avoids constantly reloading full file contents or tree payloads.
- **Alternatives considered**:
  - Browser-only polling of full tree and file endpoints. Rejected because it would create unnecessary repeated work and make graceful deletion handling harder to reason about.
  - Always-on push channels such as WebSockets or server-sent events. Rejected because they add more moving parts than needed for a local single-user app and would complicate fallback behavior.

## Decision 3: Scope live filesystem refresh to the checked-out working tree while preserving branch browsing

- **Decision**: Treat live filesystem monitoring as a working-tree feature for the currently checked-out repository state, while preserving explicit branch browsing for tree, file, and commit views.
- **Rationale**: Filesystem changes happen in the working tree, not in arbitrary historical branches. This keeps live refresh behavior truthful for what the user is editing locally while still allowing branch history browsing through the existing git-backed flows.
- **Alternatives considered**:
  - Apply live filesystem updates identically to all selected branches. Rejected because local filesystem changes do not map cleanly to non-checked-out branches.
  - Ignore branch context and search or browse only the working tree. Rejected because the current product already exposes branch switching and recent commit browsing as core behavior.

## Decision 4: Keep search as two explicit modes rather than one blended result list

- **Decision**: Provide separate repository search modes for name search and content search, with shared query text and explicit matching controls such as case-sensitive versus case-insensitive matching.
- **Rationale**: File-name matches and content matches serve different user intents and need different result presentation. Explicit modes prevent confusing mixed results and make it easier to explain why a result matched.
- **Alternatives considered**:
  - One combined search box with blended results. Rejected because it would be harder to scan and explain, especially for non-developer users.
  - Name search only. Rejected because the feature explicitly requires searching file contents.

## Decision 5: Surface copy actions as contextual controls embedded in content containers

- **Decision**: Add small, consistently placed copy controls directly inside markdown code blocks and the raw file toolbar instead of using a global copy command.
- **Rationale**: Users should not need to infer which content region will be copied. Contextual controls make the target obvious and allow accurate success and failure feedback for each copied unit.
- **Alternatives considered**:
  - A single global "copy current view" action. Rejected because it becomes ambiguous in rendered markdown views with multiple code blocks.
  - Rely on text selection only. Rejected because it does not address the usability problem described in the feature request.

## Implementation Notes

- Refresh persistence should initialize app state from the URL first, then fall back to API-derived defaults such as the repository's README and current branch only when the URL does not specify a location.
- Repository sync metadata should include enough information to tell whether the current file, folder tree, or parent path is still valid before the UI chooses to refetch or fall back.
- Double-click handling in the picker should coexist with the current single-click selection model so keyboard and pointer interactions remain predictable.
- Search result rendering should emphasize direct navigation and clear empty states rather than advanced filtering in the first iteration.
