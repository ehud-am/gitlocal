# Feature Specification: Release Quality and Automation

**Feature Branch**: `002-release-quality-automation`  
**Created**: 2026-03-28  
**Status**: Implemented  
**Input**: User description: "in this release we will try to achive several things:
1. when a user does not provide a location, there is a very basic location selector page. 
Let's make it look better. It should have the same look and feel as the gitlocal main pages. It should have a title explaining that this is a folder selector and it is needed because the original activation did not provide a location. It should have a more appropiate folder selector that render a kind of finder (and it should be designed to work on windows and linux as well).

2. Every pr should trigger a gethub action to run the test suite and if it fails then the pr should not be accepted. 

3. the build itself is not clean right now, so eliminate all warnings from build (Some chunks are larger than 500 kB after minification., npm warn deprecated glob@10.5.0: Old versions of glob are not supported, 5 moderate severity vulnerabilities)

4. when a new release is created we want to run a github action to publish a new package in npn"

## Clarifications

### Session 2026-03-29

- Q: How should GitLocal choose the picker starting location and allow parent-folder navigation across launch modes? → A: Start the picker from the current working directory when no folder is provided, start it from the provided non-git folder when one is given, and always provide a way to switch from a viewed git repository to a picker rooted at that repository's parent folder.
- Q: How should accessibility validation be enforced for this release? → A: Add automated accessibility assertions to the UI test suite and make them part of the same CI verification gate used for release readiness.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a Repository Confidently (Priority: P1)

When a user launches GitLocal without a repository path, they see a polished folder-selection experience that matches the rest of the app and clearly explains why repository selection is needed.

**Why this priority**: Users who start without a path are currently greeted with the weakest part of the experience. Improving this flow directly affects first impressions and basic usability.

**Independent Test**: Launch GitLocal without a repository path and confirm the folder-selection screen presents branded guidance, supports repository browsing and selection in a finder-style layout, and works for users on macOS, Windows, and Linux.

**Acceptance Scenarios**:

1. **Given** a user starts GitLocal without a repository path, **When** the initial screen loads, **Then** the user sees a folder selector page with the same visual style and tone as the main GitLocal viewer.
2. **Given** the folder selector page is shown, **When** the user reads the page header and supporting text, **Then** the interface explains that a repository location is required because no location was provided at launch.
3. **Given** the user needs to choose a repository, **When** they interact with the selector, **Then** the page provides a finder-style browsing experience that is clearer and more appropriate than a plain text entry field.
4. **Given** a user launches GitLocal without a folder argument, **When** the picker opens, **Then** browsing begins from the current working directory instead of a generic home fallback.
5. **Given** a user launches GitLocal with a folder that is not a git repository, **When** the picker opens, **Then** browsing begins from that provided folder.
6. **Given** a user is already viewing a git repository, **When** they choose to move up a level, **Then** the application switches into folder-picker mode rooted at the parent folder of the current repository.
7. **Given** a user is on Windows or Linux, **When** they use the selector, **Then** the interaction model and layout remain understandable and usable for their platform.

---

### User Story 2 - Trust Pull Request Quality Gates (Priority: P1)

As a maintainer, I want every pull request to run the full verification suite automatically so that broken changes cannot be merged unnoticed.

**Why this priority**: Release safety depends on preventing regressions before they reach the main branch. This protects every subsequent release and change.

**Independent Test**: Open a pull request and verify that automated verification starts automatically, reports success or failure clearly, and blocks acceptance of pull requests with failing required checks.

**Acceptance Scenarios**:

1. **Given** a contributor opens or updates a pull request, **When** the repository automation runs, **Then** the full project test suite is executed automatically.
2. **Given** the automated verification fails for a pull request, **When** a maintainer reviews the pull request, **Then** the pull request is visibly blocked from acceptance until the failure is resolved.
3. **Given** the automated verification succeeds, **When** a maintainer reviews the pull request, **Then** the pull request can proceed without manual guesswork about test status.
4. **Given** UI accessibility regressions detectable by the project's automated accessibility checks are introduced, **When** pull-request verification runs, **Then** the pull request fails the same required CI gate.

---

### User Story 3 - Build Releases Without Health Warnings (Priority: P2)

As a maintainer, I want the build and dependency checks to complete cleanly so that release preparation does not carry known warnings, deprecated packages, or unresolved security issues.

**Why this priority**: A clean build reduces release risk, lowers maintenance noise, and improves confidence that the package is healthy enough to ship.

**Independent Test**: Run the standard build and dependency verification flow and confirm it completes without the currently known chunk-size warning, deprecated dependency warning, or moderate-or-higher security findings.

**Acceptance Scenarios**:

1. **Given** a maintainer runs the normal build flow, **When** the build completes, **Then** no known release-blocking warnings remain in the output.
2. **Given** the dependency tree is reviewed during build preparation, **When** the release readiness checks run, **Then** deprecated package warnings targeted by this release no longer appear.
3. **Given** dependency health is evaluated for release, **When** the security review completes, **Then** the known moderate-severity issues targeted by this release are resolved or reduced below the release threshold.
4. **Given** release readiness is being evaluated, **When** the UI verification suite runs, **Then** automated accessibility checks complete without violations in the covered scenarios.

---

### User Story 4 - Publish Automatically on Release (Priority: P2)

As a maintainer, I want package publication to happen automatically when a release is created so that shipping a release is consistent, repeatable, and not dependent on manual local steps.

**Why this priority**: Automated publishing reduces human error and makes release delivery faster and more dependable.

**Independent Test**: Create a release in the repository and verify that the publication workflow starts automatically, uses the release as the publication trigger, and publishes the package only after required release checks pass.

**Acceptance Scenarios**:

