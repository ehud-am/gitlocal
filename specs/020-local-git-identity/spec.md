# Feature Specification: Local Git Identity

**Feature Branch**: `020-local-git-identity`
**Created**: 2026-05-27
**Status**: Draft
**Input**: User description: "Change the implementation of the git identity settings (name, email, ssh key) so GitLocal reads and writes the repository-local Git identity. Prefer using Git's own local configuration behavior over hand-editing .git/config, while supporting both native app and browser mode."

## Clarifications

### Session 2026-05-27

- Q: What release documentation updates should be included with this feature? → A: Update the GitHub README to show the GitLocal icon, clearly warn that the macOS native app is alpha and unsigned, document first-run approval with `xattr -dr com.apple.quarantine /Applications/GitLocal.app`, and create a shorter npm README focused on npm usage while linking to GitHub documentation for native macOS and source-build workflows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Repository Git Identity (Priority: P1)

As a user opening GitLocal for a repository, I want the identity section to show the repository's local Git name, email, and SSH key setting, so I can understand which identity Git will use for this project.

**Why this priority**: The identity section is only useful if it reflects the effective project-local Git settings rather than a separate app-only copy.

**Independent Test**: Can be tested by configuring local Git identity values for a repository outside GitLocal, opening the repository in GitLocal, and confirming those values appear in the identity section.

**Acceptance Scenarios**:

1. **Given** a repository has a local Git author name and email, **When** the user opens the identity section, **Then** GitLocal shows those local values.
2. **Given** a repository has a local Git SSH key configuration, **When** the user opens the identity section, **Then** GitLocal shows the configured key path without exposing key contents.
3. **Given** a repository has no local Git identity values, **When** the user opens the identity section, **Then** GitLocal clearly shows that no repository-local identity is set.

---

### User Story 2 - Save Repository Git Identity (Priority: P1)

As a user editing identity settings in GitLocal, I want saved name, email, and SSH key values to become the repository's local Git identity, so commits and remote operations from any Git client use the same project-specific settings.

**Why this priority**: Saving values into the repository-local Git identity removes the need for a separate private settings file and aligns GitLocal with normal Git behavior.

**Independent Test**: Can be tested by saving identity values in GitLocal and verifying that regular Git operations in the same repository observe the saved project-local values.

**Acceptance Scenarios**:

1. **Given** a user enters a valid name and email, **When** the user saves the identity settings, **Then** the repository's local Git identity is updated with those values.
2. **Given** a user selects or enters a valid SSH private key path, **When** the user saves the identity settings, **Then** the repository's local Git SSH key setting is updated for that repository.
3. **Given** a user clears a previously saved local identity value, **When** the user saves the settings, **Then** the corresponding repository-local override is removed or no longer used.
4. **Given** the identity values are saved in one repository, **When** the user opens a different repository, **Then** the other repository is not changed.

---

### User Story 3 - Use One Identity Experience Across Distributions (Priority: P2)

As a user of either the browser-based app or the native macOS app, I want the same identity settings behavior, so I do not need to learn different rules for each distribution.

**Why this priority**: GitLocal has two distributions that share the same app code; identity settings must behave consistently even though the native app manages the service lifecycle differently.

**Independent Test**: Can be tested by saving and reading the same repository identity values through both distributions and confirming that each shows and uses the same repository-local settings.

**Acceptance Scenarios**:

1. **Given** identity values are saved in browser mode, **When** the same repository is opened in the native app, **Then** the native app shows the same repository-local values.
2. **Given** identity values are saved in the native app, **When** the same repository is opened in browser mode, **Then** browser mode shows the same repository-local values.
3. **Given** a save operation fails in either distribution, **When** the user views the error, **Then** the message explains the repository-local identity could not be updated and does not suggest editing private app settings.

---

### User Story 4 - Keep SSH Key Selection Safe (Priority: P3)

