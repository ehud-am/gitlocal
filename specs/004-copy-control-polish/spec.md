# Feature Specification: Copy Control Polish

**Feature Branch**: `004-copy-control-polish`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "The experience of the copy code and copy raw file were not good. Let's change that. First, instead of a button with the word copy, use a standard copy icon like in the attached image. Second, when rendering markdown, the copy icon should be available only for code blocks, not for each block."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy From Markdown Naturally (Priority: P1)

When a user reads rendered markdown that includes code samples, they can immediately recognize and use a standard copy icon on each code block without seeing copy controls on non-code content.

**Why this priority**: The markdown view currently creates noise by showing copy affordances too broadly. Restricting the control to code blocks makes copying faster and the reading experience cleaner.

**Independent Test**: Open a markdown file that contains headings, paragraphs, lists, quotes, and multiple code blocks. Confirm that only code blocks display the copy icon and that activating it copies only the selected code block's content.

**Acceptance Scenarios**:

1. **Given** a rendered markdown document contains a code block, **When** the code block is shown to the user, **Then** a standard copy icon is visible for that code block.
2. **Given** a rendered markdown document contains non-code elements such as paragraphs, headings, lists, or quotes, **When** those elements are shown, **Then** no copy icon is displayed for those non-code elements.
3. **Given** a markdown document contains multiple code blocks, **When** the user activates the copy icon on one code block, **Then** only the content of that selected code block is copied.

---

### User Story 2 - Copy Raw Files With A Familiar Control (Priority: P1)

When a user is viewing a raw file, they can copy the full file content by using the same standard copy icon style instead of a text-labeled button.

**Why this priority**: The raw-file copy action is still valuable, but the control should feel lighter and more visually consistent with the markdown code copy action.

**Independent Test**: Open a file in raw view, verify that the full-file copy action uses a standard copy icon, and confirm that activating it copies the entire visible raw file content.

**Acceptance Scenarios**:

1. **Given** the user is viewing a file in raw mode, **When** the file content panel is displayed, **Then** the full-file copy action is presented as a standard copy icon rather than a text button.
2. **Given** the user activates the raw-file copy icon, **When** the copy completes, **Then** the clipboard content matches the entire raw file content currently shown.

### Edge Cases

- A markdown document contains no code blocks, and no copy icon should appear anywhere in the rendered markdown body.
- A markdown document contains several code blocks close together, and each icon must remain clearly associated with only its own code block.
- A raw file is empty, and the copy icon must still behave predictably without copying stale content from a previous action.
- A user switches between rendered markdown and raw view for the same file, and each mode must show only the copy affordance appropriate to that mode.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace the text-labeled copy control with a standard copy icon for markdown code-block copy actions.
- **FR-002**: The system MUST replace the text-labeled copy control with a standard copy icon for raw-file copy actions.
- **FR-003**: In rendered markdown, the system MUST display copy controls only for code blocks.
- **FR-004**: In rendered markdown, the system MUST NOT display copy controls for non-code content blocks such as paragraphs, headings, lists, block quotes, or tables.
- **FR-005**: Activating a markdown copy icon MUST copy only the content of the associated code block.
- **FR-006**: Activating a raw-file copy icon MUST copy the entire raw file content currently displayed.
- **FR-007**: The icon-based copy controls for markdown code blocks and raw-file views MUST remain visually consistent enough that users can recognize them as the same action.

### Key Entities *(include if feature involves data)*

- **Copy Control**: A visible icon-based action that initiates clipboard copying for a specific content target.
- **Markdown Code Block**: A rendered code segment within markdown content that is eligible to show a copy control.
- **Raw File View**: The plain-text file presentation that allows the user to copy the entire file as displayed.
- **Copy Target**: The exact content scope associated with a copy action, either one markdown code block or the full raw file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of rendered markdown code blocks show a copy icon, and 0% of non-code markdown blocks show a copy icon.
- **SC-002**: In validation testing, 100% of markdown copy actions place only the selected code block content on the clipboard on the first attempt.
- **SC-003**: In validation testing, 100% of raw-file copy actions use the icon-based control and place the full visible raw file content on the clipboard on the first attempt.
- **SC-004**: In usability review, test participants can identify the copy action in both markdown code blocks and raw-file view without relying on a text label.

## Assumptions

- The requested standard copy icon can follow the product's existing visual style as long as it is recognizable as a copy action.
- This refinement changes the presentation and placement rules of existing copy actions rather than introducing new copy destinations.
- The copy icon for markdown is scoped to rendered code blocks only and does not apply to other rendered markdown elements.
- The existing raw-file copy capability remains in place, with only its control style updated from text to icon.
