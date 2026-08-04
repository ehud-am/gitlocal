# Feature Specification: JSON Document Viewer

**Feature Branch**: `031-json-viewer`
**Created**: 2026-08-03
**Status**: Draft
**Input**: User description: "Add a JSON document viewer with pretty view, raw view, and edit, matching the existing Markdown viewer experience"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a JSON file in a clean, structured view (Priority: P1)

A user browsing a repo opens a `.json` file (e.g. `package.json`, a config file). Instead of seeing an unformatted or merely syntax-highlighted wall of text, they see a pretty, readable rendering of the document's structure — keys, values, nesting, arrays — similar in spirit to how a Markdown file renders as formatted prose instead of raw markup.

**Why this priority**: This is the core value of the feature and mirrors the primary Markdown experience (pretty rendering by default). Without it, JSON files are no better served than they are today via the generic code viewer.

**Independent Test**: Open any valid `.json` file in the repo browser and confirm it renders as a pretty, structured view by default (not raw text), with no changes to how any other file type is displayed.

**Acceptance Scenarios**:

1. **Given** a repo containing a well-formed `.json` file, **When** the user selects that file, **Then** the content panel shows a pretty, structured rendering of the JSON (expandable/readable key-value structure) rather than raw unformatted text.
2. **Given** a `.json` file with nested objects and arrays, **When** it is rendered in pretty view, **Then** nesting is visually indented/scoped so parent-child relationships are clear, and arrays are visually distinguished from objects.
3. **Given** a large `.json` file, **When** it is opened, **Then** the pretty view renders without noticeably degrading responsiveness (consistent with existing performance expectations for large Markdown files).

---

### User Story 2 - Switch to raw view to see the exact file contents (Priority: P2)

A user viewing the pretty JSON rendering wants to confirm the exact underlying text (e.g. exact formatting, whitespace, key order, or to copy a snippet verbatim). They switch to "raw" view using the same toggle mechanism already used for Markdown files.

**Why this priority**: Matches the existing Markdown pretty/raw toggle pattern; needed for trust (users can always verify the rendered view matches the real file) and for copy/paste workflows.

**Independent Test**: With a `.json` file open in pretty view, use the existing view toggle to switch to raw, and confirm the exact file text is shown (syntax-highlighted, as CodeViewer does today), then switch back to pretty.

**Acceptance Scenarios**:

1. **Given** a `.json` file open in pretty view, **When** the user selects "View raw", **Then** the exact raw file contents are displayed with JSON syntax highlighting, using the same toggle control and location already used for Markdown files.
2. **Given** a `.json` file open in raw view, **When** the user selects "View rendered", **Then** the pretty structured view reappears.
3. **Given** a malformed/invalid `.json` file, **When** the user opens it, **Then** the system falls back to raw view (since a structured pretty view cannot be built), with a brief inline indication that the file could not be parsed as JSON.

---

### User Story 3 - Edit a JSON file's contents (Priority: P3)

A user needs to make a small change to a `.json` file (e.g. update a config value) without leaving the app. They use the existing edit affordance to enter edit mode, modify the raw text, and save.

**Why this priority**: Completes parity with the Markdown experience (view → raw → edit) and is the least-frequently-needed of the three for a "browsing-first" product, but is expected by users already familiar with editing Markdown/text files in the app.

**Independent Test**: Open a `.json` file, enter edit mode, change a value, save, and confirm the file is updated on disk and the pretty view reflects the change.

**Acceptance Scenarios**:

1. **Given** a `.json` file open in pretty or raw view, **When** the user chooses "Edit", **Then** they enter the same inline editing experience used for other text files, editing the raw JSON text.
2. **Given** a user in edit mode for a `.json` file, **When** they save valid JSON, **Then** the file is written, the editor exits back to view mode, and the pretty view reflects the updated content.
3. **Given** a user in edit mode for a `.json` file, **When** they attempt to save text that is not valid JSON, **Then** the system warns them before saving completes (consistent with treating JSON validity as a soft check, not a hard blocker, since the underlying file is still plain text).
4. **Given** unsaved edits to a `.json` file, **When** the user tries to navigate away, **Then** the existing unsaved-changes confirmation applies, same as other editable files.

---

### Edge Cases

