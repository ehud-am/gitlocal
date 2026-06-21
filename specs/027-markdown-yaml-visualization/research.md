# Research: Markdown YAML Visualization

## Decision: Split recognized start-of-file front matter before Markdown rendering

**Rationale**: The current failure mode happens because YAML delimiters and metadata are passed to the Markdown renderer as body content. Splitting a bounded front matter section before rendering lets the body continue using the existing Markdown pipeline while ensuring metadata is not interpreted as emphasis, headings, or prose.

**Alternatives considered**:

- Leave front matter inside Markdown and restyle the resulting nodes. Rejected because the Markdown parser has already lost the front matter boundary and can produce misleading body markup.
- Treat every leading delimiter as metadata. Rejected because ordinary Markdown can start with a horizontal rule.
- Require users to switch to source view for skill files. Rejected because the product optimizes for Markdown reading.

## Decision: Recognize only bounded front matter at the beginning of the file

**Rationale**: The spec requires ordinary Markdown to continue rendering normally. Limiting recognition to an opening delimiter at the first line and a later closing delimiter before body content avoids changing horizontal rules, code fences, or delimiter-like text that appears after normal content begins.

**Alternatives considered**:

- Search the whole file for delimiter pairs. Rejected because it could misclassify code examples or embedded YAML snippets.
- Detect YAML based on field-like lines without delimiters. Rejected because it would create false positives in ordinary prose and lists.

## Decision: Use a lightweight metadata view model, with graceful fallback for malformed content

**Rationale**: Representative skill front matter mostly uses simple keys, strings, booleans, arrays, and nested maps. A local helper can produce a display model for those cases and fall back to preformatted metadata text when content is incomplete or too ambiguous, without changing file content or adding a dependency.

**Alternatives considered**:

- Add a full YAML parser dependency. Rejected for initial implementation because the UI only needs readable presentation, not full YAML execution semantics, and the constitution discourages dependency bloat without clear need.
- Display front matter only as a plain code block. Rejected as the sole experience because the requested improvement asks for a better visualization and the spec requires readable field names, values, and nested structure.

## Decision: Keep raw source, copy/share source, and navigation behavior unchanged

**Rationale**: The source text remains the authority for exact file contents. Existing copy/share/source workflows should not silently remove metadata unless a future product requirement explicitly asks for rendered-body-only exports.

**Alternatives considered**:

- Strip front matter from copy and share outputs. Rejected because this feature is about rendering clarity, not changing document export semantics.
- Persist a parsed metadata cache. Rejected because front matter is cheap to derive from the already loaded file content.

## Decision: Verify through helper tests, renderer tests, and representative samples

**Rationale**: The risky behavior is classification and rendering boundaries. Tests should cover valid skill-like front matter, nested metadata, arrays, empty metadata, incomplete delimiters, malformed metadata, ordinary Markdown with horizontal rules, and delimiter-like text in code fences.

**Alternatives considered**:

- Only snapshot the rendered DOM. Rejected because helper-level classification tests make false-positive and false-negative cases easier to diagnose.
