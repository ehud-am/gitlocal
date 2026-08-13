# Feature Specification: Patch Bug Fixes (0.10.2)

**Feature Branch**: `034-patch-bugfixes`
**Created**: 2026-08-13
**Status**: Draft
**Input**: User description: "Minor patch for bug fixes. 1) The scroll on the filesystem folder view stopped working after the introduction of the terminal. 3) On the left side panel we have hide .* files, and we have the same on the right hero panel when it is showing a folder view or a git folder view. Let's instead move that to the app menu for the Mac native app as an option that works globally. Need to have a similar experience for the browser version that is close to this. 4) Let's remove the refresh button and instead move it also to the menu and keep it also a shortcut. 5) Let's have a shortcut for the terminal cmd+t this should toggle the show/hide for the terminal window (same as expand/collapse). 6) When opening the terminal window for Claude I get error, but when opening a regular terminal and typing Claude it works well. The error is 'The Claude Code CLI (\"claude\") was not found on PATH. Install it to use a Claude Code terminal.' 7) Move the 'Tracked/All/Local' dropdown for all/local also to the app menu and the equivalent browser option."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Folder view scrolls again (Priority: P1)

A user browsing a folder or repository with more entries than fit on screen can no longer scroll the listing since the terminal panel was introduced (032-integrated-terminal-panel). Scrolling the folder/current-content view is restored regardless of whether the terminal panel is open, closed, expanded, or collapsed.

**Why this priority**: This is a straight regression that breaks core browsing — the app's primary use case — for any folder or repo with enough entries to overflow the viewport. It ships first and alone.

**Independent Test**: Open a folder with enough entries to overflow the viewport height, with the terminal panel in each of its states (hidden, collapsed, expanded), and confirm the listing scrolls fully to its last entry in every state.

**Acceptance Scenarios**:

1. **Given** a folder with many entries and the terminal panel closed, **When** the user scrolls the content area, **Then** all entries are reachable by scrolling.
2. **Given** the same folder with the terminal panel open and expanded, **When** the user scrolls the content area, **Then** all entries remain reachable and the terminal panel's own internal scrolling is unaffected.
3. **Given** the terminal panel is toggled open, closed, or resized while a long folder listing is scrolled partway down, **When** the panel state changes, **Then** the folder view does not lose its ability to scroll or become clipped.

---

### User Story 2 - Claude terminal tabs launch without a PATH error (Priority: P1)

A user opens a "Claude" terminal tab and gets `The Claude Code CLI ("claude") was not found on PATH. Install it to use a Claude Code terminal.`, even though `claude` runs fine when typed manually into a "Regular" terminal tab in the same app. Claude and Codex terminal tabs resolve the CLI the same way an interactively-typed command in a Regular tab does, so they launch successfully whenever the user's normal shell can find the command.

**Why this priority**: A hard failure of a specifically-advertised feature (Claude/Codex terminal kinds), with a known-working workaround already proving the underlying capability exists. Independent of the other terminal/menu changes in this release.

**Independent Test**: With `claude` installed somewhere resolved only via the user's shell profile (e.g. nvm, a version manager shim, or a PATH export in `~/.zshrc`/`~/.bashrc`), open a Regular terminal tab and confirm `claude` runs; then open a Claude terminal tab and confirm it launches the same CLI without the PATH error.

**Acceptance Scenarios**:

1. **Given** `claude` is only resolvable through the user's login/interactive shell profile, **When** the user opens a Claude terminal tab, **Then** the CLI launches successfully instead of reporting a PATH error.
2. **Given** the same environment, **When** the user opens a Codex terminal tab, **Then** the equivalent CLI launch succeeds using the same resolution approach (Codex shares the same underlying spawn path as Claude).
3. **Given** `claude` is genuinely not installed anywhere reachable by the user's shell, **When** the user opens a Claude terminal tab, **Then** the existing "not found" error still appears (the fix must not mask a real absence of the CLI).

---

### User Story 3 - Terminal panel toggles with Cmd+T (Priority: P2)

A user wants to show or hide the terminal panel without reaching for the mouse. Pressing Cmd+T (native macOS app) toggles the terminal panel exactly as clicking the existing Terminal toggle button does — opening it if hidden/closed, and hiding it if currently visible.

