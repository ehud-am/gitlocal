# Feature Specification: Markdown Share Actions

**Feature Branch**: `022-markdown-share-actions`  
**Created**: 2026-06-07  
**Status**: Draft  
**Input**: User description: "let's add more capabilities: a top right button to refresh the page; cmd-undo and cmd-redo when editing a page; markdown becomes super important, add a markdown-specific way to print rendered content and options to share markdown content via email, Slack, save as PDF, and other share options as the main enhancement for this release; develop the experience and discuss options"

## Clarifications

### Session 2026-06-07

- Q: What should GitLocal open when no folder is explicitly specified at startup? -> A: Reopen the last used folder if it still exists; otherwise use the platform Documents folder by default, falling back to the user's home folder if no Documents location is available.
- Q: What should Command-A collect or select? -> A: Command-A selects all content in the currently viewed content panel only, not the entire GitLocal web page or app chrome.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Share Rendered Markdown (Priority: P1)

As a GitLocal user reading an important Markdown file, I want clear Markdown-specific actions for printing, saving, and sharing the rendered content, so I can send polished project notes, specs, documentation, and review material without manually copying raw Markdown into another tool.

**Why this priority**: Markdown reading and review are central to GitLocal's product direction, and this is the main enhancement for the release.

**Independent Test**: Can be fully tested by opening a Markdown file, using the Markdown action area to print rendered content, save it as a PDF, share it by email, and share it to Slack or another available destination.

**Acceptance Scenarios**:

1. **Given** a Markdown file is open in rendered preview, **When** the user chooses Print, **Then** the print preview uses the rendered content rather than the raw Markdown text.
2. **Given** a Markdown file is open in rendered preview, **When** the user chooses Save as PDF, **Then** the user can create a PDF that preserves readable headings, lists, tables, code blocks, links, and document title context.
3. **Given** a Markdown file is open in rendered preview, **When** the user chooses Email, **Then** a share flow opens with the rendered document title and content or attachment prepared for sending.
4. **Given** a Markdown file is open in rendered preview, **When** the user chooses Slack or Other Share Options, **Then** the user can share the rendered content or a shareable artifact through an available destination without losing the current GitLocal context.
5. **Given** the user is viewing a non-Markdown file, **When** they look for Markdown share actions, **Then** Markdown-specific actions are hidden, disabled with clear reason, or replaced by general file actions as appropriate.

---

### User Story 2 - Refresh Current Page from a Prominent Action (Priority: P2)

As a GitLocal user browsing a repository, I want a specific refresh button in the top-right area, so I can reload the current page after file or git changes happen outside the app.

**Why this priority**: Refresh is a frequent local repository workflow and should be discoverable without relying on browser or native shortcuts.

**Independent Test**: Can be fully tested by opening a repository page, changing a file outside GitLocal, selecting the top-right refresh button, and confirming the current view reflects the latest local state.

**Acceptance Scenarios**:

1. **Given** the user is viewing repository content, **When** they select the top-right Refresh button, **Then** the current page reloads from the latest local repository and filesystem state.
2. **Given** the current file still exists after refresh, **When** refresh completes, **Then** GitLocal keeps the user on the same file and view mode when possible.
3. **Given** the current file no longer exists after refresh, **When** refresh completes, **Then** GitLocal shows an appropriate available state without a stale preview or crash.
4. **Given** refresh is already in progress, **When** the user requests refresh again, **Then** the app avoids duplicate confusing reload states and ends in one coherent refreshed view.

---

### User Story 3 - Undo and Redo Markdown Edits (Priority: P2)

As a GitLocal user making lightweight edits to a page, I want Command-Z and Command-Shift-Z or Command-Y to undo and redo edits, so I can recover from mistakes with normal editor muscle memory.

**Why this priority**: Lightweight human intervention is part of GitLocal's core workflow, and editing without dependable undo/redo feels risky.

**Independent Test**: Can be fully tested by editing a file, applying multiple changes, using undo and redo commands, and confirming the edited content moves through the expected history without saving unintended changes.

**Acceptance Scenarios**:

1. **Given** an editable file has unsaved changes, **When** the user presses Command-Z, **Then** the most recent edit is undone within the editor.
2. **Given** the user has undone one or more edits, **When** the user presses Command-Shift-Z or Command-Y, **Then** the next undone edit is reapplied within the editor.
3. **Given** there is no available undo or redo action, **When** the user invokes the command, **Then** content remains unchanged and the app does not show a disruptive error.
4. **Given** the user switches between preview and edit modes for the same file, **When** edit history is still relevant, **Then** undo and redo behavior remains predictable and does not affect unrelated files.
5. **Given** the user is viewing a file, folder README, rendered Markdown preview, raw text preview, or editable draft in the content panel, **When** the user presses Command-A or the platform equivalent select-all command, **Then** GitLocal selects or collects all content in that currently viewed content panel without selecting the full application shell, sidebar, header, or unrelated controls.

