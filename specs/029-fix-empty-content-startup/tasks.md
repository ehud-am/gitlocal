---

description: "Task list for Fix Empty Content on Startup"
---

# Tasks: Fix Empty Content on Startup

**Input**: Design documents from `specs/029-fix-empty-content-startup/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included and required, not optional — constitution Principle II mandates ≥90% per-file branch coverage as non-negotiable, so every new guard/error branch introduced below needs a test hitting it. The one exception is `src/cli.ts`, which `vitest.config.ts` explicitly excludes from the coverage gate; its tasks rely on the manual quickstart.md validation instead of a new unit-test file.

**Organization**: Tasks are grouped by user story (from spec.md, priorities P1–P4) so each can be implemented, tested, and demoed independently after the shared Foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to spec.md user stories — US1 (P1), US2 (P2), US3 (P3), US4 (P4)
- File paths are exact and repo-relative

---

## Phase 1: Setup

**Purpose**: Confirm the pre-fix baseline is green before making changes.

- [X] T001 Run `npm test` and `npm run build` from the repository root and confirm both succeed on the current `029-fix-empty-content-startup` branch before any code changes, so any later failure is attributable to this feature's changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared error-surfacing infrastructure that User Stories 1, 2, and 3 all depend on for specific, distinguishable failure messages (per [contracts/error-response-contract.md](contracts/error-response-contract.md) and [contracts/startup-resolution-contract.md](contracts/startup-resolution-contract.md)). User Story 4 does not depend on this phase and may be implemented in parallel by a separate contributor if desired.

**⚠️ CRITICAL**: Complete this phase before starting User Story 1, 2, or 3 implementation tasks.

- [X] T002 Add a global `app.onError((err, c) => ...)` handler in `src/server.ts`'s `createApp()` that returns the structured JSON error envelope `{ error: string, code: string }` defined in [contracts/error-response-contract.md](contracts/error-response-contract.md), classifying known Node `fs` error codes (`ENOENT` → `NOT_FOUND`, `EACCES`/`EPERM` → `PERMISSION_DENIED`, `ENOTDIR`/`EBUSY`/`ESTALE` → `UNAVAILABLE`) read directly off the naturally-propagating error's `.code`, and falling back to `UNKNOWN` for anything else — **no changes needed in `src/git/repo.ts`**: empirical testing against the installed `hono` package during implementation confirmed Hono's default dispatch already catches a raw `readdirSync`/`realpathSync` throw and preserves its `.code`, so this single handler is sufficient (see research.md item #2's second correction)
- [X] T003 ~~(removed)~~ Superseded — confirmed no try/catch is needed around `listWorkingTreeDirectoryEntries`'s `readdirSync` (`src/git/repo.ts:1757`); see research.md item #2
- [X] T004 ~~(removed)~~ Superseded — confirmed no try/catch is needed around `canonicalizeExistingPath`'s `realpathSync` (`src/git/repo.ts:289`); see research.md item #2
- [X] T005 [P] In `src/services/startup-preferences.ts`, change `isReadableDirectory` (lines 34-40) to attempt a guarded directory read (not just `existsSync` + `statSync().isDirectory()`) before reporting a candidate startup folder as readable, per FR-006 and data-model.md's Startup Folder Selection validation rule — this one **does** need a real try/catch, because it is a boolean probe (swallowing to `false` is the correct behavior here, unlike the count/listing path above)
- [X] T006 [P] Verified (no code change needed): `request<T>()` in `ui/src/services/api.ts` (lines 54-64) already throws the parsed JSON body directly, so it already surfaces the `error`/`code` fields from the new structured error envelope once the server sends one — confirmed by tests rather than by editing already-correct code; see research.md item #1's implementation-time correction
- [X] T007 [P] Add tests in `tests/integration/server.test.ts` covering the new `onError` handler: an unhandled exception from a route returns the structured JSON envelope with the expected `code` for at least an `ENOENT` and an `EACCES` case
- [X] T008 [P] Add a regression-guard test in `tests/unit/git/repo.test.ts` asserting that `listWorkingTreeDirectoryEntries` and `classifyLocalPath` still *propagate* (do not swallow to `[]`/a silently-substituted path) when `readdirSync`/`realpathSync` throw — a negative assertion protecting the T002/research.md-item-#2 design decision from a future accidental swallow
- [X] T009 [P] Add tests in `tests/unit/services/startup-preferences.test.ts` covering `isReadableDirectory` returning `false` for a directory that exists and passes `statSync` but fails a guarded read attempt (e.g., permission-denied)
- [X] T010 [P] Add tests in `ui/src/services/api.test.ts` covering `request<T>()` surfacing the structured `error`/`code` fields from a non-2xx JSON error response, and the generic `UNKNOWN` fallback when the body isn't parseable JSON
- [X] T010A **[Critical — added during implementation, not originally planned]** In `ui/src/main.tsx`, configure the `QueryClient` with `networkMode: 'always'` and call `focusManager.setFocused(true)` at startup. Discovered while manually verifying User Story 1 end-to-end: T002/T014/T015/T016 alone were insufficient — React Query's retry-continuation logic pauses a failed query indefinitely (`fetchStatus: 'paused'`, neither loading nor erroring) whenever it believes the tab is offline or unfocused, which reproduces the exact reported bug independently of every other fix in this feature, and is especially plausible in the macOS app's embedded WKWebView. See research.md item #4a for the full investigation.
- [X] T010B **[Critical — added during implementation]** Add `ui/src/main.test.tsx` asserting `focusManager.isFocused()` stays `true` even when `document.visibilityState` is `'hidden'`, and that the exported `queryClient`'s default options carry `networkMode: 'always'` — regression guard for T010A.

**Checkpoint**: Foundation ready — User Stories 1, 2, and 3 can now begin.

---

## Phase 3: User Story 1 - First launch lands on an unreadable default folder (Priority: P1) 🎯 MVP

**Goal**: A user whose default/current startup folder cannot actually be read sees a clear, specific explanation and a way to choose a different folder, instead of a blank content area — while a genuinely empty folder still shows its existing, visually distinct "ready for a first file" state.

**Independent Test**: Launch GitLocal against a folder that exists but cannot be enumerated (permission stripped, per [quickstart.md](quickstart.md) Scenario 1) and confirm a specific failure message with a recovery path appears; separately confirm a truly empty folder (Scenario 2) still renders the existing empty-state landing, visually distinct from the failure message.

### Tests for User Story 1

- [X] T011 [P] [US1] Add a test in `ui/src/App.branch-coverage.test.tsx` (or `ui/src/App.test.tsx`) asserting that when the `['info']` query resolves with `isError: true`, the app renders a failure view (not the full app shell with `info` undefined, and not the loading screen) — also found and fixed a second, pre-existing test (`App.branch-coverage.test.tsx`, "repository info is unavailable") that was unknowingly pinning the old silent-failure behavior via TanStack Query's own "data cannot be undefined" guard on a resolved-`undefined` queryFn; updated its expectations to match the corrected behavior
- [X] T012 [P] [US1] Add a test in `ui/src/components/ContentPanel/ContentPanel.test.tsx` asserting that when `isDirectoryError` is true for the root/default view (`!selectedPath` branch), a distinct failure message renders instead of the generic "no visible files yet" empty message
- [X] T013 [P] [US1] Add a test in `ui/src/components/ContentPanel/ContentPanel.test.tsx` asserting that when `isDirectoryError` is true for the folder view (`selectedPathType === 'dir'` branch), a distinct failure message renders regardless of `showSelectedLocalOnly` (today it only renders when `showSelectedLocalOnly` is also true)

### Implementation for User Story 1

- [X] T014 [US1] In `ui/src/App.tsx`, destructure `isError` (and expose a retry action via `queryClient.refetchQueries(['info'])`) from the `['info']` query (lines 184-187), and render a failure view using the existing `ErrorScreen` component (defined at lines 107-116) with a retry button before the `isLoading`/`info?.pickerMode` branches at lines 1038-1049, instead of falling through to the full app shell with `info` undefined
- [X] T015 [US1] In `ui/src/components/ContentPanel/ContentPanel.tsx`, check `isDirectoryError` in the root/default view (the `!selectedPath` branch around line 956) and render a distinct failure message (matching `FileTree.tsx`'s "Failed to load file tree" wording/style) instead of unconditionally calling `renderDirectoryList('', visibleDirectoryEntries)`
- [X] T016 [US1] In `ui/src/components/ContentPanel/ContentPanel.tsx`, check `isDirectoryError` unconditionally (not only when `showSelectedLocalOnly`) in the folder view (`selectedPathType === 'dir'` branch around line 968) and render a distinct failure message before falling back to `renderDirectoryList(selectedPath, visibleDirectoryEntries)`
- [X] T017 [US1] Confirm `src/git/repo.ts`'s `getInfo` (lines 410-453) lets a `getBrowseableRootEntryCount` failure propagate naturally (unguarded, per T002/T008) up through `infoHandler` to the new `onError` handler (T002), rather than any code path coercing it to `rootEntryCount: 0` — add a regression test in `tests/unit/handlers/repo.test.ts` asserting `/api/info` returns a structured error (not a fake zero count) when the non-git root folder is unreadable
- [X] T018 [US1] Manually run quickstart.md Scenario 1 (unreadable default folder) and Scenario 2 (genuinely empty folder) against a local build (`npm run build` then launch against each), confirming the two are visually and textually distinguishable — done via real browser testing; also verified the "Try again" retry action recovers in place (no reload) once the underlying permission was fixed. This manual pass is what surfaced the T010A/T010B React Query pausing issue that no unit test would have caught

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Returning user's remembered folder is no longer available (Priority: P2)

**Goal**: A user whose previously remembered folder was deleted, renamed, or is on a currently-disconnected drive sees a message identifying that specifically, distinct from a generic failure, with a path to choose a new folder — and recovers automatically (without a full relaunch) once the folder becomes available again.

**Independent Test**: Set a remembered folder, delete/unmount it, relaunch, and confirm quickstart.md Scenario 3's message and recovery path appear.

### Tests for User Story 2

- [X] T019 [P] [US2] Add a test in `tests/unit/services/startup-preferences.test.ts` asserting `resolveStartupFolder` returns `source: 'platform-default'` with a distinct `fallbackReason` per cause when the preference file points at a folder that now fails the (T005-hardened) readability check — expanded beyond the original single-string plan into three sub-cases (deleted, permission-denied, other/disconnected) via a new `describeUnreadableFolder` helper in `src/services/startup-preferences.ts`, directly satisfying US2 Acceptance Scenario 2's "distinct from 'deleted' or 'permission denied'" requirement
- [X] T020 [P] [US2] Add a test in `ui/src/components/Picker/PickerPage.test.tsx` asserting that a non-empty `fallbackReason` from the startup-folder resolution is actually rendered to the user, not merely computed — found and confirmed a real gap: the `platform-default` branch of `startupMessage` ignored `fallbackReason` entirely, always showing the generic "started from your Documents folder" message even when a stale remembered folder caused the fallback

### Implementation for User Story 2

- [X] T021 [US2] Surface `StartupFolderResolution.fallbackReason` to the user. This expanded significantly once end-to-end testing showed the original single-component plan didn't work for a real launch:
  - `ui/src/components/Picker/PickerPage.tsx`'s `startupMessage`: fixed the `platform-default` branch (previously hardcoded, ignoring `fallbackReason` — the `home-fallback` branch already did this correctly and was the reference pattern)
  - **[Added — not in original plan]** `src/server.ts`: added `getStartupFolderResolution` module state (mirrors the existing `currentStartupOpenTarget` pattern) so the resolution computed once at CLI startup survives being captured, instead of `startupFolderHandler` recomputing fresh from a preference file that `rememberStartupFolder` had already overwritten by request time — discovered because this silently erased the fallback evidence before any client could ever observe it
  - **[Added]** `src/handlers/repo.ts`'s `startupFolderHandler` now returns `getStartupFolderResolution()`; `src/cli.ts` passes its already-computed `startupFolder` into `createApp()`'s new `startupFolderResolution` option
  - **[Added]** `ui/src/App.tsx`: added a `['startup-folder']` query and a one-time effect setting `statusMessage` from `fallbackReason` when present and not in picker mode — discovered because a *successful* fallback resolution (the actual real-world US2 scenario) never enters `pickerMode`, so `PickerPage.tsx` alone is never rendered for it; the message needs to reach the main app view
- [X] T022 [US2] Confirm FR-008 recovery: verified the picker's existing "type a path and click Open" flow (already covered generically by prior tests) is sufficient recovery once a disconnected/renamed folder becomes available again — no new code needed there, since the picker is already the active, usable UI (no relaunch involved); added a test tying this explicitly to the US2 scenario (unavailable-folder message → same path reopened successfully → reload)
- [X] T023 [US2] Manually run quickstart.md Scenario 3 (remembered folder deleted mid-session) against a local build — confirmed via a real CLI launch (isolated `HOME`/`GITLOCAL_STARTUP_PREFERENCE_PATH`) that after fixing the T021 server-side capture bug, the real browser correctly shows "Last used folder no longer exists." as a status banner atop the Documents fallback view; this manual pass is what caught the capture-timing bug in the first place — no unit test (all of which mock the API) could have caught it

**Checkpoint**: User Stories 1 and 2 both independently functional.

---

## Phase 5: User Story 3 - Opening a specific file or folder that no longer exists (Priority: P3)

**Goal**: A user who launches GitLocal against a specific path (CLI argument, "Open With", recent-document shortcut) that no longer exists sees a message naming that path and explaining it could not be opened, instead of being silently shown an unrelated folder (e.g., `process.cwd()`).

**Independent Test**: Launch with a nonexistent explicit path (quickstart.md Scenario 4) and confirm the picker view shows a path-specific failure message rather than silently browsing an unrelated directory.

### Tests for User Story 3

- [X] T024 [P] [US3] Verified (no new test needed): `tests/unit/handlers/repo.test.ts`'s existing "returns distinct startup-open failure targets for missing and unsupported files" test already asserts a nonexistent explicit path (launched exactly as `cli.ts` really does, with `initialOpenSource: 'explicit-launch'`) produces `status: 'failed'` and a message matching `/path does not exist/i` — confirmed by direct empirical testing (real CLI launch + `curl /api/startup-open-target`) that `cli.ts`'s current `explicitFileLaunch` classification and `server.ts`'s `initializePaths` already do this correctly; the original plan's premise (that these needed fixing) was incorrect
- [X] T025 [P] [US3] Add a test in `ui/src/components/Picker/PickerPage.test.tsx` asserting that when the `['startup-open-target']` query returns a `target` with `status !== 'accepted'`, its `message` is rendered in the picker view — confirmed this was a real, previously-untested gap: `PickerPage.tsx` never called `api.getStartupOpenTarget()` at all before this feature

### Implementation for User Story 3

- [X] T026 [US3] ~~Superseded~~ — verified via direct empirical testing (real CLI launch against a missing path, then `curl /api/startup-open-target`) that `src/cli.ts`'s `explicitFileLaunch` classification already routes a nonexistent explicit path through `resolveOpenTarget`, which already returns `status: 'failed'` with a correct message; no code change needed
- [X] T027 [US3] ~~Superseded~~ — verified `src/server.ts`'s `initializePaths` already sets `currentStartupOpenTarget` to the failed target *before* falling back to `currentPickerPath = process.cwd()`, for the actual invocation pattern `cli.ts` uses (`initialOpenSource` set); the original research.md finding that this was dropped was incorrect — the real gap was entirely on the frontend (T028)
- [X] T028 [US3] In `ui/src/components/Picker/PickerPage.tsx`, added a `getStartupOpenTarget()` call in `loadPath()` (alongside the existing `getStartupFolder()` call) and a new `openTargetMessage` state, rendered via a `role="alert"` element whenever `target.status !== 'accepted'` — this was the one real, confirmed gap: the component never read this endpoint at all
- [X] T029 [US3] Manually run quickstart.md Scenario 4 (invalid explicit CLI path) against a local build — confirmed via real browser test: launching against a nonexistent path shows "Path does not exist: /tmp/gitlocal-us3-missing-96451" prominently in the picker, alongside "GitLocal reopened your last used folder." explaining where it landed instead

**Checkpoint**: User Stories 1, 2, and 3 all independently functional.

---

## Phase 6: User Story 4 - No feedback when the browser window can't auto-open (Priority: P4)

**Goal**: When the npm/terminal distribution cannot auto-open a browser, the terminal output prominently instructs the user to open the address manually — and, discovered during implementation, a real browser-open failure must not crash the entire server.

**Independent Test**: Start GitLocal where browser auto-open fails (quickstart.md Scenario 5) and confirm the terminal output includes a prominent manual-open instruction, and the server keeps running.

### Implementation for User Story 4

- [X] T030 [US4] In `src/cli.ts`'s `openBrowser()`, print an explicit, prominent instruction telling the user to open the already-logged local address manually. **Significantly expanded beyond the original plan** after empirically forcing a real failure (restricting `PATH` so `open`'s underlying `spawn('open', …)` gets `ENOENT`) revealed the original `try/catch` provided no protection at all: `open()`'s default (non-`wait`) mode returns a bare `ChildProcess` synchronously with no error listener attached, so the actual async spawn failure is an unhandled `'error'` event that **crashed the entire server process**, bypassing the `try/catch` entirely (it fires on a later tick, after the synchronous `await open(url)` already returned). Fixed by explicitly attaching `subprocess.once('error', () => reportBrowserOpenFailure(url))` to the returned `ChildProcess`. See research.md item #7 part 2.
- [X] T031 [US4] Manually run quickstart.md Scenario 5 (browser auto-open failure) against a local build — verified via a real forced failure (not a hypothetical): before the fix, the server crashed with `Error: spawn open ENOENT` and an unhandled-error stack trace; after the fix, the server stays running and prints "GitLocal could not open a browser automatically. Open http://127.0.0.1:PORT in your browser to continue." `src/cli.ts` is excluded from the coverage gate in `vitest.config.ts`, so this manual reproduction — not a mocked unit test — is what actually caught this bug

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Close out lower-severity findings from the investigation that don't warrant their own user story, and confirm the feature-wide guarantees hold.

- [X] T032 [P] Fix the documented vs. actual listening-address host mismatch in `packaging/macos/release/service-launch.md` (documented `http://localhost:<port>`; `src/cli.ts` actually emits `http://127.0.0.1:<port>`) so the release-validation doc matches real behavior
- [X] T033 [P] Added regression-guard comments: on `getBrowseableRootEntryCount` and `getFastBrowseableRootEntryCount` (`src/git/repo.ts`) explaining the asymmetry (the git-repo branch's "return 0 on failure" is safe only because prior git reads already proved accessibility; the non-git branch must propagate, not swallow); on `canonicalizeExistingPath`'s unguarded `realpathSync`; and on `listWorkingTreeDirectoryEntries`'s unguarded `readdirSync` — each explaining they are deliberately left to propagate to the global `onError` handler (T002) and must not be "fixed" with a swallow-to-empty catch, to prevent a future regression of the exact bug this feature fixes
- [X] T034 Ran the cross-cutting consistency check from quickstart.md against a real local build in a browser: (a) a root-level failure (`/api/info` erroring) replaces the *entire* app shell — sidebar and content panel both — with one unified `ErrorScreen`, so the two surfaces cannot disagree by construction; (b) a subfolder-level failure (root readable, one subfolder made unreadable mid-session) correctly shows "Failed to load this folder's contents." in `ContentPanel`, while the sidebar `FileTree` (which fetches the whole tree once, not per-folder, so has no fresh query to contradict the failure with) shows no false "this folder is fine" signal — confirmed via direct DOM inspection, not just visual screenshots
- [X] T035 Ran `npm test` (full suite, backend + frontend) and confirmed ≥90% per-file branch coverage on every file touched by this feature, per constitution Principle II. Final state: **backend** 347/352 passing (the 5 failures are the same pre-existing git-sync test flakiness confirmed unrelated to this feature at the T001 baseline, before any changes); **frontend** 339/339 passing, zero coverage-threshold errors on any file. One real coverage regression was found and fixed during this task: `ui/src/App.tsx` dipped to 89.62% branch coverage (from a 90.02% baseline) because this feature added new branches (the `isInfoError` failure screen, the startup-folder fallback effect) without fully exercising all of them — fixed by adding 3 targeted tests (a generic-error-message fallback case, a picker-mode-suppresses-the-duplicate-banner case, and a non-git empty-folder landing-state case that was a genuine pre-existing gap), bringing it to 90.06%. One pre-existing, out-of-scope coverage shortfall remains and was **not** fixed here: `src/git/repo.ts` sits at 88.49% branch coverage — confirmed via `git stash` comparison to be a pre-existing condition (87-88% before this branch's changes, which only added comments there) spread across many unrelated git/sync/branch-switching code paths, not something this feature touches or should scope-creep into backfilling. Flagged separately (see completion report).
- [X] T036 Added a `CHANGELOG.md` entry under "Unreleased" describing this fix, per constitution Principle VII

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS User Stories 1, 2, and 3 (User Story 4 does not depend on Phase 2 and may proceed in parallel)
- **User Story 1 (Phase 3)**: Depends on Foundational (T002-T010) — no dependency on US2/US3/US4
- **User Story 2 (Phase 4)**: Depends on Foundational (specifically T005/T009's readability hardening); independent of US1/US3/US4 implementation, though it reuses the retry mechanism US1 introduces in T014
- **User Story 3 (Phase 5)**: Depends on Foundational (T002's error classification); independent of US1/US2/US4
- **User Story 4 (Phase 6)**: Independent of Foundational and all other stories — can start any time after Setup
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests before implementation (write T011-T013 before T014-T017, etc.) — mandatory here per constitution Principle II, not optional
- Story complete and checkpointed before moving to the next priority, if working sequentially

### Parallel Opportunities

- Foundational: T002, T005, T006 touch different files and can run in parallel; T007-T010 (their respective tests) can likewise run in parallel once their implementation counterpart lands
- User Story 1: T011, T012, T013 (tests, different assertions but same/adjacent files — coordinate if touching the same test file) can be drafted in parallel; T014, T015/T016 touch different files (`App.tsx` vs. `ContentPanel.tsx`) and can proceed in parallel
- User Story 4 can be staffed entirely in parallel with Foundational/US1/US2/US3 since it has no dependency on them
- Different user stories can be worked on by different contributors once Phase 2 is complete

---

## Parallel Example: Foundational Phase

```bash
# Launch independent foundational fixes together (different files):
Task: "Add global onError classifier in src/server.ts (T002)"
Task: "Harden isReadableDirectory in src/services/startup-preferences.ts (T005)"
Task: "Propagate structured error fields in ui/src/services/api.ts (T006)"
```

## Parallel Example: User Story 1

```bash
# Launch all three failing-first tests together:
Task: "Test ['info'] isError renders a failure view (ui/src/App.branch-coverage.test.tsx)"
Task: "Test isDirectoryError in ContentPanel root view (ui/src/components/ContentPanel/ContentPanel.test.tsx)"
Task: "Test isDirectoryError in ContentPanel folder view (ui/src/components/ContentPanel/ContentPanel.test.tsx)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks US1-US3)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1-2 independently
5. This alone fixes the most common, most damaging trigger (fresh-install default folder) and is a shippable MVP

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate → MVP
3. Add User Story 2 → validate (remembered-folder messaging)
4. Add User Story 3 → validate (explicit invalid path messaging)
5. Add User Story 4 → validate (browser auto-open feedback) — can slot in anytime, even before US1, since it has no shared dependency
6. Polish phase → doc fix, regression-guard comment, full coverage/consistency check, CHANGELOG entry

### Parallel Team Strategy

With multiple contributors: complete Setup + Foundational together first (T002-T010 split across people by file), then assign US1/US2/US3 to different people (each depends only on Foundational, not on each other) while a separate person picks up US4 at any point since it has no Foundational dependency at all.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to its spec.md user story for traceability
- The single most important correction from research (made twice — once in Phase 1 design, again empirically during implementation): the unguarded `readdirSync`/`realpathSync` calls in `src/git/repo.ts` need **no try/catch at all** — Hono's default dispatch already propagates them to the `onError` handler (T002) with their OS error code intact. Adding a catch that swallows to an empty/zero result would silently move the reported bug to a quieter code path instead of fixing it (see research.md item #2 and T033's regression-guard comment)
- The single most important **addition** discovered during implementation (not present in the original plan at all): T002/T014/T015/T016 alone do not fully fix the bug. React Query's `networkMode`/focus-based retry-pausing (see research.md item #4a, tasks T010A/T010B) can leave a genuinely failed query stuck `isLoading: false, isError: false, data: undefined` forever — the exact reported symptom — independent of every other fix in this feature. This was only found by manually testing User Story 1 end-to-end in a real browser after the "complete" implementation still failed to show the new error screen; it would not have been caught by unit tests alone, which is why the quickstart.md manual-validation tasks (T018, T023, T029, T031) matter as much as the automated ones
- Verify each new test fails before its implementation task lands, then passes after
- Stop at any checkpoint to validate a story independently before continuing
