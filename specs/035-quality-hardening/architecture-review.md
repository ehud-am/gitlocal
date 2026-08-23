# Architecture Review (0.10.3 Quality Hardening)

**Input**: `findings/*.md` — 16 review units, 110 logged findings + 2 architecture verdicts, produced by two independent passes per unit (Pass 1 mechanical sweep + Pass 2 deep review, with Pass 3 adjudication on disagreement) per `plan.md` Q2.

## 1. Module boundaries and layering

**Server (`src/`)** is a clean, mostly-well-layered Hono app:

- `git/` (2,141 lines: `repo.ts`, `tree.ts`, `identity-settings.ts`) — the git-execution core. `tree.ts` builds on `repo.ts`'s primitives, not vice versa; `identity-settings.ts` is a leaf dependency. No circularity.
- `handlers/` (1,520 lines) — thin Hono route handlers that delegate all real logic to `git/` and `services/`. Correct separation of concerns; its cost is duplicated request-plumbing (below), not misplaced logic.
- `services/` (332 lines) — small, focused, well-tested composition modules (`repo-watch.ts`, `startup-preferences.ts`) sitting between handlers and `git/`.
- `terminal/` (455 lines) — a genuinely clean vertical slice (PATH probing / session registry / types / WebSocket transport), each file single-purpose, with a factory-injection seam (`PtyFactory`) for testability.
- `*.ts` root (1,041 lines: `cli.ts`, `index.ts`, `server.ts`, `types.ts`) — a thin composition root. One boundary is blurred: `server.ts` mixes pure route wiring with non-trivial path-classification business logic (`resolveOpenTarget`, `initializePaths`, `classifyServerError`) that arguably belongs beside `git/repo.ts`'s `classifyLocalPath`, which it wraps.

**UI (`ui/src/`)** layers similarly: `App.tsx` (shell/orchestration) → feature components (`ContentPanel/`, `RepoContext/`, `TerminalPanel/`, `Picker/`, `Search/`, `FileTree/`) → `services/` (API/storage clients) and `components/ui/` + `lib/` (primitives, pure helpers). Container/presentational splits are consistently applied where they matter most (`FileTree`/`FileTreeNode`, `RepoContextHeader`/`BranchSwitchDialog`, `TerminalPanel`/`TerminalView`).

**Native (`native/macos/`, 629 lines, review-only)** is a thin, correctly-scoped wrapper: six single-responsibility files (process lifecycle, path resolution, WebKit host + JS bridge, app/menu wiring, fatal-error UI, bootstrap), delegating all product logic to the shared TypeScript server over HTTP. No god-object; the wrapper stays a wrapper.

## 2. God-component verdicts (T018/T023)

Two files were flagged pre-review as size outliers and required an explicit verdict rather than an assumption:

- **`App.tsx` (1,602 lines) — NOT a god component.** (Full rationale: `findings/ui-app-shell.md` AS-003.) It is the sole top-level composition root (verified: imported only by `main.tsx`), owns coherent, centrally-necessary concerns (9 `useQuery` hooks needing coordinated invalidation, ~48 state variables grouped by concern, native-bridge wiring, viewer-state persistence), and drills props only one shallow level to well-scoped children. **No decomposition into sub-components is recommended.** Its real cost is duplicated logic within the shell (query-invalidation key lists repeated 4 ways — AS-004/AS-005; `handleSelectFile`/`handleSelectFolder` — AS-001), not its size.
- **`ContentPanel.tsx` (1,325 lines) — NOT a god component**, but with an identified **optional** shrink path. (Full rationale: `findings/ui-content-panel.md` CP-010.) It already delegates content-type rendering, editing, deletion, creation, and markdown export to sibling files; every remaining piece of state serves the single responsibility of rendering/mutating the selected path. Directory-list rendering (~180 lines), root-dashboard rendering (~65 lines), find-in-file UI (~110 lines), and create-folder UI (~50 lines) are inlined rather than extracted — extracting `FindInFilePanel`/`DirectoryListView` could bring the file under 1,000 lines with zero behavior change, but this is a nice-to-have, not a defect.

Both verdicts close the open architecture question from `plan.md` Q1. No other unit approaches this scale — the next-largest units (`ui/src/types/` at 675 lines, `ui/src/services/` at 649) are appropriately-sized, single-purpose modules.

## 3. Cross-cutting structural themes

These recur across ≥2 review units and represent the highest-leverage fix targets — several individually-logged findings are local symptoms of the same root cause:

1. **Server/client type duplication (highest-leverage single issue).** `src/types.ts` (589 lines) and `ui/src/types/index.ts` (661 lines) hand-duplicate the wire-format contract with no shared module across the esbuild/Vite bundle boundary: 87 type names appear in both, 84 byte-for-byte identical (SR-001, UT-002). This has already produced real drift twice — `ViewerState` diverged into two differently-shaped types sharing one name after the server copy went dead (UT-003), and `src/terminal/types.ts`'s `TerminalUnavailableErrorCode` is stale relative to what `session-manager.ts` can actually return, unenforced because the server handler never imports its own type (ST-001/ST-004). A shared types package/module consumed by both bundles would eliminate this entire class of drift bugs at the root, rather than patching each divergence individually.

