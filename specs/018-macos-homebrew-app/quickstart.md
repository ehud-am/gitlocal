# Quickstart: macOS Homebrew Native App

## Prerequisites

- macOS on a supported architecture.
- Homebrew installed.
- Access to the GitLocal GitHub Releases artifact for the target version.
- Project-owned Homebrew tap available.
- For public release validation: signed/notarized app artifact or explicit documented exception for internal testing.

## Development Validation

1. Build the existing shared product.

   ```sh
   npm run verify
   ```

2. Build the macOS native app wrapper.

   ```sh
   xcodebuild \
     -project native/macos/GitLocal/GitLocal.xcodeproj \
     -scheme GitLocal \
     -configuration Release \
     -derivedDataPath native/macos/build \
     CODE_SIGNING_ALLOWED=NO
   ```

3. Launch the built app.

   ```sh
   open native/macos/build/Build/Products/Release/GitLocal.app
   ```

4. Confirm:

   - no terminal window is required after launch;
   - GitLocal viewer appears in a native window;
   - displayed version matches the package version;
   - closing/quitting the app stops the managed local service;
   - npm/browser mode still works independently.

## Packaging Validation

1. Produce the macOS app release artifact.

   ```sh
   packaging/macos/release/package-app.sh
   ```

2. Compute checksum.

   ```sh
   shasum -a 256 packaging/macos/release/artifacts/GitLocal-<version>-macos.zip
   ```

3. Update the cask metadata with the artifact URL, version, and checksum.

4. Install through the project tap on a clean Mac.

   ```sh
   brew tap ehud-am/gitlocal
   brew install --cask gitlocal
   ```

5. Launch GitLocal from macOS and confirm the viewer opens.

6. Uninstall.

   ```sh
   brew uninstall --cask gitlocal
   ```

## Upgrade Validation

1. Install the previous cask version.
2. Publish or locally expose the newer cask metadata.
3. Run:

   ```sh
   brew update
   brew upgrade --cask gitlocal
   ```

4. Relaunch GitLocal and confirm the app reports the newer version.

Timing method for SC-006:

- Start the timer after `brew upgrade --cask gitlocal` begins downloading the newer package metadata.
- Stop the timer after the upgraded app launches and the visible GitLocal version matches the newer release.
- Supported release validation passes when this completes in under 2 minutes on the documented supported macOS test machine after the package is available.

## npm Regression Validation

1. Install or run the npm package using the existing workflow.

   ```sh
   npm install -g gitlocal
   gitlocal
   ```

2. Confirm the browser-based GitLocal workflow is unchanged.

3. Confirm the npm package allowlist excludes native packaging artifacts.

   ```sh
   npm pack --dry-run
   ```

   Expected: the file list includes `dist` and `ui/dist`, and does not include `native/` or `packaging/`.

## Shared Code Measurement

The current implementation is 90.4% shared between the npm and macOS native distributions.

Measurement scope:

- Shared app code: 10,510 lines in `src/` and `ui/src/`.
- macOS distribution-specific code/config: 1,117 lines in `native/macos/GitLocal/`, `packaging/macos/`, `.github/workflows/macos-app-release.yml`, and `.github/workflows/publish.yml`.
- Excluded from the calculation: tests, Markdown documentation, generated build outputs, and historical release/spec artifacts.

Formula:

```text
10510 / (10510 + 1117) = 90.4%
```

## Success Criteria Measurement

- **SC-001 install and launch timing**: Run on a supported macOS machine with Homebrew already installed. Start timing when `brew install --cask gitlocal` is invoked and stop when the native GitLocal viewer is visible. Pass threshold: under 3 minutes.
- **SC-006 upgrade timing**: Run on a supported macOS machine with the previous cask version installed. Start timing when `brew upgrade --cask gitlocal` is invoked after the newer package is available and stop when the relaunched app shows the newer GitLocal version. Pass threshold: under 2 minutes.
- **SC-007 guided documentation validation**: Ask at least 10 first-time validation participants or internal release reviewers to follow only the README/Homebrew docs for install, launch, upgrade, and uninstall. Pass threshold: at least 9 of 10 complete the flow without additional support. If fewer than 10 reviewers are available for a dot release, record the sample size and treat the result as limited internal validation rather than a public-readiness claim.

## Implementation Validation Results

- Governance amendment: completed in `.specify/memory/constitution.md`.
- US1 native launch/install validation: passed with `xcodebuild`, `packaging/macos/release/package-app.sh`, app launch/quit smoke, and local Homebrew cask install/uninstall using a temporary tap and app directory.
- npm regression validation: passed with `npm run verify` and `npm pack --dry-run`; the dry-run package includes `dist` and `ui/dist` and excludes `native/` and `packaging/`.
- Homebrew cask validation: passed with `validate-cask.sh`, `validate-artifact.sh`, `validate-version-alignment.sh`, and local cask install/uninstall against the generated release artifact.

## Governance Check

The constitution has been amended to permit:

- an additional macOS Homebrew native app distribution;
- a small Swift macOS wrapper around the existing TypeScript/Node product core;
- native app packaging and release validation outside the npm package.
