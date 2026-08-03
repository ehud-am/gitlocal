# Quickstart: JSON Document Viewer

## Implementation Targets

1. Extend `detectFileType` in `src/git/repo.ts` so `.json` files resolve to content type `json` (with `language: 'json'`) instead of generic `text`.
2. Add `'json'` to the `FileContentType` union in `ui/src/types/index.ts`.
3. Add `json-tree.ts`: a pure function that parses raw JSON text into a `Parsed JSON Tree Node` structure, or reports a parse failure, without any new dependency.
4. Add `JSONViewer.tsx`: a recursive, collapsible component rendering the parsed tree, modeled on `MetadataEntryView` in `MarkdownRenderer.tsx`.
5. Update `ContentPanel.tsx`: dispatch to `JSONViewer` for `type === 'json'` and `!showRaw`; extend `canToggleRaw` to include `json`; fall back to raw view with an inline parse notice when parsing fails; add a non-blocking JSON-validity warning in `handleSaveEdit` for JSON files.
6. Add `json-tree-*` styles to `ui/src/styles/globals.css`, modeled on the existing `markdown-metadata-*` styles.
7. Preserve all existing Markdown, text, image, and binary file behavior unchanged.

## Focused Verification

Run the targeted UI tests while implementing:

```sh
npm --prefix ui run test -- json-tree JSONViewer ContentPanel
```

Run the server-side test for file-type detection:

```sh
npm test -- repo.test
```

Run the UI coverage suite before handing off implementation:

```sh
npm --prefix ui run test:ci
```

Run the full project checks if the implementation touches shared helpers or build configuration:

```sh
npm test
npm run lint
npm run build
```

## Manual Smoke Samples

Use representative `.json` content with:

- A `package.json`-style object with nested fields and arrays.
- A root-level array of objects.
- A root-level bare scalar (`42`, `"hello"`, `true`, `null`).
- An empty file (zero bytes).
- Malformed JSON (trailing comma, unquoted key, truncated content).
- A deeply nested object (5+ levels) and a large array (100+ items).
- Editing a valid JSON file, saving valid changes, and confirming the pretty view updates.
- Editing a JSON file into invalid JSON and confirming the warning appears before save completes.

Expected result: well-formed JSON renders as a pretty, collapsible tree by default; the raw toggle always shows the exact file text with JSON highlighting; malformed or empty JSON falls back to raw view with a brief inline notice; editing and saving behave exactly as they do for other text files, with a soft warning only when saved content isn't valid JSON; no other file type's behavior changes.
