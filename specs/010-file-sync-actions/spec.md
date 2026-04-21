# Feature Specification: File Sync Indicators and Commit/Remote Actions

**Feature Branch**: `010-file-sync-actions`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "Let's add indication on each file if the file has been changed since last commit locally, and also if the file has been changed and committed locally but has not been synced to remote, and if the file was changed on remote but not synced on local. Let's also have options to commit changes, and sync with remote."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See file-level local and remote sync state while browsing (Priority: P1)

When a user browses files in GitLocal, they can immediately tell whether a file has uncommitted local changes, local committed changes that are not yet pushed, or remote committed changes that are not yet pulled.

**Why this priority**: The core value of the request is awareness. Without accurate file-level indicators, the commit and sync actions become much harder to trust.

**Independent Test**: Open a repository with one file modified in the working tree, one file changed in a local-only commit, and one file changed only in upstream commits, then verify GitLocal shows the correct indicator on each affected file row.

**Acceptance Scenarios**:

1. **Given** a tracked or untracked file differs from the working tree `HEAD`, **When** that file appears in the file tree or folder list, **Then** GitLocal marks it as a local uncommitted change.
2. **Given** a file was changed in local commits that have not yet reached the branch upstream, **When** that file appears in the file tree or folder list, **Then** GitLocal marks it as locally committed but not yet synced to remote.
3. **Given** a file was changed in upstream commits that are not yet present locally, **When** that file appears in the file tree or folder list, **Then** GitLocal marks it as changed on remote and not yet synced locally.
4. **Given** the same file has both unsynced local commits and unseen upstream commits, **When** that file appears in the UI, **Then** GitLocal uses a diverged presentation instead of hiding one side of the conflict.
5. **Given** the current branch has no upstream remote, **When** GitLocal renders file rows, **Then** it still shows local uncommitted status while omitting remote-derived sync indicators cleanly.

---

### User Story 2 - Commit and sync repository changes from GitLocal (Priority: P1)

When a user sees local changes or upstream drift, they can commit current work and sync the current branch with its upstream directly from GitLocal without leaving the app.

**Why this priority**: Indicators are only half the workflow. Users also asked to act on the state from the same UI.

**Independent Test**: Open a repository on the current working branch, create local changes, commit them from GitLocal, then use the sync action to push or fast-forward pull depending on the upstream state.

**Acceptance Scenarios**:

1. **Given** the current working branch has staged, unstaged, or untracked changes, **When** the user chooses to commit changes from GitLocal and supplies a message, **Then** GitLocal stages all current changes and creates a local commit.
2. **Given** there are no local changes to commit, **When** the user attempts to commit from GitLocal, **Then** GitLocal blocks the action with a clear message instead of creating an empty commit.
3. **Given** the current branch is ahead of its upstream and the working tree is clean, **When** the user chooses to sync with remote, **Then** GitLocal pushes the current branch through the local `git` executable and refreshes the repo state.
4. **Given** the current branch is behind its upstream and the working tree is clean, **When** the user chooses to sync with remote, **Then** GitLocal performs a fast-forward pull through the local `git` executable and refreshes the repo state.
5. **Given** the current branch has both local and remote-only commits, **When** the user chooses to sync with remote, **Then** GitLocal blocks the action with an explicit divergence message instead of attempting a destructive or ambiguous merge.
6. **Given** the current branch has uncommitted local changes, **When** the user chooses to sync with remote, **Then** GitLocal blocks the action and instructs the user to commit or discard local changes first.

## Edge Cases

- How should GitLocal represent a file that is both ignored/local-only and also modified locally?
- What should the sync indicators show when the repository has a remote configured but the current branch does not track an upstream branch?
- How should GitLocal behave when a sync operation updates the selected file or folder so the previously open content disappears or changes shape?
- What should happen when `git push`, `git fetch`, or `git pull --ff-only` fails because of authentication, network, or non-fast-forward conditions?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a file-level sync state for browsable file entries on the current working branch.
- **FR-002**: File-level sync state MUST distinguish at least these cases: uncommitted local changes, local committed changes not yet pushed, remote committed changes not yet pulled, diverged local-and-remote changes, and clean/no-indicator.
- **FR-003**: The system MUST render the file-level sync state in the repository file tree and in folder-content file rows.
- **FR-004**: The system MUST continue to support local-only browsing when no remote or upstream branch is configured.
- **FR-005**: The system MUST derive remote-related file indicators from locally known upstream tracking refs rather than from background network polling.
- **FR-006**: The system MUST provide an explicit action to create a local commit from the current working branch.
- **FR-007**: The commit action MUST stage all current changes before creating the commit.
- **FR-008**: The commit action MUST require a non-empty commit message and MUST block empty commits.
- **FR-009**: The system MUST provide an explicit action to sync the current working branch with its upstream remote.
- **FR-010**: The sync action MUST run only through the locally installed `git` executable.
- **FR-011**: The sync action MUST block when the working tree has uncommitted changes.
- **FR-012**: If the current branch is only ahead of upstream, the sync action MUST push.
- **FR-013**: If the current branch is only behind upstream, the sync action MUST perform a fast-forward pull.
- **FR-014**: If the current branch has both ahead and behind commits, the sync action MUST block with a divergence message instead of auto-merging or rebasing.
- **FR-015**: After a successful commit or sync action, GitLocal MUST refresh repository metadata, file tree data, file indicators, and the active content view.
- **FR-016**: The feature MUST preserve the existing branch-switch, file-editing, and repository-browsing behavior.

### Key Entities *(include if feature involves data)*

- **File Sync State**: The per-file status derived from working tree changes, local-only commits, upstream-only commits, or a combination of both.
- **Repository Sync Summary**: The branch-level upstream state that describes whether the current branch is clean, ahead, behind, diverged, or missing an upstream.
- **Commit Changes Request**: The user-supplied commit message and current-branch intent used to create a local commit.
- **Remote Sync Action**: A user-triggered upstream sync attempt that either pushes, fast-forward pulls, reports no-op, or blocks safely.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation testing, 100% of affected file rows show the correct sync indicator for uncommitted, local-ahead, remote-ahead, and diverged cases.
- **SC-002**: In validation testing, 100% of successful commit actions create a local commit that appears in repository history without leaving GitLocal.
- **SC-003**: In validation testing, 100% of successful sync actions refresh the visible repository state without a full app restart.
- **SC-004**: In validation testing, 100% of divergent or dirty-tree sync attempts are blocked with a clear user-facing explanation.

## Assumptions

- Remote-derived indicators are based on the locally available upstream-tracking refs and become freshest after explicit user-initiated sync activity.
- The commit action is scoped to the currently opened repository and stages all changes rather than offering selective staging in this iteration.
- Sync is limited to safe push and fast-forward pull flows; merge, rebase, and conflict-resolution UX remain out of scope for this slice.
