# Quickstart: Git Identity Settings

## Preconditions

- Use a local git repository with a writable working tree.
- For SSH key selection tests, create a temporary home directory with an `.ssh` folder containing:
  - one fake valid OpenSSH private key fixture,
  - one `.pub` public key file,
  - one `known_hosts` file,
  - one unrelated text file.

## Manual Verification Flow

1. Start GitLocal for a local repository.
2. Open the repository git identity dialog.
3. Confirm the dialog shows name, email, and SSH key path controls.
4. Open the SSH key selector.
5. Confirm the selector starts in the conventional SSH folder when it exists.
6. Confirm only valid private key files are listed.
7. Enter a manual path to a valid private key and save.
8. Reopen the same repository and confirm name, email, and SSH key path are restored.
9. Open a different repository and confirm the first repository's saved values are not shown as saved values there.
10. Remove or edit `.gitignore` so `.env` is not protected.
11. Save identity settings and confirm the UI warns that `.env` is not protected.
12. Approve the protection update.
13. Confirm `.gitignore` now protects `.env` and the warning is cleared.

## Automated Verification Targets

- Server unit tests cover `.env` parsing/writing, preservation of unrelated values, SSH private key validation, SSH directory listing, and `.gitignore` protection checks.
- Handler tests cover successful saves, invalid key rejection, protection status responses, approved ignore-file updates, and blocked update errors.
- UI tests cover the identity dialog's selector flow, manual path validation errors, persistence warnings, approval action, declined warning state, and pending-state guards.
- Integration tests cover a repository with no `.gitignore`, a repository with `.gitignore` missing `.env`, and a repository where `.env` is already ignored.

## Expected Commands

```sh
npm run lint
npm test
npm run build
```

## Verification Notes

- 2026-05-24: Automated verification completed with `npm run lint`, `npm test`, and `npm run build`.
- 2026-05-24: A separate browser walkthrough was not required for this implementation pass; the SSH key picker, manual path validation, persistence, and `.gitignore` protection flows are covered by server, integration, and UI tests.
