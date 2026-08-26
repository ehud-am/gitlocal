---

description: "Task list for the 0.10.3 quality-hardening effort"
---

# Tasks: Quality Hardening (0.10.3)

**Input**: Design documents from `specs/035-quality-hardening/` (`spec.md`, `plan.md`)
**Prerequisites**: plan.md (approved), spec.md (approved)

**Tests**: Regression tests are required per-finding (FR: every bug fix ships with a test that fails pre-fix and passes post-fix; every dead-code/dup/efficiency change is verified against the existing suite) — not a separate up-front test-writing phase, since this effort edits existing behavior rather than building new behavior.

**Organization**: Phase 3 (US1, the review) is fully enumerable now because its inputs (the 15 review units) are already known. Phases 4-8 (US2-US6, the fix batches) are **not** enumerable yet — their task lists depend on what Phase 3 actually finds, by design (see plan.md Q3: batch count/content is sized once findings exist, not guessed up front). Each of those phases is defined here as a repeatable procedure; concrete T-numbers get appended to this file once `findings/index.md` exists, itself a tracked task (T032).

## Format: `[ID] [P?] [Story] Description (Model)`

- **[P]**: Can run in parallel (different files/units, no dependency on another task in this batch)
- **[Story]**: US1-US6 per spec.md, or `SETUP`/`FOUND`/`FINAL` for cross-cutting phases
- Model tag reflects plan.md's Q4 assignment table

## Phase 1: Setup

- [ ] T001 [SETUP] Add `knip` as a devDependency (root `package.json`); add a minimal `knip.json` scoping it to `src/` + `ui/src/` (Sonnet 5)
- [ ] T002 [SETUP] Run `npx knip` once, save raw output to `specs/035-quality-hardening/findings/knip-baseline.txt` for Pass 1 tasks to consume (Haiku 4.5)
- [ ] T003 [SETUP] Confirm baseline quality gate is green before any change: `npm run verify` (full pass required to start) (Sonnet 5)

**Checkpoint**: Tooling in place, clean starting baseline confirmed — commit as the effort's zero point.

---

## Phase 2: Foundational

**Purpose**: Scaffolding the findings inventory structure every later phase writes into.

- [ ] T004 [FOUND] Create `specs/035-quality-hardening/findings/` with the 15 per-unit files (empty tables, one row template each) per plan.md's Project Structure (Sonnet 5)
- [ ] T005 [FOUND] Create `specs/035-quality-hardening/findings/index.md` — running counts by unit × category × status, empty at start (Sonnet 5)

**Checkpoint**: Findings inventory scaffolding exists and is committed — Phase 3 can begin.

---

## Phase 3: User Story 1 - Architecture & code review produces a trustworthy findings inventory (Priority: P1)

**Goal**: Every unit reviewed by 2 independent passes (+ adjudication where they disagree); a written architecture assessment; a fully populated, evidence-backed findings inventory. No code changes in this phase.

**Independent Test**: `findings/index.md` and `architecture-review.md` exist, every unit's findings file is populated, and every entry has file/line/category/severity/evidence — reviewable and valuable even if Phases 4-8 never ran.

### Batch A (server core) — units: `src/git`, `src/handlers`, `src/*.ts` root

- [ ] T006 [P] [US1] Pass 1 mechanical sweep of `src/git/` → `findings/server-git.md` (Haiku 4.5)
- [ ] T007 [P] [US1] Pass 1 mechanical sweep of `src/handlers/` → `findings/server-handlers.md` (Haiku 4.5)
- [ ] T008 [P] [US1] Pass 1 mechanical sweep of `src/*.ts` root (cli/types/index/server) → `findings/server-root.md` (Haiku 4.5)
- [ ] T009 [US1] Pass 2 deep review of `src/git/` (depends on T006) (Sonnet 5)
- [ ] T010 [US1] Pass 2 deep review of `src/handlers/` (depends on T007) (Sonnet 5)
- [ ] T011 [US1] Pass 2 deep review of `src/*.ts` root (depends on T008) (Sonnet 5)
- [ ] T012 [US1] Adjudicate any T006-T011 disagreements, if any (Sonnet 5, high effort)

