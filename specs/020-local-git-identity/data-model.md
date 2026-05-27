# Data Model: Local Git Identity

## Repository Git Identity

Represents the repository-local identity values GitLocal displays and manages for the active repository.

### Fields

- `name`: Repository-local author name. Empty when no local override exists.
- `email`: Repository-local author email. Empty when no local override exists.
- `sshKeyPath`: Repository-local SSH private key path derived from the repository's SSH command setting. Empty when no local key is configured.
- `source`: Indicates that returned values are repository-local, unset, or partially set.
- `validationState`: Current validity of editable values before save.

### Validation Rules

- Name and email must either both be present for a saved identity or both be cleared when removing local author identity.
- Email must be non-empty when name is non-empty.
- SSH key path is optional.
- When present, SSH key path must point to a readable valid SSH private key file.
- SSH private key contents must never be included in returned data, logs, or errors.

### State Transitions

- `unset` -> `configured`: User saves valid name and email, with optional SSH key path.
- `configured` -> `partially-configured`: External Git change removes only one local identity field.
- `configured` -> `unset`: User clears repository-local identity overrides.
- `configured` -> `invalid-key`: Previously configured SSH key path no longer points to a valid readable private key.

## SSH Private Key Candidate

Represents a file GitLocal may offer or accept as an SSH key path.

### Fields

- `name`: File name for display.
- `path`: Local filesystem path to the key file.
- `readable`: Whether the service can read enough metadata/content to validate the file.
- `valid`: Whether the file appears to be a private SSH key.
- `message`: Human-readable validation result.

### Validation Rules

- Candidate must be a regular file.
- Candidate must be readable by the local service process.
- Candidate must match recognized SSH private key material without returning that material to the UI.
- Public keys, known hosts files, config files, directories, missing files, and unreadable files are invalid.
- Passphrase-protected private keys are valid when identifiable as private keys.

## Identity Save Result

Represents the outcome of an identity read, save, clear, or validation operation.

### Fields

- `ok`: Whether the operation succeeded.
- `message`: User-facing success or error message.
- `user`: Repository Git Identity returned after a successful read or save.
- `errors`: Optional field-specific validation errors.

### Validation Rules

- Successful save results must reflect values observable by regular Git operations in the same repository.
- Failed save results must not partially report a value as saved unless it is observable afterward.
- Errors must be actionable without exposing private key contents.

## Repository Identity Context

Represents the active repository constraints for identity operations.

### Fields

- `repoPath`: Active repository root.
- `gitMetadataState`: Whether local Git metadata is available, readable, and writable.
- `distributionMode`: Browser mode or native app mode, used only for diagnostics and test coverage.

### Validation Rules

- Identity operations require an active repository with readable Git metadata.
- Save and clear operations require writable local Git configuration.
- Worktrees, submodules, nested repositories, and repositories with redirected Git metadata must follow normal Git behavior.
