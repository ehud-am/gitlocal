# Tasks: Patch Bug Fixes (0.10.2)

**Input**: Design documents from `specs/034-patch-bugfixes/`
**Prerequisites**: plan.md, spec.md, quickstart.md

**Tests**: Included — per Constitution Principle II (NON-NEGOTIABLE ≥90% per-file branch coverage), existing suites are extended alongside each change rather than treated as optional.

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and shipped independently. There is no Foundational phase — this feature adds no shared infrastructure; every story is a self-contained change to existing files, though US4 and US6 share one new UI control (introduced by US4, extended by US6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)

## Path Conventions

Existing single-repo layout: `src/` (Hono backend), `ui/src/` (Vite/React frontend), `tests/` (server Vitest suites), `native/macos/GitLocal/GitLocal/` (Swift native wrapper).

---

## Phase 1: User Story 1 - Folder view scrolls again (Priority: P1) 🎯 MVP

**Goal**: Restore folder/content-view scrolling, broken since the terminal panel's introduction (032), by fixing the flex min-height chain.

**Independent Test**: Per quickstart.md US1 — open a folder with 30+ entries, scroll it fully in each terminal panel state (hidden/collapsed/expanded).

### Tests for User Story 1

- [x] T001 [US1] Add a regression assertion to `ui/src/App.test.tsx` that the `main.content-area` element carries `min-h-0` alongside its existing `flex min-w-0 flex-1 flex-col` classes, so the fix can't silently regress.

### Implementation for User Story 1

- [x] T002 [US1] Add the missing `min-h-0` class to the `main` element's `className` in `ui/src/App.tsx:1296` (currently `"content-area flex min-w-0 flex-1 flex-col"`), matching the `min-h-0 flex-1 overflow-hidden` pattern already correctly applied to its ancestor (`app-body`, line 1233) and descendant wrapper divs (lines 1275, 1393) so `.content-panel`'s `height: 100%; overflow: auto` (`ui/src/styles/globals.css:1085-1092`) can actually activate instead of `main` growing to fit its content.

**Checkpoint**: Folder/content view scrolls fully to its last entry regardless of terminal panel state.

---

## Phase 2: User Story 2 - Claude terminal tabs launch without a PATH error (Priority: P1)

**Goal**: Claude/Codex terminal tabs resolve the CLI the same way an interactively-typed command in a Regular tab does, instead of failing the pre-flight PATH check.

**Independent Test**: Per quickstart.md US2 — with `claude` resolvable only via a shell profile, confirm a Regular tab already works, then confirm a Claude tab now launches instead of erroring; confirm a genuinely-missing CLI still errors.

**Depends on**: Nothing from US1; touches entirely different files (`src/terminal/cli-detection.ts` vs `ui/src/App.tsx`).

### Tests for User Story 2

- [x] T003 [P] [US2] Add test cases to `tests/unit/terminal/cli-detection.test.ts` for `detectCapabilities()`'s new login-shell fallback: mock `node:child_process`'s `execFileSync` to (a) return a path when the raw PATH walk misses but the shell probe succeeds, (b) throw/timeout and confirm the result is treated as "not found" (fail closed, FR-003), and (c) confirm `isCliAvailable()` itself is untouched — its existing pure-PATH-walk test cases in this file must still pass unmodified.

### Implementation for User Story 2

- [x] T004 [US2] In `src/terminal/cli-detection.ts`, add a login-shell fallback used only inside `detectCapabilities()` (not `isCliAvailable`, which keeps its existing synchronous PATH-walk-only contract): when `isCliAvailable(command, process.env.PATH)` misses, run `execFileSync(shell, ['-ilc', \`command -v ${command}\`], { timeout: 2000 })` where `shell = process.env.SHELL || '/bin/sh'`, on `darwin`/`linux` only (`win32` keeps raw-PATH-only behavior per plan.md Phase 0 Research #1).
- [x] T005 [US2] Treat any thrown error or timeout from the `execFileSync` probe as "not found" — no exception should propagate out of `detectCapabilities()`, and a timeout/error must never be interpreted as a false positive (FR-003).
- [x] T006 [US2] Apply the same fallback to both `claudeCliFound` and `codexCliFound` in `detectCapabilities()`'s return shape (FR-002's acceptance scenario 2: Codex must share the fix, not just Claude).

**Checkpoint**: Claude and Codex terminal tabs launch successfully whenever the CLI is resolvable from the user's interactive shell; a genuinely-missing CLI still surfaces the existing "not found on PATH" error.

---

## Phase 3: User Story 3 - Terminal panel toggle is discoverable in the native menu (Priority: P2)

