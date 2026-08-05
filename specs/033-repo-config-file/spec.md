# Feature Specification: Per-Repo/Folder Configuration File

**Feature Branch**: `033-repo-config-file`
**Created**: 2026-08-05
**Status**: Draft
**Input**: User description: "Add a feature. Configuration is saved for each git repo or filesystem folder in a .gitlocal file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reopen a repo where you left off (Priority: P1)

A user browsing a repo picks a branch, opens a specific file, and toggles raw/pretty view. They close GitLocal (or their browser tab) and come back later — either the same day or after restarting their machine — and open that same repo again. Instead of landing back at the folder root with default settings, GitLocal restores the branch, file, and view mode they were last using for that specific repo.

**Why this priority**: This is the concrete value behind the request — durable, per-location memory instead of relying on browser-only state (localStorage/URL), which is tied to one browser profile and doesn't survive across GitLocal's two distributions (npm-served browser tab vs. the macOS native app) pointed at the same repo.

**Independent Test**: Open a repo, navigate to a specific branch/file/view mode, close GitLocal entirely, reopen the same repo, and confirm the same branch/file/view mode is restored automatically with no user action required.

**Acceptance Scenarios**:

1. **Given** a user has a repo open and navigates to a specific file on a specific branch, **When** they close and later reopen that same repo, **Then** the same branch and file are shown automatically.
2. **Given** a user toggled raw view for a file before closing, **When** they reopen the repo and that file, **Then** raw view is still selected.
3. **Given** a repo has never been opened before, **When** the user opens it for the first time, **Then** GitLocal falls back to its existing default behavior (no saved configuration to restore).
4. **Given** a user opens the same repo via the npm-served browser UI on one occasion and the macOS native app on another, **When** they reopen it either way, **Then** the same saved configuration is restored, since it lives in the repo/folder itself rather than in one browser's storage.

---

### User Story 2 - Same behavior for a plain (non-git) folder (Priority: P2)

A user opens a plain filesystem folder that is not a git repository (GitLocal supports browsing folders directly, not only git repos). The same automatic remembering of last-viewed location and view mode applies, since the feature is folder-scoped, not git-specific.

**Why this priority**: The request explicitly names "git repo or filesystem folder" as equally in scope; this confirms the mechanism doesn't depend on git being present, extending the same value to non-repo folder browsing.

**Independent Test**: Open a plain folder (no `.git` directory) in GitLocal, navigate to a file, close and reopen that same folder, and confirm the last-viewed file/view mode is restored the same way it is for a git repo.

**Acceptance Scenarios**:

1. **Given** a non-git folder is opened and a file within it is viewed, **When** the folder is reopened later, **Then** the same file/view mode is restored, identical to the git-repo case.

---

### User Story 3 - Configuration survives a corrupted or hand-edited file (Priority: P3)

A user (or some other tool) directly edits or corrupts the saved configuration file — for example, breaking its JSON syntax. GitLocal must never fail to open the repo/folder because of this; it falls back to default behavior instead of crashing or blocking access.

**Why this priority**: Since this file lives inside the user's own repo/folder (not a GitLocal-managed internal directory), it is exposed to accidental edits, merge conflicts, or manual tampering; resilience here protects the core browsing experience from ever breaking because of it.

**Independent Test**: Manually corrupt a repo's saved configuration file (invalid JSON), open that repo in GitLocal, and confirm it opens normally at default state with no error blocking access.

**Acceptance Scenarios**:

1. **Given** a repo's configuration file contains invalid JSON, **When** the user opens that repo, **Then** GitLocal opens it successfully at default state, without a crash or blocking error.
2. **Given** the location where the configuration file would be written is read-only, **When** the user navigates within that repo, **Then** browsing continues to work normally even though the new configuration cannot be saved.

---

### Edge Cases

