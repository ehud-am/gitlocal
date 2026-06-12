# Local API Contract: Viewer Usability Upgrades

This contract documents local server surfaces expected by the viewer. Names are descriptive and may map to existing endpoints or endpoint extensions during implementation. All paths and payload fields use repository-relative paths unless explicitly noted.

## Repository Summary

### Purpose

Provide plain-language repository status, key document shortcuts, recent/review entry points, and generated/local visibility context.

### Request

```text
GET /api/repo/summary?branch={branch}
```

### Response

```json
{
  "repoName": "gitlocal",
  "branch": "main",
  "statusSummary": {
    "text": "main is up to date with origin and has 2 local changes.",
    "tone": "info",
    "remoteLabel": "origin",
    "syncState": "up-to-date",
    "localChangeCount": 2,
    "untrackedChangeCount": 1
  },
  "keyDocuments": [
    {
      "path": "README.md",
      "label": "README",
      "category": "README",
      "reason": "Repository overview",
      "available": true
    }
  ],
  "recentItems": [
    {
      "path": "specs/025-viewer-usability-upgrades/spec.md",
      "type": "file",
      "label": "spec.md",
      "lastViewedAt": "2026-06-11T12:00:00.000Z",
      "lastChangedAt": "2026-06-11T12:01:00.000Z",
      "available": true
    }
  ],
  "visibility": {
    "generatedLocalMode": "hide",
    "hiddenCount": 3
  }
}
```

### Error States

- `400` when no repository or folder is loaded.
- `200` with local-only status when no remote exists.
- `200` with unavailable sync state when remote status cannot be determined locally.

## Changed Files

### Purpose

Provide review/navigation entries for local and remote-relevant path changes.

### Request

```text
GET /api/repo/changes?branch={branch}&includeGeneratedLocal=false
```

### Response

```json
{
  "branch": "main",
  "checkedAt": "2026-06-11T12:00:00.000Z",
  "summary": {
    "total": 3,
    "modified": 1,
    "added": 1,
    "deleted": 0,
    "renamed": 0,
    "untracked": 1,
    "remoteRelevant": 0
  },
  "items": [
    {
      "path": "ui/src/App.tsx",
      "name": "App.tsx",
      "type": "file",
      "changeState": "modified",
      "generatedLocalState": "tracked",
      "sourcePath": "",
      "canOpen": true,
      "reviewHint": "Modified locally"
    }
  ]
}
```

### Error States

- Deleted or missing files return `canOpen: false` with a parent-oriented `reviewHint`.
- Unknown classifications return `changeState: "unknown"` and a readable `reviewHint`.

## Scoped Repository Search

### Purpose

Search repository content with explicit result limits and scopes.

### Request

```text
GET /api/search?query={query}&branch={branch}&rootPath={path}&targets=both&contentKinds=markdown&trackedMode=tracked-only&caseSensitive=false&limit=50&cursor={cursor}
```

### Response

```json
{
  "query": "markdown",
  "branch": "main",
  "scope": {
    "rootPath": "",
    "targets": "both",
    "contentKinds": "markdown",
    "trackedMode": "tracked-only",
    "caseSensitive": false,
    "limit": 50
  },
  "resultCount": 50,
  "totalEstimate": 125,
  "partial": true,
  "nextCursor": "opaque-next-page-token",
  "results": [
    {
      "path": "README.md",
      "type": "file",
      "matchType": "content",
      "line": 14,
      "snippet": "read Markdown documents clearly",
      "changeState": "clean",
      "generatedLocalState": "tracked",
      "scopeLabel": "Markdown content"
    }
  ]
}
```

### Error States

- Queries below the minimum length return an empty result set and guidance.
- Unsupported scope values fall back to documented defaults or return `400` with a user-readable message.
- Partial results must be identified with `partial: true`.

## Sync and Background Notices

### Purpose

Extend current sync status with user-facing active-file change metadata and changed-file entry points.

### Request

```text
GET /api/sync?path={path}&branch={branch}
```

### Response Additions

```json
{
  "currentPath": "AGENTS.md",
  "currentPathType": "file",
  "workingTreeRevision": "revision-token",
  "checkedAt": "2026-06-11T12:00:00.000Z",
  "activePathNotice": {
    "path": "AGENTS.md",
    "changeKind": "refreshed",
    "detectedAt": "2026-06-11T12:00:00.000Z",
    "lastRefreshedAt": "2026-06-11T12:00:00.000Z",
    "message": "AGENTS.md changed outside GitLocal and was refreshed.",
    "actionLabel": "View changed files"
  },
  "changedFilesSummary": {
    "total": 2,
    "tracked": 1,
    "untracked": 1
  }
}
```

### Error States

- Missing active path returns the nearest resolved path and an explanatory notice.
- Non-current branches may return unavailable changed-file summaries while preserving read-only browsing.

## Key Documents and Recent Items

### Purpose

Support root dashboard and collapsed navigation shortcuts.

### Request

```text
GET /api/repo/navigation-hints?branch={branch}&includeRecent=true&includeGeneratedLocal=false
```

### Response

```json
{
  "keyDocuments": [
    {
      "path": "README.md",
      "label": "README",
      "category": "README",
      "reason": "Repository overview",
      "available": true
    }
  ],
  "recentItems": [
    {
      "path": "README.md",
      "type": "file",
      "label": "README.md",
      "lastViewedAt": "2026-06-11T12:00:00.000Z",
      "available": true
    }
  ],
  "changedItems": []
}
```

### Error States

- Missing optional documents are omitted or marked unavailable, not shown as broken primary shortcuts.
- Recent items that no longer exist are marked unavailable until the viewer prunes or refreshes them.