**Why this priority**: A pure keyboard-shortcut addition with no layout risk; independent of the folder-scroll fix and the menu-migration items.

**Independent Test**: With the terminal panel hidden, press Cmd+T and confirm it opens (creating a default tab if none exist, matching current click behavior); press Cmd+T again and confirm it hides.

**Acceptance Scenarios**:

1. **Given** the terminal panel is hidden with no open tabs, **When** the user presses Cmd+T, **Then** a terminal opens exactly as clicking the toolbar Terminal button does today.
2. **Given** the terminal panel is visible, **When** the user presses Cmd+T, **Then** the panel hides, preserving existing session state (same behavior as the current toggle button/Ctrl+\` shortcut).
3. **Given** the browser distribution, where Cmd+T/Ctrl+T is reserved by the browser itself for opening a new browser tab, **When** the shortcut cannot be safely intercepted, **Then** the existing Ctrl+\`/Cmd+\` terminal-toggle shortcut continues to work as the browser-safe equivalent, and Cmd+T is wired only where it can be reliably captured (the native macOS app's menu shortcut).

---

### User Story 4 - Dotfile visibility is a single global setting (Priority: P2)

A user toggling "Hide .* files" today has to set it twice — once in the left sidebar file tree and once in the right content panel — because the two controls hold independent, unsynchronized state. This becomes one global setting. In the native macOS app it lives in the app menu (with a keyboard shortcut) instead of as inline controls; in the browser distribution, where there is no native app menu, the equivalent is a single toolbar-level control that applies everywhere, replacing the two separate inline toggles.

**Why this priority**: Fixes a confusing state-desync bug (two controls, two independent states, no visible indication they disagree) and reduces UI clutter; ranks below the two functional breakages above.

**Independent Test**: Toggle dotfile visibility from the new single control and confirm both the sidebar file tree and the content panel folder/git views immediately reflect the same state, with no other control left that can set a conflicting value.

**Acceptance Scenarios**:

1. **Given** the native macOS app, **When** the user opens the app menu, **Then** a "Hide Dotfiles" (or equivalent) menu item is present, toggleable, and reflects current state (e.g. a checkmark).
2. **Given** the native macOS app, **When** the user toggles dotfile visibility from the app menu, **Then** both the sidebar file tree and the content panel folder/git views update together to the same visibility state.
3. **Given** the browser distribution, **When** the user looks for the dotfile toggle, **Then** it appears once, in a single toolbar-level location, and no longer appears separately inside the sidebar and the content panel.
4. **Given** either distribution, **When** the app is reloaded or navigated within the same session, **Then** the dotfile visibility setting persists rather than resetting to its default.

---

### User Story 5 - Refresh moves to the menu with a shortcut (Priority: P3)

The Refresh button is removed from the top toolbar. Refreshing the current view remains available from the native macOS app's menu (with a keyboard shortcut) and, for the browser distribution, from an equivalent always-reachable place plus the same keyboard shortcut.

**Why this priority**: Toolbar decluttering with an existing, well-understood action (`refreshCurrentView()`); lowest risk and value of the changes in this release, but still expected in the same patch.

**Independent Test**: Confirm the Refresh button no longer renders in the top toolbar, then confirm the refresh action is reachable from the app menu (native) or its browser equivalent, and via its keyboard shortcut, and that it performs the same query-invalidation refresh as before.

**Acceptance Scenarios**:

1. **Given** the top toolbar, **When** rendered, **Then** no Refresh button is present.
2. **Given** the native macOS app, **When** the user opens the app menu, **Then** a Refresh item is present with a keyboard shortcut shown next to it.
3. **Given** either distribution, **When** the user triggers refresh via its keyboard shortcut, **Then** the same set of queries currently invalidated by the toolbar Refresh button (info, git-context, branches, tree, file, readme, directory-readme, sync, repo-summary, navigation-hints) are invalidated.
4. **Given** the browser distribution, **When** the user looks for a way to refresh without the keyboard shortcut, **Then** an equivalent always-reachable control exists (e.g. in an app-level menu/overflow control), so refresh is not keyboard-only.

---

### User Story 6 - Tracked/All/Local filter moves to the menu (Priority: P3)

The "Tracked/All/Local" files-visibility dropdown is removed from the left sidebar toolbar and becomes a global setting reachable from the native macOS app menu, mirroring how dotfile visibility (User Story 4) is relocated; the browser distribution gets an equivalent always-reachable control in place of the removed inline dropdown.

**Why this priority**: Consistent with, and naturally sequenced after, the dotfile-visibility relocation — same pattern, same menu, lowest-risk cosmetic/organizational change.

**Independent Test**: Confirm the inline Tracked/All/Local dropdown no longer renders in the sidebar, and that selecting each of the three values from its new location (menu or browser equivalent) filters the file tree and folder view exactly as the old dropdown did.

**Acceptance Scenarios**:

1. **Given** the left sidebar, **When** rendered, **Then** the inline Tracked/All/Local dropdown is no longer present.
2. **Given** the native macOS app menu, **When** opened, **Then** a Tracked/All/Local selection (e.g. a submenu with a checkmark on the active value) is present and changes the same underlying `generatedLocalVisibility` state used today.
3. **Given** the browser distribution, **When** the user looks for this filter, **Then** it is reachable from a single, consistent, always-visible location (e.g. the same relocated control area introduced for dotfile visibility in User Story 4).
4. **Given** any of the three values is selected from the new location, **When** the file tree and folder/content view render, **Then** filtering behaves identically to the current dropdown's behavior.

---

### Edge Cases

- When the terminal panel is resized (drag-resize) while the folder view is scrolled partway down, does the folder view's scroll position survive, or is it acceptable for it to reset?
- If a user has both a Claude and a Codex terminal tab open in the same session, does fixing the PATH resolution for one need to be re-verified independently for the other, given they may resolve to different underlying CLIs installed via different means (e.g. one via nvm, one via a package manager)?
- What happens if `claude` (or `codex`) is aliased rather than a plain PATH binary (e.g. a shell function or alias defined only in `~/.zshrc`)? Should the fix's shell-profile-sourcing approach still make it resolve?
- On the browser distribution, does the relocated dotfile/tracked-filter control need its own toolbar affordance, or can both share one combined "view options" control? (See Assumptions.)
- If a user has the browser distribution open in a browser that does allow overriding Ctrl+T (uncommon, but some kiosk/PWA-installed contexts do), should GitLocal attempt to intercept it there, or is Ctrl+\`/Cmd+\` the sole supported shortcut for all browser contexts regardless of what the browser technically allows?
- Does removing the toolbar Refresh button change any existing keyboard-focus order (tab order) through the toolbar in a way that needs to be preserved for accessibility?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The folder/content view MUST remain independently scrollable to reach all entries regardless of the terminal panel's visibility, expanded/collapsed state, or height.
- **FR-002**: Claude and Codex terminal tabs MUST resolve and launch their respective CLI using the same environment/PATH resolution a user's interactive login shell uses (i.e. must find CLIs that are only resolvable via shell profile scripts such as `~/.zshrc`/`~/.bashrc`, not just `process.env.PATH` as inherited by the server process).
- **FR-003**: If the CLI genuinely cannot be resolved even via shell-profile resolution, the existing "not found on PATH" error MUST still be shown (no silent failure, no false positive).
- **FR-004**: A Cmd+T keyboard shortcut (native macOS app) MUST toggle the terminal panel's visibility identically to the existing Terminal toolbar button / Ctrl+\` shortcut.
- **FR-005**: The browser distribution MUST NOT rely on intercepting Cmd+T/Ctrl+T for the terminal toggle (browsers reserve it); the existing Ctrl+\`/Cmd+\` shortcut remains the supported terminal-toggle shortcut there.
- **FR-006**: Dotfile visibility ("Hide .* files") MUST become a single piece of shared state that drives both the sidebar file tree and the content panel's folder/git views, replacing the two independent, unsynchronized toggles that exist today.
- **FR-007**: In the native macOS app, dotfile visibility MUST be exposed as an app-menu item (with a keyboard shortcut and a checked/unchecked state reflecting the current value), and the two inline toggle controls MUST be removed from the sidebar and content panel.
- **FR-008**: In the browser distribution, dotfile visibility MUST be exposed via a single, always-reachable toolbar-level control, replacing the two removed inline toggles.
- **FR-009**: The top toolbar's Refresh button MUST be removed.
- **FR-010**: Refresh MUST remain reachable in the native macOS app via an app-menu item with a keyboard shortcut, and MUST trigger the same query invalidation the toolbar button triggers today (info, git-context, branches, tree, file, readme, directory-readme, sync, repo-summary, navigation-hints).
- **FR-011**: Refresh MUST remain reachable in the browser distribution via both a keyboard shortcut and an always-visible non-keyboard control (not keyboard-only).
- **FR-012**: The Tracked/All/Local files-visibility dropdown MUST be removed from the left sidebar toolbar.
- **FR-013**: In the native macOS app, Tracked/All/Local selection MUST be exposed via the app menu, driving the same `generatedLocalVisibility` state the removed dropdown drove.
- **FR-014**: In the browser distribution, Tracked/All/Local selection MUST remain reachable via a single, always-visible control equivalent to its native-menu counterpart.
- **FR-015**: All relocated controls (dotfile visibility, Tracked/All/Local, Refresh) MUST preserve their current underlying behavior and app state exactly — only their location/presentation changes, not what they do.
- **FR-016**: None of the relocations MUST regress existing keyboard operability or accessible naming already present on the affected controls.

### Key Entities

- **View options (dotfile visibility, Tracked/All/Local filter)**: Global, app-level settings that determine which filesystem entries are shown across both the sidebar file tree and the content panel; currently split across three disconnected inline controls (two dotfile toggles, one filter dropdown), consolidated here into single sources of truth reachable from the native app menu or a browser-equivalent control.
- **Terminal tab kind (Regular/Claude/Codex)**: Existing entity from 032-integrated-terminal-panel; this patch changes how Claude/Codex kinds resolve their launch command's environment, not the kind model itself.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can scroll to the last entry of any folder listing regardless of terminal panel state, in 100% of manual verification passes across the three terminal states (hidden/collapsed/expanded).
- **SC-002**: A Claude terminal tab launches successfully (no PATH error) whenever the CLI is runnable from a manually-typed Regular terminal tab in the same environment.
- **SC-003**: Cmd+T toggles the terminal panel in the native macOS app with no additional clicks required; browser users retain a working terminal-toggle shortcut (Ctrl+\`/Cmd+\`) with zero regression.
- **SC-004**: Dotfile visibility requires exactly one interaction to change, and that change is reflected in both the sidebar and content panel with no possibility of the two disagreeing.
- **SC-005**: Refresh and the Tracked/All/Local filter remain fully reachable (menu, browser equivalent, and/or shortcut) after their toolbar/sidebar controls are removed, with zero loss of functionality.

## Assumptions

- "The same" browser experience for menu-relocated items (User Stories 4 and 6) means a single, consistently-placed, always-reachable control (e.g. a compact "View" control near the toolbar) rather than a literal dropdown menu — the browser distribution has no native OS menu bar to mirror exactly.
- Cmd+T cannot be safely captured by the browser distribution because operating systems/browsers reserve it for tab management; the existing Ctrl+\`/Cmd+\` shortcut remains the terminal-toggle shortcut for the browser distribution, and Cmd+T is added only to the native macOS app's menu/global shortcut handling.
- The Claude/Codex PATH fix resolves the launch command through the same mechanism an interactive login shell uses (sourcing the user's shell profile) rather than hardcoding specific tool paths (e.g. nvm), so it generalizes across differing user environments without per-tool special-casing.
- "The app menu" refers to the existing native macOS `NSMenu` structure already installed by `AppDelegate.swift` (018-macos-homebrew-app); this patch extends it rather than introducing a new menu system.
- Removing the toolbar Refresh button and sidebar Tracked/All/Local dropdown does not remove the underlying React state/query-invalidation logic — only the inline control markup and its former location.
- This patch targets a 0.10.2 release and does not include any other UI/behavior changes beyond the 7 items described (numbered 1, 3–7 per the original request; there is no item 2).
