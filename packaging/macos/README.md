# macOS Packaging

This directory contains the packaging support for the optional macOS Homebrew app distribution. It is separate from the npm package so `npm install -g gitlocal` remains lightweight and cross-platform.

The distribution strategy intentionally serves two audiences with the same app code:

- npm users get a one-command install on any platform with Node.js, with the tradeoff that a terminal process stays open.
- macOS Homebrew users get `GitLocal.app`, a native wrapper with an embedded WebKit browser and managed local service lifecycle.

Measured on the current implementation, 90.7% of the code is shared between these distributions. The Mac-specific layer owns only native windowing, lifecycle, cask metadata, packaging, and release automation.

## Scope

The first native distribution targets macOS only. Windows and Linux native app packaging remain future work; those users should continue to use the npm package and browser workflow.

## Alpha Signing Status

The native macOS app is currently alpha and unsigned. Public users should expect Apple security warning messages on first launch until signing and notarization are available.

After installing the app, approve the unsigned bundle with:

```sh
xattr -dr com.apple.quarantine /Applications/GitLocal.app
```

## Layout

```text
packaging/macos/
├── cask/      # Homebrew cask template, validation, and tap update helpers
└── release/   # App bundle layout, packaging, signing, and release validation
```

## Release Shape

The release process builds the shared GitLocal server/UI assets, builds `GitLocal.app`, packages the app with its runtime assets, creates a versioned artifact, computes the artifact checksum, and updates the project-owned Homebrew tap cask.

The app distribution should not rely on a user's global npm installation during normal launch.

The packaged native app should expose the shared viewer's current local workflows through the macOS menu where applicable, including Refresh, focused editor Undo/Redo, panel-scoped Select All, and rendered Markdown print/share forwarding. These commands remain thin WebKit-to-React command bridges; repository browsing and Markdown output behavior stay in the shared app code.
