# Findings Index

Running counts by unit, updated after each Phase 3 checkpoint. Status values: `open`, `verified`, `deferred`, `fixed`, `rejected`.

| Unit | Bug | Dead Code | Duplicate | Efficiency | Readability | Total | Batch |
|------|-----|-----------|-----------|------------|--------------|-------|-------|
| server-git | 0 | 2 | 1 | 1 | 2 | 6 | A |
| server-handlers | 1 | 0 | 4 | 0 | 4 | 9 | A |
| server-root | 0 | 1 | 1 | 1 | 0 | 3 | A |
| server-terminal | 1 | 3 | 0 | 1 | 0 | 5 | B |
| server-services | 2 | 1 | 1 | 0 | 0 | 4 | B |
| ui-app-shell | 0 | 0 | 2 | 1 | 4 | 7* | B |
| ui-content-panel | 0 | 4 | 1 | 3 | 1 | 9* | C |
| ui-types | 1 | 0 | 2 | 0 | 0 | 3 | C |
| ui-services | 0 | 1 | 4 | 0 | 1 | 6 | C |
| ui-repo-context | 1 | 1 | 3 | 0 | 4 | 9 | D |
| ui-terminal-panel | 0 | 1 | 0 | 0 | 1 | 2 | D |
| ui-picker | 0 | 0 | 5 | 1 | 3 | 9 | D |
| ui-search | 2 | 0 | 0 | 4 | 2 | 8 | E |
| ui-file-tree | 3 | 0 | 1 | 6 | 2 | 12 | E |
| ui-primitives-misc | 0 | 3 | 0 | 1 | 0 | 4 | E |
| native-macos | 5 | 1 | 2 | 2 | 4 | 14 | F |

**Total findings logged**: 110
**Last updated**: Phase 3 complete (T044/T045) — `architecture-review.md` written, findings inventory finalized, all 16 units reviewed (batches A-F)

\* ui-app-shell's 7 counted findings exclude AS-003, a required architecture verdict (not a defect) confirming App.tsx is NOT an oversized "god component" — see ui-app-shell.md for the full rationale. This closes plan.md's Q1 open question and tasks.md's T018.

\* ui-content-panel's 9 counted findings exclude CP-010, a required architecture verdict (not a defect) confirming ContentPanel.tsx is NOT an oversized "god component," though it notes an optional (non-mandatory) shrink path — see ui-content-panel.md for the full rationale.

## Totals by category

| Bug | Dead Code | Duplicate | Efficiency | Readability | **Total** |
|-----|-----------|-----------|------------|--------------|-----------|
| 16  | 18        | 27        | 21         | 28           | **110**   |

## Totals by severity

| Severity | Count | Notes |
|----------|-------|-------|
| High     | 5     | SG-004, SR-001, PK-001, NM-001, NM-004 — see `architecture-review.md` §4 |
| Medium   | 31    | |
| Low      | 74    | |
| **Total**| **110** | |

## Totals by status

