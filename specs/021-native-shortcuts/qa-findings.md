# QA Findings: Native App Shortcuts

## Review Scope

- Branch reviewed: `021-native-shortcuts`
- Base comparison: `origin/main...HEAD`
- Review date: 2026-06-01
- Changed files reviewed: Spec Kit planning artifacts, `AGENTS.md`, and `.specify/feature.json`
- Runtime code changed in this branch: native macOS wrapper and React viewer command handling

## Findings

### 1. Resolved: Release branch implements the requested native shortcut fixes

**Severity**: Critical  
**Status**: Resolved
**Evidence**:

- `native/macos/GitLocal/GitLocal/AppDelegate.swift` installs native Edit and View menu items.
- `native/macos/GitLocal/GitLocal/ViewerWindowController.swift` routes Copy, Cut, Paste through WebKit and dispatches native Find/Refresh events into the React viewer.
- `ui/src/App.tsx` handles native Find and Refresh events.
- `ui/src/components/ContentPanel/ContentPanel.tsx` opens preview-scoped Find from the native Find event.

**Risk**: Remaining risk is native AppKit/WebKit manual validation, not absence of implementation.

### 2. Resolved: Acceptance coverage exists for the new native shortcut behavior

**Severity**: Critical
**Status**: Resolved
**Evidence**:

- `ui/src/App.native-shortcuts.test.tsx` covers native Find and Refresh command events.
- `ui/src/components/ContentPanel/ContentPanel.test.tsx` covers native Find opening preview-scoped search and refresh-token file refetch behavior.
- `native/macos/GitLocalTests/ShortcutCommandTests.md` records manual native acceptance cases for menu and keyboard command paths.

**Risk**: Native WebKit/AppKit command regressions still require manual app validation because the UI tests cannot exercise real macOS menu dispatch.

### 3. Resolved: Patch release metadata and final artifact cask work are complete

**Severity**: Critical
**Status**: Resolved
**Evidence**:

- `package.json` and `package-lock.json` are updated to `0.9.4`.
- `CHANGELOG.md` includes a `0.9.4` patch entry.
- GitHub Release `v0.9.4` contains `GitLocal-0.9.4-macos.zip`.
- `packaging/macos/cask/gitlocal.rb` points to the final `v0.9.4` release archive with SHA-256 `161efd3fe3ea64f8f5b8c2cb0fb7ebdecba92535770558faf3958099b19dcd60`.

### 4. Resolved: Quickstart release verification now covers the required release checks

**Severity**: High  
**Status**: Resolved  
**Evidence**:

- `specs/021-native-shortcuts/quickstart.md` now lists the full local validation set, including app packaging, package validation, cask validation, cask install testing, version alignment, and npm package dry run.
- The final cask checksum is explicitly tied to the final GitHub Release archive.

### 5. Resolved: The spec uses patch-release wording

**Severity**: Medium  
**Status**: Resolved  
**Evidence**:

- `specs/021-native-shortcuts/spec.md` now uses "patch release" wording for the requested semver scope.

## Checks Reviewed

Run during implementation validation:

- `npm run verify` passed.
- `xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal -configuration Release build` passed.
- `packaging/macos/release/package-app.sh` passed and built `GitLocal-0.9.4-macos.zip`.
- `packaging/macos/release/test-package.sh` passed.
- `packaging/macos/cask/validate-cask.sh` passed.
- `packaging/macos/cask/test-install-cask.sh` passed against released `0.9.4` cask metadata.
- `packaging/macos/release/validate-version-alignment.sh` passed after the source cask update.
- `npm pack --dry-run` passed for `gitlocal@0.9.4`.

## Release Recommendation

Approve public patch release `0.9.4`. Product code, focused tests, local app packaging, versioning, changelog, documentation, GitHub Release artifact publication, source cask update, cask syntax validation, cask install validation, version alignment, and npm package publication are complete.