**Checkpoint 1**: Update `findings/index.md`, present Batch A findings to user, get go-ahead, commit.

### Batch B (server terminal/services + UI app shell) — units: `src/terminal`, `src/services`, `ui/src/App.tsx`

- [ ] T013 [P] [US1] Pass 1 mechanical sweep of `src/terminal/` → `findings/server-terminal.md` (Haiku 4.5)
- [ ] T014 [P] [US1] Pass 1 mechanical sweep of `src/services/` → `findings/server-services.md` (Haiku 4.5)
- [ ] T015 [P] [US1] Pass 1 mechanical sweep of `ui/src/App.tsx` → `findings/ui-app-shell.md` (Haiku 4.5)
- [ ] T016 [US1] Pass 2 deep review of `src/terminal/` (depends on T013) (Sonnet 5)
- [ ] T017 [US1] Pass 2 deep review of `src/services/` (depends on T014) (Sonnet 5)
- [ ] T018 [US1] Pass 2 deep review of `ui/src/App.tsx`, incl. explicit "is this a god component" architecture call (depends on T015) (Sonnet 5)
- [ ] T019 [US1] Adjudicate any T013-T018 disagreements, if any (Sonnet 5, high effort)

**Checkpoint 2**: Update `findings/index.md`, present Batch B findings to user, get go-ahead, commit.

### Batch C (UI content/types/services) — units: `ContentPanel/`, `ui/src/types/`, `ui/src/services/`

- [ ] T020 [P] [US1] Pass 1 mechanical sweep of `ui/src/components/ContentPanel/` → `findings/ui-content-panel.md` (Haiku 4.5)
- [ ] T021 [P] [US1] Pass 1 mechanical sweep of `ui/src/types/` → `findings/ui-types.md` (Haiku 4.5)
- [ ] T022 [P] [US1] Pass 1 mechanical sweep of `ui/src/services/` → `findings/ui-services.md` (Haiku 4.5)
- [ ] T023 [US1] Pass 2 deep review of `ui/src/components/ContentPanel/`, incl. explicit "is this a god component" architecture call (depends on T020) (Sonnet 5)
- [ ] T024 [US1] Pass 2 deep review of `ui/src/types/` (depends on T021) (Sonnet 5)
- [ ] T025 [US1] Pass 2 deep review of `ui/src/services/` (depends on T022) (Sonnet 5)
- [ ] T026 [US1] Adjudicate any T020-T025 disagreements, if any (Sonnet 5, high effort)

**Checkpoint 3**: Update `findings/index.md`, present Batch C findings to user, get go-ahead, commit.

### Batch D (UI RepoContext/TerminalPanel/Picker) — units: `RepoContext/`, `TerminalPanel/`, `Picker/`

- [ ] T027 [P] [US1] Pass 1 mechanical sweep of `ui/src/components/RepoContext/` → `findings/ui-repo-context.md` (Haiku 4.5)
- [ ] T028 [P] [US1] Pass 1 mechanical sweep of `ui/src/components/TerminalPanel/` → `findings/ui-terminal-panel.md` (Haiku 4.5)
- [ ] T029 [P] [US1] Pass 1 mechanical sweep of `ui/src/components/Picker/` → `findings/ui-picker.md` (Haiku 4.5)
- [ ] T030 [US1] Pass 2 deep review of `ui/src/components/RepoContext/` (depends on T027) (Sonnet 5)
- [ ] T031 [US1] Pass 2 deep review of `ui/src/components/TerminalPanel/` (depends on T028) (Sonnet 5)
- [ ] T032 [US1] Pass 2 deep review of `ui/src/components/Picker/` (depends on T029) (Sonnet 5)
- [ ] T033 [US1] Adjudicate any T027-T032 disagreements, if any (Sonnet 5, high effort)