---

### User Story 4 - Start in the Right Folder (Priority: P3)

As a GitLocal user launching the app without specifying a folder, I want GitLocal to reopen where I last worked when possible and otherwise start from a familiar documents location, so I can resume browsing quickly without repeatedly navigating from an irrelevant system path.

**Why this priority**: Startup location improves daily ergonomics and cross-platform polish, but it does not block the primary Markdown share and editing workflows.

**Independent Test**: Can be fully tested by launching GitLocal with no explicit folder, confirming the default folder on first launch, selecting a different folder, relaunching with no explicit folder, and confirming the last used folder reopens when it still exists.

**Acceptance Scenarios**:

1. **Given** the user launches GitLocal with no explicit folder and no remembered folder exists, **When** the startup view opens on macOS, **Then** GitLocal starts from the user's Documents folder if it exists.
2. **Given** the user launches GitLocal with no explicit folder and no remembered folder exists, **When** the startup view opens on Windows, **Then** GitLocal starts from the user's Documents folder if it exists.
3. **Given** the user launches GitLocal with no explicit folder and no remembered folder exists, **When** the startup view opens on Linux, **Then** GitLocal starts from the user's configured Documents folder if available, otherwise from `~/Documents` if it exists.
4. **Given** the user previously opened a folder in GitLocal, **When** they launch GitLocal later with no explicit folder and that folder still exists, **Then** GitLocal reopens that folder.
5. **Given** the user launches GitLocal with an explicit folder, **When** startup completes, **Then** GitLocal opens the explicit folder instead of the remembered or default folder.
6. **Given** the remembered folder no longer exists or is unavailable, **When** the user launches GitLocal with no explicit folder, **Then** GitLocal falls back to the platform default folder and does not show a startup failure.

### Edge Cases

- Markdown contains long documents, tables, nested lists, code blocks, blockquotes, local images, relative links, or front matter.
- Rendered Markdown includes content that prints across multiple pages.
- The user tries to share when the destination app is not installed, unavailable, or cannot accept the prepared content.
- The user tries to share or print a Markdown file with unsaved edits.
- The current repository path, selected file, or generated share artifact contains spaces or special characters.
- Refresh occurs while a share, print, save, or edit operation is in progress.
- Undo or redo is invoked while focus is in a dialog, file name field, search field, or another input that has its own local text history.
- Select all is invoked while focus is in the content panel, editor, search field, dialog, file tree, or another control with its own local selection behavior.
- A file changes on disk while the user has unsaved editor history.
- The remembered folder is deleted, moved, renamed, disconnected, or no longer readable before the next launch.
- The platform Documents folder is missing, redirected, inaccessible, or represented by a localized display name.
- The user provides an explicit startup folder that conflicts with the remembered folder.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GitLocal MUST provide a prominent top-right Refresh action for reloading the current page from the latest local repository and filesystem state.
- **FR-002**: Refresh MUST preserve the user's current repository, selected file, scroll position, and view mode when those targets still exist and can be restored reliably.
- **FR-003**: Refresh MUST handle removed, renamed, ignored, or newly created files without showing stale content or requiring an app restart.
- **FR-004**: Editable file views MUST support undo through the standard platform undo command.
- **FR-005**: Editable file views MUST support redo through the standard platform redo commands commonly expected by users.
- **FR-006**: Undo and redo MUST apply only to the currently focused editing context and MUST NOT alter unrelated files, navigation state, or preview-only content.
- **FR-006a**: The platform select-all command, including Command-A on macOS, MUST select or collect all content in the currently viewed content panel when the content panel is the active context, and MUST NOT select the entire GitLocal page, app header, sidebar, footer, or unrelated controls.
- **FR-006b**: When focus is inside a native text input, textarea, search field, dialog field, or other control with its own select-all behavior, GitLocal MUST preserve that local control behavior instead of overriding it with content-panel selection.
- **FR-007**: Markdown file views MUST provide Markdown-specific actions for Print, Save as PDF, Email, Slack, and Other Share Options.
- **FR-008**: Markdown Print MUST use the rendered Markdown presentation rather than raw Markdown source text.
- **FR-009**: Save as PDF MUST produce a readable document artifact that preserves the rendered Markdown structure, including headings, paragraphs, lists, tables, code blocks, links, and document title context.
- **FR-010**: Email sharing MUST prepare a sendable message or attachment that represents the rendered Markdown content and includes a useful subject based on the document context.
- **FR-011**: Slack sharing MUST prepare the rendered Markdown content, a PDF, or a suitable share artifact for Slack when Slack sharing is available on the user's device.
- **FR-012**: Other Share Options MUST expose available system or app destinations where possible and provide a practical fallback when no direct destination is available.
- **FR-013**: Markdown share actions MUST clearly communicate whether they use saved content, current unsaved edits, or require the user to save before sharing.
- **FR-014**: Markdown share actions MUST keep the user in the same GitLocal repository and file context after the share, print, or save flow is dismissed.
- **FR-015**: GitLocal MUST avoid exposing Markdown-specific print and share actions as primary actions for non-Markdown files.
- **FR-016**: The feature MUST work consistently across GitLocal distributions where the underlying operating environment supports the requested action, with graceful fallback where it does not.
- **FR-017**: When launched without an explicit folder, GitLocal MUST reopen the last used folder if one has been saved and still exists.
- **FR-018**: When launched without an explicit folder and no usable last folder exists, GitLocal MUST start from the user's platform Documents folder when available.
- **FR-019**: The platform Documents default MUST be the user's Documents folder on macOS and Windows; on Linux it MUST prefer the user's configured Documents directory, then `~/Documents` when present.
- **FR-020**: If neither the remembered folder nor a platform Documents folder is available, GitLocal MUST fall back to the user's home folder.
- **FR-021**: An explicitly provided startup folder MUST take precedence over remembered and default folders.
- **FR-022**: GitLocal MUST update the remembered last used folder when the user successfully opens or switches to a folder.