As a user configuring an SSH key, I want GitLocal to preserve the existing safe key selection behavior, so I can choose a valid private key without exposing secrets.

**Why this priority**: Moving persistence into repository-local Git configuration should not weaken SSH key validation or leak private key contents.

**Independent Test**: Can be tested by attempting to save valid private keys, public keys, missing files, directories, and unreadable paths, then confirming only valid private key paths are accepted.

**Acceptance Scenarios**:

1. **Given** the user selects a valid private SSH key, **When** the user saves identity settings, **Then** the key path is accepted and saved as the repository-local SSH key setting.
2. **Given** the user selects a public key, missing file, directory, or unreadable file, **When** the user tries to save, **Then** GitLocal rejects the key path with a clear message.
3. **Given** a private key is passphrase-protected, **When** the user selects it, **Then** GitLocal accepts the key path without asking for or storing the passphrase.

---

### User Story 5 - Understand Distribution Documentation (Priority: P3)

As a user choosing how to install GitLocal, I want GitHub and npm documentation to be clearly tailored to their channels, so I can understand npm usage quickly and see native macOS alpha limitations before launching the app.

**Why this priority**: The identity change touches distribution behavior across browser and native modes; documentation should prevent install confusion and make the unsigned alpha app warning explicit.

**Independent Test**: Can be tested by reviewing the GitHub README and npm README and confirming that each document presents the right installation path, warning level, and cross-links.

**Acceptance Scenarios**:

1. **Given** a user reads the GitHub README, **When** they reach the macOS native app section, **Then** they see that the native app is alpha, unsigned, may trigger Apple warnings, and requires explicit first-run approval with `xattr -dr com.apple.quarantine /Applications/GitLocal.app`.
2. **Given** a user reads the npm README, **When** they look for usage instructions, **Then** they see a short npm-focused workflow without detailed native macOS or source-build instructions.
3. **Given** a user needs native macOS or source-build instructions from the npm README, **When** they follow the provided links, **Then** they are directed to the GitHub documentation.
4. **Given** a user opens the GitHub README, **When** the first screen is displayed, **Then** the GitLocal icon is visible in a stable, non-disruptive location.

### Edge Cases

