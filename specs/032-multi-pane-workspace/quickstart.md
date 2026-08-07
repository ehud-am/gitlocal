# Quickstart: Multi-Pane Workspace

## Implementation Targets

1. Add `Pane`, `PaneKind`, `WorkspaceLayoutMode` types to `ui/src/types/index.ts`.
2. Add `usePaneWorkspace.ts`: the pane-list/active-pane/layout-mode state hook and its open/close/select/change-layout actions, replacing `App.tsx`'s `selectedPath`/`selectedPathType` scalars. Not persisted (FR-014); the existing single-file `viewerState.ts` persistence is left as-is for the implicit single-pane case.
3. Add the `ui/src/components/Workspace/` component family: `WorkspaceShell.tsx` (top-level: tab strip + layout switcher + active view), `TabStrip.tsx`, `LayoutSwitcher.tsx`, `PaneTile.tsx` (dispatches to `ContentPanel` or `TerminalPane` per pane, renders the empty-tile placeholder). Wire `App.tsx` to render `WorkspaceShell` in place of its current single `ContentPanel` usage — `ContentPanel.tsx` itself is unchanged, just mounted per Content Pane.
4. Add `node-pty` and `ws` as direct dependencies in `package.json`; add `src/handlers/terminal.ts` (WS upgrade route: spawn a `node-pty` session per connection scoped to the repository root, stream I/O, track sessions in an in-memory map, kill the `pty` on close); wire the route in `src/server.ts`.
5. Add `@xterm/xterm` and `@xterm/addon-fit` as direct dependencies in `ui/package.json`; add `ui/src/services/terminalSocket.ts` (WS client wrapper) and `ui/src/components/Workspace/TerminalPane.tsx` (xterm instance bound to one session, handling `connecting`/`connected`/`ended`/`error` states).
6. Add `workspace-tabstrip-*`, `workspace-grid-*`, `terminal-pane-*` styles to `ui/src/styles/globals.css`, implementing the three fixed grid presets (2-column = 1×2, 4-tile = 2×2, 6-tile = 3×2) and a responsive/stacked fallback for narrow viewports.
7. Preserve all existing single-file view/raw/edit/JSON/Markdown behavior unchanged when exactly one pane is open.

## Focused Verification

Run the targeted UI tests while implementing:

```sh
npm --prefix ui run test -- usePaneWorkspace WorkspaceShell TabStrip LayoutSwitcher PaneTile TerminalPane terminalSocket
```

Run the server-side terminal handler tests:

```sh
npm test -- terminal.test
```

Run the UI coverage suite before handing off implementation:

```sh
npm --prefix ui run test:ci
```

Run the full project checks, since this feature touches shared top-level state (`App.tsx`) and adds new server dependencies:

```sh
npm test
npm run lint
npm run build
```

## Manual Smoke Samples

- Open one file (default state) and confirm view/raw/edit behavior is identical to before this feature.
- Open a second file as a new tab; switch between tabs; close one tab; confirm the other stays open and becomes active.
- With 3+ tabs open, switch to 2-column, 4-tile, and 6-tile layouts in turn; confirm the right number of panes render simultaneously and no open pane is lost when switching back to Tabbed Mode.
- Open a tab with fewer panes than a tiled layout's capacity; confirm empty placeholder tiles appear.
- Open more panes than a tiled layout's capacity; confirm the excess panes remain reachable.
- Open a terminal pane; run a long-lived command (e.g. `top`, or an actual AI coding agent CLI) and confirm output streams live.
- Open a second terminal pane and confirm both sessions are fully independent (run different commands in each).
- Place a terminal pane and a content pane together in a 2-column layout; confirm both remain live/usable simultaneously (the concrete SC-005 scenario).
- Close a terminal pane's tab/tile; confirm its shell process is terminated (e.g. check no orphaned process remains).
- In a terminal pane, type `exit` (end the shell without closing the pane via the UI); confirm the pane shows a "session ended" state rather than freezing or going blank.
- Reload the page/app with multiple panes and a terminal open; confirm the workspace resets to the default single-file view (FR-014) and no terminal sessions survive.
- Resize the browser/app window to a narrow viewport with a 4-tile or 6-tile layout active; confirm the layout degrades to a usable arrangement rather than illegibly small tiles.
- On macOS: verify the native app (Homebrew cask build) can spawn a terminal pane successfully — this is the primary check for the `node-pty` native-binary packaging risk called out in plan.md.
