# Contract: Homebrew Cask Distribution

## Purpose

Define the project-owned Homebrew cask behavior for installing the macOS native app.

The cask is the macOS-native distribution path for users who want the same GitLocal app code wrapped as `GitLocal.app` instead of running the npm package from a terminal.

## Initial Install

### Command Shape

Initial release via project-owned tap:

```sh
brew tap ehud-am/gitlocal
brew install --cask gitlocal
```

Direct cask install form may also be supported if the tap layout allows it:

```sh
brew install --cask ehud-am/gitlocal/gitlocal
```

### Expected Result

- Homebrew downloads the versioned GitLocal macOS app artifact.
- Homebrew verifies the artifact checksum before installation.
- Homebrew installs `GitLocal.app` as a launchable macOS app.
- Installation does not require `npm install -g gitlocal`.

## Upgrade

### Command Shape

```sh
brew update
brew upgrade --cask gitlocal
```

### Expected Result

- Homebrew resolves the newer cask metadata.
- Homebrew downloads the newer release artifact.
- Homebrew verifies the checksum.
- Homebrew replaces the installed app.
- Relaunching the app shows the newer GitLocal version.

## Uninstall

### Command Shape

```sh
brew uninstall --cask gitlocal
```

### Expected Result

- Homebrew removes the installed app bundle.
- Optional full cleanup behavior is documented for user-local preferences/caches.

## Cask Metadata Requirements

The cask must define:

- cask token;
- version;
- SHA-256 checksum;
- artifact URL;
- app name;
- description;
- homepage;
- app artifact.

## Artifact Requirements

- Artifact URL points to a GitHub Release asset for the same GitLocal version.
- SHA-256 matches the exact uploaded artifact.
- Artifact contains the app bundle and required packaged assets.
- Artifact signing/notarization status is documented in the release notes.

## Out Of Scope

- Official `homebrew/cask` acceptance in the first release.
- Windows or Linux package manager distribution.
- Installing or updating the npm package as part of the cask.
