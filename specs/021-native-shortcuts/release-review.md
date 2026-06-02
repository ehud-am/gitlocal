# Release Review: Native App Shortcuts

## Scope

- Feature: `021-native-shortcuts`
- Intended release type: PATCH
- Current package version during pre-release validation: `0.9.3`
- Review date: 2026-06-01

This review covers the specification and implementation-plan branch for restoring expected macOS native app command behavior for Copy, Cut, Paste, Find, and Refresh. The branch currently contains planning artifacts only. It does not yet contain the Swift/WebKit or shared UI implementation for the shortcut fixes.

## Validation Log

| Check | Status | Notes |
|-------|--------|-------|
| `npm run verify` | Passed | Server tests: 10 files / 277 tests. UI tests: 19 files / 203 tests. Build and root/UI audits passed with 0 vulnerabilities. |
| `xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal -configuration Release build` | Passed | Native wrapper Release build succeeded. Xcode selected the first matching local macOS destination. |
| `packaging/macos/release/test-package.sh` | Passed | Existing packaged app bundle validated on disk, code signature verified, bundled service started, and `/api/info` responded. |
| `packaging/macos/cask/validate-cask.sh` | Passed | Cask metadata validation passed for `packaging/macos/cask/gitlocal.rb`. |
| `packaging/macos/cask/test-install-cask.sh` | Passed | Local-test cask installed and uninstalled successfully. Homebrew emitted tap-trust transition warnings for existing taps, but the validation completed successfully. |
| `packaging/macos/release/validate-version-alignment.sh` | Passed | Existing release metadata is aligned for `0.9.3`. |
| `npm pack --dry-run` | Passed | Package dry run produced `gitlocal-0.9.3.tgz` with 15 files and expected built server/UI contents. |
| README review | Passed with no change | README does not need shortcut-specific documentation before implementation because this patch restores expected native app platform behavior rather than adding a new user workflow. |
| CHANGELOG review | Pending implementation | No `0.9.4` changelog entry was added because the branch has not implemented the user-visible fix yet. |
| Version metadata review | Pending implementation | `package.json`, `package-lock.json`, and cask metadata remain at `0.9.3`; they should advance only when the patch implementation and final artifact are ready. |

## Contrarian QA Findings

- **Release blocker: shortcut implementation is absent.** The branch defines the feature and plan, but no native app command routing, preview-scoped Find behavior, or Refresh behavior changes have been implemented yet.
- **Release blocker: no implemented acceptance tests for the new behavior exist yet.** The current passing test suite proves the existing app remains healthy, not that Command-C, Command-X, Command-V, Command-F, and Refresh have been fixed in the native app.
- **Release blocker: version metadata is intentionally unchanged.** Advancing to the next patch version before implementation would make local package/cask validation misleading and could desynchronize final cask checksum work.
- **Release blocker: final macOS release artifact checksum is not available.** The project cask must be updated from the exact final GitHub Release archive, not from a planning-only branch.
- **Residual risk: native Find behavior can accidentally search app chrome.** Implementation must explicitly verify preview-only matching, including cases where the sidebar or toolbar contains the same text as the query.
- **Residual risk: native command routing can break focused text controls.** Implementation must preserve standard text-field behavior inside dialogs and editable fields before adding generic preview handling.
- **Residual risk: Refresh can hide stale state bugs.** Implementation must cover changed, deleted, and concurrently refreshed files.

## Accessibility Review

The current branch adds no new runtime UI. For implementation, any Find control changes must remain keyboard-operable, expose visible focus state, and avoid trapping focus in the preview panel. Existing automated accessibility-oriented UI tests remain part of `npm run verify`.

## Release Documentation Review

- `specs/021-native-shortcuts/spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and `contracts/native-app-commands.md` define the intended patch scope.
- `AGENTS.md` points to `specs/021-native-shortcuts/plan.md`.
- `CHANGELOG.md` should receive a dated patch entry after the implementation is complete.
- `package.json` and `package-lock.json` should advance to the next patch version after implementation validation.
- `packaging/macos/cask/gitlocal.rb` should be updated only after the final GitHub Release archive and SHA-256 checksum exist.

## Release Readiness

Not release-ready. The pre-release validation environment is healthy, but the branch is a planning branch. Public release approval should wait for implementation, tests, patch version bump, changelog update, README re-review, final artifact validation, and cask checksum update.
