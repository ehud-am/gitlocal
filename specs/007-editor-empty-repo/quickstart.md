# Quickstart: Editor Workspace, Folder-First Main View, and Markdown Comment Hiding

## Prerequisites

- Install dependencies with `npm ci` and `npm --prefix ui ci`.
- Start the UI and server locally with `npm run dev:ui` and `npm run dev:server`.
- Prepare three local repositories or folders for manual validation:
  - A normal repository with a `README.md` that can be edited.
  - A freshly initialized repository created with `git init` and no `README.md`.
  - A repository with at least one nested folder and markdown content that contains hidden comment lines or comment blocks.

## Validation Flow

1. Open GitLocal against the repository that contains `README.md`.
2. Select `README.md`, enter edit mode, and confirm the editor uses most of the main content area instead of appearing inside a cramped centered card.
3. Verify the save and cancel controls remain visible and usable while the expanded editor is open.
4. Resize the browser narrower and confirm the edit workspace remains usable without overlapping controls.
5. Open a freshly initialized repository with no `README.md`.
6. Confirm the main content area shows the current folder contents rather than a sparse blank screen or a dedicated recovery message.
7. Verify each listed row exposes an `Open` action on the right and that double-clicking a row opens the same item.
8. Compare the in-repo folder list with the existing non-git folder browser and confirm the look and feel is intentionally similar.
9. Switch between repositories so the saved file selection is cleared and confirm the main content area still falls back to the current folder list instead of the prior "Pick up where you left off" experience.
10. Select a folder from the tree and confirm the main content area shows that folder's immediate child files and folders.
11. Use the row button to open one child item, then return and open another item by double-clicking it.
12. Open an empty folder and confirm the content area shows an intentional empty-folder message instead of an error-like state.
13. Open a markdown file that contains hidden comments and confirm rendered markdown does not show the commented content.
14. Switch the same markdown file to raw view and confirm the source still shows the original comment text.

## Automated Checks

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
