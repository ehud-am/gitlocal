# Feature Specification: macOS Homebrew Native App

**Feature Branch**: `018-macos-homebrew-app`  
**Created**: 2026-05-25  
**Status**: Implemented - Release validation in progress  
**Input**: User description: "this is a dot release. the goal is to create a homebrew package as alternative distribution model for gitlocal on macos system that will run as a native app. please see the discussion about and build a spec for the swift wrapper and the cask homebrew distribution"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install GitLocal as a macOS App (Priority: P1)

As a less-technical builder on macOS, I want to install GitLocal through Homebrew and launch it as a normal Mac app, so I can browse and review an AI-maintained codebase without keeping a terminal open.

**Why this priority**: The native app distribution is the core value of this release; users need a familiar macOS install and launch experience while the existing npm path remains available.

**Independent Test**: Can be tested by installing the macOS distribution on a clean supported Mac, launching GitLocal from the installed app, and confirming the repository viewer opens in a native window.

**Acceptance Scenarios**:

1. **Given** a supported macOS system with Homebrew installed, **When** the user installs the GitLocal macOS package, **Then** GitLocal appears as a launchable Mac app.
2. **Given** the GitLocal app is installed, **When** the user launches it from the app launcher or Applications location, **Then** a native window opens and shows the GitLocal repository viewer.
3. **Given** the native app is running, **When** the user closes the app window or quits the app, **Then** GitLocal stops its background local service without requiring terminal cleanup.

---

### User Story 2 - Preserve the Existing npm Distribution (Priority: P2)

As an existing GitLocal user, I want the npm-installed version to continue working as it does today, so the new macOS app does not disrupt cross-platform users or automation.

**Why this priority**: The macOS app is an additional distribution model, not a replacement for the npm package.

**Independent Test**: Can be tested by installing and running the npm package after the native app release and confirming the browser-based workflow remains available and unchanged.

**Acceptance Scenarios**:

1. **Given** a user installs GitLocal through npm, **When** the user runs GitLocal, **Then** the existing browser-based experience remains available.
2. **Given** both the npm package and the macOS app distribution exist for the same release, **When** a user chooses either installation path, **Then** both paths present the same GitLocal product capabilities for repository viewing.
3. **Given** a non-macOS user installs GitLocal through npm, **When** the user runs GitLocal, **Then** the macOS app distribution does not affect that user's workflow.

---

### User Story 3 - Upgrade the Native App Through Homebrew (Priority: P3)

As a macOS user who installed GitLocal through Homebrew, I want future GitLocal native app updates to arrive through the same Homebrew workflow, so upgrades are predictable and do not require manual downloads.

**Why this priority**: A second distribution channel only remains viable if users can update and verify it consistently.

**Independent Test**: Can be tested by publishing a newer macOS package version, upgrading through Homebrew, and confirming the installed app reports and runs the newer GitLocal version.

**Acceptance Scenarios**:

1. **Given** a previous GitLocal macOS package is installed, **When** a newer package is published and the user upgrades through Homebrew, **Then** the installed app is replaced with the newer version.
2. **Given** the user launches the upgraded app, **When** the app opens, **Then** it shows the same product version as the published release.
3. **Given** the published package is missing or has an integrity mismatch, **When** Homebrew attempts installation or upgrade, **Then** installation fails before the app is launched.

### Edge Cases

