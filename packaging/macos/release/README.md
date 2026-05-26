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

Published GitHub releases run `.github/workflows/publish.yml`, which publishes the npm package, builds the macOS app artifact, attaches it to the release, updates the cask checksum, and commits the cask to the project-owned Homebrew tap.

The release environment must provide:

- npm trusted publishing for the package.
- `HOMEBREW_TAP_TOKEN` with write access to `ehud-am/homebrew-gitlocal`.

Manual release flow, if automation is unavailable:

1. Run `npm run verify`.
2. Run `packaging/macos/release/package-app.sh`.
3. Sign, notarize, and staple the app for public distribution.
4. Upload the final archive to the GitHub Release.
5. Compute SHA-256 from the exact uploaded archive.
6. Update the project-owned Homebrew tap cask.
7. Validate cask install, launch, upgrade, and uninstall.

## GitHub Release Attachment

Attach the app artifact to the same GitLocal release as the npm package. The app version, npm package version, release tag, artifact filename, and cask version must match.

The native artifact must not introduce a product fork. It packages the same GitLocal server and React UI used by npm, plus the small macOS wrapper needed for native launch and embedded browsing.

## Project Tap Update

After uploading the artifact and computing its checksum, update `packaging/macos/cask/gitlocal.rb` using `packaging/macos/cask/update-cask.sh`, then copy the result to the project-owned tap repository.
