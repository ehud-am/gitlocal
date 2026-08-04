# Research: JSON Document Viewer

## Decision: Detect `.json` as its own content type, split out from the generic `text` type

**Rationale**: `detectFileType` in `src/git/repo.ts` currently maps `.json` into the generic `text` type with `language: 'json'`, which the UI renders via the plain `CodeViewer` (syntax highlighting only, no structure). Markdown already has its own `type: 'markdown'` for exactly this reason — to let the content panel choose a purpose-built renderer. Giving JSON its own `type: 'json'` (keeping `language: 'json'` for raw-view highlighting) is the smallest change that lets the panel dispatch to a dedicated pretty view without touching any other file type.

**Alternatives considered**:

- Keep `type: 'text'` and special-case `language === 'json'` in the content panel. Rejected because it conflates "generic text with a language hint" with "has a dedicated structural renderer," which would make future non-Markdown pretty-viewers (e.g. YAML) harder to reason about consistently.
- Detect JSON by sniffing content rather than extension. Rejected — extension-based detection is what every other type in `detectFileType` already does, and content-sniffing would add ambiguity (e.g. a `.txt` file that happens to contain JSON) outside this feature's scope.

## Decision: Parse with built-in `JSON.parse`; no new dependency for tree building or pretty-printing

**Rationale**: `JSON.parse` already gives a fully structured value; a small local function can walk that value and produce a display tree (label, type, value, children) in the same shape the Markdown front-matter parser already produces (`MetadataEntry`). This keeps the feature dependency-free, consistent with the constitution's "avoid dependency bloat" guidance, and consistent with how the 027 (Markdown YAML visualization) feature explicitly rejected adding a YAML parser dependency for the same reason.

**Alternatives considered**:

- Add a dedicated JSON-tree-view npm package (e.g. `react-json-view`, `react-json-tree`). Rejected: these packages bring their own theming, bundle size, and interaction conventions that would diverge from the product's existing hand-rolled metadata view, for a problem (recursively rendering a parsed value) the codebase already solves in `MarkdownRenderer.tsx`.
- Write a custom recursive-descent JSON parser instead of `JSON.parse`. Rejected: no correctness or error-detail benefit for this feature's needs — `JSON.parse` throwing is sufficient to detect "cannot be pretty-printed," and the raw fallback view already shows the exact text for a human to inspect.

## Decision: Model the pretty view directly on the existing Markdown metadata pattern

**Rationale**: `markdown-frontmatter.ts` + `MetadataEntryView` (in `MarkdownRenderer.tsx`) already implement exactly the shape this feature needs: a pure parser producing a tree of `{ kind, label, value, children }`-style nodes, rendered by a small recursive component with kind-based CSS classes. Reusing this shape (as a new `json-tree.ts` + `JSONViewer.tsx` rather than generalizing the Markdown-specific one) keeps each parser focused on its own file format while giving the UI a consistent visual language across both pretty views.

**Alternatives considered**:

- Generalize `MetadataEntry`/`MetadataEntryView` into a shared "structured data" model used by both Markdown front matter and JSON. Rejected for this feature: Markdown front matter is YAML-flavored (scalars mostly, shallow nesting) while JSON needs explicit array-vs-object distinction, collapsible state per node, and root-level scalar handling. Forcing a shared abstraction now would add indirection for a second use case rather than removing duplication; can be revisited later if a third structured-data view appears.

## Decision: Malformed JSON always falls back to raw view, with an inline notice

**Rationale**: The product's UX philosophy is "never show a broken or blank pane." Since `JSON.parse` either fully succeeds or throws, there's no reliable partial-structure to render for invalid JSON — falling back to the existing, always-reliable raw `CodeViewer` (which already renders any text safely) is both the simplest and the safest behavior, mirroring how Markdown's malformed-front-matter handling preserves document content rather than hiding it.

**Alternatives considered**:

- Attempt best-effort/lenient parsing of near-valid JSON (trailing commas, unquoted keys) to still show a partial tree. Rejected: adds meaningful parsing complexity and ambiguity (what to do with the unparseable remainder) for a case the spec explicitly scopes as "raw view is an acceptable, expected fallback," not an error state.

## Decision: Collapse/expand state is per-render, not persisted

**Rationale**: Neither Markdown rendering nor any other file view in the product persists UI-only interaction state (e.g. scroll position, expanded headings) across file switches or reloads today. Keeping collapse/expand as local component state (default: expanded, or collapsed past a depth/size threshold — see data-model.md) matches existing behavior and avoids introducing new persisted state surfaces.

**Alternatives considered**:

- Persist expand/collapse per path in `viewerState.ts` (the existing app-wide viewer preferences store). Rejected as unnecessary scope for this feature; no equivalent precedent exists for Markdown, and it can be added later if users ask for it.

## Decision: Editing remains raw-text editing via the existing `InlineFileEditor`; validity is a soft warning, not a hard block

**Rationale**: The spec (FR-006) and the product's broader editing philosophy (raw markup editing, not WYSIWYG, per Constitution Principle V) both point to reusing `handleSaveEdit` in `ContentPanel.tsx` unchanged except for one addition: before calling `api.updateFile`, if `data.type === 'json'` and `JSON.parse(draftContent)` throws, ask for confirmation via the same `window.confirm` pattern already used by `confirmDiscardIfNeeded`, rather than blocking the save outright. The file is still plain text on disk; GitLocal must not prevent a user from saving intentionally-non-JSON content (e.g. mid-edit, or deliberately renaming to `.json` for an unrelated reason).

**Alternatives considered**:

- Hard-block saving invalid JSON. Rejected: contradicts the "raw file editing, not IDE validation" philosophy and could trap a user who has a legitimate reason to save non-JSON content to a `.json`-named file.
- Silently allow saving invalid JSON with no warning at all. Rejected: the spec (FR-006) explicitly requires a warning, since silently saving broken JSON would surprise a user who intended to keep the file parseable.

## Decision: Verify through parser tests, renderer tests, dispatch tests, and representative samples

**Rationale**: The risky behavior is (a) correct classification/dispatch by file type, (b) correct tree construction across JSON's value types and nesting, and (c) graceful fallback for malformed/empty content. Tests should cover: empty file, root object, root array, root scalar (string/number/boolean/null), deep nesting, large arrays, malformed JSON, and the raw/pretty toggle and edit-save-warning interactions in `ContentPanel`.

**Alternatives considered**:

- Only snapshot the rendered DOM. Rejected because parser-level classification tests make malformed/edge-case handling far easier to pinpoint than DOM snapshots alone, consistent with how `markdown-frontmatter.test.ts` is structured today.
