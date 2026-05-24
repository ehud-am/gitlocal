# Data Model: Git Identity Settings

## ProjectGitIdentity

Represents the identity GitLocal shows and saves for the currently opened project.

### Fields

- `name`: Non-empty string after trimming.
- `email`: Non-empty string after trimming; should be suitable for git author email usage.
- `sshKeyPath`: Optional string path to an SSH private key.
- `source`: One of `private-settings`, `local-git-config`, `global-git-config`, or `mixed`.
- `protection`: Current `PrivateSettingsProtectionState`.

### Relationships

- Reads from and writes to `PrivateIdentitySettings`.
- Synchronizes name/email/SSH key path into repository-local git configuration for active git behavior.
- References one `SshPrivateKeyCandidate` when an SSH key path is present.

### Validation Rules

- `name` is required to save.
- `email` is required to save.
- `sshKeyPath`, when present, must point to a readable valid SSH private key file.
- Private key contents must never be included in API responses, UI text, logs, or test fixtures beyond minimal fake fixtures.

### State Transitions

- `empty` -> `draft`: user edits fields.
- `draft` -> `invalid`: required field or key validation fails.
- `draft` -> `saved-unprotected`: values save while private settings are not protected and user has not approved protection.
- `draft` -> `saved-protected`: values save and `.env` is protected by `.gitignore`.

## PrivateIdentitySettings

Represents GitLocal-owned project-local private settings stored in `.env`.

### Fields

- `filePath`: `.env` at the repository root.
- `gitName`: Stored GitLocal git author name value.
- `gitEmail`: Stored GitLocal git author email value.
- `gitSshKeyPath`: Stored GitLocal SSH private key path value.
- `exists`: Whether the settings file exists.
- `readable`: Whether GitLocal can read it.
- `writable`: Whether GitLocal can create or update it.

### Validation Rules

- GitLocal-owned keys must be updated without destroying unrelated `.env` values.
- Missing values should fall back to existing git config reads where appropriate.
- File write errors must produce actionable user-facing messages.

## SshPrivateKeyCandidate

Represents a local file considered for SSH key selection.

### Fields

- `path`: Full local path for selection and save.
- `name`: Display name derived from the file name.
- `valid`: Whether the file passes private-key validation.
- `reason`: Optional user-facing reason when validation fails for manual path checks.

### Validation Rules

- Candidate must be a regular readable file.
- Candidate must contain a recognized SSH private key header in a bounded prefix.
- Public keys, known hosts, config files, directories, symlinks to invalid targets, and unreadable files are invalid.
- Passphrase-protected private keys remain valid.

## SshKeyDirectory

Represents the browsable key directory for the current platform.

### Fields

- `path`: Conventional SSH folder path when available.
- `exists`: Whether the folder exists.
- `readable`: Whether GitLocal can list it.
- `keys`: Valid `SshPrivateKeyCandidate` entries.
- `message`: Optional fallback or error guidance.

### Validation Rules

- macOS/POSIX default is the user's `.ssh` folder under the home directory.
- Windows default is the user's `.ssh` folder under the user profile.
- If unavailable, the UI still allows arbitrary path entry.

## PrivateSettingsProtectionState

Represents whether `.env` is protected from commits by the repository ignore file.

### Fields

- `settingsPath`: `.env`.
- `ignoreFileExists`: Whether `.gitignore` exists at the repository root.
- `protected`: Whether `.gitignore` covers `.env`.
- `status`: One of `protected`, `missing-ignore-file`, `missing-entry`, or `blocked`.
- `message`: User-facing warning or confirmation.
- `canApplyFix`: Whether GitLocal can offer to create or update `.gitignore`.

### Validation Rules

- Equivalent ignore entries that cover `.env` should count as protected.
- Duplicate `.env` entries must not be added.
- GitLocal must not create or update `.gitignore` without user approval.
- Read/write failures must return `blocked` with an actionable message.

## IgnoreFileUpdateRequest

Represents the explicit user-approved request to protect `.env`.

### Fields

- `approved`: Must be true for the update action to run.
- `action`: One of `create-ignore-file` or `add-entry`.
- `result`: Updated `PrivateSettingsProtectionState`.

### Validation Rules

- Requests without explicit approval are rejected.
- If `.gitignore` becomes protected before the update runs, the action is a no-op success.
- Updates preserve existing ignore-file content.
