# Data Model: Markdown Share Actions

## Markdown Document

Represents the currently selected Markdown file.

**Fields**

- `path`: Repository-relative file path.
- `displayTitle`: User-facing title derived from file name or document heading.
- `savedContent`: Last content loaded from disk/git.
- `visibleContent`: Content currently visible to the user, including unsaved edits when previewing edited Markdown is supported.
- `contentState`: `saved`, `unsaved`, or `unavailable`.
- `fileType`: Must be `markdown` for Markdown-specific output actions.
- `revisionToken`: Current file revision token when editing or saving is allowed.

**Validation Rules**

- Markdown actions are available only when `fileType` is `markdown`.
- Sharing must not silently use stale saved content when `contentState` is `unsaved`.
- `path` must remain inside the currently loaded local folder/repository scope.

## Rendered Markdown Output

Represents the prepared rendered document used by print, PDF, and share flows.

**Fields**

- `sourcePath`: Markdown document path.
- `title`: Output title shown in print, PDF, email subject, or shared artifact.
- `renderedBody`: Rendered document content.
- `outputMode`: `print`, `pdf`, `email`, `slack`, `system-share`, `copy`, or `download`.
- `includesUnsavedEdits`: Whether output reflects visible unsaved content.
- `createdAt`: Local timestamp for generated artifacts or share preparation.

**Validation Rules**

- Output must preserve headings, paragraphs, lists, tables, code blocks, links, and title context.
- Output must not include app navigation, sidebars, controls, or editor-only UI.
- Relative links and local images should remain useful where the destination supports them; otherwise the user should receive a clear fallback.

## Share Destination

Represents a user-selected destination or fallback for Markdown output.

**Fields**

- `kind`: `print`, `pdf`, `email`, `slack`, `system-share`, `copy`, or `download`.
- `label`: User-facing destination label.
- `available`: Whether the destination can be used in the current environment.
- `fallbackKind`: Fallback destination when direct sharing is unavailable.
- `message`: Optional user-facing status or limitation.

**Validation Rules**

- Slack direct sharing is available only when the local environment exposes it.
- Email sharing must prepare a useful subject from document context.
- Unavailable destinations must fail gracefully and offer a practical fallback.

## Editor History

Represents reversible edits for the focused file editor.

**Fields**

- `filePath`: Current editable file path.
- `past`: Ordered prior content states.
- `present`: Current editor content.
- `future`: Ordered redo states.
- `dirty`: Whether `present` differs from saved content.
- `focused`: Whether this history should respond to undo/redo commands.

**Validation Rules**

- Undo and redo affect only the focused editor context.
- History resets or becomes inactive when the selected file changes.
- Commands invoked outside the editor must not mutate editor history unless focus remains in the editor.

## Content Panel Selection Scope

Represents the selectable content region for platform select-all commands.

**Fields**

- `activePanelId`: Stable identifier for the currently viewed content panel.
- `contentKind`: `rendered-markdown`, `readme-preview`, `raw-text`, `source-preview`, `editable-draft`, `binary-placeholder`, `image-preview`, `folder-view`, or `empty-state`.
- `selectionRoot`: DOM/content root that owns content-panel selection.
- `selectableText`: Text content that can be selected or collected for the current panel.
- `preserveNativeControlSelection`: Whether focus is inside a control that should keep native select-all behavior.
- `includesAppChrome`: Must be `false`.

**Validation Rules**

- Select-all must include only the current content panel's user-facing content.
- Select-all must exclude app header, sidebar, footer, tree controls, action buttons, dialogs, and unrelated panels.
- Native input, textarea, search, and dialog field select-all behavior must not be overridden.
- Empty, binary, or image-only panels may select their visible placeholder/metadata but must not select global app chrome.

## Page Refresh State

Represents the user's current view context before and after refresh.

**Fields**

- `repoPath`: Current local folder or repository path.
- `selectedPath`: Current selected file/folder path.
- `selectedPathType`: `file`, `dir`, or `none`.
- `branch`: Current branch or empty string for non-git folders.
- `raw`: Whether raw/source view is selected.
- `scrollPosition`: Restorable scroll position when available.
- `loading`: Whether refresh is in progress.

**Validation Rules**

- Refresh preserves restorable fields when targets still exist.
- If the selected path no longer exists, refresh resolves to an available parent/root state.
- Concurrent refresh requests collapse into one coherent refreshed state.

## Startup Folder Preference

Represents the last successfully opened folder that may be reused on launch.

**Fields**

- `path`: Absolute local folder path.
- `openedAt`: Last successful open time.
- `source`: `explicit-launch`, `picker-open`, `repo-open`, or `native-open`.
- `exists`: Whether the path exists at startup validation time.
- `readable`: Whether the path can be used as a startup folder.

**Validation Rules**

- Explicit launch path always takes precedence over this preference.
- Preference updates only after a successful folder/repository open.
- Unavailable preferences are ignored for startup and must not block launch.

## Platform Default Folder

Represents the fallback startup folder when no explicit or remembered folder can be used.

**Fields**

- `platform`: `macos`, `windows`, or `linux`.
- `documentsPath`: Candidate user Documents folder.
- `homePath`: User home folder fallback.
- `selectedPath`: Resolved default folder.
- `fallbackReason`: Empty for Documents success, otherwise why home was used.

**Validation Rules**

- macOS default prefers the user's Documents folder.
- Windows default prefers the user's Documents folder.
- Linux default prefers the configured Documents folder, then `~/Documents`.
- Home folder is used only when no Documents candidate is available.

## State Transitions

```text
Startup:
explicit folder provided -> open explicit folder
no explicit folder + saved folder exists -> open saved folder
no explicit folder + no saved folder -> open platform Documents
Documents unavailable -> open home folder

Markdown output:
markdown file opened -> rendered output available
share action selected -> destination availability checked
destination available -> start destination flow
destination unavailable -> present fallback

Editor history:
editor focused -> record present state
content changed -> push prior state into past, clear future
undo -> move present to future, restore latest past
redo -> move present to past, restore next future
file changed/cancelled/saved -> reset or finalize history

Content panel selection:
content panel active -> platform select-all invoked -> select content panel root
native input active -> platform select-all invoked -> preserve native control selection
panel changes -> selection scope updates to new panel root

Refresh:
idle -> refresh requested -> loading
loading + duplicate request -> keep one pending refresh
loading completed + target exists -> restore target context
loading completed + target missing -> resolve to parent/root context
```
