# Tasks: macOS Homebrew Native App

**Input**: Design documents from `specs/018-macos-homebrew-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: Test and validation tasks are included because this feature introduces release packaging, native lifecycle behavior, and distribution contracts that must be independently verified.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish governance and repository structure needed before native packaging work can begin.

- [X] T001 Amend `.specify/memory/constitution.md` to permit a macOS Homebrew native app wrapper while preserving the TypeScript/Node product core and npm distribution
- [X] T002 Update `AGENTS.md` code style guidance to remove the obsolete blanket "No Go, no Makefile, no shell scripts" conflict for the scoped Swift wrapper and packaging scripts
- [X] T003 [P] Create macOS wrapper documentation scaffold in `native/macos/README.md`
- [X] T004 [P] Create packaging documentation scaffold in `packaging/macos/README.md`
- [X] T005 [P] Create Homebrew tap/cask documentation scaffold in `packaging/macos/cask/README.md`
- [X] T006 [P] Create release workflow documentation scaffold in `packaging/macos/release/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared contracts, runtime boundaries, and packaging assumptions that all user stories rely on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Define the app/runtime bundle layout contract in `packaging/macos/release/bundle-layout.md`
- [X] T008 Define the native app launch and shutdown state contract in `native/macos/README.md`
- [X] T009 Define the local service launch command contract in `packaging/macos/release/service-launch.md`
- [X] T010 Create a cask template with placeholder version, URL, checksum, app artifact, and zap guidance in `packaging/macos/cask/gitlocal.rb.template`
- [X] T011 Create a release artifact naming convention document in `packaging/macos/release/artifact-naming.md`
- [X] T012 Create a signing and notarization decision document in `packaging/macos/release/signing-notarization.md`
- [X] T013 [P] Add native app build outputs to `.gitignore` without ignoring source files under `native/macos/`
- [X] T014 [P] Add macOS packaging output patterns to `.gitignore` for generated `.app`, `.dmg`, `.zip`, checksum, and staging artifacts
- [X] T015 [P] Document unsupported Windows/Linux native packaging scope in `packaging/macos/README.md`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Install GitLocal as a macOS App (Priority: P1) MVP

**Goal**: A macOS user can install GitLocal through Homebrew and launch it as a native app without keeping a terminal open.

**Independent Test**: Install the cask on a supported Mac, launch `GitLocal.app`, confirm the viewer opens in a native window, then quit and confirm the managed local service stops.

### Tests for User Story 1

- [X] T016 [P] [US1] Add native lifecycle test plan covering launch, loopback URL load, error display, quit cleanup, and relaunch in `native/macos/GitLocalTests/LifecycleTests.md`
- [X] T017 [P] [US1] Add cask install smoke test script for local artifacts in `packaging/macos/cask/test-install-cask.sh`
- [X] T018 [P] [US1] Add packaging smoke test script for bundle contents, version metadata, and required assets in `packaging/macos/release/test-package.sh`

### Implementation for User Story 1

- [X] T019 [US1] Create the Swift macOS app project skeleton in `native/macos/GitLocal/GitLocal.xcodeproj`
- [X] T020 [US1] Create the Swift app entry point in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [X] T021 [US1] Implement the native viewer window with WebKit in `native/macos/GitLocal/GitLocal/ViewerWindowController.swift`
- [X] T022 [US1] Implement managed local service process startup in `native/macos/GitLocal/GitLocal/GitLocalService.swift`
- [X] T023 [US1] Implement loopback readiness detection before loading the viewer in `native/macos/GitLocal/GitLocal/GitLocalService.swift`
- [X] T024 [US1] Implement native startup and failure messages in `native/macos/GitLocal/GitLocal/AppErrorPresenter.swift`
- [X] T025 [US1] Implement app quit cleanup for the managed local service in `native/macos/GitLocal/GitLocal/AppDelegate.swift`
- [X] T026 [US1] Add app version display metadata sourced from the GitLocal release version in `native/macos/GitLocal/GitLocal/Info.plist`
- [X] T027 [US1] Add packaged asset lookup for the bundled server and UI assets in `native/macos/GitLocal/GitLocal/BundlePaths.swift`
- [X] T028 [US1] Add package assembly script for local unsigned test builds in `packaging/macos/release/package-app.sh`
- [X] T029 [US1] Add the generated cask file for local/tap use in `packaging/macos/cask/gitlocal.rb`
- [X] T030 [US1] Run and document the US1 launch/install validation results in `specs/018-macos-homebrew-app/quickstart.md`

**Checkpoint**: User Story 1 is functional as the MVP native app installation path.

---

## Phase 4: User Story 2 - Preserve the Existing npm Distribution (Priority: P2)

**Goal**: The npm-installed GitLocal workflow remains unchanged while the macOS app distribution is added.

