# Quickstart: Validating the Simplified Terminal Panel

## Prerequisites

- On branch `044-simplify-terminal-panel` with the implementation applied.
- `npm install` at the repo root (and in `ui/` if it manages its own deps).

## Setup

```sh
npm run build
npm start   # or the project's existing dev command, e.g. `npm run dev`
```

Open the served UI in a browser (or the macOS app, if validating that distribution) against any
local Git repository folder.

## Validation Scenarios

### 1. No kind selection remains (User Story 1)

1. Open the terminal panel (Ctrl+`` ` ``).
2. Click "New Terminal".
3. **Expect**: a plain shell opens immediately with no prompt or dropdown asking to choose a
   terminal kind, and no "Claude"/"Codex" option is visible anywhere in the panel.
4. In the new tab, type `claude` (or `codex`) and press enter.
5. **Expect**: the command runs exactly as it would in any terminal — no special panel behavior.

### 2. Dock position defaults to right and persists (User Story 2)

1. On a clean profile (no `~/.gitlocal/terminal-panel-preference.json`), open the terminal panel
   for the first time.
2. **Expect**: it docks to the right edge of the window.
3. Open a couple of terminal tabs, run a command in each so there's visible scrollback.
4. Change the dock position to "bottom", then to "left", using the position control.
5. **Expect**: at each step, the panel visibly relocates, the resize handle orientation matches
   (row-resize at bottom, column-resize at left/right), and all open tabs/scrollback are
   unchanged (see `curl -s http://localhost:<port>/api/terminal-panel-preference` reflecting the
   latest choice after each change).
6. Restart the server process and reload the page.
7. **Expect**: the terminal panel reopens in the last-chosen position ("left"), not back to the
   default "right".

### 3. Single, consistent "New Terminal" action (User Story 3)

1. With the terminal panel empty (no tabs), locate the terminal-open control.
2. **Expect**: one clearly labeled "New Terminal" action, no other controls.
3. Open a tab, then look at the tab strip's control for opening another terminal.
4. **Expect**: the same "New Terminal" label/action, producing an equivalent new, distinctly
   labeled tab (e.g., "Terminal 2").

### 4. Regression checks

- Ctrl+`` ` `` still toggles panel visibility regardless of current dock position.
- On the macOS app, the native "Toggle Terminal" menu item still works regardless of dock
  position.
- `GET /api/terminal-panel-preference` returns `{"dockPosition":"right"}` by default when the
  preference file is absent or deleted.
- `PUT /api/terminal-panel-preference` with an invalid value (e.g. `{"dockPosition":"top"}`)
  returns `400`.

## Automated Checks

```sh
npm test        # root: server + coverage gate (≥90% per-file branch coverage)
cd ui && npx tsc --noEmit && npm test   # UI type-check + tests/coverage
```

Confirm any new UI file introduced by this feature (e.g. a dock-position control component or
the client-side preference service) is present in `ui/vitest.config.ts`'s coverage `include`
list — its absence would silently exempt the file from the coverage gate.