- What happens when a `.json` file is empty (zero bytes)? Pretty view should show an explicit "empty file" state rather than an error.
- What happens when a `.json` file is syntactically invalid (trailing commas, unquoted keys, truncated content)? Pretty view is not shown; the file opens in raw view with an inline notice that it couldn't be parsed as JSON, and the user can still edit it as plain text.
- What happens with a very deeply nested JSON structure? Rendering should remain usable (e.g. via collapsible nesting) rather than becoming an unreadable, unbounded wall of indentation.
- What happens with non-object/array root values (e.g. a bare number, string, boolean, or `null` as the entire file)? These are still valid JSON and should render as a minimal single-value pretty view.
- What happens with JSON containing very large arrays or long string values? The view should stay responsive and readable, matching how the existing Markdown/code viewers handle large content today.
- What happens for `.jsonc` or JSON-with-comments files, or non-`.json`-extensioned files containing JSON? Out of scope for this feature (see Assumptions) — only files already detected by extension as JSON are affected.
- What happens when a file has a `.json` extension but the pretty view is mid-render and the user rapidly toggles raw/pretty or navigates to another file? The view must not show stale content from the previous file (consistent with existing file-switch behavior).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect files with a `.json` extension as a distinct content type (rather than generic text), analogous to how Markdown files are detected today.
- **FR-002**: System MUST render valid JSON files in a pretty, structured view by default when opened, showing keys, values, nesting, and array structure in a readable layout.
- **FR-003**: System MUST allow the user to toggle between pretty view and raw view for JSON files using the same toggle control/mechanism already used for Markdown files.
- **FR-004**: Raw view for JSON files MUST show the exact underlying file text with JSON syntax highlighting (reusing the existing raw/code viewer).
- **FR-005**: System MUST allow editing of JSON files via the existing inline file editor, operating on the raw text.
- **FR-006**: System MUST NOT prevent saving a JSON file whose contents are not valid JSON, but MUST warn the user before the save completes.
- **FR-007**: When a JSON file cannot be parsed as valid JSON, the system MUST show the raw view instead of the pretty view, with an inline indication that pretty rendering is unavailable.
- **FR-008**: The pretty JSON view MUST visually distinguish objects, arrays, strings, numbers, booleans, and null values from one another.
- **FR-009**: The pretty JSON view MUST support collapsing/expanding nested objects and arrays so large or deeply nested documents remain navigable.
- **FR-010**: System MUST continue to render all non-JSON file types exactly as it does today (no regression to Markdown, plain text, image, or binary handling).
- **FR-011**: System MUST handle an empty `.json` file by showing an explicit empty-file state rather than an error or blank screen.
- **FR-012**: The existing unsaved-changes confirmation, revision-conflict handling, and file-switch/refresh behavior MUST apply to JSON files exactly as they do for other editable text files today.

### Key Entities

- **JSON Document**: A file with a `.json` extension whose content is (expected to be) valid JSON text; may be a single value, object, or array at its root, at any nesting depth.
- **Parsed JSON Structure**: The in-memory structural representation of a successfully parsed JSON document, used to drive the pretty view (keys, values, types, nesting).
- **View Mode**: The existing per-file display state (pretty/raw) and edit state, extended to apply to JSON documents the same way it already applies to Markdown and text documents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open any well-formed `.json` file in the repo and see a pretty, structured rendering without any extra steps (same click path as opening any other file).
- **SC-002**: Users can switch between pretty and raw view for a JSON file in one action, with no perceptible delay (consistent with current Markdown toggle responsiveness).
- **SC-003**: Users can edit and save a JSON file using the same workflow they already use for other text files, with no new workflow to learn.
- **SC-004**: 100% of existing file-viewing and editing behavior for non-JSON file types is unaffected (zero regressions in existing test suite).
- **SC-005**: Malformed JSON files never produce a broken/blank pane — they always fall back gracefully to raw view.

## Assumptions

- Only files with a `.json` extension are in scope; `.jsonc`, `.json5`, or JSON embedded in other file types (e.g. inside Markdown code fences) are out of scope for this feature.
- The pretty view is read-oriented (structured display), not a structured/tree-based *editor*; editing continues to happen against raw text via the existing inline editor, consistent with how Markdown editing works today (edit raw markup, not a WYSIWYG view).
- "Similar experience to Markdown" means matching the same view/raw/edit toggle pattern and UI placement, not that JSON and Markdown share a rendering component internally.
- Very large JSON files are handled the same way the product already handles very large Markdown/text files today (no new size-based restrictions introduced by this feature).
- The existing server-side file-type detection (`detectFileType`) and `FileContent` type are the right extension points, and adding a `json` type is an additive change consistent with how `markdown` was added.