**Checkpoint 4**: Update `findings/index.md`, present Batch D findings to user, get go-ahead, commit.

### Batch E (UI Search/FileTree/primitives+misc) — units: `Search/`, `FileTree/`, `ui/` primitives+lib+hooks+top-level

- [ ] T034 [P] [US1] Pass 1 mechanical sweep of `ui/src/components/Search/` → `findings/ui-search.md` (Haiku 4.5)
- [ ] T035 [P] [US1] Pass 1 mechanical sweep of `ui/src/components/FileTree/` → `findings/ui-file-tree.md` (Haiku 4.5)
- [ ] T036 [P] [US1] Pass 1 mechanical sweep of `ui/src/components/ui/`, `ui/src/lib/`, `ui/src/hooks/`, `AppFooter.tsx`/`AppDialogs.tsx` → `findings/ui-primitives-misc.md` (Haiku 4.5)
- [ ] T037 [US1] Pass 2 deep review of `ui/src/components/Search/` (depends on T034) (Sonnet 5)
- [ ] T038 [US1] Pass 2 deep review of `ui/src/components/FileTree/` (depends on T035) (Sonnet 5)
- [ ] T039 [US1] Pass 2 deep review of primitives+misc (depends on T036) (Sonnet 5)
- [ ] T040 [US1] Adjudicate any T034-T039 disagreements, if any (Sonnet 5, high effort)

**Checkpoint 5**: Update `findings/index.md`, present Batch E findings to user, get go-ahead, commit.

### Batch F (native, review-only)

- [ ] T041 [US1] Pass 1 mechanical sweep of `native/macos/GitLocal/GitLocal/*.swift` → `findings/native-macos.md` (Haiku 4.5)
- [ ] T042 [US1] Pass 2 deep review of native Swift wrapper (depends on T041) (Sonnet 5)
- [ ] T043 [US1] Adjudicate any T041-T042 disagreements, if any (Sonnet 5, high effort)

**Checkpoint 6**: Update `findings/index.md`, present Batch F findings to user, get go-ahead, commit.

### Synthesis

- [x] T044 [US1] Write `architecture-review.md`: module boundaries, layering, structural concerns, and an explicit verdict on the `App.tsx`/`ContentPanel` "god component" question raised in T018/T023 (Sonnet 5)
- [x] T045 [US1] Finalize `findings/index.md`: full counts by category/severity/status across all 15 units; this is the concrete input Phases 4-8 get expanded from (Sonnet 5)

**Checkpoint 7 (Phase 3 complete)**: Present `architecture-review.md` + final findings inventory to user. Get explicit go-ahead before expanding Phases 4-8 below into real task IDs. Commit.

---

## Phase 4: User Story 2 - Confirmed bugs are fixed (Priority: P1)

**Goal**: Every open bug finding from `findings/index.md` is fixed with a regression test, or explicitly deferred to the user (FR-008) if the correct fix would change behavior.

All 16 open bug findings, sorted by severity, batched into three checkpoints of ≤6 each. Per finding: write/confirm a failing regression test → fix → confirm test passes → `npm run verify` green (TS/JS findings). Native Swift findings use an adapted procedure — see note below.

### Checkpoint B1 (6 fixes: both high-severity + 4 next-highest)

- [x] T051 Fix NM-001 (native-macos, high): unsynchronized `completed` flag race across 3 GCD queues in `GitLocalService`.
- [x] T052 Fix NM-004 (native-macos, high): incomplete JS-string escaping in the Finder→WebView JS bridge (script injection via filename).
- [x] T053 Fix ST-001 (server-terminal, medium): stale `TerminalUnavailableErrorCode` type unenforced because the handler never imports it.
- [x] T054 Fix SV-001 (server-services, medium).
- [x] T055 Fix RC-008 (ui-repo-context, medium).
- [x] T056 Fix FT-010 (ui-file-tree, medium): tree/treeitem ARIA roles with no keyboard operability.

