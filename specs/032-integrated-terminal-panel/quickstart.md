# Quickstart: Integrated Terminal Panel

Manual verification steps once the feature is implemented, covering each user story in `spec.md`.

## Setup

```sh
npm install
npm run dev:server   # starts the Hono server against a local repo path
npm run dev:ui        # starts the Vite dev server
```

Open the app in a browser and browse into any local git repository.

## US1 — Persistent terminal across navigation

1. Open the terminal panel (control is reachable from any page).
2. Run `pwd` in the terminal; note the output.
3. Navigate: folder view → a file view → the git view.
4. Return to the terminal panel — confirm the earlier `pwd` output is still there and the shell is still responsive.
5. Reload the browser page — confirm the panel resets to closed/empty (no session survives reload, per FR-016).

## US2 — Show/hide without losing sessions

1. With a terminal running a long-lived command (e.g. `ping localhost` or similar continuous output), hide the panel.
2. Confirm the main content area reclaims the vertical space.
3. Wait a few seconds, then show the panel again — confirm the output produced while hidden is now visible (not skipped).

## US3 — Multiple independent tabs

1. Open three terminal tabs.
2. Run a distinct, identifiable command in each (e.g. `echo one`, `echo two`, `echo three`).
3. Switch focus between tabs — confirm each shows only its own output.
4. Close the middle tab — confirm the other two are unaffected and still running.
5. Close the remaining tabs one by one — confirm the panel shows an empty/"open a terminal" state after the last one, not an error.

## US4 — Terminal kinds

1. Open a new tab as "Regular" — confirm it's a plain shell prompt with nothing auto-run.
2. Open a new tab as "Claude" — confirm the Claude Code CLI starts automatically with no typing required.
3. Open a new tab as "Codex" — confirm the Codex CLI starts automatically with no typing required.
4. (If either CLI isn't installed locally) confirm the tab shows a clear "not available" message instead of a broken/empty session.
5. Confirm the tab strip visibly distinguishes Regular/Claude/Codex tabs (icon or label).

## US5 — Working directory follows visible content

1. Browse into a nested subfolder in the file tree; open a new terminal tab; run `pwd` — confirm it matches the browsed folder.
2. Open a file two levels deep; open a new terminal tab; run `pwd` — confirm it matches that file's parent folder.
3. Navigate to a page with no specific file/folder in view (e.g. the git history/repo overview); open a new terminal tab; run `pwd` — confirm it defaults to the repository root.
4. With a tab already open, navigate elsewhere in the app — confirm that existing tab's directory (check via `pwd` again in that same tab) has not changed.

## Accessibility pass

1. Using only the keyboard (no mouse), show the panel, open a tab, switch tabs, close a tab, and hide the panel.
2. Run the existing `jest-axe` UI test suite (`npm run test:ui`) and confirm no new violations from the terminal panel/tab strip components.

## Coverage & regression gate

```sh
npm run verify
```

Confirm: full suite green, ≥90% per-file coverage on every new/modified file (server and UI), no new `npm audit` findings.
