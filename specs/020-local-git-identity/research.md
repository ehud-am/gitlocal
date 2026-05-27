# Research: Local Git Identity

## Decision: Use Git local configuration behavior as the identity source of truth

GitLocal should read and write repository-local identity values through normal Git configuration behavior. This applies to author name, author email, and the SSH command/key path used for repository operations.

**Rationale**: Git already owns local configuration semantics, including config precedence, locking, worktree layouts, submodules, and non-standard Git directory locations. Using that behavior avoids creating a second identity store and makes values saved in GitLocal visible to other Git clients.

**Alternatives considered**:

- **Directly edit `.git/config`**: Rejected because it bypasses Git's locking and layout handling, risks preserving config syntax incorrectly, and can fail for worktrees or repositories whose Git metadata is not a plain `.git/config` file at the worktree root.
- **Persist to `.env` and synchronize Git config**: Rejected for this feature because it creates two sources of truth and requires private file protection UI that is unnecessary when repository-local Git config is the store.

## Decision: Treat repository-local values separately from global fallbacks

The identity settings surface should show and manage repository-local overrides. When no local value exists, the UI should clearly show an unset local state rather than silently presenting global identity as if it were project-specific.

**Rationale**: The feature goal is project-specific identity. Showing global fallback values as editable local values can mislead users into thinking the repository has its own identity when it does not.

**Alternatives considered**:

- **Display effective Git identity including global fallback**: Useful for diagnostics, but rejected as the primary editable value because it blurs local vs global ownership.
- **Hide identity when local values are missing**: Rejected because users need an obvious place to set local identity.

## Decision: Store SSH key selection as repository-local SSH command configuration

GitLocal should continue to expose the user-facing value as an SSH private key path, while persisting the repository-local Git setting needed for Git operations to use that key.

**Rationale**: Users think in terms of a selected key file, but Git operations need a configured SSH invocation. Keeping the UI path-oriented while making Git's local config observable satisfies both user needs and interoperability with command-line Git.

**Alternatives considered**:

- **Store only an app-specific SSH key field**: Rejected because regular Git operations would not observe it.
- **Expose the full SSH command as the main UI field**: Rejected because it is less usable for less-technical users and increases risk of malformed commands.

## Decision: Preserve SSH key discovery and validation

The existing safe SSH key selection behavior remains in scope: browse the conventional SSH directory, list likely private keys, accept manual paths, validate before save, and never return private key contents.

**Rationale**: Moving persistence into Git config changes where values are saved, not the safety requirements around selecting key files.

**Alternatives considered**:

- **Allow any SSH key path without validation**: Rejected because it would make repository operations fail later with less actionable errors.
- **Read passphrases or test network authentication**: Rejected because GitLocal must remain local-first and must not collect SSH secrets.

## Decision: Remove identity-specific `.env` protection endpoints and UI

GitLocal should not require `.env` creation, `.gitignore` checks, or private settings protection warnings for identity persistence after this change.

**Rationale**: Repository-local Git config is already untracked Git metadata. Keeping `.env` warnings in the identity flow after removing `.env` persistence would be confusing and would add unnecessary user approval steps.

**Alternatives considered**:

- **Leave protection endpoints unused**: Rejected because stale API and UI contracts increase maintenance cost and test burden.
- **Keep `.env` for future unrelated settings**: Acceptable outside this feature, but identity values must not depend on it.

## Decision: Share behavior through the local service for both distributions

Browser mode and the native macOS app should use the same local service handlers and repository logic for identity operations.

**Rationale**: The native app is a thin wrapper around the Node.js-served React UI. Shared service behavior prevents distribution-specific identity bugs and keeps the 93%+ shared code direction intact.

**Alternatives considered**:

- **Use native macOS APIs to edit identity settings**: Rejected because it would fork behavior and violate the thin-wrapper product direction.
- **Use browser-only file access behavior**: Rejected because GitLocal's local service already has the filesystem and Git access needed by both modes.
