# Release Review: 0.9.7

**Date**: 2026-06-09  
**Feature**: `024-fix-share-toolbar`  
**Scope**: Patch release for README logo rendering and Markdown toolbar real-estate cleanup.

## Verification

- `npm run verify` passed.
- `packaging/macos/release/package-app.sh` passed and produced `GitLocal-0.9.7-macos.zip`.
- `packaging/macos/release/test-package.sh` passed.
- `npm pack --dry-run` passed for `gitlocal@0.9.7`.
- `packaging/macos/cask/validate-cask.sh packaging/macos/cask/gitlocal.rb` passed.

## Contrarian QA Notes

- README logo risk: covered by `tests/unit/readme-assets.test.ts`, which verifies the hosted raw URL maps back to the committed `ui/public/gitlocal-logo.svg` asset.
- Markdown toolbar regression risk: covered by content-panel and share-action tests that verify Find in file and Markdown share actions coexist in the same toolbar region, non-Markdown views do not gain Markdown share actions, and helper text is absent.
- Share behavior regression risk: existing Save PDF, system share, copy fallback, native command, and unavailable-browser tests still pass.
- Packaging risk: npm dry-run excludes native packaging sources and includes built server/UI assets; macOS package validation passed locally.

## Residual Risk

- The native macOS app remains unsigned/beta and will continue to show macOS first-launch security warnings until a signed/notarized release path exists.
