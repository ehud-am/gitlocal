# Research: macOS Homebrew Native App

## Decision: Use a Swift macOS wrapper for the native app shell

**Rationale**: The wrapper's job is native macOS lifecycle, windowing, embedded web rendering, app menu behavior, and local child-process cleanup. Swift with AppKit/WebKit is the direct macOS-native path for that responsibility and avoids shipping Chromium or adding Electron to the npm package.

**Alternatives considered**:

- Electron: mature and cross-platform, but too heavy for this product direction and would make a native distribution less differentiated.
- Go wrapper: good for process logic, but macOS WebKit integration would require less idiomatic bridging and still need native UI plumbing.
- Browser-only npm flow: already supported, but does not satisfy the requested no-terminal Mac app experience.

## Decision: Keep the native app self-contained for normal use

**Rationale**: The app should not depend on a user's global npm installation because global Node/npm paths vary across Homebrew Node, nvm, fnm, Volta, corporate managed systems, and shell startup behavior. Bundling the built GitLocal service/UI assets and a controlled runtime path makes installation and launch more predictable.

**Alternatives considered**:

- Call the globally installed `gitlocal` command: smaller app, but fragile across shell managers and version skew.
- Require `brew install node` and run from source: smaller artifact, but converts app launch into a runtime assembly problem and increases support burden.
- Compile the server into a native executable: possible later, but riskier for dynamic package assets and not needed for the first cask.

## Decision: Use a project-owned Homebrew tap for the first release

**Rationale**: Homebrew's tap model is built for third-party package repositories. Official docs recommend GitHub tap repos use the `homebrew-` prefix so users can tap them with the short command form, and a tap can carry project-specific casks before the app meets official repository notability and maintenance expectations. See Homebrew's tap documentation: https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap and https://docs.brew.sh/Taps.

**Alternatives considered**:

- Submit immediately to `homebrew/cask`: better user command eventually, but official acceptance has additional criteria and review expectations documented in https://docs.brew.sh/Acceptable-Casks.
- Store cask only in the main repo: useful as a template, but users need a Homebrew tap repo or official cask repo for normal install/update behavior.

## Decision: Use a cask, not a formula, for the macOS app

**Rationale**: The deliverable is a Mac app bundle installed as a GUI-style native app. Homebrew casks are the documented packaging model for app artifacts such as `.app`, `.dmg`, and `.zip` distributions. Cask metadata includes artifact URL, version, checksum, name, description, homepage, and app artifact handling. See Homebrew's Cask Cookbook: https://docs.brew.sh/Cask-Cookbook.

**Alternatives considered**:

- Formula only: appropriate for CLI/source-built tools, but this feature is an app bundle.
- Formula plus cask in the first release: possible later, but the existing npm package already covers the CLI/browser distribution.

## Decision: Publish versioned app artifacts from GitHub Releases

**Rationale**: Homebrew casks should point at a stable, versioned download and verify the artifact with SHA-256. GitHub Releases already match the project's release workflow and provide a natural place to attach `GitLocal-<version>-macos-<arch>.dmg` or `.zip` assets.

**Alternatives considered**:

- Download from npm package: cask would depend on npm packaging and still need app bundle assembly at install time.
- Store artifacts in the tap repository: bloats the tap and mixes package metadata with binary release assets.

## Decision: Support one universal macOS artifact if practical, otherwise separate Apple Silicon and Intel artifacts

**Rationale**: A universal artifact gives users and the cask a simpler install path. Separate architecture artifacts are acceptable if universal packaging adds release complexity, but the cask contract must then select the correct artifact consistently.

**Alternatives considered**:

- Apple Silicon only: simpler, but excludes supported Intel Mac users.
- Rosetta-only Intel app: weaker native experience on Apple Silicon.

## Decision: Treat signing/notarization as required for public Homebrew distribution

**Rationale**: Public macOS app distribution should avoid scary Gatekeeper flows and should be transparent about trust status. The release workflow should sign, notarize, and staple when credentials are available. Internal testing may use unsigned artifacts, but the cask documentation must say so clearly.

**Alternatives considered**:

- Unsigned public app: faster to ship but creates avoidable user friction and trust concerns.
- Mac App Store: not aligned with the open-source local developer tool distribution model.

## Decision: Preserve npm package contents and commands

**Rationale**: The new distribution channel is additive. Keeping native packaging outside the npm package prevents size increases and avoids changing existing cross-platform behavior.

**Alternatives considered**:

- Add native app assets to the npm package: makes `npm install -g gitlocal` heavier and platform-specific.
- Replace npm with Homebrew on macOS: breaks existing users and automation.

## Decision: Position GitLocal around AI-driven codebase browsing and review

**Rationale**: The target user is a less-technical builder collaborating with AI agents. In that workflow, humans often need to understand, inspect, and lightly intervene in codebases rather than spend most of their time writing source directly. GitLocal should make browsing, Markdown reading, and review feel primary while preserving editing as an available but secondary capability.

**Alternatives considered**:

- Full IDE positioning: mismatched for users who mainly need codebase understanding and review around AI-generated changes.
- Read-only viewer positioning: too limiting because users still need occasional lightweight edits.
- Developer-only CLI positioning: excludes the native app value and less-technical builder audience.
