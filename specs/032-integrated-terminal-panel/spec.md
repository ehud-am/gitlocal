# Feature Specification: Integrated Terminal Panel

**Feature Branch**: `032-integrated-terminal-panel`
**Created**: 2026-08-07
**Status**: Draft
**Input**: User description: "Let's start a new spec kit specify: the goal is to support a terminal (or multiple terminals) at the bottom of the screen. Think about the experience at ide like code studio. A way to show hide terminal. A way to open close a new tab terminal. A way to run regular terminal, Claude terminal, codex terminal. The same terminal is always there across all types of pages: file system folder, gut rep, file View, file edit, etc. A new terminal tab opens in the same folder as the current visible content. Make sure to keep this accessibility compliant, make sure to keep beautiful design, keep the test coverage high and potentially shippable code"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Always-there terminal while browsing the repo (Priority: P1)

A user is working in GitLocal — browsing the file tree, reviewing a Git diff, reading a file, editing a file — and wants to drop into a real terminal without losing their place. They open a terminal panel docked at the bottom of the screen, run commands, then move to a different page or content type in the app. When they come back, the terminal is exactly as they left it: same output, same running process, nothing restarted.

**Why this priority**: This is the core value of the feature — a single persistent terminal that survives navigation, unlike a one-off terminal tied to a single page. Without this, the feature is just a modal terminal window, not an IDE-like dock.

**Independent Test**: Open the terminal panel from any page, run a command (e.g. `pwd`), navigate to at least two other page/content types (folder view, git view, file view), and confirm the terminal's output and running state are unchanged when the panel is revisited.

**Acceptance Scenarios**:

1. **Given** the terminal panel is closed, **When** the user opens it, **Then** a terminal session starts and the panel appears docked at the bottom of the screen, without navigating away from the current page.
2. **Given** an open terminal with a command still running (e.g. a long-lived process), **When** the user navigates from the file view to the folder view and then to the git view, **Then** the terminal session keeps running uninterrupted and its output is unchanged when the panel is next viewed.
3. **Given** an active terminal session, **When** the user reloads the browser page or restarts the app, **Then** the session ends (consistent with the rest of the app's ephemeral UI state) and a fresh terminal panel is available on next load.

---

### User Story 2 - Show and hide the panel without losing sessions (Priority: P1)

A user wants to reclaim screen space to focus on reading a file or reviewing a diff, without ending whatever is running in the terminal. They collapse (hide) the terminal panel with one action, and bring it back with the same action, finding all tabs and output untouched.

**Why this priority**: Collapsing the terminal is essential to an IDE-like experience — it's how a persistent panel avoids being intrusive. This is tightly coupled to User Story 1's persistence guarantee and is equally foundational to shipping something usable.

**Independent Test**: With one or more terminal tabs open and producing output, hide the panel, confirm the main content area regains the space, then show the panel again and confirm all tabs, scrollback, and running processes are unchanged.

**Acceptance Scenarios**:

1. **Given** the terminal panel is visible, **When** the user triggers the hide control, **Then** the panel disappears and the main content area expands to use the reclaimed space.
2. **Given** the terminal panel is hidden with a command actively producing output, **When** the user triggers the show control, **Then** the panel reappears immediately showing the up-to-date output, including anything produced while hidden.
3. **Given** the terminal panel is hidden, **When** the user navigates between page/content types, **Then** the panel remains hidden (its visibility state is not reset by navigation) until the user explicitly shows it again.

---

### User Story 3 - Multiple independent terminal tabs (Priority: P2)

A user wants to run more than one thing at once — for example, a dev server in one tab and ad-hoc commands in another. They open several terminal tabs within the same panel, switch between them, and close any one of them independently without affecting the others.

**Why this priority**: Running one thing at a time in a single terminal is workable but limiting; multiple tabs is the natural next increment of value once the persistent single-terminal panel exists, and is explicitly requested.

**Independent Test**: With the panel open, create three terminal tabs, run a distinct command in each, switch focus between tabs, close one tab, and confirm the remaining two are unaffected and still running.

**Acceptance Scenarios**:

1. **Given** the terminal panel has one open tab, **When** the user opens a new tab, **Then** a second, independent terminal session starts with its own input/output, and the user can switch focus between the two tabs.
2. **Given** multiple terminal tabs are open, **When** the user closes one tab, **Then** its underlying process is terminated, the tab is removed, and the other tabs continue running unaffected.
3. **Given** the last remaining terminal tab is closed, **When** the closure completes, **Then** the panel shows a clear empty/"open a terminal" state rather than an error or blank panel.

---

### User Story 4 - Choose the terminal kind: regular, Claude, or Codex (Priority: P2)

When opening a new terminal tab, a user chooses what kind of terminal they want: a regular shell, a "Claude" terminal that immediately launches the Claude Code CLI, or a "Codex" terminal that immediately launches the Codex CLI. They don't have to remember or type the launch command themselves.

**Why this priority**: This differentiates the feature from a plain shell dock and directly serves GitLocal's AI-driven-development audience, but it depends on tabs (User Story 3) already existing, so it's ordered after basic multi-tab support.

**Independent Test**: Open a new terminal tab as a "Claude" kind and confirm the Claude Code CLI is running in that tab without the user typing anything; repeat for "Codex"; open a "Regular" tab and confirm it is a plain shell with no CLI auto-launched.

**Acceptance Scenarios**:

1. **Given** the user is opening a new terminal tab, **When** they choose "Regular", **Then** a plain shell session starts with no additional command run automatically.
2. **Given** the user is opening a new terminal tab, **When** they choose "Claude", **Then** the session starts and automatically runs the Claude Code CLI, ready for the user's first prompt.
3. **Given** the user is opening a new terminal tab, **When** they choose "Codex", **Then** the session starts and automatically runs the Codex CLI, ready for the user's first prompt.
4. **Given** the user chooses "Claude" or "Codex" but the corresponding CLI is not installed or not on the system PATH, **When** the tab opens, **Then** the tab shows a clear message explaining the tool isn't available, rather than a silently broken or empty session.
5. **Given** multiple tabs of different kinds are open, **When** the user looks at the tab strip, **Then** each tab is clearly labeled/distinguished by its kind (Regular / Claude / Codex).

---

### User Story 5 - New terminal opens where you're looking (Priority: P3)

A user is viewing a specific folder, a specific file, or a file's edit view. When they open a new terminal tab, it starts in the working directory that matches what's currently visible — the file's containing folder, the folder being browsed, or the repository root when viewing something like the git history that has no specific folder — so they don't have to `cd` manually.

**Why this priority**: This is a real convenience and was explicitly requested, but the feature is fully usable without it (falling back to the repository root), so it's the right increment to ship last.

**Independent Test**: Browse to a nested folder, open a new terminal tab, and confirm its working directory matches that folder; open a file two levels deep, open a new terminal tab, and confirm its working directory matches that file's parent folder.

**Acceptance Scenarios**:

1. **Given** the user is browsing a folder in the file tree, **When** they open a new terminal tab, **Then** the new session's working directory is that folder.
2. **Given** the user is viewing or editing a file, **When** they open a new terminal tab, **Then** the new session's working directory is the file's containing folder.
3. **Given** the user is on a page with no specific folder or file in view (e.g. the git history/repo overview), **When** they open a new terminal tab, **Then** the new session's working directory defaults to the repository root.
4. **Given** a terminal tab is already open with a working directory set, **When** the user subsequently navigates to different content elsewhere in the app, **Then** that existing tab's working directory does not change out from under it — the smart default only applies at the moment a new tab is opened.

---

### Edge Cases

- What happens if the terminal panel is hidden while a long-running or interactive process (e.g. a dev server, `codex`, `claude`) is mid-output? Output MUST continue to buffer and stream in the background; nothing is lost when the panel is shown again.
- What happens when the user closes the terminal tab that has a foreground child process still running (e.g. mid `npm install`)? The process MUST be terminated along with the tab, consistent with normal terminal-close semantics.
- What happens when native terminal support (PTY spawning) is unavailable on the current platform or fails to load? The system MUST clearly communicate that terminals are unavailable, in the panel itself, rather than crashing the app or silently failing.
- What happens when the folder or file that determined a new tab's working directory has since been deleted, renamed, or moved before the tab opens? The system MUST fall back to the nearest existing ancestor folder, or the repository root if none can be resolved.
- What happens on a narrow/small viewport where a bottom-docked panel and the main content can't both be comfortably visible? The panel MUST remain usable (e.g. it may take priority when shown, with an easy way to hide it and return to content) without breaking either the panel or the main content's usability.
- What happens if the user tries to open more terminal tabs than is reasonable? The system MUST NOT hard-cap tabs at a number that blocks a realistic workflow (e.g. one per terminal kind plus a couple of ad-hoc shells) or degrade responsiveness silently; performance MUST remain acceptable as tabs accumulate.
- What happens when a "Claude" or "Codex" tab's underlying CLI process exits (normally or due to an error)? The tab MUST show that the session has ended rather than appearing to hang, and the user MUST still be able to close the tab or interact with the ended session's scrollback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a terminal panel docked at the bottom of the screen that is reachable from every page/content type in the app (folder/file-tree view, git repository view, file view, file edit view).
- **FR-002**: The system MUST provide a visible, always-reachable control to show or hide the terminal panel.
- **FR-003**: Hiding the terminal panel MUST NOT terminate any running terminal session; sessions MUST continue running and buffering output while hidden.
- **FR-004**: The system MUST let the user open a new terminal tab and close any individual terminal tab independently of other open tabs.
- **FR-005**: Closing a terminal tab MUST terminate its underlying shell/process.
- **FR-006**: The system MUST support multiple concurrent terminal tabs, each with its own independent session (own input/output stream, own working directory, own running state).
- **FR-007**: When opening a new terminal tab, the user MUST be able to choose its kind: Regular, Claude, or Codex.
- **FR-008**: A Claude-kind terminal tab MUST automatically launch the Claude Code CLI in that session when it opens, without the user typing the launch command.
- **FR-009**: A Codex-kind terminal tab MUST automatically launch the Codex CLI in that session when it opens, without the user typing the launch command.
- **FR-010**: If the CLI required for a Claude or Codex terminal tab is not installed or not available on the system, the tab MUST display a clear, actionable message instead of a silently broken or empty session.
- **FR-011**: A newly opened terminal tab's working directory MUST default to the folder associated with whatever content is currently visible in the main content area (the browsed folder, the open file's containing folder, or the repository root when no specific folder/file is in view).
- **FR-012**: An already-open terminal tab's working directory MUST NOT change automatically as a result of the user navigating to different content elsewhere in the app.
- **FR-013**: The terminal panel, its open tabs, and their sessions MUST persist unchanged as the user navigates between different page/content types within the same app session — navigation alone MUST NOT interrupt, restart, or lose a session.
- **FR-014**: The terminal panel and all its interactive controls (show/hide, open tab, close tab, select kind, switch tabs) MUST be fully operable via keyboard and MUST expose correct roles, names, and states to assistive technology.
- **FR-015**: If terminal support is unavailable on the current platform (e.g. the native PTY dependency fails to load), the system MUST communicate this clearly at the panel level rather than crashing or silently disabling the feature.
- **FR-016**: All terminal sessions MUST end on a full page reload or app restart, and the panel MUST return to a clean, empty-tab default state on next load, consistent with the app's existing ephemeral UI state.
- **FR-017**: The terminal panel's visual design MUST be consistent with the rest of the application's clean, minimal, content-focused design language.

