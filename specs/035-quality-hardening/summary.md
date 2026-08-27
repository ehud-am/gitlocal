# 035-quality-hardening: Final Summary

**Status**: Phase 9 (Final Verification) complete. This is the release-review artifact required by tasks.md's final checkpoint, presented before this effort's own merge/version-bump/tag steps (deferred per Principle VIII, same as 0.10.2).

## Headline result

Every success criterion passed except SC-001 (the 30% LOC-reduction target), which fell well short. That shortfall was surfaced to the user mid-effort (before Phase 9 began) rather than discovered here; the user chose to proceed to final verification and reporting rather than pursue further reduction work. Every other quality, correctness, and coverage bar was met.

## SC-001 — LOC reduction: **MISSED**

| | `src/` | `ui/src/` | Total |
|---|---|---|---|
| v0.10.2 baseline | 5,489 | 9,062 | 14,551 |
| Current (035 tip) | 5,520 | 8,773 | 14,293 |
| Delta | +31 | -289 | **-258 (-1.8%)** |

Target was ≥30% reduction (≤10,186 lines). Actual reduction: **1.8%**. `src/` grew slightly (small correctness additions like SH-008's explicit status codes and FT-009's error/retry affordance outweighed dead-code removal there); `ui/src/` shrank modestly, mainly from duplicate-code consolidation (Checkpoints D1-D6) and dead-code removal (C1-C3).

Root cause of the miss: this effort's scope (Phase 3's architecture review, `architecture-review.md`) explicitly found the codebase already lean and well-factored going in — 16 units reviewed, no unit flagged as an oversized "god component" needing structural rewrite (see AS-003, CP-010 architecture verdicts), and most of the 110 findings were low/medium-severity local issues (dead code, small duplication, missing memoization, minor readability) rather than large removable blocks. Hitting 30% would have required speculative restructuring beyond what the findings supported, which conflicts with this project's anti-overengineering guidance. This was reported to the user as a choice point; the user opted to close the effort honestly rather than manufacture reduction.

## SC-002 — Test pass rate: **PASS**

