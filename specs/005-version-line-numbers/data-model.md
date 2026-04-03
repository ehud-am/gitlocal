# Data Model: Accurate Version Display and Code Line Numbers

## Running Application Version

- **Description**: The release identifier for the currently running GitLocal build.
- **Fields**:
  - `version`: User-visible semantic version string exposed to the UI.
- **Validation rules**:
  - Must not fall back to `0.0.0` when valid runtime metadata is available.
  - Must be shown consistently across picker and repository screens within the same run.
- **Relationships**:
  - Originates from application package metadata.
  - Flows through the existing repository info payload to the footer UI.

## Code Presentation

- **Description**: A viewer state where file content is rendered as code-like text.
- **Fields**:
  - `content`: Displayed text content for the file.
  - `language`: Optional syntax or formatting context for highlighted rendering.
  - `mode`: Rendered or raw code-oriented presentation.
- **Validation rules**:
  - Must preserve existing code content fidelity.
  - Must remain eligible for existing copy behavior without embedding line numbers into copied text.
- **Relationships**:
  - Rendered by existing content-panel components.
  - Paired with a line number gutter for code-oriented views only.

## Line Number Gutter

- **Description**: The left-side numbering column associated with a code presentation.
- **Fields**:
  - `startLine`: First visible line number, expected to begin at 1 for opened file content.
  - `lineCount`: Number of numbered lines corresponding to displayed code lines.
- **Validation rules**:
  - Must stay aligned with the displayed code lines.
  - Must not appear for non-code presentations.
- **Relationships**:
  - Derived from the displayed code content.
  - Rendered alongside code-oriented file content in the viewer.
