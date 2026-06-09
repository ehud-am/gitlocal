# Feature Specification: README Logo and Markdown Toolbar Polish

**Feature Branch**: `024-fix-share-toolbar`  
**Created**: 2026-06-09  
**Status**: Draft  
**Input**: User description: "1. check why the logo in the readme is no longer showing - regression. 2. let's optimize the real estate. the new sharing options should be on the same line as the find in file. This wil remove the need for a dedicated line for the sharing options. we also do not need 'Sharing uses the saved Markdown content.' It just adds clutter to the page. The buttons and clear enough as is"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the README Logo (Priority: P1)

A visitor reading the project README sees the GitLocal logo at the top of the document instead of a broken or missing image.

**Why this priority**: The README is the first public product surface for many users. A missing logo makes the project feel less polished and signals a regression in the published documentation.

**Independent Test**: Can be fully tested by viewing the README in the primary hosted repository view and confirming the logo renders above the badges.

**Acceptance Scenarios**:

1. **Given** a user opens the project README in the hosted repository view, **When** the document loads, **Then** the GitLocal logo is visible at the top of the README.
2. **Given** a user opens the project README from a checked-out copy of the repository, **When** the document is rendered locally, **Then** the logo path resolves to an image included in the repository.

---

### User Story 2 - Use Markdown Share Actions Without Extra Toolbar Height (Priority: P2)

A user reading a rendered Markdown file can access share actions from the same toolbar row as file-level find, without losing vertical reading space to a separate sharing row.

**Why this priority**: Markdown reading is a core GitLocal workflow. The new sharing controls are useful, but they should not make the document area feel crowded or reduce reading space unnecessarily.

**Independent Test**: Can be fully tested by opening a Markdown file that supports sharing and confirming find and share actions are available on one row without a dedicated sharing row.

**Acceptance Scenarios**:

1. **Given** a user opens a rendered Markdown file, **When** the Markdown toolbar is shown, **Then** the share actions appear on the same horizontal row as the file-level find control.
2. **Given** a user opens a rendered Markdown file, **When** the toolbar is shown, **Then** there is no separate row dedicated only to sharing actions.
3. **Given** a user uses file-level find or a share action, **When** either control is activated, **Then** the expected action remains discoverable and usable from the shared toolbar row.

---

### User Story 3 - Remove Redundant Sharing Help Text (Priority: P3)

A user reading a rendered Markdown file sees the share action buttons without the extra sentence "Sharing uses the saved Markdown content."

**Why this priority**: The sentence adds visual clutter without helping users complete the task. Removing it makes the page quieter while preserving the sharing functionality.

**Independent Test**: Can be fully tested by opening a Markdown file with sharing controls and confirming the redundant sentence is absent while the buttons remain visible and understandable.

**Acceptance Scenarios**:

1. **Given** a user opens a rendered Markdown file, **When** the share controls are visible, **Then** the sentence "Sharing uses the saved Markdown content." is not displayed.
2. **Given** the explanatory sentence is removed, **When** a user scans the toolbar, **Then** the available share actions are still identifiable from their button labels or accessible names.

### Edge Cases

- The README logo should render in the hosted repository view and from local repository renderers, even if one environment handles relative image paths differently.
- The shared Markdown toolbar should remain usable when the window is narrow or when there are multiple sharing actions available.
- Removing the sharing sentence must not remove necessary accessible names or tooltips for icon-only controls.
- The toolbar should not wrap in a way that hides file-level find or primary share actions at common desktop widths.
- Non-Markdown file views should not gain irrelevant share controls or lose their existing find behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project README MUST reference a logo image that renders correctly in the hosted repository view.
- **FR-002**: The README logo reference MUST also work when the repository is viewed locally from a checked-out copy.
- **FR-003**: Rendered Markdown views MUST present file-level find and Markdown share actions in a single toolbar row when there is enough horizontal space for the controls.
- **FR-004**: Rendered Markdown views MUST NOT display a separate toolbar row dedicated only to share actions.
- **FR-005**: Rendered Markdown views MUST NOT display the sentence "Sharing uses the saved Markdown content."
- **FR-006**: Share actions MUST remain visible, identifiable, and operable after being moved into the same row as file-level find.
- **FR-007**: File-level find MUST remain visible, identifiable, and operable after the share actions move into its row.
- **FR-008**: The combined toolbar MUST handle constrained widths without overlapping controls, clipping button text, or obscuring the Markdown content.
- **FR-009**: Existing share action outcomes, including print, PDF-through-print, local email or system share flows, copy, and download fallbacks, MUST continue to be available where they were available before this polish.
- **FR-010**: Existing non-Markdown file views MUST preserve their current find and content viewing behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the hosted repository README view, the GitLocal logo renders successfully on first load in 100% of supported README render checks.
- **SC-002**: In local repository viewing, the GitLocal logo renders successfully in 100% of supported local README render checks.
- **SC-003**: Rendered Markdown files show find and share controls on one toolbar row at common desktop widths, eliminating the previous dedicated sharing row.
- **SC-004**: The sentence "Sharing uses the saved Markdown content." appears zero times in the rendered Markdown viewer.
- **SC-005**: Users can still complete each available share action and file-level find task after the layout change with no additional steps compared with the previous layout.
- **SC-006**: At common desktop and narrow-window widths, toolbar controls remain readable or accessible without visual overlap in supported Markdown viewer checks.

## Assumptions

- The intended README logo is the existing GitLocal logo asset already stored in the repository.
- The README should work in the primary hosted repository renderer and in local repository views without depending on generated build output.
- This feature is limited to documentation logo restoration and Markdown viewer toolbar real-estate cleanup.
- The sharing feature set itself is not changing; only placement and redundant explanatory copy are in scope.
- If space is constrained, controls may wrap or collapse only if all actions remain accessible and the layout stays visually clean.
