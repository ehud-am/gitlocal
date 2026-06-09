# Quickstart: README Logo and Markdown Toolbar Polish

## Prerequisites

- Node.js 22+
- npm dependencies installed at the repository root and in `ui/`

## Verification Steps

1. Confirm the README logo path references a repository-tracked asset:

   ```sh
   rg -n "gitlocal-logo" README.md
   test -f ui/public/gitlocal-logo.svg
   ```

2. Run focused UI tests after implementation:

   ```sh
   npm --prefix ui run test:ci -- ContentPanel.test.tsx MarkdownShareActions.test.tsx
   ```

3. Run the project type check:

   ```sh
   npm run lint
   ```

4. Open a rendered Markdown file in GitLocal.

5. Verify the Markdown toolbar:

   - Find in File and sharing actions are on the same row or compact toolbar region.
   - There is no dedicated sharing-only row.
   - The sentence "Sharing uses the saved Markdown content." is absent.
   - Find in File still opens, searches, navigates matches, and closes.
   - Existing share/copy/save/download actions still work where supported.

6. Resize the window to representative desktop and narrow widths.

7. Confirm controls remain readable or accessible without overlapping the Markdown content.

## Full Verification

Before release or merge, run:

```sh
npm test
npm run build
```
