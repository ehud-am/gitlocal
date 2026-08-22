# Implementation Plan: Quality Hardening (0.10.3)

**Branch**: `035-quality-hardening` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/035-quality-hardening/spec.md`

## Summary

A no-new-features quality pass across the whole product (`src/`, `ui/src/`, `native/macos/`): a written architecture review, a findings inventory built from two independent review passes per module, then checkpointed fix batches (bugs → dead code → duplication → efficiency → readability) targeting a ≥30% reduction in non-test source lines with no behavior change and no coverage regression. Because this runs on a $20 Claude plan, the plan below is organized around small, cheap, resumable units of work rather than one long unattended run: mechanical, high-volume work goes to a fast/cheap model; judgment-heavy work goes to the stronger model already used for this session; every checkpoint commits to git and pauses for human approval, so a rate limit mid-batch costs at most the current batch, never the whole effort.

## Technical Context

**Language/Version**: TypeScript 5.8.3, React 18.3.1 (UI); Node.js 22+ (server); Swift (native macOS wrapper, review-only per constitution's thin-wrapper constraint) — unchanged, this is a quality pass, not a stack change.
**Primary Dependencies**: Existing only, with one proposed addition: `knip` (MIT, devDependency) as an *aid* to the manual dead-code sweep (unused-export/unused-file detection), not a replacement for it — FR-002's two-human-equivalent-pass requirement still applies to everything it flags. Flagged for explicit confirmation below (Phase 0, Q6) since it's a dependency change even though dev-only.
**Storage**: N/A — no data model changes.
**Testing**: Existing Vitest suites (server + UI) are the regression safety net; every fix must leave them green, and every deletion/consolidation must be verified against them before and after.
**Target Platform**: Unchanged — npm/browser distribution and the macOS Homebrew native wrapper both stay in scope for review.
**Project Type**: Existing single-repo web application (`src/` Hono backend, `ui/` Vite/React frontend) plus the existing thin native Swift wrapper.
**Performance Goals**: No fixed global target; each US5 efficiency finding must carry its own before/after measurement (call count, render count, benchmark, or bundle size) per spec FR success criteria.
**Constraints**: $20 Claude plan usage/rate limits (drives batch sizing and model choice below); zero behavior/feature change; 90%-per-file coverage floor never regresses; every checkpoint must leave the repo in a fully green, committed state.
**Scale/Scope**: 14,551 non-test lines across ~14 review units in `src/` + `ui/src/` (table below), plus `native/macos/` (629 lines, Swift) reviewed but excluded from the numeric 30% target.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TypeScript-First Product Core | PASS | Pure cleanup within the existing TS/Node core; native Swift changes (if any) stay confined to `native/macos/` menu/lifecycle code already covered by the constitution's scoped exception. |
| II. Test Coverage (NON-NEGOTIABLE) | PASS (design accounts for it) | FR-010/SC-008 make the 90%-per-file floor a per-checkpoint gate, not just a release-time check. Deletions that would drop a file below 90% must add/keep equivalent coverage or the deletion is rejected. |
| III. Local-First with Git Remote Exception | PASS | No network/remote behavior touched; this is internal-quality work only. |
| IV. Node.js-Served React UI | PASS | No change to the serving model. |
| V. Clean & Useful UI | PASS | Readability/simplification work (US6) directly serves this principle; no UI behavior changes. |
| VI. Free & Open Source | PASS | `knip` (proposed, Q6 below) is MIT-licensed and dev-only; no runtime dependency changes. |
| VII. Repository-Relative Paths and Release Documentation | PASS | Spec-kit artifacts use repo-relative paths; CHANGELOG/README review deferred to release time per Principle VIII. |
| VIII. Release Branches, Pre-GA Versioning, and Contrarian QA | DEFERRED (not a plan-time gate) | Targets `0.10.3`. Version bump, changelog, README review, and a contrarian-QA pass happen when the release branch is cut, same as every prior release (most recently 034/0.10.2) — not during spec/plan/implement. |

No violations requiring justification; no Complexity Tracking entries needed.

## Phase 0: Research

Six process-design questions had to be resolved before tasks can be generated. Folded inline (narrow enough, no separate `research.md`, matching how 033/034 handled similarly-scoped plans).

**Q1: How to decompose "multi-pass on every line" into units that are actually reviewable?**
By existing directory boundaries — they already match how the codebase is organized and understood. 14 review units:

| Unit | Path | Non-test lines |
|---|---|---|
| Server: git | `src/git/` | 2,141 |
| Server: handlers | `src/handlers/` | 1,520 |
| Server: root (cli/types/index/server) | `src/*.ts` | 1,041 |
| Server: terminal | `src/terminal/` | 455 |
| Server: services | `src/services/` | 332 |
| UI: App shell | `ui/src/App.tsx` (+ `main.tsx` etc.) | 1,602 |
| UI: ContentPanel | `ui/src/components/ContentPanel/` | 2,911 |
| UI: types | `ui/src/types/` | 675 |
| UI: services | `ui/src/services/` | 649 |
| UI: RepoContext | `ui/src/components/RepoContext/` | 538 |
| UI: TerminalPanel | `ui/src/components/TerminalPanel/` | 521 |
| UI: Picker | `ui/src/components/Picker/` | 526 |
| UI: Search | `ui/src/components/Search/` | 391 |
| UI: FileTree | `ui/src/components/FileTree/` | 315 |
| UI: ui primitives + lib + hooks + top-level components | `ui/src/components/ui/`, `ui/src/lib/`, `ui/src/hooks/`, `AppFooter.tsx`/`AppDialogs.tsx` | ~700 |
| Native: macOS wrapper (review-only, excluded from 30% target) | `native/macos/GitLocal/GitLocal/*.swift` | 629 |

Two units stand out as likely architecture-review findings before any line is even read: `App.tsx` (1,602 lines, one file) and `ContentPanel/` (2,911 lines) are disproportionately large relative to everything else — plausible "god component" candidates. The architecture review (US1) confirms or refutes this with evidence rather than assuming it.

**Q2: How to get genuine independence for the "≥2 passes" FR-002 requires?**
Two passes per unit, deliberately different in lens and model, not just "read it twice":
- **Pass 1 — mechanical sweep** (per unit): grep/AST-pattern-driven check across all five finding categories (obvious dead exports, near-duplicate blocks, unused imports, unbounded loops over unbounded data, unclear naming) using `knip`'s output (Q6) as one input among several. Fast, cheap, high-recall/lower-precision — expected to over-flag.
- **Pass 2 — deep module review** (per unit): a full holistic read of the unit with product/architecture context, independently forming its own view of the same five categories, then reconciling against Pass 1's flags (confirm / refute / add). Slower, expensive, high-precision.
- **Pass 3 — adjudication** (only on disagreement): a third, narrowly-scoped pass (e.g., "is this export ever referenced dynamically — check Swift `#selector`, string-based lookups, test-only imports") resolves the specific disputed finding. Expected to be rare and cheap since it's targeted, not a re-review.

This gives real independence (different method, not just a second read) while staying at ~28 review-phase tasks (14 units × 2 passes) instead of the ~70+ a category×unit cross-product would cost — important given the budget constraint (Q3/Q4).

**Q3: How big should a checkpoint batch be?**
Rule, not a fixed count (exact task list is Phase 2/`tasks.md`'s job): **no checkpoint spans more than 3 review units in Phase A, or more than 6 findings/fixes in Phase B, and no checkpoint spans a phase boundary.** At ~14 units this yields roughly 5 review checkpoints; Phase B's checkpoint count depends on how many findings the review actually produces and is sized once that's known. Every checkpoint ends with: full `npm run verify` green, a git commit, and an explicit user go-ahead before the next batch starts (FR-005/FR-006/FR-007/SC-007).

**Q4: Which model for which task type?**

| Task type | Model | Why |
|---|---|---|
| Pass 1 mechanical sweeps (per unit) | Haiku 4.5 | High-volume, pattern-matching work with a clear checklist; cheapest tier, no deep product judgment required. |
| Pass 2 deep module review, architecture assessment (US1), bug fixes (US2), dedup extraction (US4), efficiency fixes (US5) | Sonnet 5 (this session's model) | Needs product/architecture judgment and the "would this change behavior?" call from FR-008 — the main workhorse. |
| Adjudication of disputed findings (Pass 3) | Sonnet 5, high reasoning effort | Small in volume, high cost of being wrong (e.g., deleting live code) — worth the extra effort setting, not worth a model upgrade at this volume. |
| Readability/elegance polish (US6) | Sonnet 5, default effort | Lower stakes, cosmetic; runs last, over code already fully understood from earlier passes. |
| Findings-inventory consolidation / per-checkpoint summary for user review | Sonnet 5 | Needs to accurately represent tradeoffs to the human approver — not a mechanical rollup. |

**Q5: How does this survive $20-plan usage limits (pause/resume)?**
Nothing load-bearing lives only in conversation context:
- Findings persist to files under `specs/035-quality-hardening/findings/` (one file per review unit — see Project Structure), written as each Pass 1/2/3 completes, not batched up in memory.
- Task-level progress uses the `TaskCreate`/`TaskUpdate` tracker (already in use this session) so "what's done" is queryable, not remembered.
- Every checkpoint's boundary is a git commit — if a rate limit interrupts mid-batch, the worst case is redoing the current (small, ≤3-unit or ≤6-fix) batch, never earlier approved work.
- Cheap-model tasks (Pass 1, the majority of task volume) are dispatched first/most often, reserving the costlier model for the minority of judgment-heavy tasks — this is the primary budget lever, not just batch size.

**Q6: Should a dead-code-detection devDependency (`knip`) be added?**
Proposed yes, as an input to Pass 1, not a replacement for FR-002's required passes — it catches unused exports/files fast and cheaply (Haiku-tier task: run it, read its output, file findings from it), leaving Pass 2's human-equivalent judgment for what static analysis can't see (dynamic references, intentionally-public API surface). It's a devDependency only (no runtime/bundle impact), MIT-licensed (Principle VI). **This is the one plan decision the user should explicitly confirm or veto before Phase 2**, since it's a dependency change even though dev-only and reversible.

## Post-Design Constitution Re-Check

No new data model, no new HTTP API surface, no new runtime dependency (the one proposed addition, `knip`, is dev-only and pending explicit confirmation per Q6). Re-reviewing the Constitution Check table against the Phase 0 decisions changes nothing: still no user-facing behavior change, still local-only, still MIT-compatible. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/035-quality-hardening/
├── spec.md                    # Phase -1 output (/speckit.specify) — approved
├── plan.md                    # This file (/speckit.plan command output)
├── research.md                # n/a — folded into this plan's "Phase 0: Research" section
├── findings/                  # Phase A output — one file per review unit (see Q1 table),
│                               #   each row: ID, lines, category, severity, evidence, status
│   ├── index.md                # running summary/counts across all units, updated per checkpoint
│   ├── server-git.md, server-handlers.md, server-root.md, server-terminal.md, server-services.md
│   ├── ui-app-shell.md, ui-content-panel.md, ui-types.md, ui-services.md, ui-repo-context.md,
│   │   ui-terminal-panel.md, ui-picker.md, ui-search.md, ui-file-tree.md, ui-primitives-misc.md
│   └── native-macos.md
├── architecture-review.md     # Phase A output — US1's written architecture assessment
├── quickstart.md              # Phase 1 output — how a human re-verifies "same features" post-effort
└── tasks.md                   # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

No new source directories. This feature only ever *edits or deletes* within the existing layout (`src/`, `ui/src/`, `native/macos/`) per the units listed in Q1's table above; no new files beyond what individual dedup/consolidation fixes (US4) legitimately introduce (a shared utility replacing 2+ duplicates), each traceable to a logged finding per FR-004.

## Execution Phases (maps to spec user stories and checkpoint rule)

1. **Phase A — Review** (US1): Pass 1 + Pass 2 (+ Pass 3 where needed) per unit, per Q1-Q4 above → `findings/*.md` + `architecture-review.md`. Checkpointed every ≤3 units. No code changes in this phase.
2. **Phase B1 — Bug fixes** (US2): fix all open bug findings, each with a regression test. Checkpointed every ≤6 fixes.
3. **Phase B2 — Dead code removal** (US3): delete verified-dead findings only (Pass 3-cleared where disputed). Checkpointed every ≤6 removals.
4. **Phase B3 — Duplicate consolidation** (US4): extract shared utilities for verified duplication findings. Checkpointed every ≤6 consolidations.
5. **Phase B4 — Efficiency fixes** (US5): apply findings with measured before/after evidence. Checkpointed every ≤6 fixes.
6. **Phase B5 — Readability polish** (US6): last, over code already understood from Phases A/B1-4. Checkpointed every ≤6 changes.
7. **Phase C — Final verification**: full `npm run verify`, LOC count vs. 30% target (SC-001), findings-inventory closure check (SC-003/SC-004/SC-005), release-review-style summary for the user — mirrors the existing prerelease-cycle pattern used for 0.10.2, ahead of an eventual release branch (Principle VIII, deferred).

**Recommended execution mechanism**: given the volume (~28 review tasks alone, plus a variable number of fix tasks, many independent and model-differentiated), Phase A and each Phase B sub-phase are natural fits for the `Workflow` tool (parallel fan-out per unit/finding, pipeline stages for sweep→deep-review→adjudicate, barrier-free checkpoints). This needs the user's explicit go-ahead to invoke (flagged separately in chat, not assumed here) — the alternative is running the same phases via sequential/parallel `Agent` tool calls turn-by-turn, which works but forfeits the automatic per-phase progress tracking and higher parallelism ceiling.

## Complexity Tracking

*No entries — no Constitution Check violations.*
