# Quickstart: Mac Markdown Open Preview

## 1. Run shared verification

```sh
npm test
npm run lint
npm run build
```

## 2. Verify server open-file behavior

Use tests or a local dev run to confirm opening a file path resolves:

- repository-root context for files inside a repository
- parent-folder context for files outside a repository
- relative `selectedPath`
- `selectedPathType: file`
- readable error messages for missing or unreadable files

Representative cases:

- `README.md` at repository root
- `docs/guide.md` inside a repository
- `notes.md` in a non-git folder
- path with spaces
- missing file path

## 3. Verify React viewer startup and folder layout behavior

Automated UI coverage should confirm:

- native/startup selected file overrides saved viewer selected file
- requested Markdown opens rendered, not raw
- visible tree selection matches requested file when the file is visible
- ordinary folder pages show the folder tree before README on the same page
- no top-level tree/README tab is required to discover navigation
- README quick link appears when a README exists and scrolls to the README section
- README quick link is hidden when no README exists
- dotfiles are visible by default
- dotfile checkbox hides and shows `.*` files without resetting active folder or selected file
- selecting a neighboring file updates preview
- failed open request does not show stale content

## 4. Verify macOS wrapper build

```sh
xcodebuild -project native/macos/GitLocal/GitLocal.xcodeproj -scheme GitLocal -configuration Release build
```

Confirm the app advertises Markdown open capability and can offer default-reader setup without changing the default association before user consent.

## 5. Verify first-run opt-in manually

1. Build or install the macOS app.
2. Launch GitLocal in a fresh user state.
3. Confirm GitLocal asks before becoming the default Markdown reader.
4. Decline the prompt and confirm the default Markdown reader is unchanged.
5. Reset the fresh user state, launch again, accept the prompt, and confirm the association changes only after acceptance.

## 6. Verify Finder workflow manually

1. After opting in, double-click a local `.md` file in Finder.
2. Confirm GitLocal opens or activates.
3. Confirm the containing folder/repository is active.
4. Confirm the requested file is selected and rendered in preview.
5. Double-click a second `.md` file while GitLocal is running.
6. Confirm the viewer switches to the second file and does not require a restart.
7. Open the containing folder view and confirm the tree appears above README.
8. Use the README quick link and confirm it jumps to the README section.
9. Toggle the dotfile checkbox and confirm dotfiles hide/show without changing the selected file.

## 7. Verify package/cask impact if releasing

Run existing macOS package/cask validation scripts when packaging metadata changes:

```sh
packaging/macos/release/test-package.sh
packaging/macos/cask/test-install-cask.sh
```

Release tasks must also update `CHANGELOG.md`, review `README.md`, and complete the required release QA flow before shipping.