**Independent Test**: Run the existing npm install/run smoke path and confirm browser-based GitLocal behavior still works without native app assets in the npm package.

### Tests for User Story 2

- [X] T031 [P] [US2] Add npm package contents regression check for excluding native packaging artifacts in `tests/integration/npm-package-contents.test.ts`
- [X] T032 [P] [US2] Add CLI browser-mode regression coverage for unchanged npm launch behavior in `tests/integration/server.test.ts`
- [X] T033 [P] [US2] Add documentation regression checklist for npm install/run behavior in `specs/018-macos-homebrew-app/quickstart.md`

### Implementation for User Story 2

- [X] T034 [US2] Ensure `package.json` files list remains limited to npm runtime assets and excludes `native/` and `packaging/`
- [X] T035 [US2] Add or update npm package smoke command documentation in `README.md`
- [X] T036 [US2] Add macOS app distribution documentation next to existing npm install guidance in `README.md`
- [X] T037 [US2] Add npm/native distribution comparison notes in `README.md`
- [X] T038 [US2] Run `npm run verify` and record the npm regression result in `specs/018-macos-homebrew-app/quickstart.md`
- [X] T039 [US2] Run `npm pack --dry-run` and record that native packaging artifacts are excluded in `specs/018-macos-homebrew-app/quickstart.md`

**Checkpoint**: Existing npm users and non-macOS users remain unaffected by the native app work.

---

## Phase 5: User Story 3 - Upgrade the Native App Through Homebrew (Priority: P3)

**Goal**: A macOS user can upgrade GitLocal through Homebrew and receive a version-matched native app artifact.

**Independent Test**: Install a previous cask version, update the cask metadata to a newer release artifact, run Homebrew upgrade, and confirm the app reports the newer GitLocal version.

### Tests for User Story 3

- [X] T040 [P] [US3] Add cask metadata validation script for version, URL, sha256, homepage, and app artifact fields in `packaging/macos/cask/validate-cask.sh`
- [X] T041 [P] [US3] Add release artifact checksum validation script in `packaging/macos/release/validate-artifact.sh`
- [X] T042 [P] [US3] Add Homebrew upgrade smoke test instructions in `packaging/macos/cask/upgrade-test.md`

### Implementation for User Story 3

- [X] T043 [US3] Add cask update helper script that applies version, artifact URL, and checksum to `packaging/macos/cask/update-cask.sh`
- [X] T044 [US3] Add GitHub Actions workflow skeleton for macOS app artifact build and upload in `.github/workflows/macos-app-release.yml`
- [X] T045 [US3] Add release workflow notes for attaching the app artifact and updating the project tap in `packaging/macos/release/README.md`
- [X] T046 [US3] Add signing/notarization environment variable documentation in `packaging/macos/release/signing-notarization.md`
- [X] T047 [US3] Add version alignment checks for package version, app version, release tag, artifact filename, and cask version in `packaging/macos/release/validate-version-alignment.sh`
- [X] T048 [US3] Run and document cask validation, checksum validation, and upgrade validation results in `specs/018-macos-homebrew-app/quickstart.md`

**Checkpoint**: Homebrew upgrades can move a user from one native app release to the next with verified artifact integrity.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Release readiness, documentation, and cross-channel validation.

