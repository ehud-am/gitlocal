# Data Model: Nested Repository Detection

## Browse Root

Represents the folder currently shown in the folder browser.

**Fields**:
- `path`: Absolute runtime path to the displayed folder.
- `displayName`: Folder name or full path shown to the user.
- `gitState`: `repository-root`, `inside-repository`, or `outside-repository`.
- `openMode`: `repository`, `folder`, or `blocked`.
- `entries`: Child folder and file entries shown under this root.

**Validation rules**:
- A browse root outside git can still contain repository child folders.
- A browse root that is itself a repository root does not imply every child is a repository.
- Missing or unsupported browse roots return existing blocked/error behavior.

## Repository Child Folder

Represents a child folder under the browse root that is itself a valid repository root.

**Fields**:
- `name`: Entry name shown in the picker.
- `path`: Absolute runtime path to the child folder.
- `type`: `dir`.
- `isGitRepo`: `true`.
- `gitState`: `repository-root`.
- `openMode`: `repository`.
- `repositoryRootPath`: Canonical repository root path when exposed by classification.

**Validation rules**:
- Must be labeled as a repository when listed from a plain parent folder.
- Must open in repository mode from Open, double-click, and typed path submission.
- Remains a repository even with no commits, no remote, or missing git identity.
- May be represented by repository metadata stored as a directory or file.

## Regular Child Folder

Represents a child folder under the browse root that is not itself a repository root.

**Fields**:
- `name`: Entry name shown in the picker.
- `path`: Absolute runtime path to the child folder.
- `type`: `dir`.
- `isGitRepo`: `false`.
- `gitState`: `outside-repository` or `inside-repository`.
- `openMode`: `folder`.
- `repositoryRootPath`: Present only when the folder is inside another repository.

**Validation rules**:
- Must not show a repository badge.
- Must open or browse as a regular folder according to existing picker behavior.
- Must not inherit repository status from sibling repository folders.
- If the folder is inside a repository but is not itself the root, it remains a folder.

## Folder Entry Classification

Represents the type-aware metadata used by picker labels and open behavior.

**Fields**:
- `pathType`: `file`, `directory`, `missing`, or `unsupported`.
- `gitState`: `repository-root`, `inside-repository`, or `outside-repository`.
- `openMode`: `repository`, `folder`, `file`, or `blocked`.
- `message`: Optional user-readable error or status text.

**Validation rules**:
- `isGitRepo` is true only when `gitState` is `repository-root`.
- Directory entries with `openMode: repository` open as repositories.
- Directory entries with `openMode: folder` browse or open as folders.
- File entries keep existing file-opening behavior.

## Repository Capability State

Represents the context available after a repository child opens.

**Fields**:
- `path`: Active root path.
- `isGitRepo`: Whether the active root is a repository.
- `currentBranch`: Current branch when available.
- `hasCommits`: Whether repository history exists.
- `gitContext`: Optional identity and remote context.
- `rootEntryCount`: Count of root entries available for browsing.

**Validation rules**:
- Repository-only controls are enabled only when the active root is a repository.
- Missing optional repository metadata appears as an empty state, not as a folder classification.
- Folder roots disable repository-only controls.

## State Transitions

### Mixed Parent Browse

1. `outside-repository` browse root lists child entries.
2. Each child entry is classified independently.
3. Repository child -> `gitState: repository-root`, `openMode: repository`.
4. Regular child -> `gitState: outside-repository`, `openMode: folder`.

### Repository Child Opening

1. `repository-root` picker entry -> active root in repository mode.
2. `repository-root` typed path -> active root in repository mode.
3. `repository-root` startup path -> active root in repository mode.
4. Active root in repository mode -> repository capability state available.

### Regular Child Opening

1. `outside-repository` child -> active root in folder mode.
2. `inside-repository` child that is not a repository root -> active root in folder mode.
3. Folder mode -> repository-only capability state unavailable.
