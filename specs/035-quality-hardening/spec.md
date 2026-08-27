# Feature Specification: Quality Hardening (0.10.3)

**Feature Branch**: `035-quality-hardening`
**Created**: 2026-08-22
**Status**: Draft
**Input**: User description: "The code works more or less but quality is not where I want it to be. Let's use spec kit specify for version 0.10.3. No new features. Full spec, requirements, architecture, and code review. Search and eliminate bugs. Search and eliminate dead code. Search and eliminate duplicate code. Search for opportunities to do things more efficiently. Search for opportunities to make the code more elegant and readable. Break this into a set of requirements, multi-pass on each line of code, design it so there are breaks and validation every several tasks. Success means the same set of features, but in 30% less code, that is faster, and above all high quality across the board."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Architecture & code review produces a trustworthy findings inventory (Priority: P1)

As the maintainer, I want a full architecture and code review of the existing codebase (server, UI, native macOS wrapper) so that every subsequent bug fix, deletion, or simplification is backed by a documented, evidence-based finding rather than ad-hoc changes.

**Why this priority**: Everything else in this effort (bug fixes, dead-code removal, dedup, efficiency, readability) depends on first knowing, with evidence, where the problems are. Without this, "cleanup" becomes guesswork and risks silent regressions.

**Independent Test**: Can be fully tested by producing a written review (architecture assessment + itemized findings inventory, each with location, category, severity, and evidence) without changing any code. The review is valuable on its own even if no further phase executes.

**Acceptance Scenarios**:

1. **Given** the v0.10.2 codebase, **When** the architecture review is performed, **Then** a written document exists describing module boundaries, layering, and structural concerns (server/`src`, UI/`ui/src`, native/`native/macos`), independent of any specific bug.
2. **Given** the codebase, **When** the code review passes are performed, **Then** every non-test source file has been read by at least two independent review passes, and every finding is logged with file, line range, category, severity, and supporting evidence before any fix begins.
3. **Given** the findings inventory, **When** two passes disagree about a finding (e.g., one flags code as dead, another finds a dynamic reference), **Then** the disagreement is resolved by a third, targeted verification pass before the finding is marked actionable.

---

### User Story 2 - Confirmed bugs are fixed (Priority: P1)

As a user of GitLocal, I want correctness bugs found during the review to be fixed, so the app behaves correctly in cases it currently handles wrong.

**Why this priority**: Correctness issues directly affect users today and are the highest-value outcome of a quality pass.

**Independent Test**: Can be fully tested by picking any logged bug finding, confirming it reproduces (or is verifiably wrong by inspection plus a regression test), fixing it, and adding/adjusting a test that fails before the fix and passes after.

**Acceptance Scenarios**:

1. **Given** a logged bug finding, **When** the fix is applied, **Then** a test exists that would have failed on the pre-fix code and passes after.
2. **Given** a bug finding whose correct fix would change user-visible behavior or add a decision point not implied by existing specs 001-034, **When** it is evaluated, **Then** it is deferred and flagged to the user instead of silently implemented (no new features / behavior changes).

---

### User Story 3 - Dead code is removed (Priority: P2)

As the maintainer, I want unreachable/unused code (functions, exports, components, CSS rules, files, feature flags left over from prior specs) removed, so the codebase only contains code that does something.

**Why this priority**: Directly serves the "30% less code" and "high quality" goals; safe once findings are verified, but lower risk/value than fixing live bugs.

**Independent Test**: Can be fully tested by taking a logged dead-code finding, verifying no reachable import/usage exists (static analysis plus a targeted grep/build/test check), deleting it, and confirming the full quality gate still passes.

**Acceptance Scenarios**:

1. **Given** a symbol or file flagged as dead code, **When** removal is verified via static analysis and a full build+test run, **Then** it is deleted and the quality gate (tests, coverage, build, audits) still passes.
2. **Given** a symbol that appears unused by static analysis but is referenced dynamically (string-based lookup, reflection-like patterns, Swift `#selector`, menu wiring), **When** evaluated, **Then** it is confirmed live and excluded from deletion.

---

### User Story 4 - Duplicate code is consolidated (Priority: P2)

As the maintainer, I want repeated logic (near-identical functions, components, CSS, or test setup) consolidated into shared, well-named utilities, so behavior lives in one place.

**Why this priority**: Reduces line count and bug surface (fixes currently need to happen in N places), but requires more care than deletion since behavior must be preserved exactly at every call site.

**Independent Test**: Can be fully tested by taking a logged duplication finding, extracting the shared implementation, updating all call sites, and confirming existing tests for every affected call site still pass unchanged.