### Key Entities

- **Markdown Document**: The currently selected Markdown file, including its path, display title, saved content, and any unsaved edit state visible to the user.
- **Rendered Markdown Output**: The user-facing presentation of a Markdown document prepared for printing, PDF creation, or sharing.
- **Share Destination**: A target action or application such as print, PDF, email, Slack, or a broader system share destination.
- **Editor History**: The sequence of reversible edits associated with the focused editable file context.
- **Content Panel Selection Scope**: The currently viewed file, rendered Markdown output, README preview, raw text, or editable draft area that may be selected through the platform select-all command without including global GitLocal chrome.
- **Page Refresh State**: The current repository, selected file, view mode, scroll position, and loading status used to restore context after refresh.
- **Startup Folder Preference**: The most recent successfully opened folder that GitLocal may reopen on future launches when no explicit folder is provided.
- **Platform Default Folder**: The fallback starting folder for first launch or unavailable remembered folders, based on the user's standard Documents location or home folder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users in usability testing can find the Markdown print or share action within 10 seconds of opening a Markdown file.
- **SC-002**: Users can save a rendered Markdown file as a PDF in under 30 seconds for typical project documents used in release testing.
- **SC-003**: Rendered Markdown PDFs and print previews preserve headings, lists, tables, code blocks, and links correctly in 100% of acceptance test documents.
- **SC-004**: Users can start an email or Slack share flow for rendered Markdown content in under 20 seconds when the destination is available.
- **SC-005**: Refresh reflects an external file or repository change within 5 seconds for typical local repositories used in release testing.
- **SC-006**: Undo and redo restore the expected editor content in 100% of tested single-file edit sequences.
- **SC-006a**: Command-A or the platform select-all equivalent selects only the currently viewed content panel content in 100% of content-panel acceptance tests and leaves app chrome, navigation, dialogs, and unrelated controls unselected.
- **SC-007**: After print, PDF, email, Slack, other share, refresh, undo, or redo actions, users remain in the expected repository and file context in 100% of acceptance tests unless the file no longer exists.
- **SC-008**: On first launch with no explicit folder, GitLocal opens the correct platform default folder in 100% of startup acceptance tests where that folder exists.
- **SC-009**: After a user opens a folder, relaunching GitLocal with no explicit folder reopens that folder in 100% of acceptance tests where the folder still exists.
- **SC-010**: When the remembered folder is unavailable, GitLocal falls back to the correct default folder without a blocking startup error in 100% of acceptance tests.

## Assumptions

- "Page" means the currently visible GitLocal repository/file view, not a full application restart.
- Markdown-specific actions apply to files GitLocal recognizes as Markdown documents, including common Markdown extensions.
- The default share experience should prefer rendered content and a polished artifact over raw source text.
- If a share destination is unavailable, GitLocal should offer a fallback such as save as PDF, copy rendered content, or download/export a share artifact.
- Unsaved edits should not be silently omitted from printed or shared output; the experience must either include the visible edited content or clearly tell the user what will be shared.
- Slack sharing may depend on whether Slack or a system-level share destination is available on the user's device.
- This release should not introduce account management, hosted collaboration, public links, or cloud storage.
- "Explicit folder" means a folder supplied at launch time through the supported startup path for the distribution, and it always overrides remembered state.
- Linux systems may expose a configured Documents folder; when they do not, `~/Documents` is the preferred default if it exists.
