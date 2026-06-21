# Feature Specification: Markdown YAML Visualization

**Feature Branch**: `027-markdown-yaml-visualization`  
**Created**: 2026-06-21  
**Status**: Draft  
**Input**: User description: "when presenting an md file that includes yaml front matter, for example a skill file, handle the mix of yaml and markdown properly instead of rendering the yaml block as bold text; build a better visualization for it"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read Markdown Files With Front Matter Clearly (Priority: P1)

As a GitLocal user reading a Markdown file that begins with YAML front matter, I want the metadata to appear as a separate, understandable part of the document so the main Markdown content is not visually distorted.

**Why this priority**: This fixes the current broken reading experience where metadata can appear as a large bold text block and obscure the useful document content.

**Independent Test**: Can be fully tested by opening a Markdown skill file with front matter and confirming that the metadata is visually separated from the rendered Markdown body.

**Acceptance Scenarios**:

1. **Given** a Markdown file that begins with valid front matter, **When** the user opens the file in the rendered viewer, **Then** the metadata appears in a distinct structured area before the rendered Markdown body.
2. **Given** a Markdown file that begins with valid front matter, **When** the rendered view appears, **Then** the Markdown body starts after the metadata and normal headings, lists, emphasis, and code blocks render according to the document content rather than the metadata delimiter.
3. **Given** a Markdown skill file with fields such as name, description, compatibility, and nested metadata, **When** the user opens the file, **Then** those fields are readable without being shown as one large bold paragraph.

---

### User Story 2 - Inspect Metadata Without Losing Raw Meaning (Priority: P2)

As a user inspecting a file with front matter, I want the metadata display to preserve field names, values, and nested structure so I can understand what the file declares.

**Why this priority**: Skill and configuration-adjacent Markdown files often use front matter as meaningful file data, so hiding or flattening it would reduce usefulness.

**Independent Test**: Can be tested by opening Markdown files with flat and nested front matter and verifying that field labels, values, and grouping remain understandable.

**Acceptance Scenarios**:

1. **Given** front matter with nested fields, **When** the file is rendered, **Then** the nested relationship is visible and not collapsed into an ambiguous sentence.
2. **Given** front matter containing quoted strings, arrays, numbers, or booleans, **When** the file is rendered, **Then** each value remains distinguishable and readable.
3. **Given** a user switches to a source-oriented file view, **When** they inspect the same file, **Then** the original text remains available unchanged.

---

### User Story 3 - Handle Non-Front-Matter Markdown Normally (Priority: P3)

As a user opening ordinary Markdown files, I want files without front matter to continue rendering exactly as Markdown documents without extra visual treatment.

**Why this priority**: The improvement should solve the mixed metadata-and-Markdown case without changing the expected behavior for normal Markdown reading.

**Independent Test**: Can be tested by opening Markdown files with no front matter, horizontal rules near the top, and code fences containing delimiter-like text.

**Acceptance Scenarios**:

1. **Given** a Markdown file without front matter, **When** the user opens the rendered viewer, **Then** no metadata panel or special front matter treatment appears.
2. **Given** a Markdown file starts with a normal heading or paragraph before any delimiter-like line, **When** it renders, **Then** the content is treated as ordinary Markdown.
3. **Given** delimiter-like text appears inside a code block, **When** the file renders, **Then** it remains part of the code block rather than becoming metadata.

### Edge Cases

- A file contains an opening front matter delimiter but no closing delimiter.
- A file has a horizontal rule at the top that is not intended to be metadata.
- A file has empty front matter followed by Markdown content.
- A file has malformed front matter content.
- A file has very large front matter relative to the document body.
- A file contains front matter with nested objects, lists, quoted values, booleans, numbers, and empty values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST recognize front matter only when it appears at the start of a Markdown file and is bounded by explicit opening and closing delimiters before the Markdown body begins.
- **FR-002**: The system MUST render recognized front matter separately from the Markdown body so metadata cannot be interpreted as Markdown emphasis or body prose.
- **FR-003**: The metadata visualization MUST make field names and field values separately readable.
- **FR-004**: The metadata visualization MUST preserve understandable grouping for nested metadata and list values.
- **FR-005**: The rendered Markdown body MUST begin after the recognized front matter and MUST preserve normal Markdown rendering behavior for the remaining content.
- **FR-006**: Users MUST retain access to the original source text for files with front matter.
- **FR-007**: The system MUST avoid showing a metadata visualization for Markdown files that do not contain recognized front matter at the start of the file.
- **FR-008**: The system MUST handle malformed or incomplete front matter without hiding document content or presenting the entire file as broken formatted text.
- **FR-009**: The metadata visualization MUST remain readable in narrow and wide viewer layouts without text overlapping adjacent controls or document content.
- **FR-010**: The feature MUST preserve existing file navigation, copy, share, search, and source viewing workflows for Markdown files.

### Key Entities

- **Markdown Document**: A repository file selected for reading, containing optional metadata at the top and Markdown body content after it.
- **Front Matter Metadata**: A bounded metadata section at the start of a Markdown document, containing fields, values, and optional nested groups.
- **Markdown Body**: The main document content that follows any recognized front matter and is rendered for reading.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability checks with representative skill files, 100% of recognized front matter sections appear visually separate from the Markdown body.
- **SC-002**: Users can identify the start of the main Markdown body in under 5 seconds when opening a file with front matter.
- **SC-003**: At least 95% of metadata fields in representative flat and nested front matter samples are readable without switching to source view.
- **SC-004**: Ordinary Markdown files without front matter show no new metadata visualization in 100% of regression samples.
- **SC-005**: Files with malformed or incomplete front matter remain readable, with no loss of visible document content, in 100% of regression samples.

## Assumptions

- The improvement applies to Markdown-rendered file views and does not introduce a new full editor workflow.
- Front matter is considered only when it is at the very beginning of a Markdown file.
- Source viewing remains the authority for exact file contents when users need byte-for-byte inspection.
- Skill files are representative examples, but the behavior should apply to any Markdown file with similar front matter.
- The visualization should improve readability without requiring users to understand metadata syntax.
