# Quickstart: Accurate Version Display and Code Line Numbers

## Prerequisites

- Install dependencies with `npm ci` and `npm --prefix ui ci`.
- Run GitLocal from the repository root or from a test repository with code files and markdown files.

## Validation Flow

1. Start the app and open either the picker screen or a repository screen.
2. Confirm the footer shows `v0.4.2` for this release instead of `v0.0.0`.
3. Open a repository view and confirm the same footer version remains visible there.
4. Open a syntax-highlighted code file and verify a left-side line number gutter appears.
5. Open a markdown file with a fenced code block and verify the code block shows the same left-side line number gutter without changing prose-only markdown content.
6. Switch to raw view for a code-like file and verify line numbers remain visible and aligned there.
7. Open a non-code presentation such as an image or prose-only content and confirm no irrelevant line-number gutter is introduced.

## Automated Checks

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
