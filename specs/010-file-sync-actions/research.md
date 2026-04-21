# Research: File Sync Indicators and Commit/Remote Actions

## Decision 1: Put per-file sync classification on the server

- **Decision**: Compute file sync state in the server git helper layer and return it on tree rows plus selected-path sync payloads.
- **Rationale**: The server already owns working-tree and ref inspection. Keeping classification there avoids duplicating git diff logic across file tree, folder list, and selected-file state.
- **Alternatives considered**:
  - Compute file statuses entirely in the client from multiple endpoints: rejected because it would fragment the source of truth and complicate testing.
  - Add a separate per-file status endpoint for each row: rejected because it would create avoidable request fan-out.

## Decision 2: Use locally known upstream refs for remote visibility, not background network polling

- **Decision**: Base remote-related indicators on the repository's currently known upstream-tracking refs and refresh them during explicit sync actions.
- **Rationale**: This preserves GitLocal's local-first behavior and avoids surprise background network traffic while still providing meaningful remote-aware state.
- **Alternatives considered**:
  - Poll `git fetch` in the background: rejected because it adds remote activity the user did not explicitly request.
  - Drop remote indicators entirely until the user syncs: rejected because the user explicitly asked to see remote drift.

## Decision 3: Make sync a safe push-or-fast-forward-pull action

- **Decision**: The sync action either pushes an ahead-only branch, fast-forward pulls a behind-only branch, reports up-to-date, or blocks dirty/diverged states.
- **Rationale**: This gives users a usable "sync" button without silently creating merges, rebases, or conflict states inside GitLocal.
- **Alternatives considered**:
  - Always run `git pull` and then `git push`: rejected because it can create merge commits or conflict states unexpectedly.
  - Always rebase on pull: rejected because rebase conflict UX is out of scope for this slice.
  - Offer separate fetch/pull/push actions immediately: rejected for now because the user asked for a sync action, not a full git command surface.

## Decision 4: Reuse the existing server-authoritative commit pattern

- **Decision**: Add a dedicated commit mutation that stages all changes and creates a local commit with a required message, mirroring the existing branch-switch commit safety model.
- **Rationale**: The branch-switch flow already established a safe pattern for message collection and server-owned git execution.
- **Alternatives considered**:
  - Expose a commit action only through branch switching: rejected because the user asked for a standalone commit option.
