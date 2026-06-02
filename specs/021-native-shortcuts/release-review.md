# Release Review: Native App Shortcuts

## Scope

- Feature: `021-native-shortcuts`
- Intended release type: PATCH
- Current package version during implementation validation: `0.9.4`
- Review date: 2026-06-01

This review covers restoring expected macOS native app command behavior for Copy, Cut, Paste, Find, and Refresh.

## Validation Log

| Check | Status | Notes |
|-------|--------|-------|
| `npm run verify` | Passed | Server tests: 10 files / 277 tests. UI tests: 20 files / 207 tests. Build and root/UI audits passed with 0 vulnerabilities. |
| `xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal -configuration Release build` | Passed | Native wrapper Release build succeeded. Xcode selected the first matching local macOS destination. |
| `packaging/macos/release/package-app.sh` | Passed | Built local artifact `packaging/macos/release/artifacts/GitLocal-0.9.4-macos.zip`; SHA-256 `c02f2454b8d7618c22a954940d0c184824d3a8781e424c4c38cfd6d9380cceba`. |
| `packaging/macos/release/test-package.sh` | Passed | Built app bundle validated on disk, code signature verified, bundled service started, and `/api/info` responded. |
| `packaging/macos/cask/validate-cask.sh` | Passed | Cask metadata validation passed for `packaging/macos/cask/gitlocal.rb`. |
| `packaging/macos/cask/test-install-cask.sh` | Passed | Local-test cask installed and uninstalled successfully against the released `0.9.4` cask metadata. Homebrew emitted tap-trust transition warnings for existing taps, but validation completed successfully. |
| `packaging/macos/release/validate-version-alignment.sh` | Passed | Root package, app bundle, artifact filename, release URL, and source cask metadata are aligned for `0.9.4`. |
| `npm pack --dry-run` | Passed | `gitlocal@0.9.4`, 15 files, 317.2 kB package, unpacked size 1.1 MB, shasum `6d109cfc06faaa62919fda2af0afca2e2de094a5`. |
| README review | Updated | README now notes native app menu and keyboard shortcut support for editing, preview Find, and Refresh. |
| CHANGELOG review | Updated | `CHANGELOG.md` includes a `0.9.4` patch entry dated 2026-06-01. |
| Version metadata review | Updated | `package.json` and `package-lock.json` are set to `0.9.4`; cask metadata remains pending final artifact checksum. |

## Contrarian QA Findings

- **Resolved: shortcut implementation is present.** Native menu/shortcut routing, preview-scoped Find behavior, and Refresh command handling have been implemented.
- **Resolved: automated and manual acceptance coverage exists.** Focused UI tests and native manual acceptance notes now cover the native command bridge, preview Find trigger, standard Edit commands, and Refresh refetch behavior.
- **Resolved: package version metadata updated.** Root package metadata now targets `0.9.4`.
- **Resolved: final macOS release artifact checksum is available and recorded.** The source cask points to the exact `v0.9.4` GitHub Release archive with SHA-256 `161efd3fe3ea64f8f5b8c2cb0fb7ebdecba92535770558faf3958099b19dcd60`.
- **Residual risk: native WebKit menu dispatch requires manual app validation.** Automated tests cover the React event bridge and preview behavior, but real AppKit/WebKit responder-chain behavior still needs the manual checklist before public release approval.

## Accessibility Review

The current branch adds no new runtime UI. For implementation, any Find control changes must remain keyboard-operable, expose visible focus state, and avoid trapping focus in the preview panel. Existing automated accessibility-oriented UI tests remain part of `npm run verify`.

## Release Documentation Review

- `specs/021-native-shortcuts/spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and `contracts/native-app-commands.md` define the intended patch scope.
- `AGENTS.md` points to `specs/021-native-shortcuts/plan.md`.
- `CHANGELOG.md` includes a dated patch entry for `0.9.4`.
- `package.json` and `package-lock.json` are updated to `0.9.4`.
- `packaging/macos/cask/gitlocal.rb` is updated from the final GitHub Release archive and SHA-256 checksum.

## Release Readiness

Released as `v0.9.4`. Implementation, tests, patch version metadata, changelog, README updates, local app packaging, GitHub Release artifact publication, source cask update, cask syntax validation, cask install/uninstall validation, version alignment, and npm package publication are complete.

## QA Blocker Traceability

- `specs/021-native-shortcuts/qa-findings.md` finding 1 maps to implementation tasks T005-T034.
- `specs/021-native-shortcuts/qa-findings.md` finding 2 maps to acceptance coverage tasks T010-T012, T018-T020, and T027-T029.
- `specs/021-native-shortcuts/qa-findings.md` finding 3 maps to release metadata and artifact tasks T037-T050.
- `specs/021-native-shortcuts/qa-findings.md` finding 4 maps to quickstart and release verification tasks T002 and T040-T047.
- `specs/021-native-shortcuts/qa-findings.md` finding 5 maps to wording cleanup task T001.
