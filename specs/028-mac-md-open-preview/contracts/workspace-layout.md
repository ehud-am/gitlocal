# Contract: GitHub-Like Folder Tree And README Workspace

## Default Folder Workspace

Opening a folder should present a single GitHub-like folder page:

- Visible active folder/repository context near the top.
- A folder tree or file list as the first primary content area.
- A compact dotfile density checkbox that shows dotfiles by default and can hide `.*` files.
- A README quick link near the top when a README exists.
- The rendered README below the folder tree on the same scrollable page when present.

The folder tree and README are not mutually exclusive top-level tabs.

## Folder With README

When a folder has a README-style default document:

- The folder tree appears before the README.
- The README quick link is visible near the top and scrolls to the README section.
- The README is rendered as Markdown below the tree.
- Users can select neighboring files directly from the tree without switching tabs.
- Returning from a selected file to the folder view preserves the tree-first, README-below order.

## Finder-Opened Markdown File

When macOS opens a specific Markdown file:

- That file wins over README/default selection.
- The preview shows that file in rendered Markdown mode.
- The surrounding folder/repository context remains visible or directly available.
- Breadcrumb and header state identify the selected file.
- Returning to the containing folder shows the GitHub-like folder page with tree first and README below.

## Folder Without README

When no default Markdown document exists:

- The folder tree remains visible as the first primary content area.
- The README quick link is hidden.
- The README area shows a clear no-README state only if a README section would otherwise be expected.
- Empty state actions remain lightweight and appropriate to the folder/repository state.

## Dotfile Density Control

The folder tree must support a checkbox for dotfile density:

- Default state: dotfiles are shown.
- Checked/hidden state: entries whose displayed basename starts with `.` are hidden from the visible tree.
- Changing the checkbox must not change the active folder, selected file, preview mode, or README scroll target.
- If the currently selected file is a dotfile and the user hides dotfiles, the preview remains valid while the tree indicates that hidden files are filtered.

## Regression Checks

The UI must be tested for:

- Folder tree appears before README for ordinary folder opens.
- README quick link appears only when README exists and scrolls to the README section.
- No top-level tree/README tabs are required to discover navigation.
- Dotfiles are visible by default.
- Dotfile checkbox hides and shows `.*` files without resetting context.
- Requested Markdown preview appears for native file opens.
- Selecting a different tree file updates preview.
- Empty folder state does not hide folder context.
- Narrow layouts avoid overlapping tree controls, breadcrumbs, preview toolbar, README link, or content text.
