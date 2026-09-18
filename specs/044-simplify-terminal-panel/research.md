# Phase 0 Research: Simplify Terminal Panel

All items below were resolvable from the existing codebase and project conventions; no
`NEEDS CLARIFICATION` markers remain from the Technical Context.

## Decision 1: How to remove the terminal-kind concept

**Decision**: Delete the `TerminalKind` type (`'regular' | 'claude' | 'codex'`) entirely rather
than collapsing it to a single-value enum. Every terminal tab becomes an untyped plain shell.
Remove `src/terminal/cli-detection.ts` (existed solely to probe for the `claude`/`codex`
executables), the `TerminalCapabilities.claudeCliFound`/`codexCliFound` fields, and the
`cli_not_found` pre-flight branch and `VALID_KINDS`/`isValidKind` checks in
`src/handlers/terminal.ts`. Remove the auto-launch write in `session-manager.ts` that types
`claude`/`codex` into the PTY on first shell output.

**Rationale**: The spec (FR-001, FR-002) explicitly calls for removing the kind concept, not
just its UI. Keeping a single-value enum "for future extensibility" would be speculative
abstraction the project's code-style guidance rejects ("don't design for hypothetical future
requirements"). Users can already type `claude` or `codex` themselves once a plain shell opens.

**Alternatives considered**: Keep `TerminalKind` as a single-value type (`'regular'`) for future
kind additions — rejected as unnecessary indirection with no current requirement driving it.

## Decision 2: Where to persist the dock-position preference

**Decision**: Add a new server-side JSON preference file, `~/.gitlocal/terminal-panel-preference.json`
(shape: `{ "dockPosition": "bottom" | "left" | "right" }`), following the exact pattern already
established by `src/services/startup-preferences.ts` for `startup-folder.json` and
`default-reader.json`. Expose it via new `GET /api/terminal-panel-preference` and
`PUT /api/terminal-panel-preference` routes, matching the existing `default-reader-preference`
route pair in `src/server.ts`.

**Rationale**: The spec requires the position to survive a full app restart (FR-005, edge
case: "first run" default). This codebase already has two persistence patterns:
1. A server-side JSON file under `~/.gitlocal/` for preferences that must survive app restart
   (startup folder, default Markdown reader).
2. Client-side mechanisms (URL query params for `hideDotfiles`/`searchTrackedMode`, or
   `localStorage` for theme) for page-level view state.

The URL-param pattern is tied to the current page/view and explicitly does not survive a fresh
launch to a blank URL, so it cannot satisfy "remembers position after restart." `localStorage`
is a plausible alternative (used for theme), but its durability inside the macOS native
WKWebView wrapper across app restarts is not an established/tested contract in this codebase,
whereas the server-side JSON-file pattern already is, for exactly this kind of "restart-durable,
single global preference." Reusing an established, tested pattern is lower-risk than
introducing a second one for a single boolean-like enum.

**Alternatives considered**:
- `localStorage` (like `ui/src/services/theme.ts`) — rejected: no established restart-durability
  guarantee in the native macOS wrapper context, and the app already has a dedicated
  server-preference mechanism for exactly this kind of setting.
- URL query parameter (like `hideDotfiles`) — rejected: doesn't survive a fresh app launch,
  which the spec requires.

## Decision 3: Layout mechanics for left/right vs. bottom docking

**Decision**: Keep `TerminalPanel` as a single component with a `dockPosition` prop/state.
For `bottom` (current behavior), it remains a sibling rendered after the app-body row container
inside the outer column flex in `ui/src/App.tsx`, sized by a `height` state, with a
`cursor-row-resize` handle on its top edge. For `left`/`right`, it renders as a flex sibling
*inside* the app-body row container (alongside the sidebar/main content), sized by a `width`
state, with a `cursor-col-resize` handle on the inner edge, and CSS `order` (or conditional
JSX placement) to appear first (left) or last (right) in that row.

**Rationale**: This is the minimal-diff way to add two more dock positions without duplicating
the terminal tab/session logic across three separate components — only the container placement,
the resized dimension (`height` vs `width`), and the drag-delta sign/axis change.

**Alternatives considered**: Absolute/fixed positioning with manual overlap avoidance — rejected,
it would fight the existing flex-based `App.tsx` layout and break the panel's participation in
normal document flow (main content wouldn't reflow to make room, violating FR-011).

## Decision 4: New-terminal creation control

**Decision**: Replace the current `TerminalKindSelect` + create-button pairing with a single
button labeled "New Terminal", rendered identically in the empty state and in
`TerminalTabStrip`. Delete `ui/src/components/TerminalPanel/TerminalKindSelect.tsx` entirely.

**Rationale**: Directly satisfies FR-008/FR-009 and User Story 3. Once there is only one kind of
terminal, a kind selector has nothing left to select — removing it is not just a UI cleanup but
a correctness fix (an empty/meaningless control would be confusing).

**Alternatives considered**: Keep a menu-style button for future extensibility — rejected as
speculative, matching the reasoning in Decision 1.

## Decision 5: Handling of any leftover "claude"/"codex" tab state (FR-012)

**Decision**: No migration code is needed. `session-manager.ts` keeps all sessions in an
in-memory `Map` with no restart persistence (confirmed in existing code), so a `claude`/`codex`
kind value cannot outlive a server restart. Client-side tab state is also not persisted across
a page reload or app restart (`useTerminalPanel.ts` starts empty on mount, per existing
comments). Because the `kind` field is being removed from the type system entirely, any stray
value simply can't exist post-upgrade — this satisfies FR-012 as a natural consequence of
Decision 1 rather than requiring dedicated handling.

**Rationale**: Verified against existing session-manager and hook behavior; adding defensive
migration code for a state shape that cannot occur would be dead code the project's style
guidance discourages.

## Decision 6: Coverage allowlist maintenance

**Decision**: When `TerminalKindSelect.tsx` is deleted, remove its (already-missing) entry from
`ui/vitest.config.ts`'s coverage `include` list if present, and explicitly add every new UI file
this feature introduces (e.g., the dock-position control and the new preference client service)
to that same allowlist as part of the same commit that adds the file.

**Rationale**: `ui/vitest.config.ts` uses an explicit file allowlist rather than a glob, and this
project has twice previously shipped a feature that missed adding a new file to it (specs 038
and 042, per `CLAUDE.md`'s Recent Changes). Calling it out here front-loads that check into
planning rather than leaving it as a review-time surprise.

## Decision 7: Contract documentation location

**Decision**: Author fresh contract docs under `specs/044-simplify-terminal-panel/contracts/`
(`terminal-session-api.md` reflecting the `kind`-free create-session request/response, and
`terminal-panel-preference-api.md` for the two new routes) rather than editing
`specs/032-integrated-terminal-panel/contracts/terminal-api.md` in place, so that feature 032's
historical record stays intact and 044's contract changes are reviewable as their own diff.

**Rationale**: Matches the project's existing pattern of each feature spec directory owning its
own contract snapshot (see how 038/039 each added their own preview-registry contract notes
rather than rewriting 036's).
