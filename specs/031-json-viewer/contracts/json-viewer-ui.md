# UI Contract: JSON Document Viewer

## Scope

This contract defines the user-visible behavior for `.json` files in the content panel. It applies to the content panel's rendered view in both GitLocal distributions because both use the same UI.

## Recognized, Valid JSON

Given a `.json` file whose content parses successfully as JSON, the content panel must:

- Show a pretty, structured tree view by default (not raw text).
- Visually distinguish objects, arrays, strings, numbers, booleans, and null values from one another.
- Indent and visually scope nested objects/arrays so parent-child relationships are clear.
- Support collapsing and expanding individual object/array nodes, showing a child-count summary when collapsed.
- Show an explicit "empty" indicator for empty objects (`{}`) and empty arrays (`[]`).
- Render a root-level bare scalar (string/number/boolean/null) as a minimal single-value view rather than an empty or broken pane.
- Offer the same raw/pretty toggle control and location already used for Markdown files.

## Raw View

Given a `.json` file open in raw view (by explicit toggle, or by fallback — see below), the content panel must:

- Show the exact underlying file text, unmodified.
- Apply JSON syntax highlighting via the existing code viewer.
- Allow switching back to pretty view when the content is valid JSON.

## Malformed Or Empty JSON

Given a `.json` file that fails to parse (including an empty file), the content panel must:

- Not show the pretty tree view.
- Show the raw view instead, with a brief inline notice that the file could not be parsed as JSON.
- Still allow the user to edit the file as plain text.
- Recompute parse state and offer the pretty view again automatically once the content becomes valid (e.g. after an edit is saved).

## Edit And Save Behavior

Given a user editing a `.json` file via the existing inline editor, the content panel must:

- Operate on raw text, the same editing mechanism used for other text files.
- Not block saving when the draft is not valid JSON.
- Warn the user before the save completes when the draft is not valid JSON, distinct from the existing unsaved-changes-on-navigate confirmation.
- Apply the existing unsaved-changes confirmation when navigating away with unsaved edits, unchanged from other editable file types.
- Apply the existing revision-conflict and file-switch/refresh behavior unchanged.

## Non-JSON File Types

The content panel must continue to render Markdown, plain text, image, and binary files exactly as it does today. No existing toggle, editor, or rendering behavior for other file types changes as part of this feature.

## Accessibility And Layout

The pretty JSON view must:

- Have an accessible name or visible label identifying it as a structured JSON view.
- Be keyboard-navigable for expanding/collapsing nodes.
- Be screen-reader readable as structured content (key/value/type relationships discoverable, not just visual).
- Avoid text overlap or unreadable wrapping at narrow and wide viewer widths.
- Use stable spacing so nesting depth is easy to follow at a glance.

## Regression Samples

Implementation must include automated coverage for:

- A `package.json`-style object with nested fields and arrays.
- A root-level array of objects.
- A root-level bare scalar (string, number, boolean, null).
- An empty object, an empty array, and an empty file.
- Malformed JSON (trailing comma, unquoted key, truncated content).
- A deeply nested structure and a large array, exercising collapse/expand.
- Toggling between pretty and raw view.
- Editing and saving valid JSON, and attempting to save invalid JSON (warning shown, save not blocked).
- No regression in Markdown, plain text, image, or binary file rendering/editing.
