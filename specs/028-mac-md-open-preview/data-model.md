# Data Model: Mac Markdown Open Preview

## Open Request

Represents a user action asking GitLocal to open a local item.

**Fields**:

- `source`: `native-file-open`, `explicit-launch`, `picker-open`, or `repo-open`
- `inputPath`: Absolute local path received from macOS, CLI, or picker
- `receivedAt`: Time the request was accepted by the app process
- `startupPhase`: Whether the request arrived before service startup, after service startup, or while the viewer was already loaded
- `status`: `pending`, `accepted`, `blocked`, or `failed`
- `message`: User-facing failure or status message when applicable

**Validation rules**:

- `inputPath` must be present for native file-open requests.
- Native file-open requests must resolve to an existing readable local file before selection can succeed.
- Only supported Markdown file requests should be treated as Finder double-click document opens.

## Default Reader Preference

Represents the user's explicit choice about whether GitLocal may become the default macOS app for Markdown files.

**Fields**:

- `status`: `not-asked`, `accepted`, `declined`, or `failed`
- `askedAt`: Time the first-run prompt was shown
- `answeredAt`: Time the user accepted or declined
- `message`: Failure or status message when macOS cannot complete the association change

**Validation rules**:

- GitLocal must not change the default Markdown reader while `status` is `not-asked` or `declined`.
- GitLocal may attempt the association change only after the user accepts.
- A failed association attempt must not be recorded as accepted setup.

## Active Folder Context

The local folder GitLocal is browsing after resolving an open request.

**Fields**:

- `rootPath`: Absolute local folder path used by the local service
- `gitState`: `repository-root`, `inside-repository`, or `outside-repository`
- `repositoryRootPath`: Repository root when the opened file is inside a repository
- `displayName`: Folder or repository label shown in the viewer
- `source`: Open request source that established the context

**Validation rules**:

- If the opened file is inside a repository, `rootPath` should be the repository root so repository context remains available.
- If the opened file is outside a repository, `rootPath` should be the file's containing folder.
- A native open context must take precedence over saved startup folder state for the current launch.

## Selected File

The file highlighted in navigation and shown in the content area.

**Fields**:

- `path`: Repository- or folder-relative path
- `absolutePath`: Absolute local path for server-side resolution only
- `pathType`: `file`, `dir`, or `none`
- `contentType`: `markdown`, `text`, `image`, or `binary`
- `localOnly`: Whether the item is local-only relative to git context
- `selectionSource`: `native-file-open`, `viewer-state`, `tree-click`, `search-result`, `changed-file`, `readme-jump`, or `default`

**Validation rules**:

- Native file-open selection must use the exact requested file when readable.
- `path` must stay relative to `rootPath` for viewer/server API calls.
- Failed open requests must clear or preserve selection intentionally and must not show stale content as if it were the requested file.

## Document Preview

The content panel representation for the selected file or README section.

**Fields**:

- `selectedPath`
- `renderMode`: `rendered-markdown`, `raw-text`, `image`, `binary-placeholder`, or `empty-state`
- `loadingState`: `loading`, `ready`, `failed`, or `empty`
- `errorMessage`: Plain-language failure message when applicable

**Validation rules**:

- Markdown files opened from Finder default to rendered preview, not raw source.
- Folder pages render the README below the folder tree when a README exists.
- Preview state must update when the visible tree selection changes.
- Failed preview loads must not display stale content from a previous file.

## Workspace Layout State

The visible arrangement of the folder page, navigation controls, and preview.

**Fields**:

- `folderTreeVisibility`: `visible`
- `dotfileVisibility`: `show` or `hide`
- `readmePresence`: `present`, `absent`, or `unknown`
- `readmeQuickLinkVisibility`: `visible` or `hidden`
- `mainSurface`: `folder-page`, `file-preview`, `empty-state`, or `error`
- `activePathLabel`: Human-readable selected path
- `folderContextLabel`: Human-readable active folder or repository label

**Validation rules**:

- Folder pages must show the folder tree before the README on the same scrollable page.
- Folder tree and README must not be mutually exclusive top-level tabs.
- The README quick link appears near the top only when a README exists and scrolls to the README section.
- Dotfiles are shown by default.
- The hide `.*` checkbox changes folder tree density without changing the active folder or selected file.
- Empty folders must still show visible folder context and a clear no-README or no-files state.

## State Transitions

1. `native-file-open received` -> `open request pending`
2. `service available` -> `active folder context resolved`
3. `viewer loaded` -> `selected file applied`
4. `selected file applied` -> `document preview rendered`
5. `folder opened` -> `folder tree rendered` -> `README section rendered when present`
6. `README quick link activated` -> `README section scrolled into view`
7. `dotfile checkbox changed` -> `folder tree filtered` without active context reset
8. `tree selection changed` -> `selected file updated` -> `document preview updated`
9. `open failure detected` -> `error state shown` and stale preview suppressed
