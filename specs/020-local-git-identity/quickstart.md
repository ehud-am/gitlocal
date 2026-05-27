# Quickstart: Local Git Identity

## Prerequisites

- Node.js 22+
- Git installed and available to the local GitLocal service
- A local test repository
- Optional: a valid SSH private key file for SSH key path testing

## Manual Validation Flow

1. Start with a repository that has no local identity:

   ```sh
   git config --local --unset user.name
   git config --local --unset user.email
   git config --local --unset core.sshCommand
   ```

2. Run GitLocal for that repository.

3. Open the repository identity dialog.

4. Confirm the UI shows no repository-local identity is set.

5. Save a name, email, and optional SSH key path.

6. Confirm regular Git commands observe the saved local values:

   ```sh
   git config --local user.name
   git config --local user.email
   git config --local core.sshCommand
   ```

7. Reopen or refresh GitLocal and confirm the same values appear.

8. Open the same repository through the macOS native app distribution and confirm the same values appear.

9. Clear the identity fields in GitLocal and save.

10. Confirm the repository-local overrides are removed:

    ```sh
    git config --local --get user.name
    git config --local --get user.email
    git config --local --get core.sshCommand
    ```

## SSH Key Validation Checks

- Valid private key path saves successfully.
- Public key path is rejected.
- Missing file path is rejected.
- Directory path is rejected.
- Passphrase-protected private key path is accepted without requesting the passphrase.
- UI and server responses never display private key file contents.

## Regression Checks

- Saving identity in one repository does not change another repository.
- Values saved outside GitLocal with regular Git commands are visible after GitLocal refresh.
- Browser mode and native app mode show the same repository-local identity.
- The identity dialog no longer prompts users to create `.env` or update `.gitignore`.
- Removed identity protection endpoints are no longer used by the UI.

## Automated Validation

Run the standard project checks:

```sh
npm test
npm run lint
npm run build
```
