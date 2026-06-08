# Data Model: Share and Copy Regression Patch

## Text File Representation

Represents a readable text file view available in the content panel.

**Fields**

- `path`: File path within the active local folder or repository scope.
- `fileKind`: `markdown`, `source`, `plain-text`, `json`, `yaml`, `csv`, `config`, or another already-supported readable text kind.
- `rawText`: Source text loaded from the local file.
- `renderedText`: User-facing rendered text when a rendered representation exists.
- `activeRepresentation`: `raw` or `rendered`.
- `copyable`: Whether the active representation can be copied.
- `statusMessage`: Optional success or failure message.

**Validation Rules**

- `copyable` is false for unsupported binary or non-readable files.
- Raw copy uses `rawText`.
- Rendered copy uses `renderedText` when present and active.
- `path` must remain inside the active local folder or repository scope.

## File Action Surface

Represents the visible controls associated with the active file/content view.

**Fields**

- `copyVisible`: Whether Copy is visible.
- `copyPresentation`: Must be `icon-label-button` when visible.
- `shareVisible`: Whether Share is visible.
- `savePdfVisible`: Whether Save PDF is visible.
- `removedDestinations`: Set of hidden actions: `email`, `slack`, `print`.
- `toolbarIcons`: Icons assigned to `find-in-file`, `refresh`, and `theme`.
- `accessibilityName`: Stable name exposed for each action.

**Validation Rules**

- Copy is visible for supported text file representations.
- Email, Slack, and Print are not visible in this patch.
- Icon additions must not remove accessible names or existing keyboard behavior.

## Rendered PDF Output

Represents prepared rendered content used by Save PDF.

**Fields**

- `sourcePath`: File path for the rendered document.
- `title`: User-facing document title.
- `renderedBody`: Rendered document content prepared for output.
- `outputState`: `idle`, `preparing`, `ready`, `saving`, `saved`, or `failed`.
- `failureMessage`: User-facing message when saving cannot complete.
- `includesAppChrome`: Must be false.

**Validation Rules**

- Output excludes app header, sidebar, toolbar, file tree, buttons, dialogs, and unrelated controls.
- Output preserves readable headings, paragraphs, lists, tables, links, and code blocks for representative rendered text.
- Failure leaves the active file view unchanged.

## Folder Classification

Represents the server/app determination of how a local path should open.

**Fields**

- `inputPath`: User-provided or app-provided local path.
- `canonicalPath`: Resolved local path used by the app.
- `pathType`: `directory`, `file`, `missing`, or `unsupported`.
- `gitState`: `repository-root`, `inside-repository`, or `outside-repository`.
- `openMode`: `repository`, `folder`, `file`, or `blocked`.
- `repositoryRootPath`: Canonical git worktree root when available.
- `message`: Optional user-facing classification or error message.

**Validation Rules**

- `openMode` is `repository` only when `gitState` is `repository-root`.
- Repository roots opened through startup, typed path, picker double-click, and folder actions produce the same repository active-root behavior.
- Nested folders inside a repository remain folder mode unless they are independent repository roots.
- Non-git folders remain folder mode.

## Active Root State

Represents the app's loaded root after startup or opening a path.

**Fields**

- `rootPath`: Active folder or repository root.
- `pickerMode`: Whether the app is still in folder-picking mode.
- `isGitRepo`: Whether the active root is a git repository root.
- `gitState`: Classification for the active root.
- `openMode`: Active open mode.
- `selectedPath`: Optional selected file path relative to the root.
- `selectedPathType`: `file`, `dir`, or `none`.

**Validation Rules**

- `isGitRepo` is true only for repository roots.
- Repository-only UI is enabled only when `isGitRepo` is true.
- Opening a file inside a repository uses the repository root as `rootPath` and the file as `selectedPath`.
- Opening a plain folder uses that folder as `rootPath` and disables repository-only UI.

## State Transitions

```text
Text file loaded -> active representation selected -> Copy available -> copy succeeds/fails with status

Rendered text loaded -> Save PDF selected -> output preparing -> ready/saving -> saved or failed

Local path selected -> classify path -> repository root opens repository mode
Local path selected -> classify path -> non-git directory opens folder mode
Local path selected -> classify path -> nested repository file opens repository root with selected file
```
