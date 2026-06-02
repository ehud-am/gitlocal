# Feature Specification: Native App Shortcuts

**Feature Branch**: `021-native-shortcuts`  
**Created**: 2026-06-01  
**Status**: Draft  
**Input**: User description: "in the mac native app there are few shortcuts and funcotionality that is done for free on the browser but do not work well on the native app. Specifically cmd-copy/past/cut/find refresh button. find will search in the preview panel only. We need to make sure these are working well. Minor patch release"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use Standard Editing Shortcuts (Priority: P1)

As a GitLocal user in the macOS native app, I want standard copy, paste, and cut shortcuts to work wherever text selection or text input is focused, so I can use the app with normal Mac muscle memory.

**Why this priority**: Basic editing shortcuts are expected platform behavior and their absence makes the native app feel broken compared with the browser distribution.

**Independent Test**: Can be fully tested by selecting text in preview content, copying it, then focusing an editable text field and using paste and cut commands to confirm the expected text operation occurs.

**Acceptance Scenarios**:

1. **Given** preview content contains selectable text, **When** the user selects text and chooses Copy or presses Command-C, **Then** the selected text is available to paste elsewhere.
2. **Given** an editable text field contains selected text, **When** the user chooses Cut or presses Command-X, **Then** the selected text is removed and available to paste.
3. **Given** an editable text field is focused, **When** the user chooses Paste or presses Command-V, **Then** the clipboard text is inserted at the current cursor location.
4. **Given** no text selection or editable field can handle the command, **When** the user chooses Copy, Cut, or Paste, **Then** the app does not change unrelated content or show a disruptive failure.

---

### User Story 2 - Find Within Preview Content (Priority: P1)

As a GitLocal user reading a file in the macOS native app, I want Find to search the preview panel only, so I can locate text in the rendered file content without changing repository navigation or searching unrelated chrome.

**Why this priority**: Find is a core reading and review workflow, and the native app currently lacks the browser behavior users expect.

**Independent Test**: Can be fully tested by opening a file with known visible text in the preview panel, invoking Find, searching for that text, and confirming only preview matches are highlighted or navigated.

**Acceptance Scenarios**:

1. **Given** the preview panel contains visible text, **When** the user chooses Find or presses Command-F and enters a matching query, **Then** the app identifies matches in the preview panel.
2. **Given** matching text exists in navigation labels or other controls but not in the preview panel, **When** the user searches for that text, **Then** the search reports no preview match.
3. **Given** multiple matches exist in the preview panel, **When** the user advances through results, **Then** focus moves between preview matches in reading order.
4. **Given** the user closes Find, **When** they continue reading, **Then** the preview remains on the same file and repository context.

---

### User Story 3 - Refresh Current View (Priority: P2)

As a GitLocal user in the macOS native app, I want an obvious refresh action to reload the current repository view, so filesystem or git changes made outside the app are reflected without restarting the app.

**Why this priority**: Refresh is expected browser behavior and is important for a local git viewer, but the app is still usable without it if shortcut and find behavior work.

**Independent Test**: Can be fully tested by changing repository content outside the app, choosing Refresh, and confirming the current view reflects the change while preserving the selected repository and file when possible.

**Acceptance Scenarios**:

1. **Given** the user is viewing a repository, **When** they choose Refresh, **Then** the visible repository state is reloaded.
2. **Given** the current file still exists after refresh, **When** refresh completes, **Then** the app keeps the user on that file.
3. **Given** the current file no longer exists after refresh, **When** refresh completes, **Then** the app shows an appropriate available state without crashing or leaving a stale preview.
4. **Given** refresh is requested while the app is already loading, **When** loading completes, **Then** the app shows one coherent refreshed state.

### Edge Cases

- Copy, cut, paste, find, or refresh is invoked while focus is inside a modal, menu, or text field that already has a more specific expected behavior.
- The preview panel contains rendered Markdown, highlighted code, long files, or no selectable text.
- The clipboard is empty, unavailable, or contains content that cannot be inserted into the focused field.
- The repository contents change between starting and completing a refresh.
- The user invokes Find when no preview panel is currently visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The macOS native app MUST support standard Copy, Cut, Paste, Find, and Refresh commands through both menu actions and their expected keyboard shortcuts.
- **FR-002**: Copy MUST place the current selected text on the clipboard when selectable content or editable text is focused.
- **FR-003**: Cut MUST remove selected text and place it on the clipboard only when an editable text area can accept the command.
- **FR-004**: Paste MUST insert clipboard text into the currently focused editable text area when that area can accept text input.
- **FR-005**: Find MUST open or focus a find control that searches only the currently visible preview panel content.
- **FR-006**: Find MUST exclude application navigation, toolbars, sidebars, menus, and other non-preview interface text from match results.
- **FR-007**: Find MUST allow users to move through multiple preview matches and clearly indicate the active match.
- **FR-008**: Refresh MUST reload the current app view from the latest local repository and filesystem state.
- **FR-009**: Refresh MUST preserve the user's current repository, navigation location, and selected file when those items still exist after reload.
- **FR-010**: The app MUST handle unavailable commands gracefully without corrupting content, changing unrelated state, or requiring a restart.
- **FR-011**: The release MUST be suitable for a minor patch update with no required user migration or new configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of Copy, Cut, Paste, Find, and Refresh command paths work from both menu selection and keyboard shortcut where a keyboard shortcut is expected.
- **SC-002**: Users can copy selected preview text and paste it into an editable field in under 10 seconds without leaving the native app.
- **SC-003**: Find returns only preview-panel matches in 100% of tested cases that include matching text elsewhere in the app chrome.
- **SC-004**: Refresh reflects an external file or repository change within 5 seconds for typical local repositories used in release testing.
- **SC-005**: The patch release introduces no regressions in the browser distribution's existing shortcut, find, or refresh behavior during release verification.

## Assumptions

- The target audience is users of the macOS native app distribution, not users running GitLocal in an external browser.
- "Find" means in-page finding within the currently visible preview panel, not global repository search.
- Copy may apply to read-only selected preview text, while cut and paste apply only to editable fields.
- Refresh should preserve context when possible, but may fall back to an available repository or empty state when the prior target no longer exists.
- This is scoped as a minor patch release and should not introduce new user-facing configuration, account flows, or migration steps.
