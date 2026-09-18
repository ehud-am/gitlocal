---

description: "Task list template for feature implementation"
---

# Tasks: Simplify Terminal Panel

**Input**: Design documents from `specs/044-simplify-terminal-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested as TDD in the spec. Test-file update tasks are included
alongside each implementation task because the project constitution requires ≥90% per-file
branch coverage (NON-NEGOTIABLE) and several existing tests directly assert on behavior being
removed/changed here.

**Organization**: Tasks are grouped by user story (US1 = P1, US2 = P2, US3 = P3 from `spec.md`)
so each can be implemented, tested, and delivered independently and in priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and repository-relative

## Path Conventions

Single project layout per `CLAUDE.md`: `src/` (server), `ui/` (React frontend), `tests/`
(server unit/integration tests), `ui/src/**/*.test.*` (UI tests colocated with components).

---

## Phase 1: Setup

**Purpose**: Establish a clean baseline before touching terminal code.

- [X] T001 Run `npm test` (repo root) and `cd ui && npx tsc --noEmit && npm test` to confirm the
      existing suite and coverage gates are green before any change, so later failures are
      attributable to this feature's edits.

**Checkpoint**: Baseline confirmed green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Produce the authoritative inventory of everything referencing terminal "kind" so
every downstream story's removal/edit work is complete and consistent.

**⚠️ CRITICAL**: No user story work should begin until this inventory is confirmed.

- [X] T002 Grep the repository for `TerminalKind`, `'claude'`, `'codex'`, `claudeCliFound`,
      `codexCliFound`, `cli-detection`, and `TerminalKindSelect` across `src/`, `ui/src/`, and
      `tests/` (including `ui/**/*.test.*`) to confirm the removal scope matches
      `research.md` Decision 1 and the file list in `plan.md`'s Project Structure section;
      note any additional reference found so it is covered by a task below.

**Checkpoint**: Removal/edit scope confirmed — User Story 1 implementation can begin.

---

## Phase 3: User Story 1 - Just a plain terminal (Priority: P1) 🎯 MVP

**Goal**: Remove the Claude/Codex terminal-kind concept entirely; every terminal tab is a plain
generic shell with no kind-selection prompt anywhere in the panel.

**Independent Test**: Open the terminal panel and create a new tab — no kind/type choice is
presented, a plain shell opens immediately, and typing `claude` or `codex` into it runs like any
other shell command.

### Implementation for User Story 1

- [X] T003 [P] [US1] Remove the `TerminalKind` type (`'regular' | 'claude' | 'codex'`), the
      `kind` field on `TerminalSession` and `CreateTerminalSessionRequest`, and the
      `TerminalCapabilities.claudeCliFound` / `.codexCliFound` fields in `src/terminal/types.ts`.
- [X] T004 [P] [US1] Delete `src/terminal/cli-detection.ts` and its test
      `tests/unit/terminal/cli-detection.test.ts` (the whole file exists only to probe for the
      `claude`/`codex` executables, per `research.md` Decision 1).
- [X] T005 [US1] Remove the kind-based auto-launch write (the line writing
      `` `${session.kind}\n` `` into the PTY for non-regular kinds) and all other `kind` handling
      in `src/terminal/session-manager.ts` (depends on T003).
- [X] T006 [US1] Remove `VALID_KINDS`, `isValidKind`, `cliUnavailableMessage`, and the
      `cli_not_found` `503` pre-flight branch from `src/handlers/terminal.ts`; the create-session
      handler no longer reads or validates a `kind` field from the request body, matching
      `contracts/terminal-session-api.md` (depends on T003, T005).
- [X] T007 [US1] Update `tests/unit/handlers/terminal.test.ts`: remove kind-validation and
      `cli_not_found` test cases, and add/adjust a case asserting a plain session is created from
      a request with no `kind` field and that an unknown/extra `kind` field sent by an old client
      is silently ignored (depends on T006).
- [X] T008 [US1] Update `tests/unit/terminal/session-manager.test.ts` to remove the auto-launch
      write assertions for `claude`/`codex` kinds (depends on T005).
- [X] T009 [P] [US1] Remove `TerminalKind`, `TerminalSession.kind`, `CreateTerminalSessionRequest.kind`,
      `TerminalTabRef.kind`, and the `TerminalCapabilities` claude/codex fields from
      `ui/src/types/index.ts`.
- [X] T010 [US1] Delete `ui/src/components/TerminalPanel/TerminalKindSelect.tsx` (depends on T009).
- [X] T011 [US1] In `ui/src/components/TerminalPanel/TerminalTabStrip.tsx`, remove the
      `kindIcon()` helper (◆/✳/›_ glyphs), the `pendingKind`/`onPendingKindChange` props, and the
      `TerminalKindSelect` import/usage; the "+" control now calls a plain
      create-new-terminal action with no kind argument (depends on T010).
- [X] T012 [US1] In `ui/src/hooks/useTerminalPanel.ts`, remove the `labelFor()` kind-based
      labeling function and all kind tracking; simplify `openTerminal()` to take no kind
      argument (depends on T009).
- [X] T013 [US1] In `ui/src/components/TerminalPanel/TerminalPanel.tsx`, remove the kind selector
      from the empty-state control so it calls the simplified `openTerminal()` directly with no
      kind argument (depends on T012).
- [X] T014 [US1] Update `ui/src/components/TerminalPanel/TerminalPanel.test.tsx` to remove
      kind-selection assertions and assert the empty state opens a plain shell with one action
      (depends on T013).
- [X] T015 [US1] Update `ui/src/components/TerminalPanel/TerminalTabStrip.test.tsx` to remove
      kind-selector assertions (depends on T011).
- [X] T016 [US1] Update `ui/src/hooks/useTerminalPanel.test.ts` to remove kind-related test cases
      (depends on T012).
- [X] T017 [US1] Remove any `TerminalKindSelect.tsx` entry from `ui/vitest.config.ts`'s coverage
      `include` allowlist, since the file no longer exists (depends on T010).

**Checkpoint**: User Story 1 is fully functional and independently testable — no kind selection
remains anywhere, and `claude`/`codex` still work when typed manually into a plain shell.

---

## Phase 4: User Story 2 - Choose where the terminal panel docks (Priority: P2)

**Goal**: The terminal panel can be docked to the bottom, left, or right, defaults to right on
first use, and remembers the chosen position across app restarts without disrupting open
sessions.

**Independent Test**: With the terminal panel open and tabs running, switch position among
bottom/left/right and confirm the panel relocates, resizes correctly, and keeps all open
sessions/scrollback; restart the server and confirm the last-chosen position is restored.

### Implementation for User Story 2

- [X] T018 [P] [US2] Add a `TerminalPanelPreference` type with
      `dockPosition: 'bottom' | 'left' | 'right'` to `src/types.ts`.
- [X] T019 [US2] Create `src/services/terminal-panel-preference.ts`, mirroring
      `src/services/startup-preferences.ts`: reads/writes
      `~/.gitlocal/terminal-panel-preference.json` (path overridable via the
      `GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH` env var, matching the existing
      `GITLOCAL_STARTUP_PREFERENCE_PATH` convention); per `data-model.md`, a missing, corrupt, or
      unreadable file resolves to the default `'right'` rather than erroring, and the default is
      not written to disk until the user explicitly changes it (depends on T018).
- [X] T020 [US2] Register `GET /api/terminal-panel-preference` and
      `PUT /api/terminal-panel-preference` routes in `src/server.ts`, matching
      `contracts/terminal-panel-preference-api.md`: `GET` returns `{"dockPosition": ...}`
      (default `"right"` when unset); `PUT` validates `dockPosition` is one of
      `'bottom' | 'left' | 'right'` and returns `400 {"error":"Invalid dockPosition"}` for any
      other value (depends on T019).
- [X] T021 [P] [US2] Add `tests/unit/services/terminal-panel-preference.test.ts` covering:
      default returned when the file is missing, a value persists and is re-read correctly, and
      a corrupt/unreadable file falls back to the default instead of throwing (depends on T019).
- [X] T022 [P] [US2] Add handler tests for the two new routes (valid `PUT`, invalid
      `dockPosition` value returns `400`, `GET` returns the default when unset) in
      `tests/unit/handlers/terminal.test.ts` or a new adjacent test file (depends on T020).
- [X] T023 [P] [US2] Add a `DockPosition` type (`'bottom' | 'left' | 'right'`) to
      `ui/src/types/index.ts`.
- [X] T024 [US2] Create `ui/src/services/terminalPanelPreference.ts` with `getDockPosition()`
      and `setDockPosition(position)` calling the new API routes (depends on T023, T020).
- [X] T025 [US2] Add `dockPosition` state to `ui/src/hooks/useTerminalPanel.ts`: fetch it once on
      mount (falling back to `'right'` on error), and persist any change via the new client
      (depends on T024).
- [X] T026 [US2] Rework `ui/src/components/TerminalPanel/TerminalPanel.tsx`'s layout to be
      orientation-aware: keep the existing `height` state + `cursor-row-resize` handle
      (`data-testid="terminal-panel-resize-handle"`) for `dockPosition === 'bottom'`; add a
      `width` state + `cursor-col-resize` handle for `'left'`/`'right'`, flipping the drag-delta
      sign/axis for the horizontal case per `research.md` Decision 3 (depends on T025).
- [X] T027 [US2] Update `ui/src/App.tsx` so `TerminalPanel` renders as a column-flex sibling
      after the `app-body` container when `dockPosition === 'bottom'` (current behavior), or as a
      row-flex sibling *inside* the `app-body` row container — ordered first for `'left'`, last
      for `'right'` — otherwise (depends on T026).
- [X] T028 [US2] Add a dock-position control (e.g., a three-way Bottom/Left/Right toggle) to the
      terminal panel's toolbar area, wired to the `dockPosition` state from T025 (depends on T025).
- [X] T029 [US2] Verify the existing Ctrl+` toggle shortcut (`TerminalPanel.tsx`) and, on macOS,
      the native "Toggle Terminal" menu item continue to show/hide the panel correctly for all
      three dock positions (depends on T026).