- What happens when the file the saved configuration points to (last-viewed path) has since been deleted, renamed, or moved? GitLocal should fall back to a default view (e.g. the folder root) rather than showing an error for a path that no longer exists.
- What happens when the saved branch no longer exists (deleted or renamed since it was last saved)? GitLocal should fall back to the repo's current default branch rather than failing to open.
- What happens when the same repo is open in two GitLocal sessions at once (e.g. two browser tabs, or the npm CLI and the macOS app simultaneously) and both change settings? The most recently saved configuration wins; neither session is expected to see the other's live changes without reopening.
- What happens for a very large repo/folder where saving configuration on every navigation could be frequent? Writes should be lightweight and not introduce noticeable navigation lag (see Success Criteria).
- What happens if a user has a config file from a future/newer version of GitLocal with fields the current version doesn't recognize? Unknown fields must be ignored (not deleted or rejected) rather than causing an error, so downgrading GitLocal or version-skew between npm and macOS app installs doesn't destroy saved settings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store per-location configuration in a file named `.gitlocal` at the root of the currently opened repository or filesystem folder.
- **FR-002**: This mechanism MUST work identically whether the opened location is a git repository or a plain filesystem folder with no git metadata.
- **FR-003**: System MUST automatically persist the current branch (if applicable), last-viewed file path, and raw/pretty view mode to `.gitlocal` as the user navigates, with no explicit "save settings" action required. Scope for this first version is limited to these three fields — sidebar-collapsed state, search filters, and other browser-local UI state remain in `localStorage`/the URL and are not migrated into `.gitlocal`.
- **FR-004**: When a previously-visited repo/folder is reopened, System MUST restore its saved configuration automatically as the initial view, replacing today's always-start-at-default behavior for that location.
- **FR-005**: System MUST treat `.gitlocal` as the source of truth for a given repo/folder regardless of which GitLocal distribution (npm-served browser UI or macOS native app) or which browser opened it, so saved configuration is not tied to one browser's local storage.
- **FR-006**: `.gitlocal` MUST be a plain, human-readable text format (JSON) so it can be inspected or hand-edited if needed.
- **FR-007**: System MUST tolerate a missing, empty, unreadable, or malformed `.gitlocal` file by falling back to default behavior (as if no configuration existed) rather than erroring or blocking access to the repo/folder.
- **FR-008**: System MUST tolerate being unable to write `.gitlocal` (e.g. read-only filesystem/location) by continuing to function normally for that session with configuration simply not persisted, rather than surfacing a blocking error.
- **FR-009**: System MUST ignore unrecognized fields in an existing `.gitlocal` file rather than removing them or failing to load, so newer/older GitLocal versions and future settings remain forward- and backward-tolerant.
- **FR-010**: System MUST scope each `.gitlocal` file strictly to the root folder where it lives — it does not aggregate or inherit configuration from parent or child folders.
- **FR-011**: System MUST NOT alter existing repo-local git identity behavior (`user.name`, `user.email`, SSH key settings stored via `git config --local`, per the existing 020-local-git-identity feature) — `.gitlocal` is a separate, additive configuration surface for viewer/UI-level settings, not a replacement for git identity storage.
- **FR-012**: System MUST NOT automatically add `.gitlocal` to `.gitignore` or `.git/info/exclude`, and MUST NOT automatically commit it — whether the file is version-controlled is left entirely to the user's own repo conventions. Since `.gitlocal` only ever stores navigation state (branch, path, view mode; see FR-003), never credentials, identity, or other sensitive data, it is safe to commit by default, but the choice stays with the user.

### Key Entities

- **Repo/Folder Configuration File (`.gitlocal`)**: A single file at the root of an opened repository or folder, holding that location's persisted GitLocal settings. One per opened root location; not nested or aggregated across parent/child folders.
- **Persisted Location State**: The specific settings held in a `.gitlocal` file — at minimum, last-viewed branch (if applicable), last-viewed file path, and raw/pretty view mode; extensible to further settings over time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Reopening a previously-visited repo or folder restores its last-viewed branch, file, and view mode automatically, with zero additional user actions, every time.
- **SC-002**: Non-git folders get identical persistence behavior to git repos — no feature gap between the two.
- **SC-003**: A corrupted, unreadable, or unwritable `.gitlocal` never prevents a user from opening or browsing that repo/folder (100% of such cases fall back gracefully).
- **SC-004**: Configuration set while browsing a repo through one GitLocal distribution is correctly restored when the same repo is later opened through the other distribution, confirming persistence is file-based rather than browser-based.
- **SC-005**: Saving updated configuration on navigation introduces no perceptible delay to the browsing experience.

## Assumptions

- `.gitlocal` lives at the root of the opened repository or folder (the location the user explicitly opened), not nested per-subfolder within it.
- The file is JSON, written and read by GitLocal itself; it is not intended as a broad user-authored configuration language in this first version, beyond the ability to hand-edit or delete it safely.
- This feature is purely additive UI/viewer-level state persistence; it does not change or replace the existing git identity settings mechanism (`.git/config`-based, per 020-local-git-identity).
- `.gitlocal` is scoped to hold only non-sensitive navigation state (FR-003); this is what makes leaving the commit-vs-ignore decision to the user (FR-012) safe by default — there is nothing private in the file to protect the user from accidentally sharing.
- The existing global `~/.gitlocal/` directory (`startup-preferences.ts`, holding app-level startup-folder/default-reader preferences) and the new per-repo/folder `.gitlocal` file are deliberately kept as separate, same-named concepts distinguished by location — analogous to `~/.gitconfig` (global) vs. `.git/config` (local) in git itself, or `~/.npmrc` vs. a project's `.npmrc`. No rename is planned for either; the distinction is documented here and should be called out in user-facing docs/help text rather than resolved by renaming.
- This feature does not itself extend to persisting the multi-pane workspace feature's tab/layout/terminal state (see `032-multi-pane-workspace`, which explicitly specifies no persistence for that feature); if that changes in the future, it would be a natural candidate consumer of this same `.gitlocal` mechanism, but that integration is out of scope here.
- Scale is bounded by typical single-repo/single-folder usage; no multi-root or workspace-of-workspaces concept is introduced.