### Key Entities

- **Terminal Panel**: The persistent, bottom-docked UI region that hosts terminal tabs. Has a visibility state (shown/hidden) that persists across in-app navigation for the current session, independent of which tabs it contains.
- **Terminal Tab / Session**: One live terminal session bound to a tab in the panel. Has a kind (Regular, Claude, Codex), a working directory established at open time, a running/ended state, and its own input/output stream, independent of other tabs.
- **Terminal Kind**: An enumerated launch behavior for a new terminal tab — Regular (plain shell, nothing auto-run), Claude (auto-launches the Claude Code CLI), Codex (auto-launches the Codex CLI).
- **Visible Content Context**: The folder or file currently shown in the main content area (folder listing, file view, file edit view) or lack thereof (e.g. git repository overview), used only at the moment a new terminal tab opens to compute its default working directory.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the terminal panel and start running commands from any page in the app without a page reload or navigation away from what they were doing.
- **SC-002**: A terminal session's output and running state are unchanged 100% of the time after navigating between any two of the app's page/content types (folder view, git view, file view, file edit view).
- **SC-003**: A user can have at least 6 terminal tabs open simultaneously, each producing independent output, with no observable cross-talk between sessions.
- **SC-004**: Starting a Claude or Codex terminal takes exactly one user action (choosing the kind when opening a tab) — no manual typing of a launch command is required.
- **SC-005**: A newly opened terminal's working directory matches the folder of the currently visible content, without manual `cd`, across all supported page/content types.
- **SC-006**: The terminal panel and its controls pass automated and manual accessibility checks for keyboard operability and screen-reader semantics, matching the bar already required of the rest of the application.
- **SC-007**: Existing folder-browsing, file-viewing, file-editing, and git-review functionality shows zero regressions in the existing automated test suite after this feature ships.
- **SC-008**: Every new source file introduced or modified for this feature meets the project's 90%-per-file test coverage requirement, with no exceptions.

## Assumptions

- The terminal panel is a single, persistent dock spanning the bottom of the app shell — not a per-page or per-pane feature, and not part of a multi-pane tiling layout. This is a deliberate change of approach from the previously explored (and since abandoned) multi-pane workspace design.
- "Claude terminal" and "Codex terminal" refer to launching the already-installed `claude` (Claude Code) and `codex` CLIs on the user's machine. GitLocal does not install, bundle, or manage these tools itself; if either is missing, the corresponding tab surfaces a clear message rather than failing silently (see FR-010).
- Terminal sessions are local-only child processes of the local GitLocal server, consistent with the project's local-first constitution principle — this feature introduces no new remote or network integrations.
- Consistent with the rest of the app's UI state, terminal panel state (open tabs, visibility, scrollback) is not persisted across a full page reload or app restart; a fresh reload always starts with the panel closed and no tabs open.
- The terminal panel's exact height and whether it is user-resizable (e.g. via a drag handle) is a design/implementation-level decision to be resolved during planning, not a hard requirement of this spec — the only mandatory behaviors are show/hide and the panel not obstructing core browsing/reading workflows described in the project's UX philosophy.
- This feature is IDE-adjacent in nature; it is scoped as an optional, opt-in power-user capability that a user must explicitly open, consistent with the constitution's framing that GitLocal's primary audience does not need or want a full IDE by default, while still serving users who want closer-to-the-metal terminal access alongside AI CLIs.
- This feature applies equally to both existing distributions (npm package and macOS Homebrew app), since both share the same underlying Node.js-served React UI and local terminal-session infrastructure.
