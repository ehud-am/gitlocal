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
| ui-search | 0 | 0 | 0 | 0 | 0 | 0 | E |
| ui-file-tree | 0 | 0 | 0 | 0 | 0 | 0 | E |
| ui-primitives-misc | 0 | 0 | 0 | 0 | 0 | 0 | E |
| native-macos | 0 | 0 | 0 | 0 | 0 | 0 | F |

**Total findings logged**: 72
**Last updated**: Batch D complete (ui-repo-context, ui-terminal-panel, ui-picker)

\* ui-app-shell's 7 counted findings exclude AS-003, a required architecture verdict (not a defect) confirming App.tsx is NOT an oversized "god component" — see ui-app-shell.md for the full rationale. This closes plan.md's Q1 open question and tasks.md's T018.

\* ui-content-panel's 9 counted findings exclude CP-010, a required architecture verdict (not a defect) confirming ContentPanel.tsx is NOT an oversized "god component," though it notes an optional (non-mandatory) shrink path — see ui-content-panel.md for the full rationale.