- [X] T030 [P] [US2] Update `ui/src/components/TerminalPanel/TerminalPanel.test.tsx` to cover:
      default position is `'right'` with no prior preference, switching among all three
      positions updates layout/resize-handle orientation, and open tabs/scrollback survive a
      position change (depends on T026, T028).
- [X] T031 [P] [US2] Update `ui/src/hooks/useTerminalPanel.test.ts` to cover dock-position
      fetch-on-mount and persist-on-change behavior (depends on T025).
- [X] T032 [US2] Add `ui/src/services/terminalPanelPreference.ts` and the new dock-position
      control (if implemented as its own component file) to `ui/vitest.config.ts`'s coverage
      `include` allowlist (depends on T024, T028).

**Checkpoint**: User Stories 1 AND 2 both work independently — the panel is kind-free and can be
docked bottom/left/right with the choice surviving a restart.

---

## Phase 5: User Story 3 - A clear, unambiguous way to open a new terminal (Priority: P3)

**Goal**: One clearly labeled, consistently placed "New Terminal" action replaces the old
kind-selector-plus-create control, behaving identically whether the panel is empty or already
has tabs, with clear sequential tab labels.

**Independent Test**: From both the empty terminal panel and a panel with existing tabs, the
"new terminal" control looks and behaves the same way, and each new tab is labeled sequentially
("Terminal 1", "Terminal 2", ...).

