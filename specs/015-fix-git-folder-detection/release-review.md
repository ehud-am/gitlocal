# Release Review: v0.7.1

**Date**: 2026-05-19
**Scope**: Patch release for stable local path classification and repository-folder opening behavior.

## Decision

Release candidate is approved for `v0.7.1` after verification passes.

## Contrarian QA Findings

- Repository root detection now depends on Git top-level resolution plus canonical path comparison, which covers ordinary repositories, worktrees with `.git` files, symlinked paths, nested folders inside repositories, and folders outside repositories.
- The highest-risk regression is misrouting a regular folder inside a repository as a repository. Unit and UI coverage now assert `inside-repository` plus `openMode: folder` for that case.
- Plain folders outside Git remain supported as folder roots and do not expose repository branch or commit metadata.
- The picker behavior intentionally differs by row type: repository roots open the repository viewer, while ordinary folders continue browsing or opening as folder roots.
- Release audit initially surfaced a patched `ws` advisory through the UI test dependency tree. The UI override now pins `ws` to a patched range.

## Required Checks

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run verify`
- `npm pack --dry-run`

## Residual Risk

No known release blockers. The main residual risk is platform-specific path canonicalization, covered by using Node filesystem realpath behavior and Git's own root resolution instead of string-only path inference.
