# Quickstart: Nested Repository Detection

## Prerequisites

- Node.js 22+
- Project dependencies installed
- A temporary plain parent folder that contains:
  - one child folder initialized as a git repository
  - one ordinary child folder that is not a repository
  - optionally, one child repository represented by a `.git` file, such as a worktree

## Verify Repository Child Detection

1. Start GitLocal from the plain parent folder.
2. Confirm the folder browser lists the repository child with a repository label or badge.
3. Open the repository child with the Open action.
4. Confirm the main viewer enters repository mode and shows repository-specific context or empty states.
5. Return to the plain parent folder and repeat by double-clicking the repository child.
6. Confirm double-click also opens repository mode.

## Verify Regular Sibling Behavior

1. Start from the same plain parent folder.
2. Select the ordinary child folder.
3. Confirm it is labeled as a folder, not a repository.
4. Open it.
5. Confirm the main viewer enters folder mode and repository-only controls are absent.

## Verify Entry-Point Consistency

1. Start GitLocal directly from the repository child folder.
2. Confirm it opens in repository mode.
3. Start GitLocal from the plain parent folder and open the same repository child.
4. Confirm it opens with the same repository classification.
5. Paste the same repository child path into the selected path field and open it.
6. Confirm it again opens with the same repository classification.

## Suggested Automated Verification

```sh
npm test
npm run lint
npm run build
```

## Expected Coverage Areas

- Local path classification for a repository child under a plain parent.
- Folder browse metadata for a plain parent containing both repository and regular child folders.
- Repository open behavior for repository child paths and regular child paths.
- Startup behavior for the same repository child opened directly.
- Picker UI behavior for repository child labels, Open action, and double-click.

## Verification Results

- Focused server behavior: `npm run test:server -- --run tests/unit/git/repo.test.ts tests/unit/handlers/folder.test.ts tests/integration/server.test.ts` had all selected tests pass, but the subset run failed global coverage because unrelated files were not exercised.
- Focused picker behavior: `npm --prefix ui run test:ci -- PickerPage.test.tsx` had all selected tests pass, but the subset run failed global coverage because unrelated files were not exercised.
- Full test suite: `npm test` passed with 265 server tests and 201 UI tests; coverage gates passed.
- Type check: `npm run lint` passed.
- Build: `npm run build` passed.
- Release gate: `npm run verify` passed for `gitlocal@0.7.2`, including tests, production build, root audit, and UI audit.
- Package dry run: `npm pack --dry-run` passed for `gitlocal@0.7.2` with 14 files and a 317.1 kB package.
- Registry version check: `npm view gitlocal@0.7.2 version` returned 404, confirming `0.7.2` is not already published.
