# UI Contract: Viewer Usability Upgrades

## Markdown Reading Surface

### Contract

When a rendered Markdown file or folder README is open, the user reads it in the standard repository viewer with repository context, path, and status still visible.

### Required Observables

- Repository header, sidebar or collapsed navigation, search access, and current path remain available.
- Copy, save/share where available, and find-in-file remain available without entering edit mode.
- Read-oriented actions are more prominent than edit/delete actions.

## Markdown Links

### Contract

Relative Markdown links navigate inside GitLocal using the current Markdown file's folder as the base.

### Required Observables

- `guide.md` from `docs/README.md` opens `docs/guide.md`.
- `../README.md` resolves to the correct parent path when inside repository scope.
- Same-document anchors stay within the current document.
- External and email links keep existing external behavior.
- Missing or unsafe targets show a user-readable failure instead of silent no-op.

## Find in Rendered Markdown

### Contract

Find-in-file highlights matches directly in rendered Markdown and supports active-match navigation.

### Required Observables

- Opening find-in-file focuses the query input.
- Matching text is highlighted in the rendered document.
- Next/previous controls move the active match and scroll it into view.
- Match count and active match position are visible.
- Closing find removes highlights without changing the document content.

## Background Change Notices

### Contract

When files change outside GitLocal, the viewer explains relevant changes without requiring terminal output.

### Required Observables

- Active file refresh shows a non-disruptive notice with a recent timestamp or equivalent freshness cue.
- Active file deletion or movement routes to the nearest useful context and explains why.
- Changed-file count updates in repository context.
- Users can navigate from a change notice or repository header to changed files.
- Notices avoid repeated duplicate interruptions for the same state.

## Changed Files View

### Contract

Users can open a changed-files view from repository context to review paths changed locally or relative to remote where known.

### Required Observables

- Changed files are grouped or labeled by meaningful state.
- Modified, added, deleted, renamed, untracked, local-only/generated, local-committed, remote-committed, and diverged states are represented when known.
- Selecting an openable changed item opens that file or folder.
- Selecting a deleted or unavailable item opens the nearest parent context or explains why it cannot open.
- Generated/local-only filtering affects this view only when the user intentionally applies it.

## Repository Search

### Contract

Repository search uses a separate surface that preserves the current document context and provides explicit scope controls.

### Required Observables

- Opening search does not permanently push the active document out of view.
- Search controls include query, current folder or whole repository, names and/or contents, Markdown-focused content, tracked-only or include generated/local-only, and case sensitivity.
- Result count, active scope, loading state, empty state, and partial-result state are visible.
- Results are keyboard and pointer selectable.
- Closing search returns to the prior viewer context where practical.

## Generated and Local-Only Visibility

### Contract

Users can hide or show generated/local-only files consistently across navigation and search.

### Required Observables

- Visibility control is discoverable from navigation or repository context.
- Tree, folder list, root dashboard, and search all honor the selected visibility mode.
- The active file remains visible even if it would otherwise be hidden, or GitLocal shows an explanatory exception.
- Local-only/generated labels remain visible when those items are shown.

## Root Dashboard

### Contract

The repository root prioritizes high-value review entry points before raw directory browsing.

### Required Observables

- Root view includes repository status summary.
- Root view surfaces key documents such as README, agent instructions, specs, docs, and recent Markdown when available.
- Root view surfaces recently changed and recently viewed items when available.
- Raw directory browsing remains available from the root view.
- Missing optional docs do not create broken primary actions.

## Collapsed Navigation

### Contract

Collapsed navigation remains useful rather than acting only as an expand button.

### Required Observables

- Collapsed rail exposes search, changed files, recent files, key docs/root, current folder, and expand navigation controls.
- Icon-only controls have accessible names.
- Rail controls do not overlap content at representative desktop and narrow widths.

## Plain-Language Repository Status

### Contract

Repository context includes a concise sentence that explains branch, remote, and local change state.

### Required Observables

- Status summary is meaningful for local-only repos, remote clones, no upstream, no commits, unavailable remote state, and active local changes.
- Technical badges remain available as secondary detail.
- Nonzero change counts provide a path to changed-files review.

## Rare Edit Affordances

### Contract

Edit/create/delete remain available for allowed contexts but do not dominate high-frequency reading surfaces.

### Required Observables

- Read, find, copy, share/save, search, and review actions are more prominent than edit/delete in reading views.
- Edit/create/delete actions remain discoverable through contextual menus or folder/file actions.
- Dirty edits warn before navigation, refresh, search-result selection, or branch change.
- External file changes during edit block accidental overwrite and explain the conflict.
- Destructive actions are not primary buttons in high-frequency reading surfaces.
