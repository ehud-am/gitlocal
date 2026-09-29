# Implementation Plan: Multi-Tab Main View

**Branch**: `049-multi-tab-main-view` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

## Summary

Add a VS Code-style tab strip above the main content area. The existing single "selected path" state in `App.tsx` stays the source of truth for what the main view shows; a new ordered list of open file tabs plus a remembered "folder view" location sit beside it. Any route that selects a file adds/activates a tab; selecting a folder moves the folder tab. The strip renders only while at least one file tab is open, so the landing view is unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18 (UI only)
**Primary Dependencies**: none added
**Storage**: page URL query string (`tab` params) via the existing `services/viewerState.ts`
**Testing**: Vitest + Testing Library + jest-axe; ≥90% per-file coverage (`ui/vitest.config.ts` include list extended)
**Target Platform**: npm/browser and macOS app (shared UI)
**Constraints**: no server/API change; `ContentPanel` unchanged; no regression of unsaved-edit prompts, sync reconciliation, branch-switch fallback, startup open target
**Scale/Scope**: 1 new pure module, 1 new component, ~120 lines in `App.tsx`, small edits to `viewerState.ts`, `types/index.ts`, `PickerPage.tsx`, `icons.tsx`

## Constitution Check

- **TypeScript-first product core**: PASS. React/TypeScript only.
- **Coverage ≥90% per file**: PASS. New files added to the coverage include list; `App.tsx` stays above threshold.
- **Shared code across distributions**: PASS. No native (Swift) change.
- **No new dependencies**: PASS.

## Design Decisions

| # | Decision | Alternatives considered | Why |
|---|----------|-------------------------|-----|
| D1 | Folder view is a permanent, non-closable first tab | Folder view only reachable by closing all tabs | Spec item 3 wants a way back; a visible folder tab makes it one click even with several files open |
| D2 | Strip hidden while no file tab is open | Always show strip | Spec item 1 and 2: landing and first open look as today |
| D3 | Every opened file gets a real tab (no preview/replace tab) | VS Code preview tabs | Spec item 4 asks for multiple tabs; preview-tab semantics add hidden rules for less-technical users [guess] |
| D4 | New tab inserted after the active file tab; appended when folder tab active | Always append | Matches VS Code |
| D5 | Close active tab → right neighbor, else left, else folder view | Always folder view | Matches VS Code; folder view still reached when last tab closes |
| D6 | Keep `selectedPath` as the single source of truth; tabs derived via one effect | Store full per-tab state | Minimal change; every existing navigation route (tree, search, links, changed files, startup, create file) opens tabs without per-route edits |
| D7 | Per-tab scroll/raw state not preserved | Keep one ContentPanel mounted per tab | Mounting N heavy viewers (PDF, PPTX, Excel) costs memory; file content is already cached by React Query, so switching is fast [likely] |
| D8 | Persist tab paths in URL `tab` params, capped at 50 | localStorage | Viewer state already lives in the URL; reload and shared links restore tabs |
| D9 | No close/switch keyboard shortcuts beyond the tab strip's own keys | Ctrl/Cmd+W, Ctrl+Tab | Browsers reserve them; native menu wiring deferred |
| D10 | Unsaved-edit dot replaces the close icon on the active tab (hover reveals close) | Separate badge | VS Code convention |
| D11 | Release as 0.13.8 | 0.8.1 as written | Repository is already at 0.13.7 |

## Data Model

```ts
// ui/src/lib/file-tabs.ts
interface FileTab { path: string; localOnly: boolean }
```

`App.tsx` state:

- `fileTabs: FileTab[]` — ordered open file tabs (initialized from `readViewerState().tabs`).
- `folderView: { path: string; localOnly: boolean }` — last folder shown; `''` = repository root landing.
- `previousActiveFileRef` — last active file path, used for "insert after active".

`ViewerState.tabs?: string[]` — persisted order; `localOnly` is not persisted (display-only for files).

## Flow

1. Selection effect: `selectedPathType === 'file'` → `openTab(...)`; otherwise → `folderView = selectedPath`.
2. Tab click → `selectPath` (existing unsaved-edit confirm).
3. Close active → confirm → `tabToActivateAfterClose` → `navigateTo` (new no-confirm helper split out of `selectPath`).
4. Reconciliation hooks: sync "missing", file delete (`handleMutationComplete`), folder delete (`closeTabsUnder`), branch-switch fallback, repository change (clear), folder picker (`tabs: []`).

## Project Structure

```text
ui/src/lib/file-tabs.ts                              # new: pure tab list helpers
ui/src/lib/file-tabs.test.ts                         # new
ui/src/components/ContentTabs/ContentTabStrip.tsx    # new: tab strip UI
ui/src/components/ContentTabs/ContentTabStrip.test.tsx # new
ui/src/App.tsx                                       # tab state + wiring
ui/src/App.test.tsx                                  # 6 integration tests
ui/src/services/viewerState.ts (+test)               # tab persistence
ui/src/types/index.ts                                # ViewerState.tabs
ui/src/components/Picker/PickerPage.tsx              # reset tabs when opening another folder
ui/src/components/ui/icons.tsx                       # FolderTabIcon, FileTabIcon
ui/vitest.config.ts                                  # coverage include list
```