- Homebrew is not installed or is too old to install the macOS package.
- The user is on an unsupported macOS version or unsupported processor architecture.
- Another GitLocal instance is already running when the native app is launched.
- The local service cannot bind to an available local port.
- The app cannot access the selected repository because of filesystem permissions.
- The app bundle is moved after installation.
- The installed app is blocked by macOS security controls.
- The user has both npm and Homebrew installations available with different versions.
- The Homebrew package download fails, is interrupted, or does not match the expected integrity value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The release MUST provide a macOS-native GitLocal app distribution installable through Homebrew.
- **FR-002**: The macOS app distribution MUST be additive and MUST NOT remove or degrade the existing npm installation path.
- **FR-003**: The macOS app MUST present GitLocal in an embedded native app window rather than requiring the user to keep a terminal or external browser window open.
- **FR-004**: The macOS app MUST use the same GitLocal repository viewer experience and product capabilities as the npm/browser distribution for the same release.
- **FR-005**: The macOS app MUST start and stop any required local GitLocal background service as part of the app lifecycle.
- **FR-006**: The macOS app MUST bind local services only to the local machine and MUST NOT expose the viewer to the network by default.
- **FR-007**: The macOS app MUST show a clear user-facing error when it cannot start the local service, open the viewer, access a repository, or satisfy macOS security requirements.
- **FR-008**: The Homebrew package MUST install the native app into the expected macOS app location managed by Homebrew.
- **FR-009**: The Homebrew package MUST support versioned upgrades so users can move from one GitLocal native app release to a newer one through Homebrew.
- **FR-010**: The Homebrew package MUST verify the integrity of the downloaded release artifact before installation.
- **FR-011**: The native app release artifact MUST be generated from the same GitLocal release version as the npm package for that release.
- **FR-012**: The installed native app MUST expose the GitLocal version in a way users can compare with release notes and the npm package version.
- **FR-013**: The macOS distribution MUST document the Homebrew install, upgrade, uninstall, and troubleshooting flows.
- **FR-014**: The first release of this distribution MUST explicitly scope native app support to macOS only.
- **FR-015**: The release process MUST produce a repeatable package artifact suitable for Homebrew distribution.
- **FR-016**: The release process MUST define how the Homebrew package metadata is updated for each GitLocal release.
- **FR-017**: The native app MUST handle the presence of an existing npm installation without requiring it and without relying on it for normal operation.
- **FR-018**: The native app MUST handle quit, relaunch, and failure cleanup without leaving stale local service processes in normal use.
- **FR-019**: The app distribution MUST make clear to users whether the app is signed or otherwise accepted by macOS security prompts.
- **FR-020**: Product documentation MUST position GitLocal as a codebase browsing and review tool for AI-driven development workflows where direct human code editing is secondary but still available.
- **FR-021**: Product documentation MUST explain the two distribution paths, including the npm package terminal tradeoff and the macOS Homebrew native app experience.
- **FR-022**: Product documentation MUST state the measured percentage of shared implementation between the npm and macOS native distributions and define how that percentage was calculated.

### Key Entities

- **macOS Native App Distribution**: The installed GitLocal Mac app, including its version, supported architecture, launch behavior, and lifecycle state.
- **Homebrew Package Metadata**: The Homebrew-managed package description that identifies the release artifact, version, integrity value, install target, and uninstall behavior.
- **Release Artifact**: The versioned downloadable macOS app package used by Homebrew to install or upgrade GitLocal.
- **Local App Session**: A running native app instance, its local viewer window, and any background local service it starts for that session.
- **Distribution Channel**: An installation path for GitLocal, including the existing npm package and the new macOS Homebrew package.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A macOS user with Homebrew installed can install and launch the native GitLocal app in under 3 minutes on a supported machine.
- **SC-002**: In 100% of supported macOS installation tests, launching the app opens the GitLocal viewer without requiring a terminal window to remain open.
- **SC-003**: The npm-installed GitLocal workflow remains successful in 100% of existing npm smoke tests after the macOS distribution is added.
- **SC-004**: The Homebrew package installs only when the downloaded app artifact matches the expected integrity value in 100% of package verification tests.
- **SC-005**: Closing or quitting the native app leaves no normal-session GitLocal background service running in 100% of lifecycle tests.
- **SC-006**: A user can upgrade from one native app release to the next through Homebrew and see the newer GitLocal version in under 2 minutes after the package is available.
- **SC-007**: The macOS-native release documentation enables a first-time user to install, launch, upgrade, and uninstall the app without additional support in at least 90% of guided validation runs.

## Assumptions

- This is a dot-release feature focused on adding macOS native distribution without changing GitLocal's core repository viewer behavior.
- The macOS native app will be a platform-native wrapper around the existing GitLocal viewer and local service.
- The Homebrew package will be distributed as a cask-style macOS app package rather than replacing the existing npm package.
- The first release targets macOS only; Linux and Windows native app packaging remain future work.
- The macOS app should be self-contained for normal use and should not require users to install or configure the npm package separately.
- Official Homebrew core/cask inclusion can be pursued later; the first viable release can use a project-owned Homebrew tap.
- GitLocal is primarily for human browsing, reading, Markdown review, and lightweight intervention around AI-generated code changes rather than replacing a full IDE.
