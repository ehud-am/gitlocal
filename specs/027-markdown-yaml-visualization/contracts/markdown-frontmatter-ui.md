# UI Contract: Markdown Front Matter Visualization

## Scope

This contract defines the user-visible behavior for rendered Markdown files that may contain YAML front matter. It applies to the content panel rendered Markdown view in both GitLocal distributions because both use the same UI.

## Recognized Front Matter

Given a Markdown file whose first line is a front matter opening delimiter and that has a later closing delimiter before the Markdown body, the rendered Markdown view must:

- Show one metadata visualization before the Markdown body.
- Keep metadata visually distinct from prose, headings, lists, and code blocks.
- Show field labels and field values as separate readable text.
- Preserve nested grouping and list order where present.
- Render the Markdown body from the content after the closing delimiter.
- Keep relative links, images, heading anchors, find highlighting, code copy buttons, and Markdown body formatting working as they do for ordinary Markdown.

## Ordinary Markdown

Given a Markdown file without recognized front matter, the rendered Markdown view must:

- Show no metadata visualization.
- Render the file as ordinary Markdown.
- Treat top-level horizontal rules, code fences, and delimiter-like text after body content as normal Markdown content.

## Malformed Or Incomplete Metadata

Given a Markdown file with malformed or incomplete leading metadata, the rendered Markdown view must:

- Avoid hiding document content.
- Avoid rendering the whole file as a single broken bold or emphasized text block.
- Provide a readable fallback for the metadata-like content when a bounded metadata section can be identified but not structured.
- Preserve source view access to the original text.

## Source, Copy, And Share Behavior

The original file content remains authoritative. Source-oriented actions must continue to expose the original Markdown text, including front matter, unless a future requirement explicitly changes export semantics.

## Accessibility And Layout

The metadata visualization must:

- Have an accessible name or visible label that identifies it as document metadata.
- Be keyboard and screen-reader readable as normal document content.
- Avoid text overlap at narrow and wide viewer widths.
- Use stable spacing so the beginning of the Markdown body is easy to identify.

## Regression Samples

Implementation must include automated coverage for:

- Skill-like front matter with `name`, `description`, `compatibility`, and nested `metadata`.
- Front matter with arrays, booleans, numbers, quoted strings, and empty values.
- Empty front matter followed by Markdown body content.
- Opening delimiter without a closing delimiter.
- Malformed bounded metadata.
- Markdown beginning with a horizontal rule that is not front matter.
- Delimiter-like text inside a fenced code block.
