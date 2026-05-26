# macOS Release Packaging

This directory contains the macOS app package and release validation helpers.

## Build Artifact

The package script creates a versioned archive:

```text
GitLocal-<version>-macos.zip
```

The archive contains `GitLocal.app`, which bundles:

- the Swift macOS wrapper;
- built GitLocal server assets under `Contents/Resources/gitlocal/dist`;
- built React UI assets under `Contents/Resources/gitlocal/ui/dist`;
- `package.json` for version metadata;
- a Node runtime at `Contents/Resources/runtime/node` when available.

## Public Release Flow

Pushing a version tag such as `v0.9.0` runs `.github/workflows/publish.yml`, which publishes the npm package, builds the macOS app artifact, creates the GitHub Release with the macOS artifact already attached, updates the cask checksum, and commits the cask to the project-owned Homebrew tap.

GitHub releases for this repository are immutable, so release assets must be attached when the release is created. Do not manually publish the GitHub Release before the workflow runs.

The release environment must provide:

- npm trusted publishing for the package.
- `HOMEBREW_TAP_TOKEN` with write access to `ehud-am/homebrew-gitlocal`.

Manual release flow, if automation is unavailable:

1. Run `npm run verify`.
2. Run `packaging/macos/release/package-app.sh`.
3. Sign, notarize, and staple the app for public distribution.
4. Create the GitHub Release with the final archive attached.
5. Compute SHA-256 from the exact release archive.
6. Update the project-owned Homebrew tap cask.
7. Validate cask install, launch, upgrade, and uninstall.

## GitHub Release Attachment

Create the GitHub Release with the app artifact attached in the same operation. The app version, npm package version, release tag, artifact filename, and cask version must match.

The native artifact must not introduce a product fork. It packages the same GitLocal server and React UI used by npm, plus the small macOS wrapper needed for native launch and embedded browsing.

## Project Tap Update

After creating the release artifact and computing its checksum, update `packaging/macos/cask/gitlocal.rb` using `packaging/macos/cask/update-cask.sh`, then copy the result to the project-owned tap repository.