2. **Handler-layer request-plumbing duplication.** `file.ts`/`folder.ts` independently reimplement JSON-parse-with-fallback, branch resolution (`validateRepo(repoPath) ? getCurrentBranch(repoPath) : ''`, duplicated 6 times), and mutation-response construction (`mutationBlocked` vs. `folderMutationBlocked`, near-identical) per handler rather than sharing helpers (SH-001–SH-006). A secondary, concrete correctness-adjacent issue: three `folder.ts` handlers always return HTTP 200 with `ok:false` bodies while every sibling handler returns explicit 4xx/5xx — safe only because specific frontend callers happen to check the body instead of relying on `res.ok` (SH-008), a fragile implicit contract.

3. **Path/icon/query-invalidation utility triplication in the UI.** `parentPathOf` exists identically in three places (`App.tsx`, `ContentPanel.tsx`, `markdown-navigation.ts`) and `basenameOf`/`basenameOfPath` in two (CP-009); three icon components are byte-for-byte duplicated between `App.tsx` and `PickerPage.tsx` with no shared icons module anywhere in `ui/src` (PK-001); the same 10-query-key invalidation list is duplicated across four call sites in `App.tsx` (AS-004/AS-005). `ui/src/lib/utils.ts` currently holds only `cn()` and is the natural, under-utilized consolidation point the project's own convention (cross-cutting non-React helpers live in `ui/src/lib/`) already points to.

4. **Uncached git-subprocess-per-call pattern.** `src/git/repo.ts`'s helpers each independently shell out to `git` with no per-request memoization. This is fine for single-shot calls but becomes a real cost center under recursion: `getTrackedPathType` triggers a fresh `git ls-files` re-scan of the whole tracked-file set on every call, reached once per directory entry during tree crawling and on every `/api/search` request (SG-004, high severity — the only high-severity efficiency finding in the whole review). A "git state snapshot" abstraction, already partially prototyped via `FileSyncAnalysis`, could extend to cover the tracked-file-list and ignore-checking paths.

5. **Copy-pasted tree/list ARIA markup without matching behavior.** `PickerPage.tsx`'s sidebar list uses `role="tree"`/`treeitem` with a hardcoded `aria-expanded={false}` and a non-rotating chevron — copied from `FileTree.tsx`'s genuine tree widget without the corresponding expand-in-place state (PK-009, FT-011, FT-012). `FileTree.tsx` itself, while correctly state-driven, has no keyboard operability at all (no `onKeyDown`/`tabIndex`/roving focus) despite using tree/treeitem ARIA roles, which per the ARIA APG require full keyboard support (FT-010). This is a gap in the "reference" implementation, not just its copy.

6. **Native macOS process-lifecycle and JS-bridge robustness.** Concentrated entirely in `native/macos/` (review-only, excluded from the LOC target but not from the bug-fix priority list): `GitLocalService`'s `completed` flag is read/written unsynchronized across 3 background queues (NM-001, high) and shutdown never escalates to SIGKILL and doesn't block, orphaning the child process on quit (NM-002); `ViewerWindowController`'s Finder→WebView JS bridge escapes backslashes/single-quotes but not double-quotes or newlines, so a filename like `O'Brien's notes.md` can break out of the JS string literal and inject script into the WKWebView (NM-004, high).

## 4. Severity concentration

Of 110 findings, 5 are high severity — worth naming explicitly since Phase 4 sorts fixes by severity first:

| ID | Unit | Category | Summary |
|---|---|---|---|
| SG-004 | server-git | efficiency | Uncached `git ls-files` re-spawn on every tree/search call (theme 4 above) |
| SR-001 | server-root | duplicate | Server/client type duplication, ~80 hand-synced types (theme 1 above) |
| PK-001 | ui-picker | duplicate | Icon components triplicated with no shared icons module (theme 3 above) |
| NM-001 | native-macos | bug | Unsynchronized `completed` flag race across 3 GCD queues (theme 6 above) |
| NM-004 | native-macos | bug | Incomplete JS-string escaping enables script injection from a filename (theme 6 above) |

The remaining 105 findings are medium (31) or low (74) severity — see `findings/index.md` for the full breakdown.

## 5. Recommendation for Phases 4-8

No structural blocker prevents proceeding directly into Phase 4 (bug fixes). The two architecture verdicts (§2) mean no unit needs to be re-scoped or re-split before fix work begins. The cross-cutting themes (§3) suggest sequencing fixes within each phase to land root-cause consolidations before their local symptoms where possible — e.g., landing a shared `ui/src/lib/path.ts` (theme 3) once, ahead of/alongside the individual CP-009/PK-001 duplicate-removal tasks, rather than fixing each call site independently and re-duplicating the lesson.
