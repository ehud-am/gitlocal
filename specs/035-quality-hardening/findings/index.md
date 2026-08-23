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

Phase 4 (US2: bug fixes) is underway. Checkpoints B1 (T051-T056) and B2 (T057-T062) have together fixed 12 findings; the remaining 98 are still review-confirmed and open in the fix-lifecycle sense.

| Fix-lifecycle status | Count | Meaning |
|----------------------|-------|---------|
| `fixed`        | 12    | Checkpoint B1 (T051-T056): NM-001, NM-004, ST-001, SV-001, RC-008, FT-010. Checkpoint B2 (T057-T062): FT-011, NM-002, NM-011, SH-007, SV-003, UT-003 |
| `verified`     | 98    | Confirmed real by Pass 2 (or Pass 1 alone where Pass 2 independently agreed with no dispute); not yet fixed |

2 additional findings (AS-003, CP-010) are architecture verdicts, not defects, and are excluded from all counts above — see the unit footnotes.

Phases 4-8 will continue to flip individual findings to `fixed`, `deferred`, or `rejected` as work proceeds; this table is updated at each checkpoint alongside the per-unit table above.