1. **Given** a new release is created in the repository, **When** release automation starts, **Then** package publication is triggered automatically without requiring a maintainer to run a separate manual publish step.
2. **Given** the release workflow runs, **When** publication preconditions are not met, **Then** publication is stopped and the failure is reported clearly.
3. **Given** the release workflow succeeds, **When** the release completes, **Then** the new package version is published to the package registry associated with the project.

### Edge Cases

- A user starts GitLocal without a repository path and the selector cannot access the requested folder hierarchy.
- A user starts GitLocal from the filesystem root, and the parent-folder picker action must stop cleanly without navigating above the root.
- A user starts GitLocal with a non-git path that no longer exists by the time the picker loads.
- A repository contains many nested folders, and the selector must remain understandable without feeling like a raw filesystem dump.
- A pull request is updated multiple times, and each update must rerun the required verification checks consistently.
- An accessibility regression is introduced in a tested UI component, and CI must fail before the change can be accepted.
- A pull request from a fork or restricted context cannot access publish credentials and must not be treated as releasable.
- A build passes functionally but still emits warnings that should be considered release blockers for this feature.
- A dependency upgrade removes one warning but introduces a different release-quality issue that must still be surfaced.
- A release is created while publication credentials or package metadata are misconfigured.
- A release publish attempt is triggered for a version that has already been published and must fail safely without silent corruption.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a redesigned repository-selection experience for users who launch GitLocal without a repository path.
- **FR-002**: The repository-selection experience MUST match the general visual style, tone, and quality level of the main GitLocal application.
- **FR-003**: The repository-selection page MUST explain that repository selection is required because no location was provided at launch.
- **FR-004**: Users MUST be able to browse and choose a repository through a finder-style folder selection experience rather than relying only on a plain text field.
- **FR-005**: The repository-selection experience MUST remain usable across macOS, Windows, and Linux environments.
- **FR-005a**: When GitLocal starts without a folder argument, the initial picker location MUST be the process working directory used to launch GitLocal.
- **FR-005b**: When GitLocal starts with a folder argument that is not a git repository, the application MUST enter picker mode and initialize browsing from that provided folder.
- **FR-005c**: When GitLocal starts with a valid git repository, the viewer MUST provide a control that switches into picker mode rooted at the parent folder of the current repository.
- **FR-005d**: While viewing a git repository in the browser after startup, the user MUST continue to have access to the parent-folder picker control without restarting the process.
- **FR-006**: Every pull request MUST trigger automated verification of the project test suite.
- **FR-007**: Pull requests with failing required verification MUST be blocked from acceptance until the required checks pass.
- **FR-008**: Pull request verification results MUST be clearly visible to maintainers and contributors.
- **FR-008a**: Pull-request verification MUST include automated accessibility assertions for covered UI components as part of the shared verification entrypoint.
- **FR-009**: The standard build flow MUST complete without the currently known release-quality warnings targeted by this release.
- **FR-010**: The release-quality improvements MUST eliminate the currently known deprecated dependency warning targeted by this release.
- **FR-011**: The release-quality improvements MUST resolve or reduce the currently known moderate-severity dependency issues below the release acceptance threshold for this project.
- **FR-012**: Release publication MUST start automatically when a new repository release is created.
- **FR-013**: Automated publication MUST publish the package to the project's package registry only after required release conditions are satisfied.
- **FR-014**: Automated publication MUST fail safely and report clear status when publication prerequisites, credentials, or version constraints are not satisfied.
- **FR-015**: The release automation MUST reduce reliance on manual maintainer steps for routine package publication.

### Key Entities *(include if feature involves data)*

- **Folder Selection Session**: The user’s repository-selection interaction when GitLocal starts without a repository path, including explanatory content, visible folder hierarchy, current selection, and validation state.
- **Picker Launch Context**: The server-managed starting folder for picker mode, derived from the current working directory, a non-git launch path, or the parent of the currently viewed repository.
- **Pull Request Verification Run**: A single automated review cycle for a pull request, including trigger event, executed checks, pass/fail result, and merge-blocking status.
- **Build Health Outcome**: The summarized state of release readiness for the build, including warning status, dependency deprecation status, and security issue status.
- **Accessibility Verification Run**: A UI-focused automated validation pass that checks covered rendered components for detectable accessibility violations and contributes to the overall CI/release gate result.
- **Release Publication Run**: A single automated publication attempt started from a repository release, including trigger source, readiness checks, publication result, and failure reason when applicable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability review, at least 90% of first-time users who start without a repository path can identify why the folder selector is shown and choose a repository without outside explanation.
- **SC-002**: 100% of pull requests opened against the repository trigger the required automated verification flow within 5 minutes of creation or update.
- **SC-003**: 100% of pull requests with failing required verification are blocked from acceptance until the required checks pass.
- **SC-004**: The standard release build completes with zero occurrences of the currently known chunk-size warning and targeted deprecated-package warning.
- **SC-004a**: 100% of pull requests and release-verification runs execute the automated UI accessibility checks included in the shared verification command.
- **SC-005**: The dependency health review for release shows zero moderate-or-higher issues among the currently known issues targeted by this release.
- **SC-006**: 100% of valid repository releases trigger an automated publication attempt, and successful releases publish the corresponding package version without requiring a separate manual publish step.

## Assumptions

- The improved folder selector will be delivered inside the existing GitLocal browser experience rather than by requiring a native operating-system picker dialog.
- The repository already uses a pull-request workflow where required automated checks can be treated as acceptance gates.
- The project maintainers consider the currently known build warnings and moderate-severity dependency issues to be release blockers for this release.
- Automated publication should be tied to the creation of an official repository release, not to every tag-like event or every push to the default branch.
- Package registry credentials and repository permissions will be available through the project’s normal secret-management process.
