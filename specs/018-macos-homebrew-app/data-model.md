# Data Model: macOS Homebrew Native App

## macOS Native App Distribution

Represents the installed GitLocal Mac app.

**Fields**:

- `appName`: Display name shown by macOS.
- `version`: GitLocal release version embedded in the app.
- `buildNumber`: Native app build identifier for diagnostics.
- `supportedArchitectures`: Supported macOS CPU architectures.
- `minimumMacOSVersion`: Oldest supported macOS version.
- `bundleIdentifier`: Stable macOS app identifier.
- `installedLocation`: Homebrew-managed app install location.
- `signingStatus`: Signed, notarized, unsigned, or unknown.
- `packagedRuntime`: Runtime strategy included with the app for starting the GitLocal service.

**Validation Rules**:

- `version` must match the GitLocal release version for the attached artifact.
- `bundleIdentifier` must remain stable across upgrades.
- `installedLocation` must be compatible with Homebrew cask app installation.
- Public cask documentation must clearly state signing/notarization status.

## Local App Session

Represents one running native app instance and its managed local service.

**Fields**:

- `sessionId`: Local diagnostic identifier for the app launch session.
- `servicePort`: Loopback port selected for the GitLocal service.
- `servicePid`: Process identifier for the child service.
- `viewerUrl`: Local URL loaded in the embedded web view.
- `selectedRepositoryPath`: Repository or folder currently opened, when known.
- `state`: Launching, running, stopping, stopped, or failed.
- `failureReason`: User-facing failure reason when startup or shutdown fails.

**Validation Rules**:

- `viewerUrl` must use a loopback host.
- `servicePort` must not be exposed on external network interfaces by default.
- A normal quit must transition through `stopping` to `stopped`.
- Failed sessions must provide actionable user-facing feedback.

**State Transitions**:

```text
notStarted -> launching -> running -> stopping -> stopped
notStarted -> launching -> failed
running -> failed
failed -> stopped
```

## Release Artifact

Represents the downloadable app package consumed by Homebrew.

**Fields**:

- `version`: GitLocal release version.
- `artifactName`: Release asset filename.
- `artifactUrl`: Stable download URL.
- `architecture`: Universal, Apple Silicon, or Intel.
- `sha256`: Integrity value used by Homebrew.
- `sizeBytes`: Artifact size for release review.
- `createdAt`: Release artifact creation time.
- `signingStatus`: Signing/notarization result for this artifact.

**Validation Rules**:

- `artifactUrl` must include the release version.
- `sha256` must be computed from the exact release artifact.
- `version` must match the npm package release version for the same GitLocal release.
- Public cask artifacts must be reproducible through the documented release workflow.

## Homebrew Package Metadata

Represents the cask definition in the project-owned tap.

**Fields**:

- `token`: Homebrew cask token.
- `version`: GitLocal app version.
- `sha256`: Expected artifact checksum.
- `url`: Release artifact URL.
- `name`: Human-readable app name.
- `description`: Short package description.
- `homepage`: Project homepage.
- `artifacts`: Installed app artifacts.
- `uninstallBehavior`: Cleanup behavior exposed to Homebrew.
- `zapPaths`: Optional user-local cleanup paths for full removal.

**Validation Rules**:

- `version`, `sha256`, and `url` must match the uploaded release artifact.
- `artifacts` must install the app bundle.
- `homepage` must point to the GitLocal project.
- The cask must install without requiring the npm package.

## Distribution Channel

Represents a supported way to install GitLocal.

**Fields**:

- `channelName`: npm or Homebrew macOS app.
- `targetPlatforms`: Platforms supported by this channel.
- `installCommand`: User-facing install command.
- `upgradeCommand`: User-facing upgrade command.
- `uninstallCommand`: User-facing uninstall command.
- `runtimeMode`: Browser-based CLI or native app wrapper.

**Validation Rules**:

- The npm channel must continue to work on supported existing platforms.
- The Homebrew channel is scoped to macOS for this release.
- Both channels for the same release must present the same GitLocal product version.

## Shared Implementation Metric

Represents the measured implementation overlap between the npm and macOS native distributions.

**Fields**:

- `sharedLineCount`: Lines in shared product app code.
- `distributionSpecificLineCount`: Lines in native wrapper, cask, packaging, and release workflow code/config.
- `sharedPercentage`: Shared lines divided by shared plus distribution-specific lines.
- `measurementScope`: Included and excluded paths.

**Current Measurement**:

- `sharedLineCount`: 10,510 lines in `src/` and `ui/src/`.
- `distributionSpecificLineCount`: 1,117 lines in `native/macos/GitLocal/`, `packaging/macos/`, `.github/workflows/macos-app-release.yml`, and `.github/workflows/publish.yml`.
- `sharedPercentage`: 90.4%.
- `measurementScope`: Excludes tests, Markdown documentation, and generated build outputs.
