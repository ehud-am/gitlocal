# Data Model: JSON Document Viewer

## JSON Document

Represents the currently selected `.json` file content.

**Fields**:

- `rawContent`: Original file text loaded from the repository.
- `currentPath`: Repository-relative path of the file.
- `parseResult`: Outcome of attempting to parse `rawContent` as JSON — either a parsed tree root or a parse failure.

**Validation rules**:

- `rawContent` is never mutated by the pretty view; only explicit edit+save changes file content.
- `parseResult` is a parse failure whenever `JSON.parse(rawContent)` throws, including for an empty file.

## Parsed JSON Tree Node

Represents one displayable value within a successfully parsed JSON document — the root value or any descendant.

**Fields**:

- `key`: Property name (for object members) or index label (for array items); absent for the root node.
- `valueKind`: Display category — `object`, `array`, `string`, `number`, `boolean`, or `null`.
- `scalarValue`: Rendered text for `string`, `number`, `boolean`, or `null` nodes.
- `children`: Ordered child nodes, present for `object` and `array` nodes (object insertion order or array index order).
- `childCount`: Number of immediate children, shown as a summary for collapsed `object`/`array` nodes.

**Validation rules**:

- Every node has exactly one `valueKind`.
- `object` and `array` nodes have `children` (possibly empty); scalar nodes never have `children`.
- Object key order matches the order returned by `JSON.parse`; array order matches source order.
- An empty object or empty array node has `childCount = 0` and renders an explicit "empty" indicator rather than nothing.

## View Mode Display State

Represents the existing per-file display state (pretty/raw/edit), extended to JSON documents.

**Fields**:

- `contentType`: File content type, extended with the `json` value alongside `markdown`, `text`, `image`, `binary`.
- `showRaw`: Whether the raw/code view is currently shown instead of the pretty view.
- `canToggleRaw`: Whether the raw/pretty toggle control is available for the current file (extended to include `json`).
- `parseNotice`: Optional user-facing message shown when pretty view is unavailable because the JSON could not be parsed.
- `isEditing`: Whether the file is currently open in the inline editor (unchanged mechanism, shared with other text types).
- `saveWarning`: Optional non-blocking warning shown before a save completes, when the edited draft is not valid JSON.

**State transitions**:

- Valid JSON, view mode: `showRaw = false` by default; pretty view renders the parsed tree; `canToggleRaw = true`.
- Valid JSON, raw toggled: `showRaw = true`; existing `CodeViewer` renders `rawContent` with JSON highlighting.
- Malformed or empty JSON: pretty view is not shown; `showRaw` is forced to raw rendering; `parseNotice` is set to a brief inline message; the toggle still allows switching back once content becomes valid (e.g. after an edit).
- Edit mode: `isEditing = true`; editing operates on raw text regardless of `showRaw`; on save, if the draft fails `JSON.parse`, `saveWarning` is set and the user must confirm before the save proceeds (mirrors the existing unsaved-changes confirmation pattern); the file is written unchanged from the user's draft either way.
- Post-save: `isEditing = false`; `parseResult`/`parseNotice`/pretty view are recomputed from the newly saved content, same as any other file-content refresh.
