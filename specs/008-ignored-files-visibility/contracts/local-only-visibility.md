# Local-Only Visibility Contract

## Repository Tree Contract

- `GET /api/tree` remains the source for repository tree and folder-list entries.
- The response entry shape adds:
  - `localOnly: boolean`
- For the current working tree:
  - Entries include tracked items, untracked local items already visible today, and ignored local items that match the feature rules.
  - Ignored files and ignored folders are returned as normal browse entries with `localOnly: true`.
  - Repository internals such as `.git` remain excluded.
- For non-current branches or historical views:
  - Responses continue to come from git tree data.
  - Returned entries use the same shape but `localOnly` is always `false`.

## Repository Info Contract

- `GET /api/info` continues to return repository summary metadata used by the app shell.
- `rootEntryCount` now counts visible ignored local root items in the current working tree.
- `rootEntryCount` still excludes repository internals and hidden dotfile entries that the landing-state logic intentionally ignores.

## Search Contract

- `GET /api/search` keeps its existing query parameters and response structure.
- Each search result adds:
  - `localOnly: boolean`
- Current working-tree search behavior:
  - Name searches can return ignored local files and folders with `localOnly: true`.
  - Content searches, when used, can return ignored local files with `localOnly: true`.
- Non-current branch and historical search behavior remains unchanged apart from the added `localOnly: false` field.

## Active View Contract

- If a user opens an ignored local file or folder from the tree, folder list, or search results, the resulting active view continues to expose that item through the normal browsing flow.
- The active context must preserve a visible local-only cue near the selected item identity so users do not lose that explanation after opening the item.
- This feature does not add new ignore-management or tracking actions.

## Presentation Contract

- The file tree, content-panel directory list, and search results all use the same local-only wording pattern.
- The cue must:
  - Be readable in mixed lists that include normal items.
  - Avoid warning or error styling that implies failure.
  - Distinguish local-only items without hiding open actions or making the item feel disabled.

## Test Coverage Contract

- Backend tests must cover:
  - Current working-tree tree listings that include ignored files and ignored folders.
  - Root-entry counting when visible content is ignored-only.
  - Search responses that include local-only matches for current working-tree searches.
  - Historical branch responses that continue excluding current working-tree ignored items.
- UI tests must cover:
  - Local-only cue rendering in the file tree.
  - Local-only cue rendering in the content-panel folder list.
  - Local-only cue rendering in search results and preserved context after opening an ignored item.
  - Ignored-only roots or folders avoiding misleading empty states.