441/441 server tests pass (excluding one pre-existing, environment-only sandbox-networking flake in `tests/integration/terminal.test.ts`, present before this effort began and unrelated to any change made — documented at every checkpoint). 444/444 UI tests pass. No test assertion was weakened to force a pass; the few test files touched (`FileTree.test.tsx`, `PickerPage.test.tsx`, `TerminalPanel.test.tsx`, `TerminalTabStrip.test.tsx`, `button.test.tsx`, `sync.test.ts`, `App.logic.test.tsx`) were updated only where the code they tested was legitimately simplified (e.g. `TerminalView`'s narrowed props at TP-002).

## SC-003 — Zero open P1/P2 findings: **PASS**

`findings/index.md` confirms zero findings remain in `open` or `verified` (undispositioned) state. All 5 High-severity findings (SG-004, SR-001, PK-001, NM-001, NM-004) are fixed. Final disposition across all 110 logged findings (+2 excluded architecture verdicts, AS-003/CP-010):

- **101 fixed**
- **7 deferred** (user-sign-off basis in each case — see `findings/index.md`'s deferred row): SH-001, NM-006, NM-009, FT-004, FT-005, FT-007, SE-005
- **2 rejected** (found not to be real defects on adjudication): RC-007, SG-005

## SC-004 — Zero dead code: **PASS**

All 18 dead-code findings dispositioned (17 fixed across Checkpoints B1/C1/C2/C3, 1 rejected as RC-007 — already file-private, no dead export existed to remove).

## SC-005 — No unjustified duplication: **PASS**

All 27 duplicate-code findings dispositioned (25 fixed across Checkpoints D1-D6, 2 deferred as NM-006/NM-009 — idiomatic, necessary AppKit wiring the finding's own evidence concluded had no consolidation benefit, and native-macos is explicitly out of the LOC-reduction target's scope).

## SC-006 — Build/bundle size + efficiency win: **PASS**

Measured directly against a fresh `v0.10.2` build in an isolated worktree:

| | v0.10.2 | Current | Delta |
|---|---|---|---|
| `dist/index.js` | 192.3kb | 193.1kb | +0.8kb |
| `dist/cli.js` | 385.1kb | 386.0kb | +0.9kb |
| UI main bundle (raw) | 712.83 kB | 710.80 kB | -2.03 kB |
| UI main bundle (gzip) | 195.09 kB | 195.44 kB | +0.35 kB |

Effectively flat — within noise, no regression. The small server-bundle growth is attributable to genuine (tiny) correctness additions (SH-008's explicit HTTP status codes, FT-009's retry affordance), not bloat.

Demonstrated efficiency win (required by SC-006, from Checkpoint E1): **SG-004** — redundant `git ls-files` re-spawning during search directory traversal, measured on a synthetic 100-file/10-directory benchmark at **320 spawns → 1 spawn (99.7% reduction)**. Additional wins without formal benchmarks: SR-002 (per-request dynamic `import('node:fs')` → static top-level import), CP-001/CP-002/CP-003/PK-006 (missing `useEffect` dependency arrays and unmemoized allocations fixed via a ref-based "latest value" pattern / `useMemo`), FT-001/FT-002/FT-003 (same ref-based pattern applied to `FileTree.tsx`'s `toggleDir`), and SE-001/SE-002/SE-006 (SearchPanel's 7 single-purpose draft-sync effects consolidated into 1, cutting redundant render passes on every committed-prop change).

## SC-007 — Checkpoint review discipline: **PASS**

Every checkpoint (B1/B2, C1-C3, D1-D6, E1, F1-F4, G1-G3) was completed and reported before the next began, under the user's standing authorization to proceed through the remaining backlog once granted mid-effort. Zero batches were skipped.

## SC-008 — Per-file coverage ≥90%: **PASS**

Re-verified in Phase 9: `vitest run --coverage`, with the one pre-existing flaky integration test excluded so the v8 provider can complete its report (that test's failure otherwise aborts report generation entirely — an environment artifact, not a coverage gap). Result: **exit code 0**, all files at or above the 90% lines/functions/branches/statements floor. `index.ts`/`types.ts` (server and terminal) show 0/0/0/0 because they contain zero instrumentable statements (pure type/entry-point files), not because they're undertested.

## T049 — Manual regression pass across specs 001-034

No browser was available in this environment, so this was a code-level regression audit: every acceptance scenario in a spec whose feature area overlapped a file touched by this effort (62 files changed vs. `v0.10.2`, spanning `src/git`, `src/handlers`, `src/services`, `src/terminal`, and most of `ui/src`) was checked against the current implementation and existing automated test coverage.

Specs reviewed in depth (touched-file overlap was real): **003-viewer-usability-search**, **025-viewer-usability-upgrades** (search scopes, pagination, branch-switch behavior — relevant to SE-008's cursor-reset fix), **010-file-sync-actions** (relevant to SV-001's `currentPathType` fix), **013-unified-action-menus** (relevant to RC-008's dropped-prop fix), **032-integrated-terminal-panel** (relevant to ST-001's error-type fix), **018-macos-homebrew-app** and **021-native-shortcuts** (relevant to the native-macos NM-001/002/004/011/014 fixes). Remaining specs 001-034 either had no material file overlap or overlapped only files changed by explicitly no-behavior-change refactors (readability/dead-code/duplication checkpoints, each individually verified via `tsc --noEmit` + full `vitest run` + `npm run build` at fix time).

**Finding: no acceptance scenario was found to conflict with any fix made in this effort.** Every bug-category fix (SV-001, SV-003, RC-008, FT-009/010/011, SE-008, SH-007, NM-001/002/004/011/014) closed a gap in behavior that was either untested or entirely unaddressed by any documented acceptance scenario — none of them required loosening or contradicting an existing scenario to land. This is consistent with each finding's own evidence at disposition time (e.g. SV-001 and SV-003's findings explicitly note the buggy paths were untested by existing tests).

## Deferred findings (7) — full list with rationale

| ID | Unit | Rationale |
|---|---|---|
| SH-001 | server-handlers | Merging risks reordering validation/error precedence — see `server-handlers.md` Adjudication Log |
| NM-006 | native-macos | Idiomatic/necessary AppKit pattern; unit out of LOC-reduction scope |
| NM-009 | native-macos | Same as NM-006 |
| FT-004 | ui-file-tree | No valid fix without restructuring `renderNodes` into a subcomponent (hooks can't be called per-invocation inside a closure); finding's own evidence self-disqualifies as low-impact |
| FT-005 | ui-file-tree | Same as FT-004 |
| FT-007 | ui-file-tree | Same as FT-004 |
| SE-005 | ui-search | `React.memo` finding self-disqualifies as a pre-existing project-wide pattern (no component in the codebase uses `React.memo`), not a unit-specific regression |

## Rejected findings (2)

| ID | Unit | Reason |
|---|---|---|
| RC-007 | ui-repo-context | Already file-private; no dead export existed to remove |
| SG-005 | server-git | Comparators proved not behavior-equivalent; a test broke when unified |

## Checkpoint-by-checkpoint fix record

See `findings/index.md`'s "Totals by status" narrative for the full per-checkpoint breakdown (B1/B2 through G1-G3, 101 findings). Not duplicated here for brevity.
