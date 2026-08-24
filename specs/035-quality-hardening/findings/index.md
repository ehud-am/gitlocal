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

Phase 4 (US2: bug fixes) landed Checkpoints B1+B2 (12 findings). Phase 5 (US3: dead code removal) is complete — Checkpoint C1 fixed 6 findings and Checkpoints C2+C3 fixed the remaining 11, with 1 (RC-007) rejected as not actionable; all 18 dead-code findings are dispositioned. Phase 6 (US4: duplicate-code consolidation) is underway; Checkpoint D1 fixed 5 findings, deferred 1, and rejected 1; Checkpoint D2 fixed 5 more; Checkpoint D3 fixed 7 more (including PK-004/PK-005, whose described defect was found to already be resolved by an earlier, unrelated commit — see ui-picker.md Adjudication Log); Checkpoint D4 fixed 4 more (RepoContextHeader duplication); Checkpoint D5 fixed 4 more (services-layer duplication); Checkpoint D6 fixed 3 more (SR-001/UT-001/UT-002 — server/UI wire-format type duplication, resolved via a type-only re-export rather than redeclaration). NM-006/NM-009 (native-macOS AppKit idioms) were also dispositioned this checkpoint — deferred, not fixed, since both findings' own evidence concludes the "duplication" is idiomatic and necessary AppKit wiring with no correctness/maintenance benefit from consolidating, and the unit is explicitly scoped out of the LOC-reduction target. 48 findings remain review-confirmed and open in the fix-lifecycle sense.

| Fix-lifecycle status | Count | Meaning |
|----------------------|-------|---------|
| `fixed`        | 57    | Checkpoint B1 (T051-T056): NM-001, NM-004, ST-001, SV-001, RC-008, FT-010. Checkpoint B2 (T057-T062): FT-011, NM-002, NM-011, SH-007, SV-003, UT-003. Checkpoint C1: NM-007, SG-002, SG-003, SR-003, SV-002, ST-002. Checkpoints C2+C3: ST-003, ST-004, CP-005, CP-006, CP-007, CP-008, PM-001, PM-002, PM-004, US-001, TP-001. Checkpoint D1: SH-002, SH-003, SH-004, SH-005, SV-004. Checkpoint D2: AS-001, AS-004, AS-005, CP-009, FT-008. Checkpoint D3: PK-001, PK-002, PK-003, PK-004, PK-005, PK-007, PK-008. Checkpoint D4: RC-001, RC-002, RC-003, RC-006. Checkpoint D5: US-002, US-003, US-005, US-006. Checkpoint D6: SR-001, UT-001, UT-002 |
| `verified`     | 48    | Confirmed real by Pass 2 (or Pass 1 alone where Pass 2 independently agreed with no dispute); not yet fixed |
| `deferred`     | 3     | Checkpoint D1: SH-001 (see server-handlers.md Adjudication Log — merging risks reordering validation/error precedence). NM-006, NM-009 (see native-macos.md Adjudication Log — idiomatic/necessary AppKit patterns, unit out of LOC-reduction scope) |
| `rejected`     | 2     | RC-007 (see ui-repo-context.md Adjudication Log — already file-private, no dead export to remove). Checkpoint D1: SG-005 (see server-git.md Adjudication Log — comparators proved not behavior-equivalent; a test broke when unified) |

2 additional findings (AS-003, CP-010) are architecture verdicts, not defects, and are excluded from all counts above — see the unit footnotes.

Phases 4-8 will continue to flip individual findings to `fixed`, `deferred`, or `rejected` as work proceeds; this table is updated at each checkpoint alongside the per-unit table above.