**Goal**: Expose the existing, already-working Ctrl+\` terminal toggle as a discoverable native macOS menu item, without introducing any new shortcut.

**Independent Test**: Per quickstart.md US3 — open the native View menu, confirm "Toggle Terminal" (Ctrl+\`) is present and works from the menu; confirm Ctrl+\` itself is unchanged in both distributions.

**Depends on**: Nothing from US1/US2; touches `ui/src/App.tsx` (a new native-command branch) and the native Swift wrapper, both independent of the prior two stories' files.

### Tests for User Story 3

- [x] T007 [P] [US3] Update `ui/src/App.test.tsx` to assert that dispatching a `gitlocal:native-command` event with `detail.command === 'toggle-terminal'` calls `terminalPanelRef.current.toggleTerminal()` (mirroring the existing `'refresh'`/`'select-all-panel'` branch tests in the same suite).

### Implementation for User Story 3

- [x] T008 [US3] Add a `'toggle-terminal'` branch to the `handleNativeCommand` listener in `ui/src/App.tsx` (in the `if (command === ...)` chain at lines 543-591, alongside `'refresh'`/`'select-all-panel'`), calling `terminalPanelRef.current?.toggleTerminal()` and `event.preventDefault()`.
- [x] T009 [US3] Add `@objc func toggleTerminal(_ sender: Any?)` to `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`, following the exact pattern of the existing `refreshViewer(_:)` (lines 51-52), dispatching `dispatchNativeCommand("toggle-terminal")`.
- [x] T010 [US3] Add a "Toggle Terminal" `NSMenuItem` to the View menu in `native/macos/GitLocal/GitLocal/AppDelegate.swift` (alongside Refresh at lines 155-161), with `keyEquivalent: "\`"` and `keyEquivalentModifierMask: [.control]` (not `.command`, matching FR-004/FR-005 exactly), wired to the new `toggleTerminal(_:)` selector.

**Checkpoint**: The native app's View menu shows a "Toggle Terminal" item with Ctrl+\` as its key equivalent; selecting it toggles the panel identically to pressing Ctrl+\` directly, in both distributions.

---

## Phase 4: User Story 4 - Dotfile visibility is a single global setting (Priority: P2)

**Goal**: Replace the two independent, unsynchronized "Hide .* files" toggles with one shared, persisted setting, exposed via the native menu and a new browser toolbar control.

**Independent Test**: Per quickstart.md US4 — toggle dotfile visibility from the new single control and confirm both the sidebar file tree and content panel update together; confirm no inline toggle remains in either place; confirm the setting persists across reload.

**Depends on**: Nothing from US1-US3. Should land before US6 (Phase 6), since US6 extends the same new "View options" browser toolbar control this story introduces.

### Tests for User Story 4

- [x] T011 [P] [US4] Update `ui/src/components/FileTree/FileTree.test.tsx` to assert `showDotfiles`/hide-dotfiles behavior is driven by a prop, not local state, and that the inline "Hide .* files" checkbox (previously around line 249) is gone.
- [x] T012 [P] [US4] Update `ui/src/components/ContentPanel/ContentPanel.test.tsx` to assert the same prop-driven behavior and that its inline checkbox (previously around line 711) is gone.
- [x] T013 [P] [US4] Update `ui/src/App.test.tsx` to assert: the new "View options" toolbar control renders a dotfile-visibility toggle that updates both `FileTree` and `ContentPanel` props together, the setting round-trips through `viewerState.ts`'s persistence, and the `gitlocal:native-command` `'toggle-dotfiles'` branch flips the same shared state.

### Implementation for User Story 4

- [x] T014 [US4] Add a `hideDotfiles: boolean` field to the `ViewerState` interface in `ui/src/types/index.ts:103` and its default/read/write handling in `ui/src/services/viewerState.ts` (`readViewerState()`/`writeViewerState()`), following the existing pattern used for `generatedLocalVisibility`.
- [x] T015 [US4] Add shared `hideDotfiles`/`setHideDotfiles` state to `ui/src/App.tsx`, initialized from `readViewerState()` and persisted via `writeViewerState()` on change.
- [x] T016 [US4] Remove the local `showDotfiles` state, `filterDotfiles()` call, and inline checkbox from `ui/src/components/FileTree/FileTree.tsx` (state at line 56, filter call at line 186, checkbox+label at lines 246-249); accept the value as a prop from `App.tsx` instead.
- [x] T017 [US4] Remove the local `showDotfiles` state and inline checkbox from `ui/src/components/ContentPanel/ContentPanel.tsx` (state at line 251, usages at lines 564/662, checkbox+label at lines 708-711); accept the value as a prop from `App.tsx` instead.
- [x] T018 [US4] Pass the shared `hideDotfiles` value from `App.tsx` into both `FileTree` and `ContentPanel`.
- [x] T019 [US4] Add a new "View options" toolbar control to `ui/src/App.tsx`, rendered only in the browser distribution (gated on `postNativeAppCommand`'s existing native-WebView detection returning `false`, i.e. `!window.webkit?.messageHandlers?.gitlocalNative`), containing the dotfile-visibility toggle (Tracked/All/Local is added to this same control in Phase 6/T028).
- [x] T020 [US4] Add a `'toggle-dotfiles'` branch to the `handleNativeCommand` listener in `ui/src/App.tsx` (same chain as T008), flipping the shared `hideDotfiles` state.
- [x] T021 [US4] Add `@objc func toggleDotfiles(_ sender: Any?)` to `ViewerWindowController.swift`, dispatching `dispatchNativeCommand("toggle-dotfiles")`.
- [x] T022 [US4] Add a checkable "Hide Dotfiles" `NSMenuItem` (`keyEquivalent: "."`, `keyEquivalentModifierMask: [.command, .shift]`, matching macOS Finder's own convention) to the app menu in `AppDelegate.swift`, wired to `toggleDotfiles(_:)`.
- [x] T023 [US4] Keep the native menu item's checkmark in sync: on every `hideDotfiles` change, have `App.tsx` call `postNativeAppCommand` with the new state (extending `NativeAppOutboundCommand` in `ui/src/types/index.ts:96` with a `'dotfiles-state'` command carrying the boolean), handled in `ViewerWindowController.userContentController(_:didReceive:)` (`ViewerWindowController.swift:95-105`) to set the menu item's `state` property (`.on`/`.off`).

**Checkpoint**: Dotfile visibility is one persisted setting; both views always agree; native menu shows an accurate checkmark; no inline toggle remains anywhere.

---

## Phase 5: User Story 5 - Refresh moves to the menu with a shortcut (Priority: P3)

**Goal**: Remove the toolbar Refresh button; keep Refresh reachable via the existing native Cmd+R menu item and a new browser-safe shortcut plus an always-visible browser control.

**Independent Test**: Per quickstart.md US5 — confirm no toolbar Refresh button; confirm native Cmd+R still works; confirm Ctrl+Alt+R triggers the same refresh in the browser; confirm a non-keyboard browser control also triggers it.

**Depends on**: Nothing from US1-US4; independent files, though it reuses the "View options" control introduced in Phase 4 (T019) as its non-keyboard browser affordance.

### Tests for User Story 5

- [ ] T024 [P] [US5] Update `ui/src/App.test.tsx` to assert: no Refresh button renders in the top toolbar; a `keydown` with `ctrlKey && altKey && key === 'r'` calls `refreshCurrentView()`; the "View options" control exposes a refresh action that also calls `refreshCurrentView()`.

### Implementation for User Story 5

- [ ] T025 [US5] Remove the Refresh `Button` from the top toolbar in `ui/src/App.tsx` (lines 1199-1209).
- [ ] T026 [US5] Add a global `keydown` listener in `ui/src/App.tsx` (new `useEffect`, following the same pattern as `TerminalPanel.tsx:107-116`'s Ctrl+\` listener) matching `event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === 'r'`, calling `event.preventDefault()` and `refreshCurrentView()` — the browser-safe Ctrl+Alt+R shortcut decided in plan.md Phase 0 Research #2 (Cmd+R/Ctrl+R is unusable: every browser reserves it for page reload).
- [ ] T027 [US5] Add a refresh action to the "View options" toolbar control from T019, so browser users have an always-visible non-keyboard way to refresh (FR-011).
- [ ] T028 [US5] Verify (no code change expected) that the native View menu's existing Refresh item (`AppDelegate.swift:155-161`, already Cmd+R, already wired to `refreshViewer(_:)` → `dispatchNativeCommand("refresh")` → the existing `'refresh'` branch in `App.tsx`) continues to work unchanged now that the toolbar button is gone.

**Checkpoint**: No toolbar Refresh button; native Cmd+R unchanged; Ctrl+Alt+R and the "View options" control both refresh in the browser distribution.

---

## Phase 6: User Story 6 - Tracked/All/Local filter moves to the menu (Priority: P3)

**Goal**: Remove the inline Tracked/All/Local sidebar dropdown; expose the same `generatedLocalVisibility` state via the native menu and the shared "View options" browser control.

**Independent Test**: Per quickstart.md US6 — confirm no inline dropdown in the sidebar; confirm the native submenu and the browser "View options" control both filter identically to the old dropdown.

**Depends on**: Phase 4 (US4)'s "View options" control (T019) must exist before this story extends it with the Tracked/All/Local selector (T031).

### Tests for User Story 6

- [ ] T029 [P] [US6] Update `ui/src/App.test.tsx` to assert: the inline Tracked/All/Local `<select>` no longer renders in the sidebar toolbar; the "View options" control's Tracked/All/Local selector drives the same `generatedLocalVisibility` state; a `'set-tracked-visibility'` native-command event with each of `hide`/`show`/`only` in its `detail.message` updates the state accordingly.

### Implementation for User Story 6

- [ ] T030 [US6] Remove the inline Tracked/All/Local `<select>` from the sidebar toolbar in `ui/src/App.tsx` (lines 1250-1264).
- [ ] T031 [US6] Add a Tracked/All/Local selector to the "View options" toolbar control (from T019/T027), wired to the existing `generatedLocalVisibility`/`setGeneratedLocalVisibility` state — no new state needed (FR-013/FR-015).
- [ ] T032 [US6] Add a `'set-tracked-visibility'` branch to the `handleNativeCommand` listener in `ui/src/App.tsx`, reading the target value (`'hide'` | `'show'` | `'only'`) from `detail.message` (reusing the existing `NativeAppCommandEvent` shape rather than extending it) and calling `setGeneratedLocalVisibility`.
- [ ] T033 [US6] Add `@objc func setTrackedVisibilityHide/Show/Only(_ sender: Any?)` (or a single handler keyed off `sender.title`) to `ViewerWindowController.swift`, each dispatching `dispatchNativeCommand("set-tracked-visibility", message: "hide" | "show" | "only")`.
- [ ] T034 [US6] Add a "Tracked/All/Local" submenu (three items — Tracked, All, Local — with a checkmark on the active value) to the app menu in `AppDelegate.swift`, wired to the T033 handlers; sync the checkmark the same way T023 syncs the dotfiles checkmark (a `'tracked-visibility-state'` outbound command on every change).

**Checkpoint**: No inline Tracked/All/Local dropdown; native submenu and browser "View options" control both filter identically to the removed dropdown.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all six stories together.

- [ ] T035 [P] Run the existing `jest-axe` suites for `App`, `FileTree`, and `ContentPanel` — confirm no new accessibility violations from the Refresh-button removal or the new "View options" control (FR-016).
- [ ] T036 [P] Manually tab through the toolbar to confirm focus order still makes sense after T025 (Refresh removal) and T019 (new control's addition) — per spec.md's Edge Cases question about tab order.
- [ ] T037 Manual quickstart.md walkthrough for all six user stories, including the native macOS app build for US3/US4/US6's menu items (cannot be automated in this environment).
- [ ] T038 Update `CLAUDE.md`'s "Recent Changes" section with a `034-patch-bugfixes` entry once implementation is complete, per repository convention (see existing `033-`/`032-`/`018-` entries).

---

## Dependencies & Execution Order

### Phase Dependencies

- No Foundational phase — US1, US2, US3, US5 can all start immediately in parallel; they touch disjoint files.
- **US6 (Phase 6)** depends on **US4 (Phase 4)**: the "View options" browser control (T019) must exist before US6 can add its Tracked/All/Local selector to it (T031), and the native checkmark-sync pattern (T023) is reused by T034.
- **Polish (Phase 7)** depends on all six stories being complete.

### Parallel Opportunities

- All `[P]`-marked test tasks (T001, T003, T007, T011, T012, T013, T024, T029) can be written in parallel — different files, no shared state.
- US1, US2, US3, US5 can be implemented fully in parallel with each other (disjoint files: `App.tsx`'s layout class, `cli-detection.ts`, the native menu + one `App.tsx` branch, and the toolbar Refresh removal + shortcut respectively) — the only serialization risk is multiple stories editing `App.tsx`'s `handleNativeCommand` chain (T008, T020, T032) and toolbar JSX (T019/T025/T030) concurrently; land those sequentially even though they're logically independent.
- US4 must land before US6 (see Phase Dependencies).
- T035 and T036 (Polish) can run in parallel with each other.

---

## Implementation Strategy

### MVP First

The two P1 stories (US1 folder-scroll fix, US2 Claude/Codex PATH fix) are the minimum viable slice — both are outright regressions/breakages, independent of every menu-relocation item. Ship these first if time-constrained.

### Incremental Delivery

1. Ship US1 + US2 (P1) first — each is a narrow, single-concern fix with no UI relocation risk.
2. Add US3 (P2, pure discoverability, no new shortcut semantics) and US4 (P2, fixes a real state-desync bug) — independent of each other.
3. Add US5 and US6 (P3, toolbar decluttering) last; US6 depends on US4's "View options" control already existing.
4. Run Phase 7 polish once all six stories are in.

## Notes

- US4 and US6 intentionally share one "View options" browser toolbar control (T019) rather than each getting their own, per spec.md's Assumptions section.
- The native menu checkmark-sync mechanism (T023, T034) is new plumbing not present in the existing native-command bridge (which today is one-directional web→native only for `'set-default-markdown-reader'`); this is the one piece of genuinely new infrastructure in this patch, scoped narrowly to two boolean/enum state syncs.
- Whether this ships as `0.10.2` or another version is a release-time decision (Constitution Principle VIII), not part of these tasks.
