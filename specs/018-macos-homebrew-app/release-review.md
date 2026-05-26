# Release Review: macOS Homebrew Native App

## Scope

This review covers the macOS Homebrew native app distribution scaffold and product-positioning pivot for GitLocal. GitLocal is now documented as a codebase browsing, Markdown reading, review, and lightweight editing tool for less-technical builders working with AI agents. The feature adds a Swift/WebKit wrapper, Homebrew cask metadata, package validation scripts, macOS release workflow scaffolding, npm package regression coverage, and documentation. The existing npm package remains the primary cross-platform distribution.

## Governance

- Constitution updated to permit a scoped macOS native wrapper while preserving the TypeScript/Node product core.
- Native code is isolated under `native/macos/`.
- Packaging and cask scripts are isolated under `packaging/macos/`.
- npm package contents remain controlled by `package.json` `files`.

## Validation Log

| Check | Status | Notes |
|-------|--------|-------|
| `npm run verify` | Passed | Server tests: 10 files / 277 tests. UI tests: 19 files / 205 tests. Build and audits passed with 0 vulnerabilities. |
| `npm pack --dry-run` | Passed | Package contains 14 files, including `dist` and `ui/dist`; `native/` and `packaging/` are excluded. |
| Swift app build | Passed | `xcodebuild` completed successfully with `CODE_SIGNING_ALLOWED=NO`. |
| Package validation | Passed | `test-package.sh` confirmed app executable, bundled Node runtime, service bundle, UI bundle, and version metadata. |
| Native app lifecycle validation | Passed | Built app was launched and quit via macOS app lifecycle smoke. Follow-up process-list check found no remaining app-mode GitLocal process. |
| Native app lifecycle timing | Passed | Local validation observed service readiness and viewer launch within the plan thresholds, and quit cleanup completed before the post-quit process-list check. Public release validation should record exact timings for the signed artifact. |
| Homebrew cask metadata validation | Passed | `validate-cask.sh`, `validate-artifact.sh`, and `validate-version-alignment.sh` passed for the local artifact. |
| Homebrew cask install/uninstall validation | Passed | Local artifact installed through a temporary Homebrew tap into a temporary app directory and uninstalled cleanly. |
| Release version metadata | Passed | `package.json` is set to 0.9.0, `package-app.sh` writes the same app bundle version, `validate-version-alignment.sh` checks package/app/artifact/cask alignment, and `publish.yml` rejects release tags that do not match the package version. |
| Unified npm/Homebrew release pipeline | Passed | `.github/workflows/publish.yml` publishes npm first, then builds and validates the macOS artifact, uploads the artifact/checksum to the GitHub Release, updates the cask checksum, and pushes `Casks/gitlocal.rb` to the project-owned tap using `HOMEBREW_TAP_TOKEN`. |
| Accessibility validation | Passed | Existing UI test coverage includes automated accessibility checks for key browsing surfaces. Contrarian QA reviewed the native wrapper as a distribution shell around the already-tested React UI and found no new interactive product surface beyond the WebKit container and native error dialogs. |
| Native error handling validation | Passed | Startup and missing-asset failures route through `AppErrorPresenter`; non-loopback service URLs are rejected before WebKit load; repository permission failures are surfaced by the shared GitLocal viewer; README/Homebrew docs cover blocked/unsigned macOS app launch. |
| Homebrew upgrade validation | Deferred | Requires two published versioned artifacts or a later release-candidate tap update. |
| Signing/notarization validation | Deferred | Public release should use Developer ID signing and notarization; current local artifact is unsigned test output. |
| Shared-code calculation | Passed | 90.4% shared implementation: 10,510 shared app lines and 1,117 macOS-distribution-specific lines, excluding tests, docs, and generated outputs. |

## Contrarian QA Checklist

- npm users should not download native app artifacts. Result: package allowlist and `npm pack --dry-run` confirm exclusion.
- The native app must not call a global `gitlocal` command during normal launch. Result: Swift wrapper uses bundled `Resources/runtime/node` and `Resources/gitlocal/dist/cli.js`.
- The service URL loaded by WebKit must be loopback-only. Result: `GitLocalService` rejects non-loopback hosts before loading.
- Closing the app should not leave a managed service process running. Result: launch/quit smoke plus process-list check found no remaining app-mode process.
- Native error states must be understandable. Result: startup and asset failures use native error presentation; repository permission errors stay in the shared viewer; blocked app launch is documented as a macOS security troubleshooting case.
- Accessibility must not regress. Result: shared React accessibility checks remain part of UI CI; the native wrapper adds no replacement UI for repository browsing, and native error dialogs use standard macOS controls.
- Cask checksum must match the uploaded artifact exactly. Result: local checksum validation passes; release must recompute after final uploaded artifact.
- Public release docs must state whether the artifact is signed and notarized. Result: signing/notarization docs added; current local artifact remains unsigned test output.
- Homebrew metadata must not use contributor-local absolute paths. Result: committed cask uses a GitHub Release URL; local file URLs are generated only in temporary validation casks.

## Findings

- No npm package bloat observed.
- No non-loopback URL loading path observed in the native wrapper.
- No managed service process remained after the app quit smoke.
- Release is not ready for public Homebrew promotion until a final signed/notarized artifact is uploaded and its exact checksum is placed in the tap.

## Known Limitations

- Official `homebrew/cask` submission is future work; the initial path uses a project-owned tap.
- Windows and Linux native wrappers are out of scope for this release.
- Signing/notarization requires Apple Developer credentials in the release environment.
