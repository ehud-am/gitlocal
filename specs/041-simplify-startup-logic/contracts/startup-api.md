# Contract: Startup-Related HTTP Surface

GitLocal's only external interface is the local HTTP API served by the Node/Hono backend and
consumed by the React UI (and, unchanged, by the macOS app's embedded WebView). This document
covers the endpoints and JSON shapes touched by this feature.

## `GET /api/info`

**Unchanged.** Still returns `{ pickerMode, isGitRepo, currentBranch, rootEntryCount, version,
path, name, ... }`. Whether `pickerMode` is true/false and what `path` contains is a *consequence*
of the simplified resolution, but the response shape and field semantics do not change.

## `GET /api/startup-folder`

**Response shape changes.** `StartupFolderResolution`:

Before:
```json
{
  "path": "/Users/alice/Documents",
  "source": "platform-default",
  "exists": true,
  "readable": true,
  "platformDefaultPath": "/Users/alice/Documents",
  "lastUsedPath": "/Users/alice/old-project",
  "fallbackReason": "Last used folder no longer exists."
}
```

After:
```json
{
  "path": "/Users/alice/Documents",
  "source": "os-default",
  "exists": true,
  "readable": true,
  "lastUsedPath": "/Users/alice/old-project",
  "fallbackReason": "Your last folder is gone, so GitLocal opened a default location instead."
}
```

Changes: `source` is now one of `explicit | last-used | os-default` (was 5 values);
`platformDefaultPath` is removed (confirmed unread by any consumer — see data-model.md);
`fallbackReason` wording is reworded around the single `os-default` outcome but keeps the same
*purpose* (explain what happened and why) so the picker banner continues to render a meaningful
message with no UI code change required beyond the type update.

**Consumer impact**: `ui/src/types/index.ts`'s `StartupFolderResolution` type is updated to match
(narrower `source` union, `platformDefaultPath` removed). `ui/src/App.tsx` and
`ui/src/components/Picker/PickerPage.tsx` only ever read `fallbackReason` (a string) for display —
no consumer branches on the specific `source` value today (verified by repo-wide search), so this
is a non-breaking shape narrowing from the UI's perspective, requiring only a type update and a
fixture update in tests that construct a full mock response.

## `PUT /api/startup-folder` — REMOVED

**Before**: Accepted `{ path: string, source: StartupFolderUpdateSource }`, persisted `path`
verbatim (after only an `isReadableDirectory` check — no top-level-only validation) to
`~/.gitlocal/startup-folder.json`, returned `{ ok, path, message }`.

**After**: Endpoint removed entirely. Confirmed zero call sites in `ui/src/services/api.ts`'s
consumers (`api.updateStartupFolder` itself was also dead — defined but never invoked from
`ui/src/App.tsx` or any component) prior to removal. Any external client that was calling this
undocumented endpoint directly (not via the shipped UI) receives a 404, which is the correct,
honest signal that this write path no longer exists — there is no deprecation window needed for
an endpoint with no known caller.

**Types removed**: `StartupFolderUpdateRequest`, `StartupFolderUpdateResponse` (from both
`src/types.ts` and `ui/src/types/index.ts`). `api.updateStartupFolder` removed from
`ui/src/services/api.ts`.

## `GET /api/startup-open-target`

**Unchanged shape.** `StartupOpenTarget` still has `{ source, inputPath, rootPath, selectedPath,
selectedPathType, status, message, receivedAt, gitState?, openMode?, repositoryRootPath? }`. The
*values* now come from the single shared Direct-Open Target classifier (data-model.md) instead of
`resolveOpenTarget`'s standalone computation, but the response contract itself does not change —
this is purely an internal-implementation consolidation.

## `POST /api/repo/open`

**Unchanged shape.** Request `{ path: string }`, response `{ ok, path, rootPath, selectedPath,
selectedPathType, openMode, gitState, repositoryRootPath? }` (via `repoOpenResult`). Internally now
calls the same shared Direct-Open Target classifier used by startup file-launch handling instead of
its own inline computation — again, an internal consolidation with no response-shape change.

## `POST /api/repo/parent-folder`

**Unchanged shape.** `{ ok: boolean, error: string }`. Internal fallback-construction now goes
through the single `os-default` resolution helper instead of hand-building a
`StartupFolderResolution`-shaped object inline; no response contract change.

## Persisted file: `~/.gitlocal/startup-folder.json`

**Shape unchanged** (`{ path, openedAt, source }`), so an existing file written by an older
GitLocal version continues to read correctly (`readStartupFolderPreference` already tolerates
missing/malformed files by returning `null`, which triggers ordinary `os-default` resolution —
this graceful-degradation behavior is preserved, not newly added).

**Guarantee strengthened**: `path` in this file is now provably always a repository root or an
independent folder's own root, enforced by a defense-in-depth check inside the single writer
function (`writeStartupFolderPreference`), in addition to every real call site already only ever
passing such a path today.
