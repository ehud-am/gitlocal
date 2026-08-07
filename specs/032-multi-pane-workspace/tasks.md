# Tasks: Multi-Pane Workspace

**Input**: Design documents from `specs/032-multi-pane-workspace/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/multi-pane-workspace-ui.md, quickstart.md

**Tests**: Included — the plan and constitution (90% per-file coverage) require regression coverage for pane/layout state transitions, terminal session lifecycle/isolation (against a mocked `node-pty`), and zero-regression single-pane behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new dependencies and scaffold the new files expected by the plan.

- [ ] T001 Inspect current `App.tsx` single-pane state (`selectedPath`/`selectedPathType`) and existing `ContentPanel.tsx` usage as the baseline this feature must preserve unchanged for FR-013
- [ ] T002 Add `node-pty` and `ws` as direct dependencies in `package.json`
- [ ] T003 Add `@xterm/xterm` and `@xterm/addon-fit` as direct dependencies in `ui/package.json`
- [ ] T004 [P] Create `ui/src/hooks/usePaneWorkspace.ts` and `usePaneWorkspace.test.ts` scaffolds
- [ ] T005 [P] Create the `ui/src/components/Workspace/` folder scaffolds: `WorkspaceShell.tsx`, `TabStrip.tsx`, `LayoutSwitcher.tsx`, `PaneTile.tsx`, `TerminalPane.tsx` and matching `.test.tsx` files
- [ ] T006 [P] Create `src/handlers/terminal.ts` and `terminal.test.ts` scaffolds
- [ ] T007 [P] Create `ui/src/services/terminalSocket.ts` and `terminalSocket.test.ts` scaffolds

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared pane/layout state model that every user story renders on top of.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T008 Add `Pane`, `PaneKind` (`'content' | 'terminal'`), `WorkspaceLayoutMode` (`'tabbed' | '2-column' | '4-tile' | '6-tile'`) types to `ui/src/types/index.ts`
- [ ] T009 Add failing tests for open/close/switch-active/change-layout transitions, including empty-workspace and last-pane-closed edge cases, in `ui/src/hooks/usePaneWorkspace.test.ts`
- [ ] T010 Implement `usePaneWorkspace.ts`: `panes`, `activePaneId`, `layoutMode`, `tilePaneIds` state and open/close/select/change-layout actions per data-model.md's state-transition rules, not persisted (FR-014)
- [ ] T011 Run the focused hook tests with `npm --prefix ui run test -- usePaneWorkspace` and fix issues in `ui/src/hooks/usePaneWorkspace.ts`

**Checkpoint**: Pane/layout state is ready for UI and terminal integration.

---

## Phase 3: User Story 1 - Open multiple files as tabs (Priority: P1) 🎯 MVP

**Goal**: Let a user open more than one file at once as tabs, switch between them, and close individual tabs without losing others.

**Independent Test**: Open two different files as separate tabs, confirm both remain open and switching between them preserves each file's scroll position/view state, and confirm closing one tab leaves the other open.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add a test confirming opening a second file "as a new tab" keeps both panes open and accessible, in `ui/src/App.test.tsx`
- [ ] T013 [P] [US1] Add a test confirming selecting a tab makes its pane the active/visible view while others stay open in the background, in `ui/src/components/Workspace/TabStrip.test.tsx`
- [ ] T014 [P] [US1] Add a test confirming closing one tab leaves remaining tabs open and activates an adjacent one, in `ui/src/components/Workspace/TabStrip.test.tsx`
- [ ] T015 [P] [US1] Add a test confirming a tab for a deleted/moved file shows a clear "file no longer available" state instead of an error or blank pane, in `ui/src/components/Workspace/PaneTile.test.tsx`
- [ ] T016 [P] [US1] Add a test confirming the tab strip stays usable (scroll/overflow) with 20+ open tabs, in `ui/src/components/Workspace/TabStrip.test.tsx`
- [ ] T017 [P] [US1] Add a zero-regression test confirming single-file view/raw/edit behavior is unchanged when exactly one pane is open, in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [ ] T018 [US1] Implement `WorkspaceShell.tsx`: renders `TabStrip` + `LayoutSwitcher` + the active pane's `ContentPanel`/`TerminalPane` in Tabbed Mode
- [ ] T019 [US1] Implement `TabStrip.tsx`: scrollable/overflow-safe tab bar, tab select, tab close controls
- [ ] T020 [US1] Implement `PaneTile.tsx` dispatch for Content Panes: mounts one `ContentPanel` instance per pane keyed by pane id, with a "file no longer available" fallback state
- [ ] T021 [US1] Wire `App.tsx` to render `WorkspaceShell` via `usePaneWorkspace` in place of its current single `ContentPanel` usage, without modifying `ContentPanel.tsx` itself
- [ ] T022 [US1] Add `workspace-tabstrip-*` styles (including overflow/scroll behavior) to `ui/src/styles/globals.css`
- [ ] T023 [US1] Run `npm --prefix ui run test -- usePaneWorkspace WorkspaceShell TabStrip PaneTile App` and fix US1 regressions

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Arrange open panes into a tiled layout (Priority: P2)

**Goal**: Let a user switch open panes from Tabbed Mode into 2-column, 4-tile, or 6-tile simultaneous-view layouts, with no pane lost on switching back.

**Independent Test**: With 3+ tabs open, switch from single/tabbed view to the 2-column layout and confirm two panes render side by side; switch to 4-tile and 6-tile and confirm the corresponding number of panes render simultaneously; switch back to tabbed view and confirm no panes or content are lost.

### Tests for User Story 2

- [ ] T024 [P] [US2] Add tests for selecting 2-column, 4-tile, and 6-tile layouts rendering the right pane count simultaneously, each independently scrollable, in `ui/src/components/Workspace/WorkspaceShell.test.tsx`
- [ ] T025 [P] [US2] Add a test confirming fewer open panes than a layout's capacity renders empty/"open a file" placeholder tiles, in `ui/src/components/Workspace/PaneTile.test.tsx`
- [ ] T026 [P] [US2] Add a test confirming more open panes than a layout's capacity keeps the excess panes reachable (e.g. via tab strip/overflow) rather than closed, in `ui/src/components/Workspace/WorkspaceShell.test.tsx`
- [ ] T027 [P] [US2] Add a test confirming switching back to Tabbed Mode from any tiled layout preserves all previously open panes, in `ui/src/hooks/usePaneWorkspace.test.ts`
- [ ] T028 [P] [US2] Add a test confirming a narrow/small viewport degrades a 4-tile/6-tile layout to a usable stacked arrangement rather than illegibly small tiles, in `ui/src/components/Workspace/WorkspaceShell.test.tsx`

### Implementation for User Story 2

- [ ] T029 [US2] Implement `LayoutSwitcher.tsx`: control to pick Tabbed / 2-column / 4-tile / 6-tile, driving `usePaneWorkspace`'s `layoutMode`
- [ ] T030 [US2] Extend `WorkspaceShell.tsx` to render the CSS-grid tiled view (2-column = 1×2, 4-tile = 2×2, 6-tile = 3×2) using `tilePaneIds`, alongside the existing Tabbed Mode branch from US1
- [ ] T031 [US2] Add empty/"open a file" placeholder rendering in `PaneTile.tsx` for unused tile slots
- [ ] T032 [US2] Add `workspace-grid-*` styles to `ui/src/styles/globals.css`, including the responsive/stacked fallback for narrow viewports
- [ ] T033 [US2] Run `npm --prefix ui run test -- usePaneWorkspace WorkspaceShell LayoutSwitcher PaneTile` and fix US2 regressions

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - See terminal and code together in a live layout (Priority: P3)

**Goal**: Let a user open one or more independent live terminal panes, scoped to the repo's working directory, mixed freely with content panes in any layout.

**Independent Test**: Open a terminal pane and a content pane together in the 2-column layout, run a long-lived command (e.g. an agent or watch process) in the terminal pane, and confirm its output keeps streaming live while the content pane remains independently viewable/scrollable; open a second terminal pane and confirm both run independent sessions.

### Tests for User Story 3

- [ ] T034 [P] [US3] Add server tests for spawning a `node-pty` session per WS connection scoped to the repository root, using a mocked `node-pty` module, in `src/handlers/terminal.test.ts`
- [ ] T035 [P] [US3] Add a server test confirming two concurrent sessions are fully independent (separate `pty` handles, no shared I/O), in `src/handlers/terminal.test.ts`
- [ ] T036 [P] [US3] Add a server test confirming the session's `pty` is killed and removed from the session map on WebSocket close, in `src/handlers/terminal.test.ts`
- [ ] T037 [P] [US3] Add a server test confirming a `pty` process exiting on its own closes the WebSocket (distinct from a client-initiated close), in `src/handlers/terminal.test.ts`
- [ ] T038 [P] [US3] Add client tests for `terminalSocket.ts` covering connect, send-input, receive-output, and close events, in `ui/src/services/terminalSocket.test.ts`
- [ ] T039 [P] [US3] Add tests for `TerminalPane.tsx`'s `connecting`/`connected`/`ended`/`error` states, in `ui/src/components/Workspace/TerminalPane.test.tsx`
- [ ] T040 [P] [US3] Add a test confirming terminal and content panes can occupy tiles side by side in any layout, each remaining live and independently usable, in `ui/src/components/Workspace/WorkspaceShell.test.tsx`
- [ ] T041 [P] [US3] Add a test confirming closing a terminal pane's tab/tile terminates its session (mocked `node-pty` kill call observed), in `ui/src/hooks/usePaneWorkspace.test.ts`

### Implementation for User Story 3

- [ ] T042 [US3] Implement `src/handlers/terminal.ts`: WS upgrade route, in-memory session map, spawn `node-pty` per connection with `cwd` = repository root, stream I/O, kill `pty` and remove the session on close
- [ ] T043 [US3] Register the terminal WebSocket route in `src/server.ts` alongside existing HTTP routes
- [ ] T044 [US3] Implement `ui/src/services/terminalSocket.ts`: WS client wrapper (connect, send input, receive output/close events)
- [ ] T045 [US3] Implement `TerminalPane.tsx`: `@xterm/xterm` + `@xterm/addon-fit` instance bound to one session via `terminalSocket.ts`, handling `connecting`/`connected`/`ended`/`error` states
- [ ] T046 [US3] Add `PaneTile.tsx` dispatch branch for Terminal Panes (renders `TerminalPane` instead of `ContentPanel`)
- [ ] T047 [US3] Wire terminal pane close (tab/tile close) in `usePaneWorkspace.ts` to close the pane's WebSocket, triggering server-side `pty` cleanup (FR-009)
- [ ] T048 [US3] Add `terminal-pane-*` styles to `ui/src/styles/globals.css`
- [ ] T049 [US3] Run `npm --prefix ui run test -- usePaneWorkspace WorkspaceShell PaneTile TerminalPane terminalSocket` and `npm test -- terminal.test`, fix US3 regressions

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, packaging-risk verification, and non-regression checks across the whole feature.

- [ ] T050 [P] Confirm 100% of existing single-file viewing/editing behavior is unaffected (SC-006) by running the full existing `ContentPanel`/`App` suites unchanged
- [ ] T051 [P] Review `TabStrip`, `LayoutSwitcher`, and `TerminalPane` accessibility (keyboard tab switching, focus handling) against `specs/032-multi-pane-workspace/contracts/multi-pane-workspace-ui.md`
- [ ] T052 Verify `node-pty` prebuilt binaries resolve correctly on both the npm package install path and the macOS Homebrew cask's bundled Node runtime — the packaging risk flagged in plan.md (same class of issue as the v0.9.16 `libnode.dylib` bug)
- [ ] T053 Manually confirm no orphaned shell processes remain after closing a terminal pane, closing its browser tab, and quitting the macOS app
- [ ] T054 Run focused verification from `specs/032-multi-pane-workspace/quickstart.md` with `npm --prefix ui run test -- usePaneWorkspace WorkspaceShell TabStrip LayoutSwitcher PaneTile TerminalPane terminalSocket` and `npm test -- terminal.test`
- [ ] T055 Run full server + UI coverage validation with `npm test` and `npm --prefix ui run test:ci`
- [ ] T056 Run full project validation with `npm run lint` and `npm run build`
- [ ] T057 Manually walk the 13 Manual Smoke Samples in `specs/032-multi-pane-workspace/quickstart.md`, including the macOS native-app terminal-spawn check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002-T003 and T004-T007 can run in parallel after T001 starts.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; builds on the `WorkspaceShell`/`PaneTile` components US1 introduces.
- **User Story 3 (Phase 5)**: Depends on Foundational; the server-side terminal handler (T034-T037, T042-T043) can proceed in parallel with US1/US2, but client wiring into `PaneTile`/`WorkspaceShell` depends on those components existing from US1.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2); no dependency on US2 or US3.
- **User Story 2 (P2)**: Can start after Foundational; reuses `WorkspaceShell`/`PaneTile` from US1, so finish US1's components first to avoid rework.
- **User Story 3 (P3)**: Server-side terminal handler is independent of US1/US2 and can be built in parallel; client-side `TerminalPane`/`PaneTile` wiring depends on US1's `WorkspaceShell`/`PaneTile` scaffolding.

### Within Each User Story

- Write story-specific tests first and confirm they fail for the missing behavior.
- State/hook changes before component rendering changes.
- Component rendering before CSS polish when the DOM shape is required for selectors.
- Run the story checkpoint command before moving to the next priority.

### Parallel Opportunities

- T002, T003 can run in parallel; T004-T007 can run in parallel.
- T012, T013, T014, T015, T016, T017 can run in parallel once Phase 2 is complete.
- T024, T025, T026, T027, T028 can run in parallel once US1's components exist.
- T034, T035, T036, T037, T038, T039, T040, T041 can run in parallel once Phase 2 is complete (server-side tests are independent of client-side tests).
- T050 and T051 can run in parallel after all selected user stories are implemented.

---

## Parallel Example: User Story 1

```bash
Task: "T012 [P] [US1] Add a test confirming opening a second file as a new tab keeps both panes open in ui/src/App.test.tsx"
Task: "T013 [P] [US1] Add a test confirming selecting a tab makes its pane active in ui/src/components/Workspace/TabStrip.test.tsx"
Task: "T014 [P] [US1] Add a test confirming closing one tab leaves the others open in ui/src/components/Workspace/TabStrip.test.tsx"
Task: "T015 [P] [US1] Add a test confirming a deleted/moved file's tab shows a clear unavailable state in ui/src/components/Workspace/PaneTile.test.tsx"
Task: "T016 [P] [US1] Add a test confirming the tab strip stays usable with 20+ open tabs in ui/src/components/Workspace/TabStrip.test.tsx"
Task: "T017 [P] [US1] Add a zero-regression test for single-file behavior with one pane open in ui/src/App.test.tsx"
```

## Parallel Example: User Story 3 (server-side)

```bash
Task: "T034 [P] [US3] Add server tests for spawning a node-pty session per WS connection in src/handlers/terminal.test.ts"
Task: "T035 [P] [US3] Add a server test confirming two concurrent sessions are fully independent in src/handlers/terminal.test.ts"
Task: "T036 [P] [US3] Add a server test confirming pty cleanup on WebSocket close in src/handlers/terminal.test.ts"
Task: "T037 [P] [US3] Add a server test confirming a self-exiting pty closes the WebSocket in src/handlers/terminal.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 pane/layout state foundation.
3. Complete Phase 3 User Story 1.
4. Stop and validate with `npm --prefix ui run test -- usePaneWorkspace WorkspaceShell TabStrip PaneTile App`.
5. Demo with two files open as tabs, switching and closing.

### Incremental Delivery

1. Add US1 for multi-tab file viewing.
2. Add US2 for tiled 2/4/6-pane layouts.
3. Add US3 for live terminal panes mixed with content panes.
4. Finish polish, packaging-risk verification, and full validation.

### Parallel Team Strategy

After Phase 2, one developer can focus on `TabStrip`/`WorkspaceShell` tabbed-mode rendering for US1, another on `LayoutSwitcher`/grid rendering for US2, and a third on the server-side `terminal.ts` handler plus `TerminalPane`/`terminalSocket` for US3. Coordinate edits to `WorkspaceShell.tsx` and `PaneTile.tsx` since they are shared across all three stories.

## Notes

- [P] tasks use different files or independent test additions and can run without waiting on non-parallel tasks in the same phase.
- Every user story has an independent test criterion and checkpoint.
- `node-pty` prebuilt-binary packaging risk (flagged in plan.md, same class as the v0.9.16 `libnode.dylib` bug) MUST be verified for both distributions before release — see T052.
- Keep all paths repository-relative in committed docs.
