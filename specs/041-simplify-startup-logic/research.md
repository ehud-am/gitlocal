# Phase 0 Research: Simplify Startup Folder Resolution

All items in the plan's Technical Context were resolvable from the existing codebase and the
feature spec directly — no `NEEDS CLARIFICATION` markers remained after planning. This document
records the concrete decisions made and the alternatives considered, based on reading the current
implementation end-to-end (`src/cli.ts`, `src/server.ts`, `src/services/startup-preferences.ts`,
`src/git/repo.ts`, `src/handlers/repo.ts`, `src/types.ts`, and their tests).

## Decision 1: Collapse 5 folder-resolution tiers into 3

**Current state**: `resolveStartupFolder()` in `src/services/startup-preferences.ts` returns one
of 5 `StartupFolderSource` values — `explicit`, `last-used`, `platform-default`, `home-fallback`,
`safe-fallback` — each with its own branch, its own readability check, and its own
`fallbackReason` wording. `platform-default` and `home-fallback` are themselves just two more
rungs of a fallback ladder before the "real" last resort (`safe-fallback`, which internally walks
a 5-candidate chain of its own: Documents → home → cwd → tmp dir → filesystem root).

**Decision**: Reduce to 3 sources: `explicit` (a path was given and is valid), `last-used` (the
remembered top-level path is still valid), and `os-default` (everything else). `os-default`
internally does at most one extra safety step (try the home directory; if literally unreadable,
fall through once to the filesystem root) but is surfaced to the rest of the system as a single
outcome/message, not as multiple named tiers a caller needs to reason about differently.

**Rationale**: The spec (FR-007, FR-008) explicitly calls for exactly one OS-default fallback
outcome. Distinguishing "Documents was unreadable but home worked" from "home was unreadable but
temp worked" from "everything was unreadable, used filesystem root" has produced, in practice,
several subtly different code paths that can diverge — which is precisely the class of bug the
user reported ("multiple cases... that startup failed... not sure I can reproduce"). A single
named outcome with one small, obviously-correct internal safety net removes that divergence
surface without sacrificing the "always land on something readable" guarantee.

**Alternatives considered**:
- *Keep all 5 tiers but unify their message-building*: Rejected — this still leaves 5 branches
  that can each have their own bug; consolidating only the messages doesn't address FR-013
  (no redundant/overlapping fallback paths for what is effectively the same failure).
- *Drop all fallback and always require the picker*: Rejected — regresses today's working
  "usually reopens Documents or home on first run" convenience with no user-facing benefit, and
  the spec's User Story 1 requires reaching a *usable, remembered-when-possible* screen, not
  merely *a* screen.

## Decision 2: One shared repo-vs-independent-folder classifier, reused everywhere

**Current state**: `classifyLocalPath()` in `src/git/repo.ts` already correctly determines
repo-root/inside-repo/outside-repo status and exposes `repositoryRootPath`. However, the
*consumers* of this classification each re-derive `rootPath`/`selectedPath` for a directly-opened
file independently: `resolveOpenTarget()` in `src/server.ts` (used for native "open with" file
launches) computes `rootPath = repositoryRootPath ?? dirname(canonicalPath)` and
`selectedPath = relative(rootPath, canonicalPath)` — and `repositoryOpenHandler()` in
`src/handlers/repo.ts` computes the same two values with near-identical logic a second time for
the runtime "open this file" API. Two implementations of the same rule can silently drift.

**Decision**: Extract one function — e.g. `resolveDirectOpenTarget(canonicalPath, pathType)` —
that takes a canonical path and its type and returns `{ rootPath, selectedPath, selectedPathType,
isGitRepo }` by calling `classifyLocalPath()` once and applying the root/selection rule once.
`resolveOpenTarget()` (startup file-open) and `repositoryOpenHandler()` (runtime file/folder open)
both call this function instead of each computing the rule themselves.

**Rationale**: Directly satisfies FR-004/FR-005/FR-006 (the repo-vs-folder determination and its
tree-rooting consequence must be made once, consistently) and FR-013 (no divergent paths for the
same underlying decision). This is a pure extraction — behavior is unchanged, since both existing
implementations already compute the same result correctly; the risk being removed is *future*
drift, and the current duplication is itself the "fuzzy logic, hard to fully verify" pattern the
user described.

**Alternatives considered**:
- *Leave both call sites as-is, add a shared test helper only*: Rejected — tests can verify both
  stay in sync today, but do nothing to prevent one being edited without the other during a future
  change. The spec asks for the determination to happen "once," which calls for one production
  code path, not just one test.

## Decision 3: Last-viewed persistence gets exactly one writer, with a narrowed accepted shape

