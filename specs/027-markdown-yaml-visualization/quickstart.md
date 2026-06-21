# Quickstart: Markdown YAML Visualization

## Implementation Targets

1. Add front matter detection and metadata view model coverage near the Markdown content panel.
2. Update `MarkdownRenderer` so recognized front matter renders before the Markdown body and the body alone flows through the existing Markdown renderer.
3. Add styles for the metadata visualization in the existing UI stylesheet.
4. Preserve source, copy, share, find, image, link, heading, and code block behavior.

## Focused Verification

Run the targeted UI tests while implementing:

```sh
npm --prefix ui run test -- MarkdownRenderer markdown-frontmatter markdown-output
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

Use representative Markdown content with:

- A skill-style front matter block followed by headings and lists.
- Nested `metadata` fields.
- Arrays and boolean values.
- Empty bounded front matter.
- An opening delimiter with no closing delimiter.
- A Markdown file that starts with a horizontal rule but is not front matter.
- A code fence containing delimiter-like lines.

Expected result: valid front matter is readable as metadata, the Markdown body starts clearly after it, malformed cases remain readable, and ordinary Markdown is unchanged.
