# Quickstart: Git Folder Detection

## Prerequisites

- Node.js 22+
- Project dependencies installed
- A temporary parent folder that contains:
  - one standard git repository
  - one plain folder outside git
  - one nested folder inside the git repository
  - optionally, one worktree or submodule-style repository with a `.git` file

## Verify Repository Root Detection

1. Start GitLocal without an explicit path so the folder picker opens.
2. Browse to the parent folder containing the git repository.
3. Confirm the repository folder is labeled as a git repository.
4. Open the repository folder with the Open button.
5. Confirm the main viewer enters repository mode and shows repository-specific context or repository empty states.
6. Return to the picker and repeat by double-clicking the repository row.
7. Confirm double-click also opens repository mode rather than merely browsing into the folder.

## Verify Plain Folder Detection

1. Browse to the same parent folder.
2. Select the plain folder that is outside any git repository.
3. Open it.
4. Confirm the main viewer enters folder mode.
5. Confirm repository-only controls are absent and regular-folder file browsing still works.

## Verify Folder-Inside-Repository Detection

1. Browse inside the git repository from the folder picker.
2. Select a nested folder that is not itself a repository root.
3. Confirm it is not labeled as a git repository.
4. Open the nested folder.
5. Confirm the main viewer enters folder mode for the selected folder.
6. Confirm repository-only controls are absent for that folder root.

## Verify Worktree or Submodule-Style Repository Root

1. Browse to a folder that is a git repository root represented by a `.git` file.
2. Confirm it is labeled as a git repository.
3. Open it.
4. Confirm GitLocal enters repository mode and shows appropriate repository context.

## Suggested Automated Verification

```sh
npm test
npm run lint
npm run build
```

## Expected Coverage Areas

- Path classification for repository root, folder inside repository, folder outside repository, missing path, file path, symlinked path, and `.git` file repository roots.
- Picker browse metadata for mixed folders.
- Repository open behavior for typed paths, Open action, and double-click.
- Active-root info responses for repository roots and folder roots.
