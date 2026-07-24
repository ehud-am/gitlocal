# Contract: Startup Folder & Open Target Resolution

**Applies to**: `GET /api/info`, `GET /api/startup-folder`, `GET /api/startup-open-target` and their frontend consumers (`ui/src/App.tsx`, `ui/src/components/Picker/PickerPage.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`, `ui/src/components/FileTree/FileTree.tsx`).

This contract does not add new endpoints or change existing response types (`RepoInfo`, `StartupFolderResolution`, `StartupOpenTargetResponse` in `src/types.ts` are unchanged in shape — see [data-model.md](../data-model.md)). It documents the **behavioral guarantees** every consumer of these endpoints must now honor, since the bug being fixed is a gap between what the server already knows and what the UI shows.

## Guarantee 1 — A folder is never presented as a valid startup candidate unless it is actually enumerable

`GET /api/startup-folder` (backed by `resolveStartupFolder()`) MUST NOT report `readable: true` for a path unless a guarded attempt to list its contents succeeded during resolution. Any caller that currently trusts `readable: true` as "safe to browse" (e.g., a future picker-side check) continues to be correct once this guarantee holds.

## Guarantee 2 — Every UI surface reading a query with an `isError` state must render a distinct failure view

Any component using `useQuery` against `['info']` or `['tree', ...]` MUST branch on `isError` before falling back to an "empty" rendering. Concretely:
- `App.tsx`'s consumption of `['info']` MUST render a failure view (not the full app shell with `info` undefined) when `isError` is true.
- `ContentPanel.tsx`'s consumption of `['tree', ...]` MUST render a failure view in its root/default view and its folder view, not only in the narrow "local-only folder disappeared" branch it currently checks.
- `FileTree.tsx`'s existing handling (`isError` → "Failed to load file tree") is the reference implementation this contract requires the other two to match, not something this feature is expected to change.

## Guarantee 3 — A failed explicit/OS-provided open target is never silently discarded

`GET /api/startup-open-target` MUST return a `target` with `status: 'failed'` and a non-empty `message` whenever `initializePaths()` fell back to `process.cwd()` because the originally requested path did not exist or could not be opened — it MUST NOT return `target: null` or an accepted-looking target in that case.

`PickerPage.tsx` (rendered whenever `info.pickerMode` is true) MUST read this response and display its `message` to the user whenever `target.status !== 'accepted'`, in addition to its existing empty-folder and mutation-error messaging. This closes the gap where `App.tsx` already computes the right failure message via `applyOpenFailure`/`statusMessage`, but that code path is unreachable from the picker-mode render branch.

## Guarantee 4 — "Empty" and "failed" remain visually and textually distinguishable everywhere

No change introduced by this feature may cause a genuinely empty folder/repository and a failed fetch to converge on the same message or visual treatment. This is a regression guard on the existing "ready for a first file" (`App.tsx`) and "This folder is empty." (`PickerPage.tsx`, `ContentPanel.tsx`) empty-state messaging, which must keep working exactly as today for true-empty cases while gaining a distinct sibling for the error case.

## Verification

These guarantees are exercised end-to-end by the scenarios in [quickstart.md](../quickstart.md), and at the unit level by tests added alongside each touched file per constitution Principle II (≥90% branch coverage, so the new failure branches must be covered, not just the existing success branches).
