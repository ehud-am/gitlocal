# Quickstart: Patch Bug Fixes (0.10.2)

Manual verification steps once the feature is implemented, covering each user story in `spec.md`. US1 and US4-US6 are visual/interactive; US2 requires a shell environment where `claude`/`codex` are only resolvable via a profile script; US3 requires the native macOS app build.

## Setup

```sh
npm install
npm run dev:server   # starts the Hono server against a local repo path
npm run dev:ui        # starts the Vite dev server
```

For US3 (native menu), build and run the macOS app from `native/macos/GitLocal/` in Xcode against the same dev server.

## US1 — Folder view scrolls again

1. Open a folder or repo with enough entries to overflow the viewport height (30+ entries at a typical window size).
2. With the terminal panel closed, scroll the folder listing — confirm the last entry is reachable.
3. Open the terminal panel and expand it — confirm the folder listing still scrolls fully, and the terminal's own scrollback scrolls independently.
4. Collapse the terminal panel — confirm the folder listing still scrolls fully.
5. Resize the terminal panel while the folder view is scrolled partway down — confirm the folder view doesn't become unscrollable or clipped.

## US2 — Claude terminal tabs launch without a PATH error

1. In a shell profile only (e.g. `~/.zshrc`), add a PATH export or an nvm-managed install so `claude` resolves only via an interactive shell, not the raw system PATH.
2. Restart the GitLocal server process (so it does *not* inherit the profile-sourced PATH directly).
3. Open a Regular terminal tab and type `claude` — confirm it runs (this already works today, and must keep working).
4. Open a Claude terminal tab — confirm it launches successfully with no PATH error.
5. Open a Codex terminal tab under the same conditions — confirm the same fix applies.
6. Uninstall/rename `claude` so it's genuinely unresolvable anywhere — confirm opening a Claude tab still shows the "not found on PATH" error (no false positive).

## US3 — Terminal toggle is discoverable in the native menu

1. In the native macOS app, open the View menu — confirm a "Toggle Terminal" item is present showing Ctrl+\` as its key equivalent.
2. Select it from the menu — confirm the terminal panel opens (or hides, if already open).
3. Press Ctrl+\` directly (not via the menu) in both the native app and a browser tab — confirm identical toggle behavior in both.

## US4 — Dotfile visibility is a single global setting

1. In the native app, open the app menu — confirm a "Hide Dotfiles" item is present (Cmd+Shift+.) with a checkmark reflecting current state.
2. Toggle it — confirm both the sidebar file tree and the content panel's folder/git view update together.
3. Confirm no inline "Hide .* files" checkbox remains in either the sidebar or the content panel.
4. In the browser distribution, confirm a single toolbar-level control exposes the same toggle, and that toggling it updates both views identically.
5. Reload the app (or navigate within the session) — confirm the setting persists rather than resetting.

## US5 — Refresh moves to the menu with a shortcut

1. Confirm the top toolbar no longer shows a Refresh button.
2. In the native app, open the View menu — confirm Refresh (Cmd+R) is present and works.
3. In the browser distribution, press Ctrl+Alt+R — confirm it triggers the same refresh (info, git-context, branches, tree, file, readme, directory-readme, sync, repo-summary, navigation-hints all re-fetch).
4. In the browser distribution, confirm an always-visible non-keyboard control (the new "View options" toolbar control) also triggers refresh.

## US6 — Tracked/All/Local filter moves to the menu

1. Confirm the sidebar no longer shows the inline Tracked/All/Local dropdown.
2. In the native app menu, confirm a Tracked/All/Local submenu is present with a checkmark on the active value, and that selecting each value filters the file tree/folder view exactly as before.
3. In the browser distribution, confirm the same "View options" toolbar control introduced for US4 also exposes Tracked/All/Local, with identical filtering behavior.

## Accessibility check (all stories)

Run the existing `jest-axe` suites for `App`, `FileTree`, and `ContentPanel` — confirm no new violations. Manually tab through the toolbar to confirm focus order still makes sense after the Refresh button removal and the new "View options" control's addition.
