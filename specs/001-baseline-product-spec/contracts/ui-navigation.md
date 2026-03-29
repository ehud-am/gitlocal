# UI Navigation Contract: Current Product Baseline

## Primary Surfaces

- **Picker Page**: Visible when no repository is loaded. Accepts a local path and submits it to the picker endpoint.
- **Repository Header**: Shows the product name and loaded repository name.
- **File Tree Sidebar**: Displays the repository tree and supports lazy folder expansion plus file selection.
- **Git Info Sidebar**: Displays branch selection and recent commit history.
- **Content Area**: Displays placeholder text, rendered Markdown, raw text, images, binary placeholders, and file-load errors.
- **Breadcrumb**: Represents the current selected file path and supports parent-path navigation.

## Navigation Flows

### Initial Load With Repository

1. User launches the CLI with a repository path.
2. The browser opens the repository viewer.
3. The app loads repository metadata.
4. If the repository is valid, the tree and git context appear.
5. If a top-level README exists, it becomes the initial content selection.

### Initial Load Without Repository

1. User launches the CLI without a repository path.
2. The browser opens in picker mode.
3. User enters a local path and submits.
4. On success, the page reloads into repository view.
5. On failure, an inline error message remains on the picker page.

### Tree Navigation

1. User expands a folder.
2. The app requests only that folder's immediate children.
3. The folder can be collapsed and re-expanded without losing the fetched children during the current session.
4. Selecting a file updates the breadcrumb and content area.

### Content Navigation

1. User opens a Markdown or text file.
2. The content area shows the file and, when applicable, a toggle between rendered and raw viewing.
3. Breadcrumb navigation can clear the current selection or move to a parent path.
4. Relative links inside rendered Markdown navigate to another in-repository file.

### Branch Navigation

1. User selects a branch from the branch dropdown.
2. The app refreshes branch-dependent queries.
3. The tree and recent-commit context reflect the selected branch.

## Error States

- Invalid repository path at launch shows a non-repository error screen.
- Invalid picker submission shows an inline picker error.
- Tree load failure shows a visible tree error state.
- File load failure shows a visible content error state.
- Missing README shows a non-fatal empty-state message in the content area.