### Implementation for User Story 3

- [X] T033 [US3] Extract a single shared "New Terminal" action (e.g., a small reusable button
      component) used both by the empty-state prompt in
      `ui/src/components/TerminalPanel/TerminalPanel.tsx` and the tab-strip control in
      `ui/src/components/TerminalPanel/TerminalTabStrip.tsx`, so both places render identical
      label/styling/behavior (depends on T013, T011).
- [X] T034 [US3] Simplify the tab-labeling logic in `ui/src/hooks/useTerminalPanel.ts` to a plain
      sequential counter producing labels "Terminal 1", "Terminal 2", ... per `data-model.md`'s
      `TerminalTab.label` definition, removing any leftover per-kind ordinal logic
      (depends on T012).
- [X] T035 [US3] Update `ui/src/components/TerminalPanel/TerminalTabStrip.test.tsx` and
      `ui/src/components/TerminalPanel/TerminalPanel.test.tsx` to assert the shared "New
      Terminal" control renders with the same label/test id in both the empty state and the tab
      strip, and that repeated clicks produce correctly numbered tabs (depends on T033, T034).
- [X] T036 [US3] Manually run `quickstart.md` Scenario 3 ("Single, consistent 'New Terminal'
      action") against a local dev build and confirm no visual or behavioral inconsistency
      remains between the two entry points (depends on T033, T034).

**Checkpoint**: All three user stories are independently functional — kind-free terminals,
configurable docking, and one consistent new-terminal action.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wrap-up items that span all three stories.

- [X] T037 [P] Add a note to `specs/032-integrated-terminal-panel/contracts/terminal-api.md`
      indicating its `kind` field is superseded by
      `specs/044-simplify-terminal-panel/contracts/terminal-session-api.md`, per `research.md`
      Decision 7 (historical record only — do not rewrite feature 032's contract in place).
- [X] T038 [P] Run `npm test` (repo root) and `cd ui && npx tsc --noEmit && npm test` to confirm
      ≥90% per-file branch coverage on every changed, added, and removed file (Constitution
      Principle II).
- [X] T039 Run all four scenarios in `quickstart.md` end-to-end in a local dev build (kind
      removal, dock-position default/switch/persistence-across-restart, consistent new-terminal
      control, Ctrl+` and native macOS menu regression checks).
- [X] T040 Add a `CHANGELOG.md` entry describing the terminal-panel simplification (kind removal,
      configurable docking, unified new-terminal control), per Constitution Principle VII.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories (confirms removal scope).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational. Touches the same UI files US1 already
  simplified (`TerminalPanel.tsx`, `useTerminalPanel.ts`), so implement after US1 completes to
  avoid merge conflicts on the same lines, even though its acceptance criteria are independent
  of US1's.
- **User Story 3 (Phase 5)**: Depends on Foundational, and builds directly on the plain
  create-action introduced in US1 (T011, T013) — implement after US1, and after or alongside US2
  (US3's shared-button extraction does not depend on US2's layout changes).
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories — the MVP slice.
- **User Story 2 (P2)**: Independently testable on its own merits, but implemented after US1 to
  avoid concurrent edits to the same files.
- **User Story 3 (P3)**: Builds on the plain create-action from US1; independently testable
  regardless of whether US2 has landed.

### Parallel Opportunities

- T003 and T009 (server vs. UI type removal) can run in parallel.
- T018 and T023 (server vs. UI `DockPosition` type addition) can run in parallel.
- T021 and T022 (new service tests vs. new handler tests) can run in parallel once T019/T020 land.
- T030 and T031 (UI test updates for US2) can run in parallel once their respective implementation
  tasks land.
- T037 and T038 in Polish can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Type removal can happen in parallel (different files):
Task: "Remove TerminalKind/kind fields in src/terminal/types.ts"
Task: "Remove TerminalKind/kind fields in ui/src/types/index.ts"
```

## Parallel Example: User Story 2

```bash
# New shared type additions can happen in parallel (different files):
Task: "Add TerminalPanelPreference type to src/types.ts"
Task: "Add DockPosition type to ui/src/types/index.ts"

# Once the service/handler exist, their tests can be written in parallel:
Task: "Add tests/unit/services/terminal-panel-preference.test.ts"
Task: "Add handler tests for the new preference routes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (removal-scope inventory).
3. Complete Phase 3: User Story 1 — kind concept fully removed.
4. **STOP and VALIDATE**: Confirm no kind prompt appears anywhere and `claude`/`codex` still work
   when typed manually; run `npm test` and `ui`'s type-check/test suite.
5. Deploy/demo if ready — this alone delivers the requested cleanup.

### Incremental Delivery

1. Setup + Foundational → baseline confirmed.
2. Add User Story 1 → validate independently → MVP.
3. Add User Story 2 → validate independently (position switch + restart persistence + session
   preservation) → next increment.
4. Add User Story 3 → validate independently (consistent control + labeling) → final increment.
5. Polish (contract note, coverage confirmation, full quickstart pass, changelog).

---

## Notes

- [P] tasks touch different files with no incomplete dependency.
- [Story] labels map every user-story-phase task to US1/US2/US3 for traceability.
- Test-update tasks accompany each implementation task to keep the project's ≥90% per-file
  branch coverage gate green (Constitution Principle II) — they are maintenance/coverage tasks,
  not TDD test-first tasks, since TDD was not explicitly requested.
- Every task that adds a new UI file explicitly calls out updating `ui/vitest.config.ts`'s
  coverage `include` allowlist, per the recurring gap noted in `research.md` Decision 6 and
  `CLAUDE.md`'s history on specs 038/042.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently before continuing.