**Acceptance Scenarios**:

1. **Given** two or more near-identical code blocks, **When** consolidated into a shared utility, **Then** all original call sites use the new utility and all pre-existing tests covering those call sites still pass.
2. **Given** a proposed consolidation where the blocks are only superficially similar (different edge-case handling), **When** evaluated, **Then** the finding is downgraded/rejected rather than forcing a false abstraction.

---

### User Story 5 - Efficiency improvements (Priority: P2)

As a user of GitLocal, I want obviously wasteful patterns (redundant filesystem/git calls, unnecessary re-renders, quadratic loops over data that's typically small-but-sometimes-large, unmemoized repeated work) fixed, so the app is faster, without changing what it does.

**Why this priority**: Directly serves the "faster" success criterion; scoped to real, evidenced inefficiencies rather than speculative micro-optimization.

**Independent Test**: Can be fully tested by taking a logged efficiency finding, applying the fix, and showing a measurable improvement (fewer calls, lower render count, benchmark, or build/bundle size) with existing tests still passing.

**Acceptance Scenarios**:

1. **Given** a logged efficiency finding with evidence (e.g., a profiled hot path, a call-count assertion, a redundant `git` invocation), **When** fixed, **Then** the improvement is demonstrated (measurement before/after) and behavior is unchanged per existing tests.
2. **Given** a proposed efficiency change with no measurable evidence of a real problem, **When** evaluated, **Then** it is not applied (no speculative optimization).

---

### User Story 6 - Readability and elegance polish (Priority: P3)

As a future contributor (human or agent), I want confusing names, overly nested logic, and inconsistent patterns cleaned up, so the code is easier to reason about.

**Why this priority**: Real value, but purely cosmetic/structural changes carry regression risk for the least user-facing benefit, so they run last and only over code already touched or already fully understood from the review.

**Independent Test**: Can be fully tested by confirming a readability change alters no behavior (identical test results, no logic changes beyond renames/restructuring/extraction) and passes a second reviewer's read.

**Acceptance Scenarios**:

1. **Given** a logged readability finding, **When** addressed, **Then** the change is behavior-preserving (verified by unchanged test results) and a second review pass confirms the result is actually clearer.

---

### Edge Cases

- What happens when a "bug fix" can only be correctly resolved by changing user-visible behavior or adding a missing decision (e.g., a validation rule the product never defined)? → Deferred and flagged to the user; not silently implemented as scope creep.
- How does the process handle disagreement between independent review passes on the same code? → A third, targeted verification pass adjudicates before the finding is actionable (see US1, Scenario 3).
- What happens if a checkpoint's quality gate (tests, coverage, build, audits) fails? → The batch does not advance; the failing change is fixed or reverted before continuing to the next checkpoint.
- What happens if a Claude usage/rate limit is hit mid-batch (relevant given the $20 plan)? → Work pauses at the last committed, gate-passing state; all findings and progress are persisted to files (this spec directory, task tracking), not left in conversation memory, so work resumes later without redoing completed tasks.
- How is "30% less code" reconciled with occasional necessary additions (e.g., a new shared utility function)? → Measured as a net aggregate reduction across `src/` + `ui/src/`, not a per-file or per-commit constraint; small local additions are fine if they remove more duplication elsewhere.
- What happens to Swift/native code and to tests during this effort? → Native code (`native/macos/`) is reviewed for the same categories but is excluded from the numeric 30% target given its small size (~630 lines) and the constitution's "thin wrapper" constraint. Test files are reviewed for the same categories (dead/duplicate test code, flaky/unclear tests) but the 90%-per-file coverage floor must never regress, so test deletions must be paired with equivalent coverage or a justified, reviewed exception.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The effort MUST NOT add, remove, or change any user-facing feature or behavior; every existing acceptance scenario from specs 001-034 MUST continue to pass unchanged at every checkpoint.
- **FR-002**: Every non-test source file under `src/`, `ui/src/`, and `native/macos/` MUST receive at least two independent review passes before its findings are considered final.
- **FR-003**: All findings (bug, dead code, duplicate code, efficiency, readability) MUST be logged in a written findings inventory — file, line range, category, severity, evidence, and status — before any corresponding fix is applied. No opportunistic/unlogged changes.
- **FR-004**: Every code change in this effort MUST be traceable to a specific logged finding by ID.
- **FR-005**: Work MUST be organized into checkpoint batches of bounded size (a small, fixed number of tasks per batch); execution MUST pause after each batch for explicit human review and approval before the next batch starts.
- **FR-006**: The full quality gate (`npm run verify`: tests, ≥90%-per-file coverage, build, `npm audit` + `npm --prefix ui audit`) MUST pass at the end of every checkpoint batch, not only at the end of the whole effort.
- **FR-007**: A git commit MUST exist at every checkpoint boundary, so any single batch can be reverted independently without affecting earlier approved batches.
- **FR-008**: Any finding whose correct resolution would require a product/behavior decision or would change what a user can do MUST be deferred and explicitly flagged to the user rather than implemented.
- **FR-009**: Total non-test source line count across `src/` and `ui/src/` (excluding `*.test.ts`/`*.test.tsx` and generated/build output) MUST decrease by at least 30% relative to the v0.10.2 baseline (5,489 lines in `src/` + 9,062 lines in `ui/src/` = 14,551 lines), measured in aggregate at the end of the effort.
- **FR-010**: Per-file test coverage MUST NOT regress below the existing constitution threshold (90%) at any checkpoint.
- **FR-011**: Duplicate logic MUST be consolidated into shared, well-named utilities at their existing call sites rather than deleted outright where the behavior is still required.
- **FR-012**: `npm run build` and both dependency audits MUST remain clean (0 vulnerabilities) at every checkpoint.
- **FR-013**: The execution plan MUST account for interruption by Claude usage/rate limits (the $20 plan) — state (findings, task status, checkpoint results) MUST live in files under version control, not only in conversation context, so work can pause and resume without loss.
- **FR-014**: The plan MUST assign the most cost/quality-appropriate model to each task type (e.g., mechanical grep-style sweeps vs. architectural judgment calls vs. adjudicating disagreements) — detailed model/sub-agent assignment is a `plan.md` concern, to be produced in the next phase.

### Key Entities

- **Finding**: A single logged review result. Attributes: ID, file, line range, category (bug / dead-code / duplicate / efficiency / readability), severity, evidence, status (open / verified / deferred / fixed / rejected), and the commit that resolved it (if any).
- **Checkpoint**: A bounded batch of tasks. Attributes: batch number, tasks included, quality-gate result, human approval status, and the commit marking its boundary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Non-test source line count in `src/` + `ui/src/` is reduced by at least 30% from the v0.10.2 baseline of 14,551 lines (target: ≤10,186 lines), with no reduction in functional scope.
- **SC-002**: 100% of pre-existing automated tests (server + UI) pass at the end of the effort; any test assertion changed is changed only because the code it tests was legitimately simplified/consolidated, never because behavior changed.
- **SC-003**: Zero open P1/P2 bug findings remain in the findings inventory at release time (all are fixed or explicitly deferred with the user's sign-off).
- **SC-004**: Zero dead code remains reachable/importable in `src/`, `ui/src/`, or `native/macos/` per the dead-code sweep's final pass.
- **SC-005**: The duplicate-code sweep finds no remaining unjustified instances of near-identical logic (10+ line blocks, high textual/structural similarity) outside documented, reviewed exceptions.
- **SC-006**: Build time and/or UI bundle size do not regress versus v0.10.2, and at least one measurable efficiency improvement (from a logged finding) is demonstrated.
- **SC-007**: Every checkpoint batch is explicitly reviewed and approved by the user before the next batch begins; zero batches are skipped.
- **SC-008**: Per-file test coverage stays at or above 90% for every file at every checkpoint, matching the existing constitution requirement.

## Assumptions

- Specs 001-034 (and their acceptance scenarios) remain the source of truth for "the same set of features." Any behavior not covered by them but present in code is still treated as in-scope to preserve unless demonstrably unreachable (dead code).
- The 30% code-reduction target is measured on non-test TypeScript/TSX lines in `src/` and `ui/src/`; the native Swift wrapper (629 lines) is reviewed for the same quality categories but excluded from the numeric target given the constitution's thin-wrapper constraint and its small size.
- "Full spec, requirements, architecture, and code review" means the architecture assessment and findings inventory are first-class deliverables of this effort in their own right (User Story 1), not merely internal scratch work on the way to code changes.
- Given the $20 Claude plan, usage/rate limits will likely be hit during execution; the plan (next phase) will define concrete batch sizes and model assignments to make interruption-and-resume the normal path rather than an exception.
- This document (`spec.md`) covers WHAT and WHY only. HOW — the multi-pass review methodology, checkpoint batch sizing, sub-agent/model assignment per task type, and throttling/recovery mechanics — is planning-phase (`plan.md`) content, to follow once this spec is approved.
