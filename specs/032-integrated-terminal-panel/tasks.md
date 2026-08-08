# Tasks: Integrated Terminal Panel

**Input**: Design documents from `specs/032-integrated-terminal-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/terminal-api.md, quickstart.md

**Tests**: Included throughout. Test Coverage is Principle II (NON-NEGOTIABLE, ≥90% per-file) — this feature is not optional-tests scope.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3) so each story is independently implementable, testable, and deliverable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on other unfinished tasks in this batch)
- **[Story]**: Maps the task to US1–US5 from spec.md
- File paths below match `plan.md`'s Project Structure section exactly

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Add new dependencies: `node-pty`, `ws` to root `package.json`; `@xterm/xterm`, `@xterm/addon-fit` to `ui/package.json`
- [ ] T002 [P] Mark `node-pty` `--external` in the `build:server` esbuild command in `package.json` (esbuild cannot bundle native `.node` addons); confirm `npm run build` still produces a runnable `dist/index.js`
- [ ] T003 [P] Add `node-pty`'s platform binary to the npm package `files` list in `package.json` and note (as a comment or short doc) the equivalent copy step still needed in `packaging/macos/` for the Homebrew app bundle — full packaging-script automation happens in T045, this task only makes local dev builds runnable

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Define `TerminalKind`, session `status`, and related types in `src/terminal/types.ts` per `data-model.md`
- [ ] T005 Implement `src/terminal/session-manager.ts`: in-memory `TerminalSession` registry (create/get/list/close) with the PTY spawn call behind an injectable factory, per `research.md`'s testability strategy
- [ ] T006 [P] Implement `src/terminal/cli-detection.ts`: PATH pre-flight check for `claude`/`codex` (FR-010) and a platform PTY-capability probe (FR-015)
- [ ] T007 Implement `src/terminal/websocket.ts`: WS upgrade handling, framing input/resize (client→server) and output/exit (server→client) per `contracts/terminal-api.md`
- [ ] T008 Implement `src/handlers/terminal.ts`: `POST/GET /api/terminal/sessions`, `DELETE /api/terminal/sessions/:id`, `GET /api/terminal/capabilities`, following the existing handler pattern in `src/handlers/file.ts`/`folder.ts`
- [ ] T009 Register the new terminal routes and WS upgrade in `src/server.ts` alongside existing handlers
- [ ] T010 [P] Implement `ui/src/services/terminalApi.ts`: REST client + WebSocket connection helper matching `contracts/terminal-api.md`
- [ ] T011 [P] Implement `ui/src/hooks/useTerminalPanel.ts`: panel/tab state (`visible`, `tabs`, `activeTabId`) per `data-model.md`'s `TerminalPanel`/`TerminalTabRef`
- [ ] T012 Create `ui/src/components/TerminalPanel/TerminalPanel.tsx` as an empty-state shell and mount it once at the `App.tsx` root layout level (outside the page-specific content area) so it persists across all page/content types (FR-001, FR-013)

**Checkpoint**: Server can create/list/close a session and stream I/O over a WebSocket; UI has a mounted (empty) panel wired to the API client. No user-visible terminal yet — that starts in US1.

---

## Phase 3: User Story 1 - Always-there terminal while browsing the repo (Priority: P1) 🎯 MVP

**Goal**: A single terminal that a user can open, use, and that survives navigating between page/content types without being restarted.

**Independent Test**: Open the panel, run a command, navigate through folder/git/file views, confirm output and running state are unchanged on return.

### Tests for User Story 1

- [x] T013 [P] [US1] Unit tests for `session-manager.ts` lifecycle (`starting`→`running`→`exited`) using an injected fake PTY, in `tests/unit/terminal/session-manager.test.ts`
- [x] T014 [P] [US1] Contract tests for `POST/GET/DELETE /api/terminal/sessions` in `tests/unit/handlers/terminal.test.ts`
- [x] T015 [P] [US1] Integration test spawning a real shell (e.g. `sh -c 'echo hi'`), writing input, reading output, and closing, in `tests/integration/terminal.test.ts`

### Implementation for User Story 1

- [x] T016 [US1] Implement `ui/src/components/TerminalPanel/TerminalView.tsx`: mount `@xterm/xterm` + `addon-fit`, connect to a session's WebSocket, wire input/output/resize (depends on T010, T012)
- [x] T017 [US1] Wire an "open terminal" action in `TerminalPanel.tsx` to create a Regular-kind session via `useTerminalPanel`/`terminalApi` and render its `TerminalView` (depends on T016)
- [x] T018 [US1] Default a new session's working directory to the repository root (simple default for this story; smart cwd-follow arrives in US5), resolved server-side in `src/handlers/terminal.ts`/`session-manager.ts` via the existing `classifyLocalPath()` in `src/git/repo.ts`
- [x] T019 [US1] [P] UI test confirming a running session's output/state is unchanged when unrelated App-level state changes (e.g. `selectedPath`/`viewerRepoPath`) without `TerminalPanel` unmounting, in `ui/src/components/TerminalPanel/TerminalPanel.test.tsx`
- [x] T020 [US1] [P] Regression test asserting no terminal state is read from `localStorage`/URL params on mount, so a full reload always starts with zero sessions (FR-016)

**Checkpoint**: MVP — a user can open one persistent terminal that survives in-app navigation.

---

## Phase 4: User Story 2 - Show and hide the panel without losing sessions (Priority: P1)

**Goal**: Collapse/expand the panel freely without ending any running session.

**Independent Test**: Hide the panel mid-output, confirm the session keeps running, show it again and confirm output continuity.

### Tests for User Story 2

- [x] T022 [US2] [P] UI test: hiding the panel issues no WS-close or session-close call, and output produced while hidden is visible on show, in `ui/src/components/TerminalPanel/TerminalPanel.test.tsx`
- [x] T023 [US2] [P] UI test: panel visibility persists across unrelated App state changes until explicitly toggled

### Implementation for User Story 2

- [x] T021 [US2] Add a show/hide control to `TerminalPanel.tsx`, implemented as a CSS visibility toggle (not conditional unmount) so mounted `TerminalView` instances and their WebSocket connections are unaffected by hiding (FR-002, FR-003)

**Checkpoint**: Panel can be freely collapsed/expanded without disrupting sessions.

---

## Phase 5: User Story 3 - Multiple independent terminal tabs (Priority: P2)

**Goal**: Multiple concurrent, independently closable terminal tabs.

**Independent Test**: Open 3 tabs, run distinct commands, close one, confirm the other two are unaffected.

### Tests for User Story 3

- [x] T028 [US3] [P] Unit test: `session-manager.ts` supports ≥6 concurrent sessions with no cross-talk between their I/O streams (SC-003), in `tests/unit/terminal/session-manager.test.ts`
- [x] T029 [US3] [P] UI test: open 3 tabs, produce distinct output in each, close the middle tab, confirm the other two are unaffected, in `ui/src/components/TerminalPanel/TerminalTabStrip.test.tsx`

### Implementation for User Story 3

- [x] T024 [US3] Implement `ui/src/components/TerminalPanel/TerminalTabStrip.tsx`: render open tabs, an open-new-tab control, per-tab close, active-tab switching (depends on T011)
- [x] T025 [US3] Wire `TerminalTabStrip` into `TerminalPanel.tsx`; keep every open tab's `TerminalView` mounted (CSS-hidden when inactive) so switching tabs never loses scrollback (same pattern as T021)
- [x] T026 [US3] Implement per-tab close: call `DELETE /api/terminal/sessions/:id` via `terminalApi`, unmount that tab's `TerminalView`, leave other tabs untouched (FR-004, FR-005)
- [x] T027 [US3] Empty-state UI when the last tab is closed — a clear "open a terminal" prompt, not an error (Edge Cases)

**Checkpoint**: Multiple concurrent, independently closable terminal tabs work.

---

## Phase 6: User Story 4 - Choose the terminal kind: regular, Claude, or Codex (Priority: P2)

**Goal**: New tabs can be Regular, Claude, or Codex, with Claude/Codex auto-launching their CLI.

**Independent Test**: Open a Claude tab and confirm the CLI auto-starts; repeat for Codex; confirm Regular stays a plain shell; confirm a missing CLI shows a clear message.

### Tests for User Story 4

- [x] T035 [US4] [P] Unit tests for `cli-detection.ts` (found/not-found PATH cases, platform capability probe), in `tests/unit/terminal/cli-detection.test.ts`
- [x] T036 [US4] [P] Unit test: `session-manager.ts` auto-types the correct launch command for `claude`/`codex` kinds against the fake PTY once the shell is ready, and sends nothing extra for `regular`, in `tests/unit/terminal/session-manager.test.ts`
- [x] T037 [US4] [P] UI test: opening a Claude/Codex tab shows the CLI starting; with capabilities mocked as "missing," the tab shows the not-available message instead, in `ui/src/components/TerminalPanel/TerminalTabStrip.test.tsx`

### Implementation for User Story 4

- [x] T030 [US4] Extend the "open new tab" flow with a kind picker (Regular/Claude/Codex) in `TerminalTabStrip.tsx`/`TerminalPanel.tsx`, sending `kind` in the create-session request (FR-007)
- [x] T031 [US4] Implement server-side auto-launch in `session-manager.ts`/`websocket.ts`: once the PTY reports its shell prompt is ready, write the `claude`/`codex` command + newline for non-regular kinds (FR-008, FR-009)
- [x] T032 [US4] Wire `cli-detection.ts`'s pre-flight check into `POST /api/terminal/sessions`: return `503 cli_not_found` before spawning if the requested kind's CLI isn't resolvable (FR-010)
- [x] T033 [US4] Render the "tool not available" message in `TerminalView.tsx`/`TerminalPanel.tsx` when a session's status is `unavailable`, instead of an empty terminal
- [x] T034 [US4] Add a kind icon/label to tab strip entries so Regular/Claude/Codex tabs are visually distinguishable (US4 acceptance scenario 5)

**Checkpoint**: All three terminal kinds work end-to-end, including the missing-CLI failure path.

---

## Phase 7: User Story 5 - New terminal opens where you're looking (Priority: P3)

**Goal**: New tabs default their working directory to whatever folder/file is currently visible.

**Independent Test**: Browse a nested folder or open a file, open a new tab, confirm `pwd` matches; confirm an already-open tab's cwd never changes afterward.

### Tests for User Story 5

- [x] T041 [US5] [P] Unit tests: cwd resolution for file/dir/none `contextType` values and the deleted/moved-path fallback, in `tests/unit/handlers/terminal.test.ts`
- [x] T042 [US5] [P] UI test: opening a new tab from a nested folder/file view sends the expected `contextPath`/`contextType`, in `ui/src/services/terminalApi.test.ts`

### Implementation for User Story 5

- [x] T038 [US5] Extend `terminalApi.ts`'s create-session call to send `contextPath`/`contextType` derived from `App.tsx`'s current `viewerRepoPath`/`selectedPath`/`selectedPathType` (FR-011)
- [x] T039 [US5] Implement server-side resolution in `src/handlers/terminal.ts`: parent directory when `contextType` is `file`, the path itself when `dir`, repository root when `none` or resolution fails, via `classifyLocalPath()` (FR-011, Edge Cases)
- [x] T040 [US5] Confirm via test (no new production code expected) that an already-open tab's `cwd` is never recomputed after creation — `session-manager.ts` treats `cwd` as immutable post-creation (FR-012)

**Checkpoint**: All 5 user stories independently functional; feature matches `spec.md` in full.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Accessibility pass: keyboard operability + correct ARIA roles/names/states for every `TerminalPanel` control (show/hide, tab open/close/switch, kind picker); extend `jest-axe` assertions in `TerminalPanel.test.tsx` and `TerminalTabStrip.test.tsx` (FR-014, SC-006)
- [ ] T044 [P] Visual polish pass: align `TerminalPanel` styling with the app's existing minimal, GitHub-inspired design language (Principle V, FR-017)
- [ ] T045 Validate `node-pty` native binary packaging end-to-end for both distributions: `npm run build` output and the macOS Homebrew app bundling step (`packaging/macos/`) each include the correct per-platform binary; this directly resolves the risk flagged in `plan.md` Complexity Tracking
- [ ] T046 Run `quickstart.md` manual validation for all 5 user stories
- [ ] T047 Run `npm run verify` (full suite + coverage + build + audit); confirm ≥90% per-file coverage on every new/modified file (SC-008) and zero regressions in existing suites (SC-007)
- [ ] T048 Update `CLAUDE.md`'s "Recent Changes" entry for 032-integrated-terminal-panel to reflect implementation completion (currently reads "Not yet implemented" from the `/plan` step)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational; ordered here by priority (P1 → P1 → P2 → P2 → P3) but each is independently testable once Foundational is done
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — the MVP
- **US2 (P1)**: Builds on US1's mounted panel/session, but is independently testable (show/hide behavior)
- **US3 (P2)**: Builds on US1/US2's panel; independently testable (tab management)
- **US4 (P2)**: Builds on US3's tab-open flow (adds the kind picker to it); independently testable (kind behavior)
- **US5 (P3)**: Builds on US1's session-creation path (adds cwd context); independently testable (cwd behavior)

### Parallel Opportunities

- T002/T003 (Setup) in parallel
- T006, T010, T011 (Foundational) in parallel once T004/T005 land
- Within each story, all `[P]`-marked test tasks can run in parallel with each other before that story's implementation tasks begin
- Different user stories can be staffed in parallel once Foundational is complete, though US4 depends on US3's tab-open UI existing first

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1)
3. **STOP and VALIDATE**: run `quickstart.md`'s US1 section
4. This alone is a shippable increment: a persistent terminal, always available, surviving navigation

### Incremental Delivery

Setup + Foundational → US1 (MVP) → US2 (show/hide) → US3 (multi-tab) → US4 (kinds) → US5 (smart cwd) → Polish. Each checkpoint above is independently demoable; validate with the matching `quickstart.md` section before moving on.

---

## Notes

- `[P]` tasks touch different files with no unfinished-task dependency
- Commit after each task or logical group, per this repo's standard git workflow
- Re-run `npm run verify` at every story checkpoint, not just at the end, to catch coverage regressions early given Principle II is non-negotiable
- The native-dependency packaging risk (T003, T045) is the one item in this plan most likely to reveal unknowns mid-implementation — treat any surprises there as blocking for release, not merely nice-to-fix
