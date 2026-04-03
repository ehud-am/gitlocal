# Feature Specification: Accurate Version Display and Code Line Numbers

**Feature Branch**: `005-version-line-numbers`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "let's implement few fixes: 1. the vrstion number always shows v0.0.0., let's change that to show the actual version number of this release. I assume it should be taken from the package.json doc. But plese whatever effective way to do this. 2. when presenting code, please include line numbering on the left"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Show the Real Running Version (Priority: P1)

When a user looks at the footer, they can trust that the displayed product version matches the actual release that is running instead of a placeholder value.

**Why this priority**: The version string is part of product identity and support workflows. Showing the wrong value makes release verification and troubleshooting harder immediately.

**Independent Test**: Open the application in any supported screen and confirm the footer version matches the current release version that the app is running.

**Acceptance Scenarios**:

1. **Given** the application is running a released build, **When** the footer is shown, **Then** it displays the actual running version instead of `v0.0.0`.
2. **Given** the running application version changes in a future release, **When** the next build is started, **Then** the footer reflects that updated version without requiring a manual footer text edit.
3. **Given** the footer is shown in either repository view or picker view, **When** the page loads, **Then** the same accurate version string is shown consistently across both screens.

---

### User Story 2 - Read Code With Line Numbers (Priority: P2)

When a user reads source code or raw code-like content in GitLocal, they can see line numbers on the left so it is easier to discuss, review, and reference exact lines.

**Why this priority**: Line numbers make repository reading and collaboration much easier, but users can still browse files without them, so this is valuable but secondary to fixing the incorrect version display.

**Independent Test**: Open a code file and a raw code presentation, then confirm visible line numbers appear alongside the content and remain aligned with the displayed lines.

**Acceptance Scenarios**:

1. **Given** the user opens a code file in the viewer, **When** the content is rendered, **Then** line numbers are shown in a left-side gutter.
2. **Given** the user opens a file in raw code presentation, **When** the content is shown, **Then** line numbers are displayed alongside the visible lines there as well.
3. **Given** a file contains many lines or wraps within the code surface, **When** the user scrolls or reads the file, **Then** the line numbering remains visually associated with the correct content lines.
4. **Given** a file is not rendered as code-like text, **When** the user views that content, **Then** GitLocal does not introduce irrelevant line-number chrome where it would not improve readability.

### Edge Cases

- The application starts from a packaged or built artifact, and the displayed footer version must still match that running build instead of falling back to a placeholder.
- A code file has only one line, many lines, or trailing blank lines, and the visible numbering must still remain accurate for the displayed content.
- A code view is horizontally or vertically scrolled, and the line-number gutter must remain readable and aligned with the code.
- Markdown pages that include fenced code blocks should keep those code blocks easy to read if line numbering is applied there, while non-code markdown content remains unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the actual running application version in the footer instead of a placeholder version string.
- **FR-002**: The displayed footer version MUST stay consistent across repository-view and picker-view screens within the same running build.
- **FR-003**: Updating the product version for a future release MUST cause the footer to display that new version without requiring a separate manual footer-text change.
- **FR-004**: The system MUST show line numbers in the left gutter when presenting code-oriented file content to the user.
- **FR-005**: The system MUST show line numbers when a file is presented in raw code view.
- **FR-006**: Line numbers MUST remain visually aligned with the displayed code lines as the user reads or scrolls through the content.
- **FR-007**: The system MUST avoid adding line-number UI to content presentations where the content is not being shown as code-like text.

### Key Entities *(include if feature involves data)*

- **Running Application Version**: The release identifier for the currently running build, shown to the user in the footer for support and verification.
- **Code Presentation**: Any viewer state where file content is shown as code-like text, including syntax-highlighted files and raw code-oriented views.
- **Line Number Gutter**: The left-side visual column that labels the displayed code lines in sequence for easier reading and reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of tested screens show the same version string as the actual running release instead of `v0.0.0`.
- **SC-002**: In release verification, updating the application version once results in the footer showing the new version without any additional manual footer-text change.
- **SC-003**: In code-view validation, 100% of tested code-oriented file presentations show visible line numbers for displayed lines.
- **SC-004**: In usability review, users can identify and reference a target line in an opened code file without counting lines manually.

## Assumptions

- The currently running release version is already available somewhere in the build or runtime metadata and can be surfaced to the UI without introducing a new external dependency.
- Line numbers are intended for code-oriented content surfaces and do not need to be forced onto images or other non-text presentations.
- Existing copy, raw-view, and markdown rendering behaviors should stay intact aside from the added version accuracy and line-number readability improvements.