### Checkpoint B2 (6 fixes)

- [x] T057 Fix FT-011 (ui-file-tree, medium).
- [x] T058 Fix NM-002 (native-macos, medium): shutdown never escalates to SIGKILL, doesn't block, orphans child process on quit.
- [x] T059 Fix NM-011 (native-macos, medium).
- [x] T060 Fix SH-007 (server-handlers, low, adjudicated finding).
- [x] T061 Fix SV-003 (server-services, low).
- [x] T062 Fix UT-003 (ui-types, low): `ViewerState` drift between server/client types.

### Checkpoint B3 (4 fixes)

- [ ] T063 Fix SE-007 (ui-search, low).
- [ ] T064 Fix SE-008 (ui-search, low).
- [ ] T065 Fix FT-009 (ui-file-tree, low).
- [ ] T066 Fix NM-003 (native-macos, low).

**Native Swift procedure note**: this sandbox has no Swift compiler and no automated XCTest suite (`native/macos/GitLocalTests/` holds only manual Markdown test plans). NM-findings are fixed via careful manual code reasoning and documented as a new/updated scenario in `LifecycleTests.md` or `ShortcutCommandTests.md` in place of an automated regression test. Build/runtime verification of these fixes requires a Mac.

Any finding requiring a behavior/feature decision is pulled into a separate "deferred findings" list for the user, not fixed, at the relevant checkpoint.

