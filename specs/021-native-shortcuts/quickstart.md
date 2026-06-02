# Quickstart: Native App Shortcuts

## Prerequisites

- Node.js 22+
- npm dependencies installed at the repository root and in `ui/`
- Xcode command line tools available for macOS wrapper validation

## Build and Test Shared App

```sh
npm test
npm run build
```

## Validate macOS Wrapper Build

```sh
xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal -configuration Release build
```

## Manual Native App Acceptance

1. Launch the native macOS app with the packaged/local service.
2. Open a repository with a Markdown or source file in the preview panel.
3. Select preview text and press Command-C. Confirm the text can be pasted into an editable field.
4. Focus an editable field, select text, press Command-X, then Command-V. Confirm text is cut and restored.
5. Press Command-F and search for text visible in the preview panel. Confirm matches are limited to preview content.
6. Search for text visible only in navigation or toolbar chrome. Confirm it is not reported as a preview match.
7. Modify the visible file on disk, press Refresh, and confirm the app reflects the new content while preserving context when possible.
8. Remove the visible file on disk, press Refresh, and confirm the app shows a coherent non-stale state.

## Release Verification

```sh
npm run verify
packaging/macos/release/test-package.sh
packaging/macos/cask/test-install-cask.sh
```

Before release approval, update version metadata for the patch release, add a `CHANGELOG.md` entry, review README instructions for the native app, and complete the required contrarian QA release review.
