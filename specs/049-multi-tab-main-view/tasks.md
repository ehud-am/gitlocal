# Tasks: Multi-Tab Main View

**Input**: `specs/049-multi-tab-main-view/spec.md`, `plan.md`

## Phase 1: Setup

- [X] T001 Run the UI suite to confirm a green baseline (`cd ui && npx vitest run`: 46 files, 624 tests passed).

## Phase 2: Foundational

- [X] T002 [P] Add pure tab helpers `openTab`, `closeTab`, `tabToActivateAfterClose`, `closeTabsUnder`, `describeTabs` in `ui/src/lib/file-tabs.ts` with tests in `ui/src/lib/file-tabs.test.ts`.
- [X] T003 [P] Add `tabs?: string[]` to `ViewerState` (`ui/src/types/index.ts`); read/write repeated `tab` query params with de-duplication and a 50-tab cap in `ui/src/services/viewerState.ts`; update `viewerState.test.ts`.

## Phase 3: User Story 1 + 2 - Tabs and return to folder view (P1)

- [X] T004 [P] [US1] Add `FolderTabIcon` and `FileTabIcon` to `ui/src/components/ui/icons.tsx`.
- [X] T005 [US1] Build `ContentTabStrip` (`ui/src/components/ContentTabs/ContentTabStrip.tsx`): folder tab + file tabs, close buttons, middle-click close, Close all, unsaved dot, ARIA tabs pattern with roving focus and Delete/Backspace close; tests incl. axe in `ContentTabStrip.test.tsx`.
- [X] T006 [US1] In `ui/src/App.tsx`, add `fileTabs` / `folderView` state and the selection effect that opens tabs and tracks the folder view; split `navigateTo` out of `selectPath`.
- [X] T007 [US1] Add `handleSelectFolderTab`, `handleSelectFileTab`, `handleCloseTab`, `handleCloseAllTabs`; render the strip at the top of `<main>` only when tabs exist and no startup-open error is shown.
- [X] T008 [US2] Close tabs on: sync-detected missing file, in-app file delete, folder delete (`closeTabsUnder`), branch-switch fallback; clear tabs on repository change.

## Phase 4: User Story 3 - Persistence (P3)

- [X] T009 [US3] Include `tabs` in the `writeViewerState` snapshot; reset `tabs: []` in `PickerPage.reloadAfterOpen`.

## Phase 5: Tests and Polish

- [X] T010 Add App integration tests (`ui/src/App.test.tsx`, "main view tabs (049)"): landing without strip, open/close back to folder, multiple tabs + folder tab, neighbor activation + duplicate-name labels, unsaved-edit decline, missing-file reconciliation, folder delete.
- [X] T011 Add `ContentTabs/**` and `lib/file-tabs.ts` to `ui/vitest.config.ts` coverage include list.
- [X] T012 Run `cd ui && npx tsc --noEmit`, `npx vitest run --coverage`, repository `npm run lint`, `npm test`, `npm run build`.
- [X] T013 Bump version to 0.13.8 (`package.json`, `package-lock.json`); add CHANGELOG entry; add CLAUDE.md "Recent Changes" entry.
- [X] T015 Review feedback: remove the file view's "Back to folder" button (`ContentPanel.tsx` + test) and move the tab strip from the top of `<main>` to below the repository block, directly on the content card (`App.tsx`, `ContentTabStrip.tsx`, `.content-with-tabs` in `globals.css`).
- [ ] T014 Manual check in a browser: landing, open/close, several tabs, reload restore, unsaved-edit prompt, dark theme (left for reviewer).