- [X] T049 [P] Update `CHANGELOG.md` with the macOS Homebrew native app distribution entry for the dot release
- [X] T050 [P] Add Homebrew troubleshooting guidance for Homebrew missing, unsupported macOS, blocked app launch, and checksum mismatch in `README.md`
- [X] T051 [P] Add Homebrew tap setup notes in `packaging/macos/cask/README.md`
- [X] T052 [P] Add cask uninstall and optional full cleanup notes in `packaging/macos/cask/README.md`
- [X] T053 Review committed documentation for contributor-local absolute paths in `specs/018-macos-homebrew-app/`, `README.md`, `native/macos/`, and `packaging/macos/`
- [X] T054 Run `npm run verify` before release and record the result in `specs/018-macos-homebrew-app/release-review.md`
- [X] T055 Run native app lifecycle validation on macOS and record launch/quit results in `specs/018-macos-homebrew-app/release-review.md`
- [X] T056 Run Homebrew cask install/uninstall validation and record results in `specs/018-macos-homebrew-app/release-review.md`
- [X] T057 Run contrarian QA review for npm regression, app lifecycle cleanup, local-only binding, artifact integrity, docs accuracy, and signing/notarization status in `specs/018-macos-homebrew-app/release-review.md`
- [X] T058 Finalize release readiness notes, known limitations, and follow-up scope for official Homebrew cask submission in `specs/018-macos-homebrew-app/release-review.md`
- [X] T059 Update README and current macOS/Homebrew Markdown docs to reflect the AI-driven builder positioning and measured 90.4% shared-code distribution model
- [X] T060 Validate release version metadata by confirming `package.json` is set to the intended dot-release version and package, app bundle, artifact, release tag, and cask versions are aligned via `.github/workflows/publish.yml` and `packaging/macos/release/validate-version-alignment.sh`
- [X] T061 Add accessibility testing to the contrarian QA release review, including UI accessibility regression coverage and an explicit accessibility result in `specs/018-macos-homebrew-app/release-review.md`
- [X] T062 Integrate the published-release pipeline in `.github/workflows/publish.yml` so each non-prerelease GitHub Release publishes npm, builds/uploads the macOS app artifact, updates cask metadata, and pushes `Casks/gitlocal.rb` to the project-owned Homebrew tap
- [X] T063 Validate native error handling for repository permission failures, service startup failure, non-loopback service URL rejection, and macOS signing/security prompt documentation in `specs/018-macos-homebrew-app/release-review.md`
- [X] T064 Record launch, loopback readiness, and quit-cleanup timing validation for the macOS app in `specs/018-macos-homebrew-app/release-review.md`
- [X] T065 Define measurable install, upgrade, and guided documentation validation methods for SC-001, SC-006, and SC-007 in `specs/018-macos-homebrew-app/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; must complete first because the constitution currently blocks the feature.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user story implementation.
- **User Story 1 (Phase 3)**: Depends on Foundation; delivers the MVP native app install/launch path.
- **User Story 2 (Phase 4)**: Depends on Foundation; can run after or in parallel with US1 once npm package boundaries are clear.
- **User Story 3 (Phase 5)**: Depends on Foundation and benefits from US1 package artifacts; validates upgrade/release flow.
- **Polish (Phase 6)**: Depends on selected user stories and release validation readiness.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational phase; no dependency on US2 or US3.
- **User Story 2 (P2)**: Can start after Foundational phase; independently verifies npm preservation.
- **User Story 3 (P3)**: Can start after Foundational phase, but final upgrade validation depends on an app artifact from US1.

### Within Each User Story

- Test/validation tasks should be created before implementation tasks.
- Native app service process behavior must exist before launch readiness and cleanup can be completed.
- Cask install validation depends on a package artifact and cask file.
- Upgrade validation depends on cask metadata update tooling and a versioned artifact.

### Parallel Opportunities

- Setup documentation scaffold tasks T003-T006 can run in parallel.
- Foundational documentation and ignore updates T013-T015 can run in parallel after T007-T012 are assigned.
- US1 validation scripts T016-T018 can run in parallel before implementation.
- US2 regression tasks T031-T033 can run in parallel.
- US3 validation tasks T040-T042 can run in parallel.
- Polish documentation tasks T049-T052 can run in parallel.

---

## Parallel Example: User Story 1

```text
Task: "Add native lifecycle test plan covering launch, loopback URL load, error display, quit cleanup, and relaunch in native/macos/GitLocalTests/LifecycleTests.md"
Task: "Add cask install smoke test script for local artifacts in packaging/macos/cask/test-install-cask.sh"
Task: "Add packaging smoke test script for bundle contents, version metadata, and required assets in packaging/macos/release/test-package.sh"
```

---

## Parallel Example: User Story 2

```text
Task: "Add npm package contents regression check for excluding native packaging artifacts in tests/integration/npm-package-contents.test.ts"
Task: "Add CLI browser-mode regression coverage for unchanged npm launch behavior in tests/integration/server.test.ts"
Task: "Add documentation regression checklist for npm install/run behavior in specs/018-macos-homebrew-app/quickstart.md"
```

---

## Parallel Example: User Story 3

```text
Task: "Add cask metadata validation script for version, URL, sha256, homepage, and app artifact fields in packaging/macos/cask/validate-cask.sh"
Task: "Add release artifact checksum validation script in packaging/macos/release/validate-artifact.sh"
Task: "Add Homebrew upgrade smoke test instructions in packaging/macos/cask/upgrade-test.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 to resolve the constitution gate.
2. Complete Phase 2 to define app, bundle, cask, and release contracts.
3. Complete Phase 3 to install and launch GitLocal as a macOS app.
4. Stop and validate the native app independently using the US1 checkpoint.

### Incremental Delivery

1. Setup + Foundation: governance and shared packaging boundaries.
2. US1: native install and launch path.
3. US2: npm package preservation and documentation.
4. US3: Homebrew upgrade and release automation path.
5. Polish: release review, contrarian QA, and public documentation.

### Release Readiness

- The feature is not release-ready until the constitution is amended, package version metadata is set for the intended dot release, shared npm verification passes, native lifecycle validation passes on macOS, cask install/upgrade/uninstall validation passes, accessibility and contrarian QA are recorded, the unified npm/Homebrew release pipeline is configured, and the release-review artifact records signing/notarization status.
