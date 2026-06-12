# Research: Viewer Usability Upgrades

## Decision: Keep Markdown Reading in the Normal Repository Viewer

**Rationale**: Product managers need repository context while Codex or another tool changes files in the background. Markdown reading should improve inside the standard viewer instead of introducing a separate mode.

**Alternatives considered**:

- Modal document reader: rejected because Markdown links, search, and changed-file context should remain part of the repository viewer.

## Decision: Resolve Relative Markdown Links Against the Current Markdown File

**Rationale**: Standard Markdown author expectations are that `guide.md` from `docs/README.md` resolves to `docs/guide.md`, while root-relative paths remain explicit. Resolving from the current file folder makes nested docs usable for less-technical readers.

**Alternatives considered**:

- Continue resolving all relative links from repository root: rejected because it breaks nested README/spec links.
- Let the browser handle relative links directly: rejected because GitLocal needs to preserve in-app navigation and repository safety.
- Open all relative links externally: rejected because it fragments the local viewer workflow.

## Decision: Build Background Change Awareness on Existing Sync Polling

**Rationale**: The app already polls sync state and invalidates file/tree queries when the working-tree revision changes. Extending this with last-checked/last-refreshed metadata, changed-file summaries, and active-path notices avoids a watcher dependency while preserving local-first behavior.

**Alternatives considered**:

- Add a filesystem watcher dependency: rejected for initial planning because polling already exists and dependency bloat must be justified.
- Require manual refresh only: rejected because the target workflow assumes AI agents change files in the background.
- Auto-navigate silently on every change: rejected because users need explanations when context changes.

## Decision: Changed Files Is a Navigation Surface, Not a Diff Tool

**Rationale**: The requested user is reviewing and orienting, not resolving merges in a full IDE. Changed-files should group modified, added, deleted, renamed, untracked, local-only, and remote-relevant paths, then open the best available file/folder context. Full inline diffs can remain out of scope.

**Alternatives considered**:

- Full diff/review tool: rejected as too broad and likely to compete with IDE/Git clients.
- Only show a numeric local-change badge: rejected because it does not tell users what to inspect.
- Hide untracked/local-only items: rejected because generated/local-only visibility should be user-controlled.

## Decision: Move Repository Search to a Separate Search Surface With Scopes

**Rationale**: Inline search currently pushes the active document down and can overwhelm users with generated or low-value results. A separate panel or overlay can keep the current document recoverable while exposing explicit scopes, result counts, and partial-result messaging.

**Alternatives considered**:

- Keep inline search and reduce padding: rejected because large result sets still displace reading context.
- Search only file names by default: rejected because content search is central to codebase understanding.
- Hide advanced scopes permanently: rejected because users need generated/local-only and current-folder controls when search noise appears.

## Decision: Persist Generated/Local Visibility as a Viewer Preference

**Rationale**: Generated and local-only folders are accurate but noisy. A persistent preference lets users default to high-signal navigation/search while preserving access to hidden local files when needed.

**Alternatives considered**:

- Always hide generated/local-only files: rejected because users sometimes need ignored drafts, logs, or generated artifacts.
- Always show everything: rejected because dependency/build folders overwhelm the target workflow.
- Separate preferences per surface only: rejected because users expect the same visibility concept in tree, folder list, dashboard, and search.

## Decision: Root Dashboard Replaces Raw Directory Table as the First-Order Root Experience

**Rationale**: The root view should answer "what should I read or review?" before "what files exist?" Key docs, recent items, changed files, and repository status reduce time-to-useful-content for semi-technical users. Raw directory browsing remains available lower in the view.

**Alternatives considered**:

- Keep root as a directory table only: rejected because it duplicates the sidebar and requires layout knowledge.
- Replace tree navigation entirely with a dashboard: rejected because users still need precise browsing.
- Show only README: rejected because active AI-agent review often depends on changed/recent/spec files too.

## Decision: Keep Rare Edit Actions Secondary but Conflict-Safe

**Rationale**: Editing is explicitly lower frequency than reading. Edit/create/delete actions should remain available through menus/contextual controls, while read/find/copy/share/review actions are more prominent. Existing revision-token conflict protection should remain and be made clearer in background-change cases.

**Alternatives considered**:

- Promote edit to a primary action: rejected because it shifts the product toward IDE behavior.
- Remove edit actions from reading surfaces: rejected because lightweight human intervention remains in scope.
- Add complex multi-file editing workflows: rejected as outside the viewer-usability goal.

## Decision: Avoid New Runtime Dependencies Until Implementation Proves Need

**Rationale**: Existing React, Markdown, query, Hono, git, and filesystem capabilities are enough for the planned behavior. Avoiding new dependencies aligns with the constitution and keeps npm/native distributions smaller.

**Alternatives considered**:

- Add a Markdown AST utility: deferred unless current Markdown renderer APIs cannot support stable heading extraction.
- Add fuzzy-search libraries: deferred because scoped search and result limiting can improve usability first.
- Add file watcher libraries: rejected for initial plan because polling already covers the main background-change scenario.
