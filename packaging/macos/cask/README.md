# Homebrew Cask Distribution

The initial Homebrew distribution uses a project-owned tap:

```sh
brew tap ehud-am/gitlocal
brew install --cask gitlocal
```

The cask points to a versioned GitHub Release artifact and verifies it with SHA-256 before installation.

This is the native Mac distribution for builders who want GitLocal to launch like an app instead of keeping a terminal open. It runs the same GitLocal app code as the npm package inside `GitLocal.app`.

## Tap Setup

The tap repository should be named `homebrew-gitlocal` so Homebrew's short tap syntax works:

```text
ehud-am/homebrew-gitlocal
```

Expected cask path in the tap:

```text
Casks/gitlocal.rb
```

## Updating The Cask

Published GitLocal releases update this cask automatically through `.github/workflows/publish.yml`.
The repository must define a release environment secret named `HOMEBREW_TAP_TOKEN` with write access to `ehud-am/homebrew-gitlocal`.
The workflow builds the macOS artifact, uploads it to the GitHub Release, computes the artifact SHA-256, updates the cask, and commits `Casks/gitlocal.rb` to the tap.

For a manual cask update, use `update-cask.sh` from this directory:

```sh
packaging/macos/cask/update-cask.sh \
  --version 0.8.1 \
  --url https://github.com/ehud-am/gitlocal/releases/download/v0.8.1/GitLocal-0.8.1-macos.zip \
  --sha256 <sha256>
```

Then copy or commit the generated cask to the tap repository.

## Validation

Run:

```sh
packaging/macos/cask/validate-cask.sh packaging/macos/cask/gitlocal.rb
```

For local artifact validation, run:

```sh
packaging/macos/cask/test-install-cask.sh packaging/macos/cask/gitlocal.rb
```

## Uninstall

```sh
brew uninstall --cask gitlocal
```

Optional full cleanup can remove user-local app state:

```sh
brew uninstall --cask --zap gitlocal
```

The cask should keep `zap` paths limited to GitLocal-specific preferences, caches, logs, and saved application state.
