# Data Model: Markdown YAML Visualization

## Markdown Document

Represents the currently selected Markdown file content.

**Fields**:

- `rawContent`: Original file text loaded from the repository.
- `currentPath`: Repository-relative path used for Markdown link and image resolution.
- `frontMatter`: Optional recognized front matter section.
- `bodyContent`: Markdown text rendered as the document body.

**Validation rules**:

- `rawContent` is never mutated by the visualization.
- `bodyContent` equals `rawContent` when no recognized front matter is present.
- `bodyContent` starts after the closing front matter delimiter when recognized front matter is present.

## Front Matter Metadata

Represents a bounded metadata section at the start of a Markdown document.

**Fields**:

- `rawText`: Metadata text between opening and closing delimiters.
- `startLine`: Line number where the opening delimiter appears.
- `endLine`: Line number where the closing delimiter appears.
- `entries`: Ordered metadata entries suitable for display.
- `status`: Recognition result such as recognized, empty, malformed, or incomplete.

**Validation rules**:

- Front matter is recognized only when the opening delimiter is the first line of the file.
- A closing delimiter must appear before the Markdown body begins for recognized front matter.
- Incomplete or malformed metadata must not hide document content.

## Metadata Entry

Represents one displayable field, list item, or nested group within front matter.

**Fields**:

- `label`: Field name or list marker shown to the user.
- `value`: Scalar value text when available.
- `children`: Nested metadata entries for grouped fields or lists.
- `kind`: Display category such as field, group, list item, or raw line.

**Validation rules**:

- Field labels and values remain separately readable.
- Nested entries preserve their parent-child relationship in display order.
- Quoted strings, booleans, numbers, empty values, and list values remain distinguishable.

## Metadata Display State

Represents the rendered metadata area shown before the Markdown body.

**Fields**:

- `isVisible`: Whether a metadata visualization should appear.
- `title`: Short label for the metadata area.
- `entries`: Parsed entries shown in structured form.
- `fallbackText`: Raw metadata text shown when structured parsing is not sufficient.
- `message`: Optional user-facing message for empty, malformed, or incomplete metadata.

**State transitions**:

- Ordinary Markdown: `isVisible = false`; render `rawContent` as body.
- Recognized valid metadata: `isVisible = true`; render structured entries and render remaining body content.
- Empty metadata: `isVisible = true`; show empty metadata state and render remaining body content.
- Malformed or incomplete metadata: preserve visible document content and use a non-destructive fallback rather than rendering the whole file as broken formatted Markdown.