**Current state**: `writeStartupFolderPreference(folderPath, source, path?)` already only requires
`isReadableDirectory(folderPath)` — it does not require `folderPath` to be a repository root or an
independent folder's own root, only that it be *some* readable directory. Every current call site
(`rememberStartupFolder` calls in `src/cli.ts`, `src/handlers/repo.ts`) already happens to pass a
top-level path (a resolved repo root, or a folder chosen via the picker/parent-folder navigation),
so today's *actual* persisted values already satisfy the spec's FR-010/FR-011 in practice. The one
exception is `PUT /api/startup-folder` (`startupFolderUpdateHandler` in `src/handlers/repo.ts`),
which accepts an arbitrary caller-supplied path with no top-level check and currently has **no UI
call site** (confirmed by repo-wide search) — it is unused, unvalidated dead API surface that is
the one place a future caller (or an external HTTP client, since GitLocal binds to `127.0.0.1` but
still accepts any local request) could persist a non-top-level path.

**Decision**: Remove the `PUT /api/startup-folder` endpoint, its handler
(`startupFolderUpdateHandler`), and its now-unused request/response types
(`StartupFolderUpdateRequest`, `StartupFolderUpdateResponse`, `StartupFolderUpdateSource`'s
`picker-open` value stays where still used by the remaining internal call, but the public HTTP
surface for arbitrary updates goes away). Keep `GET /api/startup-folder` (used by the UI to read
the fallback-reason banner) and the internal `rememberStartupFolder`/`writeStartupFolderPreference`
functions, since they are exercised correctly by every real call site today.

**Rationale**: Directly satisfies FR-010/FR-011 by removing the one code path that could violate
them, rather than adding new validation logic to a function every real caller already uses
correctly — the simplest fix here is deletion, consistent with the spec's "clean up everything
that is there today" instruction and the ~30% size-reduction validation goal (SC-005).

**Alternatives considered**:
- *Add a "must be a repository root or not-inside-any-repository" assertion inside
  `writeStartupFolderPreference` itself*: Considered and partially adopted — this guard is worth
  keeping as a defense-in-depth check inside the single writer function (cheap, uses
  `classifyLocalPath` already in scope), in addition to removing the dead public endpoint that
  was the only realistic way to violate it. This gives both a structural fix (no caller *can*
  reach this function with an arbitrary path) and a belt-and-suspenders runtime guard.
- *Keep the PUT endpoint but validate its input*: Rejected — the endpoint has no UI caller and no
  documented external contract; keeping unused, speculative API surface around "just in case"
  is exactly the kind of code the user asked to clean up, and the removal reduces surface for the
  size-reduction goal without losing any real functionality.

## Decision 4: `initializePaths()` calls the consolidated resolver instead of re-deriving it

**Current state**: `src/cli.ts`'s `main()` already calls `resolveStartupFolder()` once and passes
the result into `createApp()` as `startupFolderResolution`. But `src/server.ts`'s
`initializePaths()` does **not** simply trust that pre-computed result for the folder case — for
the explicit-path and file-launch branches it re-runs `classifyLocalPath()` and hand-builds its own
fallback objects at three separate points (lines ~226–251, ~262–283 in the current file), each
constructing a similar-but-not-identical `StartupFolderResolution`-shaped object via
`buildSafeFallbackResolution`. This is the second half of the "many places it can fail"
complexity: the CLI computes a resolution, the server computes overlapping ones of its own.

**Decision**: `initializePaths()` keeps its responsibility of turning "the resolved location" into
`currentRepoPath`/`currentPickerPath` (this part is server-only state and can't move to the CLI,
since `createApp()` is also called directly by tests without going through `cli.ts`), but it stops
independently re-deriving fallback outcomes. Any failure it encounters (an explicit path that
doesn't exist, a file-launch target that fails) is handled by calling the *same* single
`os-default` resolution helper from Decision 1, so there is exactly one function in the entire
codebase that decides what the safe fallback location is and exactly one shape of "why we fell
back" message — reached from both the CLI's pre-server resolution and the server's own
defensive checks.

**Rationale**: Satisfies FR-002 (explicit-path failure converges on the same fallback as any other
failure) and FR-007 (exactly one fallback location/outcome, used everywhere).

**Alternatives considered**:
- *Move all resolution into `cli.ts` and make `createApp()` require a fully-resolved location*:
  Rejected — `createApp()` is called directly (with a bare path string) by the test suite and
  potentially by other future embedders (it's an exported function), so it must remain able to
  do its own resolution when it isn't handed a pre-computed one; the fix is making that
  self-resolution share the same helper, not eliminating the capability.

## Decision 5: Testing approach — consolidate, don't just add

**Decision**: Existing tests in `tests/unit/services/startup-preferences.test.ts` that assert on
the 5 old named tiers are rewritten to assert on the 3 new ones, preserving the underlying
scenarios they protect (remembered-folder-missing, permission-denied, disconnected-drive
messaging) rather than being deleted. `tests/unit/handlers/repo.test.ts` drops any test coverage
for the removed `PUT /api/startup-folder` endpoint and gains coverage asserting the endpoint now
returns 404/unmatched (confirming clean removal, not a silent behavior change). New shared-function
extractions (Decisions 2 and 4) get direct unit coverage so the ≥90% per-file branch coverage
constitution gate is satisfied on the smaller, consolidated functions rather than relying on
integration tests alone.

**Rationale**: The constitution's non-negotiable coverage gate applies per file; consolidating
logic into fewer, smaller functions with fewer branches makes 90% easier to reach honestly (fewer
edge-case combinations to hit) rather than harder.
