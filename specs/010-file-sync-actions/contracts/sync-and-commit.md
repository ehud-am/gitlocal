# Contract: Sync Indicators and Commit/Remote Actions

## Tree Entry Extension

- `GET /api/tree` keeps its current route and base behavior.
- Each returned entry may now include:
  - `syncState`: `clean`, `local-uncommitted`, `local-committed`, `remote-committed`, or `diverged`
- Sync state is populated only for the current working branch and only for file entries.

## Sync Status Extension

- `GET /api/sync` keeps its current route and now also returns:
  - `pathSyncState`: `clean`, `local-uncommitted`, `local-committed`, `remote-committed`, `diverged`, or `none`
  - `trackedChangeCount`
  - `untrackedChangeCount`
  - `repoSync`: `{ mode, aheadCount, behindCount, hasUpstream, upstreamRef, remoteName }`

## Commit Changes Mutation

- `POST /api/git/commit`
- Request body:
  - `message`
- Success response:
  - `ok: true`
  - `status: "committed"`
  - `message`
  - `commitHash`
  - `shortHash`
- Error response:
  - `ok: false`
  - `status: "blocked"` or `status: "failed"`
  - `message`

## Remote Sync Mutation

- `POST /api/git/sync`
- Request body: empty object
- Success response:
  - `ok: true`
  - `status: "pushed"`, `"pulled"`, or `"up-to-date"`
  - `message`
  - `aheadCount`
  - `behindCount`
- Error response:
  - `ok: false`
  - `status: "blocked"` or `status: "failed"`
  - `message`
