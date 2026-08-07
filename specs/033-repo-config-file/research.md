# Research: Per-Repo/Folder Configuration File

## Decision: Mirror `startup-preferences.ts`'s read/write shape exactly, scoped to the open repo root instead of a global path

**Rationale**: `src/services/startup-preferences.ts` already implements the exact behavior this feature needs for a *global* JSON preference file: `JSON.parse`/`readFileSync` wrapped in try/catch that returns a safe default on any failure (missing file, malformed JSON, missing fields); `mkdirSync(dirname(path), { recursive: true })` then `writeFileSync(path, JSON.stringify(value, null, 2) + '\n')` for writes; a dedicated "never block" wrapper (`rememberStartupFolder`) that swallows write errors because remembering state is ergonomic, not critical. The new `src/services/repo-layout.ts` reuses this shape verbatim, with one change: the path is always `join(repoPath, '.gitlocal', '.layout')`, derived from the already-resolved `repoPath` for the currently open repo/folder, rather than a fixed `~/.gitlocal/...` location. No env-var override is needed (unlike `GITLOCAL_STARTUP_PREFERENCE_PATH`) since the path is never a fixed global location to begin with — tests can pass an explicit `repoPath` pointing at a tmpdir instead.

**Alternatives considered**:

- Write a bespoke JSON-file service from scratch for this feature. Rejected — `startup-preferences.ts` already solved every failure mode this feature's spec requires (FR-007 malformed/missing tolerance, FR-008 unwritable-location tolerance, FR-009 unknown-field tolerance); duplicating that logic with different shape would be pure risk for no benefit.
- Use a generic key-value file store shared across all future `.gitlocal/` files. Rejected as premature — the spec (Assumptions) explicitly scopes this feature to one file (`.layout`); a shared abstraction can be introduced if/when a second `.gitlocal/` file is actually needed, consistent with the project's stated preference for avoiding dependency/abstraction bloat ahead of real need.

## Decision: New `/api/repo/layout` GET/PUT pair, no repo-id in the route

**Rationale**: GitLocal runs exactly one open repo/folder per server process (`currentRepoPath` module state in `src/server.ts`, exposed to handlers as `c.get('repoPath')`); there is no existing `/api/repos/:id/...` pattern anywhere in the codebase, and inventing one for this feature alone would be inconsistent with every other repo-scoped endpoint (`/api/repo/location`, `/api/repo/summary`, `/api/repo/changes`, `/api/repo/navigation-hints`). `GET /api/repo/layout` returns the currently saved layout (or defaults) for `c.get('repoPath')`; `PUT /api/repo/layout` writes it. This also matches the existing global-preference pair (`GET`/`PUT /api/startup-folder`) in request/response shape and error-handling convention (parse body in try/catch → 400 on invalid JSON → call service in try/catch → 400 with `error.message` on failure → 200 on success).

**Alternatives considered**:

- Bundle layout state into an existing endpoint (e.g. `/api/repo/location`) instead of a new route. Rejected — that endpoint already has a distinct, unrelated purpose (resolving path/branch/type for a requested location), and conflating "resolve what I'm asking for" with "here's what was last saved" would make both harder to reason about and test independently.
- POST instead of PUT for updates. Rejected for consistency — `/api/startup-folder` already uses PUT for a whole-resource replace of a small preference object, and `.layout` is the same shape of update (replace the current saved state).

## Decision: Insert as a new priority tier in `App.tsx`'s existing initial-state effect, not a parallel code path

**Rationale**: `App.tsx` already resolves initial view state through a priority chain in the effect around lines 588-617: an explicit startup open-target (e.g. double-clicking a file to launch GitLocal) wins outright; otherwise the URL-param-derived `savedInitialViewerStateRef` is applied, guarded by a repo-path match check. The new `.gitlocal/.layout` fetch (via a new `useQuery(['repo-layout'], api.getRepoLayout)`, matching the existing `startupFolderResponse` query pattern) slots in as a new middle tier: startup open-target (highest) → `.gitlocal/.layout` (new) → URL-param state (lowest, existing fallback). This keeps exactly one code path responsible for "what should the initial view be," rather than introducing a second, competing initializer. The existing repo-path-mismatch guard used for URL-param state isn't needed for `.gitlocal/.layout` since the file is inherently scoped to the repo that's already open — there's no cross-repo staleness case to guard against.

**Alternatives considered**:

- Restore saved layout via a `localStorage`-style eager read before first render (like `initialViewerState` is read synchronously today). Rejected — the layout now lives on the server (filesystem), so it can only be known after an async fetch resolves; the existing `useQuery` + effect pattern (already used for `startupFolderResponse`/`startupOpenTargetResponse`) is the established way this codebase handles "wait for a server-fetched value before finalizing initial state."
- Have the server inject the saved layout into the initial HTML/bootstrap payload to avoid a second round-trip. Rejected as unnecessary scope — `startupOpenTargetResponse` and `startupFolderResponse` already use the same after-mount fetch pattern with no reported UX issue; matching that precedent keeps this feature consistent and low-risk rather than introducing a new bootstrap-payload mechanism for one field.

## Decision: Writes are fire-and-forget from the UI; never surface a save error to the user

**Rationale**: Directly matches spec FR-008 (tolerate being unable to write, continue normally) and the existing `rememberStartupFolder` precedent, which wraps its writer in try/catch specifically because "remembering the folder is ergonomic state; it must not block local browsing." The UI calls `api.updateRepoLayout(...)` after each relevant navigation (branch switch, file open, raw/pretty toggle) without awaiting or blocking the interaction, and ignores rejection — consistent with treating this as best-effort convenience state, not a critical save operation the user needs to be aware of.

**Alternatives considered**:

- Debounce/batch writes to reduce filesystem churn on rapid navigation. Considered but not required for v1 — `startup-preferences.ts`'s writes are already synchronous and un-batched for comparable frequency, and SC-005 (no perceptible delay) is about UI responsiveness, not filesystem write count; can be revisited if real-world use shows an issue.
- Surface a toast/warning when a write fails (e.g. read-only filesystem). Rejected — contradicts FR-008's "continue functioning normally... rather than surfacing a blocking error," and no other ergonomic-state write in the app (recent items, startup folder) surfaces failures either.

## Decision: Verify through service tests, handler tests, and a UI priority-ordering test, plus manual smoke across both distributions

**Rationale**: The risky behavior is (a) correct read/write/fallback behavior at the service layer (mirroring `startup-preferences.test.ts`'s coverage shape: valid roundtrip, missing file, malformed JSON, unwritable directory, unknown fields), (b) correct request/response and error-code behavior at the handler layer (mirroring `repo.test.ts`), and (c) correct priority ordering in `App.tsx` (startup open-target beats saved layout beats URL-param default; saved branch that no longer exists still falls through to the existing branch-validation fallback at lines 266-303). Manual smoke must include the SC-004 cross-distribution case explicitly named in the spec: set layout via the npm-served browser UI, then open the same repo via the macOS app, and confirm it's honored.

**Alternatives considered**:

- Rely solely on manual testing given the small surface area. Rejected — the project's constitution requires 90% per-file coverage on every new/changed file without exception; the service and handler logic in particular (error/fallback branches) is exactly the kind of thing unit tests catch reliably and manual testing tends to skip.
