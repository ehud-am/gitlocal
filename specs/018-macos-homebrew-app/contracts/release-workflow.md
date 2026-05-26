# Contract: macOS App Release Workflow

## Purpose

Define the repeatable release steps for producing the npm package and macOS Homebrew app from one GitLocal version.

Both release outputs must use the same GitLocal app implementation. The macOS release adds only native wrapper, lifecycle, and package metadata around the shared server/UI.

## Inputs

- GitLocal release version.
- Built React UI assets.
- Built Node service/CLI assets.
- macOS wrapper source.
- Apple signing/notarization credentials when producing a public app.
- Project-owned Homebrew tap repository access.

## Required Outputs

- npm package release remains publishable through the existing release workflow.
- macOS app artifact attached to the GitHub Release.
- SHA-256 checksum for the uploaded app artifact.
- Updated cask metadata in the project-owned Homebrew tap.
- Release documentation covering install, upgrade, uninstall, and troubleshooting.
- Release review artifact covering npm and macOS distribution checks.

## Workflow Steps

1. Run the existing shared verification path.
2. Build shared GitLocal server and UI assets.
3. Build the macOS native wrapper.
4. Package the native app with the required shared assets/runtime.
5. Sign, notarize, and staple the app when credentials are available.
6. Create a `.dmg` or `.zip` release artifact.
7. Compute SHA-256 from the final uploaded artifact.
8. Attach the artifact to the GitHub Release.
9. Update cask metadata in the project-owned tap.
10. Verify cask install, launch, upgrade path, and uninstall on a supported macOS machine.
11. Complete release review and contrarian QA before public release approval.

## Failure Rules

- If shared verification fails, no app artifact may be published.
- If the app artifact checksum does not match cask metadata, the cask update must not be released.
- If public signing/notarization fails, the release must either stop or be explicitly marked as internal/test-only.
- If the native app cannot launch without a terminal, the macOS app release is not ready.

## Version Rules

- The npm package version, app version, release tag, app artifact filename, and cask version must match.
- Until GA, version numbers remain in the `0.x.y` range according to the constitution.
