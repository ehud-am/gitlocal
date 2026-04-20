# Folder View and README Contract

## Tree Contract

- `GET /api/tree` remains the source for immediate child repository entries.
- The endpoint continues returning actual repository items only; it does not emit synthetic navigation rows such as `..`.
- Tree responses remain valid for both current working-tree views and non-current branch views.

## Folder README Contract

- `GET /api/readme` is extended to accept optional `path` and `branch` query parameters for folder-scoped README discovery.
- Success behavior:
  - Returns `{ path: string }`, where `path` is the README file for the requested folder or an empty string if no README exists there.
- Scope behavior:
  - Current working-tree lookup uses the filesystem-aware repository helpers.
  - Non-current branch lookup uses git tree data for the requested branch.
  - Non-git folders return an empty README path.

## Folder Panel Presentation Contract

- For folder views, the UI prepends a synthetic `..` row whenever a valid parent path exists within the active browsing context.
- The `..` row uses the same single-level folder-list affordance style as normal directory rows, but it is visually identifiable as navigation rather than repository content.
- Git-backed folder views render in this order:
  1. folder header;
  2. folder/file list, including the `..` row when applicable;
  3. README preview, when a folder-scoped README exists.
- Non-git folder views render the folder list without a README section unless future work explicitly adds one.
- Opening `..` changes the selected path but does not mutate repository state.

## Test Coverage Contract

- Backend tests must cover:
  - folder-scoped README discovery at repository root and in nested folders;
  - current working-tree and non-current branch README lookup behavior;
  - empty README responses for non-git folders.
- UI tests must cover:
  - `..` row rendering and root-boundary behavior;
  - README-after-list ordering for git-backed folders;
  - folder navigation through the `..` row without regressions to file opening or selection.