- The selected folder is not a Git repository or has no local Git metadata.
- The repository's local Git configuration is unreadable or unwritable.
- A worktree, submodule, nested repository, or repository with an unusual Git directory layout is opened.
- The local Git identity is partially configured, such as name without email or email without name.
- The SSH configuration contains options in addition to the identity file path.
- The configured SSH key path uses a home-directory shortcut, relative path, spaces, or quoted segments.
- The previously configured SSH key file has been moved, deleted, or made unreadable.
- A user clears a field that also has a global Git fallback value outside the repository.
- Multiple GitLocal windows or processes edit identity settings for the same repository close together in time.
- The npm package uses a channel-specific README while the repository root README remains the GitHub-facing documentation.
- The GitLocal icon path changes or is unavailable in the published documentation context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GitLocal MUST treat the repository-local Git identity as the source of truth for the identity settings section.
- **FR-002**: GitLocal MUST read repository-local author name and email values for the active repository.
- **FR-003**: GitLocal MUST read the repository-local SSH key setting for the active repository when one is configured.
- **FR-004**: GitLocal MUST save edited author name, author email, and SSH key path as repository-local Git settings for the active repository.
- **FR-005**: GitLocal MUST NOT persist identity settings in a separate project private settings file when saving repository-local identity values.
- **FR-006**: GitLocal MUST NOT require `.env` or `.gitignore` changes for identity persistence when values are stored as repository-local Git settings.
- **FR-007**: GitLocal MUST preserve per-repository isolation so identity changes in one repository do not alter another repository.
- **FR-008**: GitLocal MUST support the same identity read and write behavior in browser mode and native macOS app mode.
- **FR-009**: GitLocal MUST show a clear empty or unset state when no repository-local identity value exists, even if a broader Git fallback may exist outside the repository.
- **FR-010**: GitLocal MUST allow users to clear a repository-local identity override.
- **FR-011**: GitLocal MUST validate SSH private key paths before saving or using them as the repository-local SSH key path.
- **FR-012**: GitLocal MUST allow valid passphrase-protected private keys without collecting or storing passphrases.
- **FR-013**: GitLocal MUST avoid displaying, logging, or storing SSH private key file contents.
- **FR-014**: GitLocal MUST report actionable errors when repository-local identity settings cannot be read, written, cleared, or validated.
- **FR-015**: GitLocal MUST handle repositories with non-standard local Git metadata layouts consistently with normal Git behavior.
- **FR-016**: GitLocal MUST preserve any unrelated repository-local Git settings when updating identity values.
- **FR-017**: GitLocal MUST make the saved identity observable to regular Git operations performed in the same repository.
- **FR-018**: GitLocal MUST make identity values saved by regular Git operations observable in the identity section after refresh.
- **FR-019**: The GitHub README MUST include the GitLocal icon in a prominent, stable location.
- **FR-020**: The GitHub README MUST identify the macOS native app as alpha and unsigned until signing/notarization is available.
- **FR-021**: The GitHub README MUST explain that Apple warning messages are expected for the unsigned native app and document first-run approval with `xattr -dr com.apple.quarantine /Applications/GitLocal.app`.
- **FR-022**: The npm README MUST be a shorter channel-specific document focused on installing and running GitLocal from npm.
- **FR-023**: The npm README MUST link to the GitHub README for native macOS app instructions and source-build instructions instead of duplicating those sections.
- **FR-024**: The package/publish workflow MUST ensure npm receives the npm-specific README while GitHub continues to show the GitHub README.

### Key Entities

- **Repository Git Identity**: The repository-local author name, author email, SSH key path, unset state, and validation state for the active repository.
- **SSH Private Key Candidate**: A local file path that may be accepted as the repository's SSH private key path after validation.
- **Identity Save Result**: The outcome of reading, saving, or clearing repository-local identity values, including success, validation errors, and repository access errors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tested repositories with local Git identity values, GitLocal displays the repository-local name and email correctly after opening or refreshing the identity section.
- **SC-002**: In 100% of successful saves, regular Git commands in the same repository observe the name, email, and SSH key setting saved from GitLocal.
- **SC-003**: Identity values saved in browser mode are visible in native app mode, and values saved in native app mode are visible in browser mode, in 100% of tested cross-distribution scenarios.
- **SC-004**: Saving identity settings for one repository leaves other tested repositories unchanged in 100% of isolation checks.
- **SC-005**: Invalid SSH key paths are rejected before save in 100% of tested invalid-path scenarios.
- **SC-006**: No tested identity view, error, log, or confirmation message exposes SSH private key file contents.
- **SC-007**: A first-time macOS native app user can find the unsigned-alpha warning and first-run approval command in the GitHub README in under 30 seconds.
- **SC-008**: A user reading the npm README can identify the npm install/run path and links to GitHub native/source docs in under 60 seconds.
- **SC-009**: The GitLocal icon renders correctly in the GitHub README in 100% of documentation preview checks.

## Assumptions

- Repository-local Git identity should replace the previous project-private settings-file approach for name, email, and SSH key persistence.
- GitLocal should rely on Git's normal local configuration semantics for reading and writing repository identity rather than directly editing Git metadata files.
- Browser mode and native macOS app mode can both route identity operations through the same local GitLocal service for the active repository.
- Existing SSH key browsing and validation requirements from the prior identity settings work still apply unless directly superseded by this specification.
- Global Git identity may exist, but this feature is focused on displaying and managing repository-local overrides.
- The repository root README remains the GitHub-facing README, and the implementation may add a package-specific README artifact or publish step so npm receives shorter documentation.
