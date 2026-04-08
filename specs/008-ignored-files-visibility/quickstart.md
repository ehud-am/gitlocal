# Quickstart: Ignored Local File Visibility

## Prerequisites

- Install dependencies with `npm ci` and `npm --prefix ui ci`.
- Start the UI and server locally with `npm run dev:ui` and `npm run dev:server`.
- Prepare three local repositories for manual validation:
  - A mixed repository with tracked files plus a `.gitignore` that matches at least one file and one folder.
  - A repository whose visible root content is ignored-only, such as a local notes file and generated folder covered by `.gitignore`.
  - A repository with at least one additional branch or historical state so current working-tree behavior can be compared with non-current branch browsing.

## Validation Flow

1. Open GitLocal against the mixed repository.
2. Confirm the left file tree shows both normal repository items and ignored local items.
3. Verify each ignored item includes a visible local-only cue without losing its normal open or navigation affordances.
4. Expand an ignored folder from the tree and confirm its immediate children remain browsable.
5. Select an ignored folder and confirm the main content panel lists its children with the same local-only cue.
6. Open an ignored file and confirm the active view still communicates that the file is local-only.
7. Use repository search to look up the ignored file by name and confirm the result appears with the same local-only treatment.
8. Open the repository whose visible root content is ignored-only.
9. Confirm GitLocal shows the ignored local items instead of an empty or broken repository state.
10. Open a folder whose visible contents are ignored-only and confirm it renders as a normal folder view rather than an empty-folder message.
11. Switch to a non-current branch or historical view and confirm ignored local items from the current working tree no longer appear there.
12. Change an ignore rule or begin tracking a previously ignored item, refresh the affected view, and confirm the local-only cue updates to match the item's new state.
13. Delete or move an ignored item outside GitLocal, refresh, and confirm the interface handles the missing item gracefully instead of leaving stale broken UI.

## Automated Checks

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.

## Validation Notes

- Automated implementation verification on 2026-04-08 completed successfully with `npm test`, `npm run lint`, and `npm run build`.
- Manual UI validation from the flow above was not executed in this terminal-only session and remains pending.
