# Data Model: Viewer Usability Upgrades

This feature introduces new viewer state concepts and local API payloads. It does not introduce a database or account-owned data.

## ReadingPreference

**Purpose**: Stores repeated-use display preferences for the local viewer.

**Fields**:

- `sidebarCollapsed`: whether navigation is collapsed
- `generatedLocalVisibility`: whether generated/local-only files are hidden, shown, or shown only in explicit contexts
- `defaultSearchScope`: preferred repository search scope

**Validation rules**:

- Preferences must be safe defaults when absent or invalid.
- Preferences must not encode contributor-local absolute paths.
- Preferences must not hide the user's currently active file without a visible explanation.

## RepositoryStatusSummary

**Purpose**: Provides plain-language repository state for semi-technical users.

**Fields**:

- `repoName`: display name
- `branchLabel`: current or selected branch
- `remoteLabel`: remote name or local-only state
- `syncDescription`: plain-language branch/remote status
- `localChangeCount`: total local changes
- `untrackedChangeCount`: untracked or local-only changes
- `statusTone`: neutral, info, warning, or danger
- `detailBadges`: supporting technical labels

**Validation rules**:

- Summary must be meaningful when there is no remote.
- Summary must not imply remote freshness when remote state is unavailable.
- Counts must link or route to changed files when nonzero.

## ChangedFileItem

**Purpose**: Describes a changed path that users may review or open.

**Fields**:

- `path`: repository-relative path
- `name`: basename for display
- `type`: file, folder, missing, or unknown
- `changeState`: modified, added, deleted, renamed, untracked, local-only, local-committed, remote-committed, diverged, or clean
- `generatedLocalState`: tracked, local-only, generated, ignored, or unknown
- `sourcePath`: previous path when known for renamed files
- `canOpen`: whether the path can be opened in the viewer
- `reviewHint`: short user-readable explanation

**Validation rules**:

- Deleted or missing paths must route to the nearest useful parent context.
- Local-only/generated classification must be visible when it affects filtering.
- Unknown states must degrade to clear user-readable labels.

## SearchScope

**Purpose**: Captures user-selected boundaries for repository search.

**Fields**:

- `query`: trimmed search text
- `branch`: selected branch or working tree
- `rootPath`: optional folder scope
- `targets`: file names, file contents, or both
- `contentKinds`: all text, Markdown-focused, or currently supported searchable types
- `trackedMode`: tracked only, include local-only/generated, or local-only/generated only
- `caseSensitive`: boolean
- `limit`: maximum results requested for the current page
- `cursor`: continuation marker when more results exist

**Validation rules**:

- Query must meet the minimum length before search runs.
- At least one target must be selected.
- Generated/local-only inclusion must be explicit in the search surface.
- Partial results must disclose that more matches may exist.

## SearchResultItem

**Purpose**: Displays one repository search match.

**Fields**:

- `path`: repository-relative path
- `type`: file or folder
- `matchType`: name or content
- `line`: line number when applicable
- `snippet`: surrounding text when applicable
- `changeState`: optional changed-file state
- `generatedLocalState`: optional local/generated state
- `scopeLabel`: why the result appears under the active scope

**Validation rules**:

- Results must be selectable with keyboard and pointer.
- Snippets must not expand enough to obscure the result list.
- Result selection must preserve enough search context for backtracking.

## KeyDocumentItem

**Purpose**: Represents a high-value repository document or folder shortcut.

**Fields**:

- `path`: repository-relative target
- `label`: user-readable label
- `category`: README, agent instructions, specs, docs, recent, changed, or folder
- `reason`: why GitLocal surfaced it
- `available`: whether the target currently exists

**Validation rules**:

- Missing common docs should not produce broken primary links.
- Paths must remain repository-relative.
- Recent items must handle deleted files gracefully.

## RecentItem

**Purpose**: Represents files or folders recently viewed or recently changed in this viewer.

**Fields**:

- `path`: repository-relative path
- `type`: file or folder
- `lastViewedAt`: local timestamp when viewed
- `lastChangedAt`: local timestamp when detected changed, if known
- `label`: display label
- `available`: whether the path currently opens

**Validation rules**:

- Deleted recent items must be clearly marked or removed after validation.
- Recent viewed state may be local to the browser/native viewer session.
- Recent changed state should derive from local filesystem/git observations.

## BackgroundChangeNotice

**Purpose**: Explains externally detected changes that affect the current view.

**Fields**:

- `path`: affected path
- `changeKind`: refreshed, modified, deleted, moved, unavailable, or conflict
- `detectedAt`: local timestamp
- `lastRefreshedAt`: local timestamp when content was refreshed
- `message`: concise user-readable explanation
- `actionLabel`: optional action such as open changed files, refresh, or view parent

**Validation rules**:

- Notices must not repeatedly interrupt users for the same unchanged state.
- Active-file deletion must include a fallback navigation explanation.
- Edit conflicts must block save until the user resolves or reloads intentionally.

## State Transitions

```text
Markdown file opened
  -> reading actions visible
  -> relative links resolve against the current Markdown folder
  -> rendered find highlights matches when used

Working tree revision changes
  -> RepositoryStatusSummary refreshes
  -> ChangedFileItem list refreshes
  -> active file reloads when safe
  -> BackgroundChangeNotice appears when the current context is affected

Repository search opened
  -> active document context is retained
  -> SearchScope controls are visible
  -> SearchResultItem list shows counts and partial-result state

Generated/local visibility changed
  -> tree, folder list, dashboard, and search update
  -> active file remains visible or gets an explanatory exception

User starts editing
  -> destructive/read-secondary actions remain available but not primary
  -> external active-file changes produce conflict notice
  -> save is blocked when revision safety fails
```