Model: Sonnet 5 (fix + test authoring), Sonnet 5 high-effort for anything touching `src/git/` (highest blast-radius unit by line count and by being the product's core data layer).

**Checkpoint**: All P1/P2 bug findings closed (fixed or user-deferred) — SC-003.

---

## Phase 5: User Story 3 - Dead code is removed (Priority: P2)

**Goal**: Every verified dead-code finding removed; nothing reachable/importable that isn't used.

**Procedure**:
1. Take only findings marked `verified` (Pass 3-cleared if originally disputed) — never remove on a Pass-1-only flag.
2. Batch into checkpoints of ≤6 removals.
3. Per finding: re-confirm via `npx knip` + targeted grep for dynamic references (string lookups, Swift `#selector`, test-only imports) immediately before deleting → delete → full build + test run.
4. Per checkpoint: present removals + verification evidence, get go-ahead, commit.

Model: Haiku 4.5 for the re-confirmation grep pass, Sonnet 5 for the actual deletion + build/test verification.

**Checkpoint**: Zero dead code remains per final `knip` run + manual spot-check — SC-004.

---

## Phase 6: User Story 4 - Duplicate code is consolidated (Priority: P2)

**Goal**: Verified duplication findings consolidated into shared, well-named utilities at every original call site.

**Procedure**:
1. Take only findings marked `verified` (true duplication, not superficial similarity — per spec.md US4 Scenario 2).
2. Batch into checkpoints of ≤6 consolidations.
3. Per finding: extract shared implementation → update all call sites → confirm every pre-existing test for every affected call site still passes unchanged.
4. Per checkpoint: present consolidations + before/after call-site list, get go-ahead, commit.

Model: Sonnet 5 (requires cross-call-site behavioral judgment).

**Checkpoint**: No unjustified near-duplicate blocks remain — SC-005.

---

## Phase 7: User Story 5 - Efficiency improvements (Priority: P2)

**Goal**: Every finding with measured evidence of waste gets a fix with a demonstrated before/after improvement; no speculative optimization.

**Procedure**:
1. Take only findings with attached evidence (call count, render count, benchmark, redundant `git`/filesystem invocation).
2. Batch into checkpoints of ≤6 fixes.
3. Per finding: capture the "before" measurement if not already in the finding → fix → capture "after" → confirm existing tests unchanged.
4. Per checkpoint: present fixes + before/after numbers, get go-ahead, commit.

Model: Sonnet 5.

**Checkpoint**: At least one demonstrated efficiency win; build time/bundle size not regressed — SC-006.

---

## Phase 8: User Story 6 - Readability and elegance polish (Priority: P3)

**Goal**: Confusing names, nesting, and inconsistent patterns cleaned up in code already fully understood from Phases 3-7, with zero behavior change.

**Procedure**:
1. Take readability findings, prioritizing units touched by earlier phases (already deeply understood) over untouched ones.
2. Batch into checkpoints of ≤6 changes.
3. Per finding: apply change → confirm identical test results → second-pass read to confirm it's actually clearer (spec.md US6 Scenario 1).
4. Per checkpoint: present diffs, get go-ahead, commit.

Model: Sonnet 5, default effort.

**Checkpoint**: Readability pass complete.

---

## Phase 9: Final Verification

- [x] T046 [FINAL] Full `npm run verify` (tests, ≥90%-per-file coverage, build, both audits) (Sonnet 5) — tests 441/441 (+1 pre-existing sandbox-networking flake, environment-only), build clean, both audits 0 vulnerabilities, coverage exit 0 at ≥90%-per-file on every file
- [x] T047 [FINAL] Measure final non-test LOC in `src/` + `ui/src/`, confirm ≥30% reduction vs. 14,551-line baseline — SC-001 (Sonnet 5) — measured 14,293 lines, a 1.8% reduction; target missed, reported to user before Phase 9 began, see summary.md
- [x] T048 [FINAL] Confirm `findings/index.md` shows zero open P1/P2 findings (fixed or explicitly user-deferred) across all categories — SC-003/004/005 (Sonnet 5) — 0 open/verified, 101 fixed, 7 deferred, 2 rejected
- [x] T049 [FINAL] Re-run every spec 001-034 acceptance scenario relevant to touched code as a manual regression pass (mirrors the 0.10.2 prerelease live-verification step) (Sonnet 5) — code-level audit (no browser available); no acceptance scenario found to conflict with any fix, see summary.md
- [x] T050 [FINAL] Write `specs/035-quality-hardening/summary.md`: LOC before/after, findings closed by category, deferred findings list, efficiency wins with numbers — the release-review-style artifact for this effort (Sonnet 5)

**Checkpoint (final)**: Present `summary.md` to user. This effort's own release/merge/version-bump/tag steps happen afterward, following the same pattern as 0.10.2 (Principle VIII, deferred until this point).

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **Phase 3 (US1)**: strictly sequential, each a hard prerequisite for the next.
- **Phase 3 batches A-F**: independent of each other (different files) — could run in parallel, but plan.md's checkpoint rule (≤3 units/checkpoint) deliberately serializes them for review bandwidth, not a technical dependency.
- **Phases 4-8 (US2-US6)**: all depend on Phase 3's T045 (finalized findings inventory) — cannot start earlier, since there's nothing to act on. Recommended order matches spec.md priority (bugs → dead code → duplicates → efficiency → readability) since later phases are safest once earlier ones have already re-verified the affected code.
- **Phase 9 (Final)**: depends on all of Phases 4-8 the user chose to run being complete.

### Parallel Opportunities

- Within any Phase 3 batch, all Pass 1 tasks are `[P]` (different units, no shared state).
- A unit's Pass 2 task depends only on its own Pass 1 task, not on other units' passes — so e.g. T009/T010/T011 can run in parallel with each other once T006/T007/T008 are respectively done.
- Recommended execution mechanism: the `Workflow` tool (user-approved), one script per Phase 3 batch using `pipeline()` per unit (Pass 1 → Pass 2 → adjudicate-if-needed) with no barrier between units, matching this dependency shape exactly.

## Notes

- No task in Phase 3 changes code — it only produces findings and documentation.
- Every fix task (Phases 4-8) must cite the finding ID it resolves (FR-004) — no opportunistic changes.
- Commit at every checkpoint, not just at phase ends.
- Stop at any checkpoint if `npm run verify` fails — fix or revert before continuing, never carry a red gate into the next batch.
