---

description: "Task list for Navigation Concepts Improvements"
---

# Tasks: Navigation Concepts Improvements

**Input**: Design documents from `specs/030-navigation-improvements/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/repo-location-contract.md](contracts/repo-location-contract.md), [quickstart.md](quickstart.md)

**Tests**: Included and required, not optional — constitution Principle II mandates ≥90% per-file branch coverage as non-negotiable, so every new/changed branch introduced below (new endpoint branches, new button visible/hidden/enabled/disabled states, the filesystem-root guard) needs a test hitting it, and every branch made dead by removing the ".." row needs its now-obsolete test removed or rewritten rather than left pinning deleted behavior.

**Organization**: Tasks are grouped by user story (from spec.md, priorities P1/P1/P2) so each can be implemented, tested, and demoed independently after the shared Foundational phase. A verification pass (item 11 in the pre-flight research) found two drift points versus plan.md's file-path table, both folded into the task descriptions below: `renderDirectoryList` actually spans `ContentPanel.tsx:635-868` (not `:635-819`), and `repositoryParentFolderHandler` currently has **zero** existing test coverage in `tests/unit/handlers/repo.test.ts` (1308 lines, no `parent-folder` references today).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to spec.md user stories — US1 (P1, Parent Folder), US2 (P1, Home), US3 (P2, Readme)
- File paths are exact and repo-relative

---

## Phase 1: Setup

**Purpose**: Confirm the pre-fix baseline is green before making changes.

- [ ] T001 Run `npm test` and `npm run build` from the repository root and confirm both succeed on the current `030-navigation-improvements` branch before any code changes, so any later failure is attributable to this feature's changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new `GET /api/repo/location` endpoint and its wire type are shared infrastructure that User Stories 2 and 3 both depend on (nested-repo home-folder resolution, home-README resolution). User Story 1 (Parent Folder) does **not** depend on this endpoint — it only depends on the `repositoryParentFolderHandler` filesystem-root guard, also placed here because it touches the same handler file and is a prerequisite for FR-004's "disabled at true root" correctness used by all three stories' shared toolbar mount point.

**⚠️ CRITICAL**: Complete this phase before starting User Story 2 or User Story 3 implementation tasks. User Story 1 may proceed in parallel with T003-T008 (it only needs T002).

- [ ] T002 [P] In `src/handlers/repo.ts`, add a filesystem-root guard to `repositoryParentFolderHandler` (currently L215-226, computes `dirname(repoPath)` unconditionally with no guard): mirror `getParentPath`'s existing `dirname(currentPath) === currentPath` check (`src/handlers/folder.ts:81-84`) and return `{ ok: false, error: 'GitLocal is already at the root of the file system.' }` instead of attempting to open a nonsensical picker path, per [contracts/repo-location-contract.md](contracts/repo-location-contract.md)'s "Parent-folder-at-filesystem-root guard" section
- [ ] T003 [P] In `src/types.ts`, add the `RepoLocationResponse` interface (near `LocalActionResponse`, currently L335-346, or `LocalPathClassification`, L78-87) exactly per [contracts/repo-location-contract.md](contracts/repo-location-contract.md): `{ repositoryRootPath: string; isRepositoryRoot: boolean; homeReadmePath: string; atFilesystemRoot: boolean }`
- [ ] T004 [US2, US3] In `src/handlers/repo.ts`, add `repositoryLocationHandler` (alongside `repositoryOpenHandler`/`repositoryParentFolderHandler`) that reads an optional `path` query param (repo-relative, default `''`), calls `classifyLocalPath(resolveRepoPath(repoPath, path))` (`src/git/repo.ts:314-370`, reused unmodified) to compute `repositoryRootPath`/`isRepositoryRoot`, and when a repository root is found, calls `findReadme(repositoryRootPath, currentBranch, '')` (`src/git/repo.ts:549-572`, reused unmodified) to compute `homeReadmePath`; returns the "not in a repo" zero-value shape (`{ repositoryRootPath: '', isRepositoryRoot: false, homeReadmePath: '', atFilesystemRoot: false }`) when `path` does not resolve inside any git repository — always `200`, per the contract's status-code rule
- [ ] T005 In `src/server.ts`, register `app.get('/api/repo/location', repositoryLocationHandler)` alongside the other `/api/repo/*` routes (currently L283-287, next to `/api/repo/summary` at L285)
- [ ] T006 [P] In `ui/src/types/index.ts`, add `RepoLocationResponse` mirroring the new `src/types.ts` interface from T003 (re-exported per data-model.md's "Cross-cutting" section)
- [ ] T007 [P] In `ui/src/services/api.ts`, add `api.getRepoLocation(path?: string): Promise<RepoLocationResponse>` following the existing `getReadme` (L202-208) / `getTree` (L159-165) request pattern

### Tests for Foundational phase

- [ ] T008 [P] Add tests in `tests/unit/handlers/repo.test.ts` (1308 lines today, zero existing `parent-folder` coverage) for `repositoryParentFolderHandler`'s new filesystem-root guard: at the true filesystem root (`ok: false` with the specific error message) and the existing non-root success path (regression guard, since this file has no prior coverage of this handler at all)
- [ ] T009 [P] Add tests in `tests/unit/handlers/repo.test.ts` for `repositoryLocationHandler` covering every branch named in research.md/the contract: non-nested repo (`repositoryRootPath === repoPath`), nested sub-repo (`repositoryRootPath` resolves to the inner repo, not the outer one), non-git path (`''`/`false`/`''`/`false` zero-value shape), already-at-repo-root (`isRepositoryRoot: true`), home folder with a README (`homeReadmePath` populated), home folder without a README (`homeReadmePath: ''`)
- [ ] T010 [P] Add a test in `tests/unit/handlers/repo.test.ts` (or `tests/integration/server.test.ts`, matching existing convention for route-registration checks) confirming `GET /api/repo/location` is reachable and returns `200` for both a git-repo path and a non-git path
- [ ] T011 [P] Add tests in `ui/src/services/api.test.ts` covering `api.getRepoLocation()` — request shape (omitted vs. provided `path`) and response passthrough

**Checkpoint**: Foundation ready — User Story 2 and User Story 3 can now begin. User Story 1 can begin as soon as T002 lands (does not need T003-T011).

---

## Phase 3: User Story 1 - Replace ".." rows with a dedicated Parent Folder button (Priority: P1) 🎯 MVP

**Goal**: A single, always-in-the-same-place "Parent Folder" button — not a synthetic ".." table row — steps up one filesystem level from any display mode (folder listing, file view, file edit), and is visibly disabled (not hidden) at the true filesystem root.

**Independent Test**: Open a subfolder (in both a git repo and a plain OS folder), open a file within that subfolder, and confirm a single "Parent Folder" control is present and behaves identically in the folder listing, the file viewer, and the file editor — with no ".." row present anywhere; confirm it is disabled (not hidden) when launched against the filesystem root.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] In `ui/src/components/RepoContext/RepoContextHeader.test.tsx`, add tests for the new "Parent Folder" button: renders in all three modes (folder listing / file view / file edit, driven by `selectedPathType`), enabled when a parent target exists, disabled (not absent from the DOM) when `parentFolderEnabled === false`, and clicking it invokes `onNavigateParent`
- [ ] T013 [P] [US1] In `ui/src/App.tsx`'s test suite (`ui/src/App.test.tsx` or `ui/src/App.branch-coverage.test.tsx`, matching existing convention), add tests for the new `onNavigateParent` handler: from a subfolder (calls `handleSelectFolder` with the parent path), from the opened repo/folder root (calls the existing `handleBrowseParentRequest` boundary-crossing flow, unchanged), and from file view/edit mode (closes the file and navigates to its containing folder, reusing `handleSelectFolder` per data-model.md's "Behavior change note")
- [ ] T014 [P] [US1] In `ui/src/components/ContentPanel/ContentPanel.test.tsx` (1980 lines), identify and rewrite the existing ".." row / `isParent` / `exitsRepo` / 'Parent' / 'Browse' badge assertions (test bodies around L83, L442, L1732, L1886 per pre-flight verification — titles don't all literally name the concept) to assert the row's **absence** instead of its presence/behavior, since `renderDirectoryList` (`ContentPanel.tsx:635-868`) will no longer construct it

### Implementation for User Story 1

- [ ] T015 [US1] In `ui/src/components/ContentPanel/ContentPanel.tsx`, delete the `parentRow` construction (`L641-661`) and its inclusion in `rows`, the `isParent`/`exitsRepo` JSX branches that render the badge/`aria-label`/Kind-column text (`L780-813`), the `isParent`/`exitsRepo` fields on the `DirectoryRow` interface (`L89-90`), and the `exitsRepo` branch inside `openDirectoryRow` (`L675-682`) — `onOpenPath`/`onBrowseParent` themselves are NOT deleted, only their synthetic-row call sites, since both are reused by the new toolbar button (T018/T019). Depends on T014 landing first (or in the same change) so no test is left pinning deleted code
- [ ] T016 [US1] In `ui/src/types.ts` / `ui/src/components/ContentPanel/ContentPanel.tsx`, remove any now-unused `parentPathOf` duplication cleanup is **out of scope** (data-model.md explicitly defers deduplication) — instead just confirm `ContentPanel.tsx`'s local `parentPathOf` (`L113-116`) is still used elsewhere in the file after T015's deletions; if it becomes fully unused, remove it as dead code (mechanical follow-up to T015, same file)
- [ ] T017 [US1] In `src/handlers/repo.ts` / `ui/src/services/api.ts`, no new call is needed here — confirm (do not re-implement) that the existing `onBrowseParent` → `handleBrowseParentRequest` → confirm dialog → `handleBrowseParentFolder` → `POST /api/repo/parent-folder` chain (`App.tsx:734-748`) is unchanged and now benefits from T002's filesystem-root guard automatically
- [ ] T018 [US1] In `ui/src/components/RepoContext/RepoContextHeader.tsx`, add the "Parent Folder" button to the existing top action row (`L135-160`) as `<Button variant="secondary" size="icon">` (with `size="sm"` + short label at the `xl:` breakpoint per research.md §6's responsive convention), with new props `onNavigateParent?: () => void` and `parentFolderEnabled?: boolean` added to the `Props` interface (currently `L8-29`); disabled (native `disabled` attribute, not conditionally unmounted) when `parentFolderEnabled` is falsy, with `aria-label`/`title="Parent Folder"`
- [ ] T019 [US1] In `ui/src/App.tsx`, add the `onNavigateParent` handler at the `RepoContextHeader` mount site (`L1246-1283`): when `selectedPathType !== 'none'` (file view/edit), reuse `handleSelectFolder(parentPathOf(selectedPath))` (per data-model.md's "Behavior change note", same pattern as `handleOpenChangedFile`'s not-`canOpen` branch); when browsing a subfolder, reuse the existing `parentPathOf(selectedPath)` + `handleSelectFolder` in-app navigation; when at the opened root, reuse the existing `handleBrowseParentRequest` chain unchanged. Compute `parentFolderEnabled = Boolean(selectedPath) || Boolean(onBrowseParent)` per data-model.md's exact formula and pass both new props to `<RepoContextHeader>`
- [ ] T020 [US1] Manually run quickstart.md Scenario 1 (Parent Folder in all three modes) and Scenario 2 (filesystem-root disables Parent Folder, `node dist/cli.js /`) against a local build, confirming no ".." row appears anywhere and the button's enabled/disabled state matches FR-004 in every mode

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP (foundational navigation fix, no repo-awareness required).

---

## Phase 4: User Story 2 - Quick jump to a git repository's home folder (Priority: P1)

**Goal**: A "Home" button, visible only inside a git repository, jumps directly to the nearest enclosing repository's home folder in one click from any subfolder depth or file view/edit — correctly targeting a nested sub-repository's own root when the user is inside one, not the outer repository.

**Independent Test**: Open a git repository, navigate several subfolders deep (and separately, open a file at that depth), and confirm a "Home" button is visible and clicking it from any of those locations returns the user to the repository's top-level folder view in one step; confirm it targets the nearest enclosing sub-repo when nested, and is hidden entirely for plain non-git folders.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T021 [P] [US2] In `ui/src/components/RepoContext/RepoContextHeader.test.tsx`, add tests for the "Home" button: hidden entirely when `!info?.isGitRepo` (not merely disabled — FR-008), visible+enabled when inside a repo and `repoLocation.isRepositoryRoot === false`, visible+disabled when `repoLocation.isRepositoryRoot === true` (already there), and clicking it invokes `onNavigateHome`
- [ ] T022 [P] [US2] In `ui/src/App.test.tsx` (or `App.branch-coverage.test.tsx`), add tests for the new `['repo-location', selectedPath, currentBranch]` query wiring (`enabled: Boolean(info?.isGitRepo)`, per contracts/repo-location-contract.md) and for `onNavigateHome`: non-nested case (`path = ''`), nested sub-repo case (`path = relative(viewerRepoPath, repoLocation.repositoryRootPath)`), and from file view/edit (still resolves to a folder navigation via `handleSelectFolder`)

### Implementation for User Story 2

- [ ] T023 [US2] In `ui/src/App.tsx`, add the `['repo-location', selectedPath, currentBranch]` `useQuery` (per data-model.md, alongside the existing `['tree', ...]`/`['info']` queries) calling `api.getRepoLocation(selectedPath)`, gated `enabled: Boolean(info?.isGitRepo)`
- [ ] T024 [US2] In `ui/src/App.tsx`, add the `onNavigateHome` handler at the `RepoContextHeader` mount site: reuses the existing `handleSelectFolder` (same primitive as `onNavigateParent`, no new navigation mechanism) with `path = relative(viewerRepoPath, repoLocation.repositoryRootPath)`, simplifying to `''` in the non-nested case; pass `repoLocation` down as a new prop
- [ ] T025 [US2] In `ui/src/components/RepoContext/RepoContextHeader.tsx`, add the "Home" button to the top action row (`L135-160`) as `<Button variant="secondary" size="icon">` (same responsive pattern as T018), with new props `onNavigateHome?: () => void` and `repoLocation?: RepoLocationResponse`; hidden (not rendered) when `!info?.isGitRepo`; disabled when `repoLocation?.isRepositoryRoot === true`; enabled otherwise when `repoLocation?.repositoryRootPath` is truthy; `aria-label`/`title="Home"` (research.md §7's resolved default label/icon)
- [ ] T026 [US2] Manually run quickstart.md Scenario 3 (Home button, plain nesting, including from file view) and Scenario 4 (Home targets the nearest enclosing sub-repo, not the outer repo — the critical FR-009 check, including the transition through a non-git `vendor` folder in between) against a local build

**Checkpoint**: User Stories 1 and 2 both independently functional — the two P1 stories are complete.

---

## Phase 5: User Story 3 - Quick access to the repository's home README (Priority: P2)

**Goal**: A "Readme" button, visible only inside a git repository, always opens the README located in that repository's home (top-level) folder — never a differently-named or same-named README in the currently-browsed subfolder — and is disabled (not hidden) when the home folder has no README.

**Independent Test**: Open a git repository whose home folder contains a README, navigate into a subfolder that contains a different README (or no README), and confirm the "Readme" button always opens the home folder's README — never the subfolder's; confirm nested sub-repo awareness matches Home's; confirm disabled state when the repo home has no README.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T027 [P] [US3] In `ui/src/components/RepoContext/RepoContextHeader.test.tsx`, add tests for the "Readme" button: hidden entirely when `!info?.isGitRepo` (FR-012), visible+enabled when `repoLocation?.homeReadmePath` is truthy, visible+disabled when `repoLocation?.homeReadmePath` is falsy (FR-013), and clicking it invokes `onNavigateReadme`
- [ ] T028 [P] [US3] In `ui/src/App.test.tsx` (or `App.branch-coverage.test.tsx`), add tests for `onNavigateReadme`: resolves to `handleSelectFile` with `path = relative(viewerRepoPath, resolve(repoLocation.repositoryRootPath, repoLocation.homeReadmePath))`, confirming it targets the home README even when the current subfolder has its own differently-named or same-named README (the FR-011 non-regression case), and from file view/edit mode

### Implementation for User Story 3

- [ ] T029 [US3] In `ui/src/App.tsx`, add the `onNavigateReadme` handler at the `RepoContextHeader` mount site: reuses the existing `handleSelectFile` (no new navigation primitive) with the path computed per data-model.md's "Navigation action" for the Readme entity
- [ ] T030 [US3] In `ui/src/components/RepoContext/RepoContextHeader.tsx`, add the "Readme" button to the top action row (`L135-160`) as `<Button variant="secondary" size="icon">` (same responsive pattern as T018/T025), with new prop `onNavigateReadme?: () => void` (reuses the `repoLocation` prop already added in T025); hidden when `!info?.isGitRepo`; disabled when `!repoLocation?.homeReadmePath`; `aria-label`/`title="Readme"` (research.md §7's resolved default)
- [ ] T031 [US3] Manually run quickstart.md Scenario 5 (Readme always targets the home README, including the decoy `docs/README.md` case and the nested sub-repo case) and Scenario 6 (Readme disabled when the repo home has no README) against a local build

**Checkpoint**: All three user stories independently functional — full feature complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close out the toolbar-footprint/accessibility requirements that span all three stories, confirm coverage, and complete release documentation.

- [ ] T032 [P] Manually run quickstart.md Scenario 7 (plain non-git folder shows no Home/Readme buttons, only Parent Folder) against a local build
- [ ] T033 [P] Manually run quickstart.md's "Cross-cutting check — toolbar footprint (SC-004)" against a local build: compare header height before/after this change at the same window size for both folder listing and file view (icon-forward compact buttons per FR-014 must not increase the single-row header height), and confirm narrow/mobile viewport collapses to icon-only buttons with `title`/`aria-label` still present (Edge Case 5), verified via the accessibility inspector or a screen reader, not just visual inspection
- [ ] T034 [P] Review `ui/src/components/RepoContext/RepoContextHeader.tsx` and `ui/src/App.tsx` for the Edge Case 2 requirement (repo-home/Readme buttons must disappear immediately when navigating from a sub-repo out into a non-git intermediate folder, not lag behind the previous location) — add a regression test in `RepoContextHeader.test.tsx` or `App.test.tsx` if not already covered by T021/T022's nested-repo test cases
- [ ] T035 Run `npm test` (full suite, backend + frontend) and confirm ≥90% per-file branch coverage on every file touched by this feature (`src/handlers/repo.ts`, `src/types.ts`, `src/server.ts`, `ui/src/types/index.ts`, `ui/src/services/api.ts`, `ui/src/App.tsx`, `ui/src/components/RepoContext/RepoContextHeader.tsx`, `ui/src/components/ContentPanel/ContentPanel.tsx`) per constitution Principle II; pay particular attention to `ContentPanel.tsx` not dropping below its coverage floor after T015's deletions (fewer branches remain, so remaining branches must still be well-covered) and to `repositoryLocationHandler`/`repositoryParentFolderHandler` in `src/handlers/repo.ts` hitting every branch enumerated in T008/T009
- [ ] T036 Add a `CHANGELOG.md` entry describing this feature, per constitution Principle VII. Note: this repository's `CHANGELOG.md` (210 lines) currently has no "Unreleased" section — entries are dated/versioned only (`## 0.9.13 - 2026-07-24` at the top) — so either introduce an "Unreleased" section at the top (preferred, matching common convention and avoiding guessing an unreleased version number) or coordinate with the next release's version entry; do not fabricate a version number
- [ ] T037 Re-read quickstart.md in full and confirm every numbered scenario (1-7 plus the cross-cutting check) has been manually exercised at least once across T020/T026/T031/T032/T033, with no scenario skipped

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup. T002 (parent-folder root guard) BLOCKS nothing in US1 beyond itself being a prerequisite for full FR-004 correctness; T003-T011 (the new `/api/repo/location` endpoint and its wire types/client) BLOCK User Story 2 and User Story 3 entirely — neither Home nor Readme can be built without `repoLocation` data
- **User Story 1 (Phase 3)**: Depends only on T002 from Foundational — does not need the new endpoint (T003-T011) at all, since Parent Folder logic reuses only existing primitives (`parentPathOf`, `onBrowseParent`). Can be fully implemented and shipped independently of US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational (T003-T011, specifically the `repoLocation` query wiring pattern) — independent of US1/US3 implementation, though it shares the same `RepoContextHeader` top action row and `App.tsx` mount site, so T018/T025/T030 should coordinate to avoid merge conflicts in the same JSX block
- **User Story 3 (Phase 5)**: Depends on Foundational (T003-T011) and reuses the same `repoLocation` prop US2 introduces on `RepoContextHeader` (T025) — implement after or alongside US2, not before, since T030 assumes T025's `repoLocation` prop already exists
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- Tests before implementation (write T012-T014 before T015-T019, T021-T022 before T023-T025, T027-T028 before T029-T030) — mandatory here per constitution Principle II, not optional
- T015 (deleting the ".." row) should land together with or immediately after T014 (rewriting its tests) so no test is ever left pinning deleted behavior, even transiently
- Story complete and checkpointed before moving to the next priority, if working sequentially

### Parallel Opportunities

- Foundational: T002, T003, T006, T007 touch different files and can run in parallel; T008-T011 (their respective tests) can likewise run in parallel once their implementation counterpart lands
- User Story 1: T012, T013, T014 (tests, different files) can be drafted in parallel; T015/T016 (ContentPanel.tsx) and T018 (RepoContextHeader.tsx) and T019 (App.tsx) touch different files and can proceed in parallel once tests are written, though T019 depends on T018's new props existing
- User Story 2 and User Story 3 share the same two files (`RepoContextHeader.tsx`, `App.tsx`) for their implementation tasks (T025 and T030; T024 and T029) — these are **not** safely parallelizable against each other despite being different stories, since both edit the same top action row and the same handler-mounting block; sequence US2's implementation (T023-T025) before US3's (T029-T030), or have one contributor own both
- Different user stories' **test** tasks (T021/T022 vs. T027/T028) can be drafted in parallel even though their implementation tasks should be sequenced, since test files can accumulate independent test cases without conflicting
- Polish: T032, T033, T034 can run in parallel (independent manual/review passes); T035, T036, T037 are sequential (coverage must be confirmed before claiming the feature complete; the changelog entry and final quickstart re-check are last)

---

## Parallel Example: Foundational Phase

```bash
# Launch independent foundational fixes together (different files):
Task: "Add filesystem-root guard to repositoryParentFolderHandler in src/handlers/repo.ts (T002)"
Task: "Add RepoLocationResponse to src/types.ts (T003)"
Task: "Add RepoLocationResponse to ui/src/types/index.ts (T006)"
Task: "Add api.getRepoLocation() to ui/src/services/api.ts (T007)"
```

## Parallel Example: User Story 1

```bash
# Launch all three failing-first tests together:
Task: "Test Parent Folder button states in ui/src/components/RepoContext/RepoContextHeader.test.tsx (T012)"
Task: "Test onNavigateParent handler in ui/src/App.test.tsx (T013)"
Task: "Rewrite obsolete '..' row assertions in ui/src/components/ContentPanel/ContentPanel.test.tsx (T014)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete T002 only from Phase 2: Foundational (US1 does not need T003-T011)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1-2 independently
5. This alone fixes the most inconsistent, highest-frequency navigation action (parent nav) and is a shippable MVP, even before Home/Readme exist

### Incremental Delivery

1. Setup + T002 → US1 MVP ready
2. Add remaining Foundational (T003-T011) → repo-location endpoint ready
3. Add User Story 2 → validate (Home button, including nested sub-repo targeting)
4. Add User Story 3 → validate (Readme button, reusing US2's `repoLocation` prop)
5. Polish phase → toolbar footprint/accessibility check, coverage confirmation, CHANGELOG entry, full quickstart re-check

### Parallel Team Strategy

With multiple contributors: one person takes T002 + User Story 1 (self-contained, no endpoint dependency) while another completes the rest of Foundational (T003-T011) in parallel; once Foundational is fully done, a third person can start User Story 2, handing off to User Story 3 afterward since both share the same `RepoContextHeader`/`App.tsx` edit sites and are safer sequenced than parallelized against each other.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to its spec.md user story for traceability
- This feature is a **relocation and consolidation** of existing navigation primitives (`parentPathOf`, `onBrowseParent`, `findReadme`, `classifyLocalPath`), not new navigation architecture — per plan.md/research.md, almost every implementation task above is "wire an existing, already-correct function into a new call site or a new toolbar button," not new logic. The one genuinely new piece of business logic is `repositoryLocationHandler`'s composition of `classifyLocalPath` + `findReadme` against the current in-app selection (T004) — everything else is prop-plumbing and JSX.
- Two drift points versus plan.md's original file/line table (found during pre-task verification against the actual current branch) are folded into the relevant tasks above rather than left implicit: `renderDirectoryList`'s true range is `ContentPanel.tsx:635-868` (T015), and `repositoryParentFolderHandler` has zero pre-existing test coverage (T008 must add baseline coverage, not just guard-branch coverage).
- Verify each new/rewritten test fails before its implementation task lands, then passes after.
- Stop at any checkpoint to validate a story independently before continuing.
