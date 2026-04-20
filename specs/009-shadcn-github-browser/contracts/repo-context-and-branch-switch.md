# Repository Context and Branch Switch Contract

## Repository Info Contract

- `GET /api/info` remains the app-shell metadata source.
- The response keeps the existing repository summary fields and adds nested git context for the right-panel header:
  - `gitContext.user`: `{ name, email, source } | null`
  - `gitContext.remote`: `{ name, fetchUrl, webUrl, selectionReason } | null`
- Repository-local git config values win over global config values for the reported user identity.
- If a remote URL cannot be converted into a browser-openable link, `webUrl` is empty while `fetchUrl` remains available for display.
- If the current repository has no remotes, `gitContext.remote` is `null`.

## Branch List Contract

- `GET /api/branches` keeps its existing route and now returns branch options with enough metadata for local and remote-tracking selection:
  - `name`
  - `displayName`
  - `scope`: `local` or `remote`
  - `remoteName?`
  - `trackingRef?`
  - `hasLocalCheckout`
  - `isCurrent`
- The response includes both local branches and eligible remote-tracking branches.
- Symbolic refs such as `origin/HEAD` are excluded.
- If a local branch already exists for the same short branch name, the local option is the primary selectable row and the duplicate remote-only row is omitted.

## Branch Switch Mutation Contract

- `POST /api/branches/switch` performs real local branch switching.
- Request body:
  - `target`: selected branch option or tracking ref
  - `resolution`: `preview`, `commit`, `discard`, `delete-untracked`, or `cancel`
  - `commitMessage?`
  - `allowDeleteUntracked?`
- Success behavior:
  - Returns `ok: true`, `status: "switched"`, the final `currentBranch`, and a user-facing success `message`.
  - If the selected option was remote-tracking only, the payload may also include `createdTrackingBranch`.
- Confirmation behavior:
  - Returns `ok: false`, `status: "confirmation-required"` when tracked or untracked changes require user confirmation before the switch.
  - Includes `trackedChangeCount`, `untrackedChangeCount`, `blockingPaths`, and `suggestedCommitMessage`.
  - Returns `ok: false`, `status: "second-confirmation-required"` when tracked/staged changes were handled but untracked blockers still require explicit deletion approval.
- Failure behavior:
  - Returns `status: "blocked"` or `status: "failed"` with a clear `message` when checkout, commit, or cleanup cannot complete.
- Safety behavior:
  - The discard path does not silently delete untracked files.
  - The cancel path leaves repository state unchanged.

## Right-Panel Presentation Contract

- The right-panel header shows:
  - the last path segment as the primary title;
  - the full repository-relative path as secondary text;
  - git-repository indication;
  - resolved user name and email;
  - selected remote name plus browser link when available;
  - the current branch selector.
- Theme controls remain app-wide, but the same light/dark tokens must apply to this header.

## Test Coverage Contract

- Backend tests must cover:
  - repo-local vs global git user resolution;
  - remote selection order (`upstream`, then `origin`, then first configured remote);
  - SSH remote conversion to browser URLs when possible;
  - branch option responses that include local and remote-tracking branches without duplicate symbolic refs;
  - clean switch, commit-then-switch, discard-then-switch, cancel, and untracked second-confirmation flows.
- UI tests must cover:
  - right-panel header rendering in both light and dark themes;
  - branch selector rendering for local and remote-tracking options;
  - commit/discard/cancel dialogs and post-switch refresh behavior.