Phase 4 (US2: bug fixes) landed Checkpoints B1+B2 (12 findings). Phase 5 (US3: dead code removal) is complete — Checkpoint C1 fixed 6 findings and Checkpoints C2+C3 fixed the remaining 11, with 1 (RC-007) rejected as not actionable; all 18 dead-code findings are dispositioned. Phase 6 (US4: duplicate-code consolidation) is complete — Checkpoint D1 fixed 5 findings, deferred 1, and rejected 1; Checkpoint D2 fixed 5 more; Checkpoint D3 fixed 7 more (including PK-004/PK-005, whose described defect was found to already be resolved by an earlier, unrelated commit — see ui-picker.md Adjudication Log); Checkpoint D4 fixed 4 more (RepoContextHeader duplication); Checkpoint D5 fixed 4 more (services-layer duplication); Checkpoint D6 fixed 3 more (SR-001/UT-001/UT-002 — server/UI wire-format type duplication, resolved via a type-only re-export rather than redeclaration), and deferred NM-006/NM-009 (native-macOS AppKit idioms), since both findings' own evidence concludes the "duplication" is idiomatic and necessary AppKit wiring with no correctness/maintenance benefit from consolidating, and the unit is explicitly scoped out of the LOC-reduction target. Phase 7 (US5: efficiency improvements) landed one checkpoint (E1, 6 findings) with measured before/after evidence per finding: SG-004 (redundant `git ls-files` re-spawning during search traversal — 320→1 spawns, a 99.7% reduction, on a synthetic 100-file/10-directory benchmark), SR-002 (per-request dynamic `import('node:fs')` converted to a static top-level import), and CP-001/CP-002/CP-003/PK-006 (missing `useEffect` dependency arrays and unmemoized array allocations in React components, fixed via a ref-based "latest value" indirection pattern and `useMemo` respectively); the user opted to move on to Phase 8 rather than triage the remaining ~13 efficiency findings, most of which self-disqualify per their own evidence text (e.g. "unlikely to be a measurable bottleneck," "only worth revisiting if profiling shows it matters") — these remain `verified`, not `deferred`, pending an explicit disposition call. Phase 8 (US6: readability polish) is underway. Checkpoint F1 fixed 6 findings, prioritizing units already deeply understood from earlier phases: SG-001 (cosmetic re-indentation in `tree.ts`'s `listDir`), AS-002 (collapsed a no-op ternary in `App.tsx`), RC-004/RC-005/RC-009 (extracted a named `isStaleUpToDateBadge` variable, removed a redundant boolean term, and renamed `hasRootReadme` to `hasNavActions` in `RepoContextHeader.tsx`), and CP-004 (fixed the "Find in file" button to only reset its query on close, not on every toggle — flagged as a small behavior improvement bundled with the readability fix, since it was mislabeled `readability` rather than `bug` in the original finding). Checkpoint F2 fixed 6 more, all comment-only or object-literal-consolidation changes with zero logic change: NM-010/NM-012/NM-013 (documentation comments and named constants in the review-only native-macos Swift unit), SG-006 (consolidated a duplicated SSH-directory-not-found response object into a shared helper), SH-009 (clarifying comment on `resolveSessionCwd`'s loop invariant), SE-003 (clarifying comment on `SearchResults.tsx`'s label-precedence logic). All twelve F1+F2 fixes verified via `tsc --noEmit`, the full `vitest run` (444/444, no regressions), and the root build where applicable (bundle size unchanged within a no-op delta); the three Swift-only F2 fixes (comment/constant-only, no logic change) were verified by manual review only, since no Swift toolchain is available in this environment. Checkpoint F3 fixed 6 more, all pure refactors with no behavior change: SH-006 (extracted `repoOpenBlocked`/`repoOpenResult` helpers in `repo.ts`, matching the `mutationBlocked`/`folderMutationBlocked` pattern already used in file.ts/folder.ts), AS-006/AS-007/AS-008 (split App.tsx's 17-dep viewer-state-persistence effect into a memoized snapshot plus a 2-dep gating effect, extracted a `computeEmptyState` helper replacing three mutable `let` bindings, and finished moving the last 3 local icon components into `icons.tsx`), US-004 (extracted a shared `safeLocalStorage.ts` wrapper, replacing 8 repeated availability-guard blocks across `viewerState.ts`/`theme.ts`), and SE-004 (added semantically distinct `name-match`/`content-match` icons to `MetaTag` in place of the unrelated `git`/`local-change` icons). All six verified via `tsc --noEmit`, the full `vitest run`, and `npm run build`. 24 findings remain review-confirmed and open in the fix-lifecycle sense.

| Fix-lifecycle status | Count | Meaning |
|----------------------|-------|---------|
| `fixed`        | 81    | Checkpoint B1 (T051-T056): NM-001, NM-004, ST-001, SV-001, RC-008, FT-010. Checkpoint B2 (T057-T062): FT-011, NM-002, NM-011, SH-007, SV-003, UT-003. Checkpoint C1: NM-007, SG-002, SG-003, SR-003, SV-002, ST-002. Checkpoints C2+C3: ST-003, ST-004, CP-005, CP-006, CP-007, CP-008, PM-001, PM-002, PM-004, US-001, TP-001. Checkpoint D1: SH-002, SH-003, SH-004, SH-005, SV-004. Checkpoint D2: AS-001, AS-004, AS-005, CP-009, FT-008. Checkpoint D3: PK-001, PK-002, PK-003, PK-004, PK-005, PK-007, PK-008. Checkpoint D4: RC-001, RC-002, RC-003, RC-006. Checkpoint D5: US-002, US-003, US-005, US-006. Checkpoint D6: SR-001, UT-001, UT-002. Checkpoint E1: SG-004, SR-002, CP-001, CP-002, CP-003, PK-006. Checkpoint F1: SG-001, AS-002, RC-004, RC-005, RC-009, CP-004. Checkpoint F2: NM-010, NM-012, NM-013, SG-006, SH-009, SE-003. Checkpoint F3: SH-006, AS-006, AS-007, AS-008, US-004, SE-004 |
| `verified`     | 24    | Confirmed real by Pass 2 (or Pass 1 alone where Pass 2 independently agreed with no dispute); not yet fixed |
| `deferred`     | 3     | Checkpoint D1: SH-001 (see server-handlers.md Adjudication Log — merging risks reordering validation/error precedence). NM-006, NM-009 (see native-macos.md Adjudication Log — idiomatic/necessary AppKit patterns, unit out of LOC-reduction scope) |
| `rejected`     | 2     | RC-007 (see ui-repo-context.md Adjudication Log — already file-private, no dead export to remove). Checkpoint D1: SG-005 (see server-git.md Adjudication Log — comparators proved not behavior-equivalent; a test broke when unified) |

2 additional findings (AS-003, CP-010) are architecture verdicts, not defects, and are excluded from all counts above — see the unit footnotes.

Phases 4-8 will continue to flip individual findings to `fixed`, `deferred`, or `rejected` as work proceeds; this table is updated at each checkpoint alongside the per-unit table above.
