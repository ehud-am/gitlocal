# Research: Git Identity Settings

## Decision: Persist GitLocal project identity in `.env`

**Rationale**: The user explicitly asked whether `.env` should be used, and it is a familiar project-local private settings file that users already expect to keep out of version control. Using GitLocal-owned variables in `.env` keeps the data readable and recoverable while avoiding a hidden global store that could leak settings across projects.

**Alternatives considered**:

- Repository-local git config only: rejected because it stores active git behavior but does not provide an app-owned protection workflow for private settings and warnings.
- Global user preferences: rejected because requirements are project-specific and values must not silently carry across repositories.
- A hidden GitLocal-specific file such as `.gitlocal.env`: reasonable, but less aligned with the user's stated preference and would require a separate ignore pattern. This can be revisited if `.env` conflicts with future product behavior.

## Decision: Synchronize `.env` identity with repository-local git config

**Rationale**: Existing behavior updates repository-local `user.name`, `user.email`, and `core.sshCommand`. Keeping that behavior preserves current git command compatibility while `.env` becomes the durable GitLocal project settings source. On load, GitLocal can prefer `.env` values when present and fall back to local/global git config where needed.

**Alternatives considered**:

- Use `.env` only and avoid git config: rejected because local git commands need configured author and SSH command behavior.
- Use git config only and skip `.env`: rejected because it does not satisfy the requested private settings and `.gitignore` protection workflow.

## Decision: Validate SSH private keys by inspecting local file metadata and private-key headers

**Rationale**: A valid selector must exclude public keys, known hosts, configs, directories, and unrelated files. Node.js can inspect file type, readability, and a small bounded prefix to identify common private key headers without reading, returning, or logging complete key contents. Encrypted private keys remain valid because identifying the private key format does not require a passphrase.

**Alternatives considered**:

- Shell out to `ssh-keygen`: rejected for v1 planning because it adds platform/tool availability variability and may require passphrase handling in some cases.
- Extension-based filtering: rejected because SSH private keys often have no extension and public/private key naming conventions are not sufficient.
- Accept any file path: rejected because it would not meet the requirement to list only valid private keys and validate manual paths.

## Decision: Use conventional SSH folders per platform with manual path fallback

**Rationale**: macOS and Linux conventionally use `~/.ssh`; Windows commonly uses `%USERPROFILE%\.ssh`. The feature should start there when available, but manual path entry must remain available for nonstandard key storage, unreadable folders, or missing home directory resolution.

**Alternatives considered**:

- Browser-native file picker: rejected because the local browser cannot reliably enumerate arbitrary local files or start in `~/.ssh` without server support.
- Require manual path only: rejected because it preserves the current error-prone workflow.

## Decision: Represent ignore-file protection as a status plus explicit approval action

**Rationale**: The UI needs to warn when `.env` is not protected and must not alter `.gitignore` without approval. A status check can describe whether protection is present, missing, or blocked. A separate approval action can create or update `.gitignore`, making user consent auditable and testable.

**Alternatives considered**:

- Automatically update `.gitignore` during save: rejected because the requirement explicitly requires user approval.
- Block all saves until `.gitignore` is fixed: rejected because users may intentionally manage protection themselves; the required behavior is warning and approval flow.

## Decision: Avoid adding runtime dependencies

**Rationale**: The required behavior can be implemented with Node.js filesystem/path/os utilities and existing Hono/React patterns. Avoiding new dependencies aligns with the constitution's dependency-bloat guidance and keeps packaging smaller.

**Alternatives considered**:

- Add dotenv parser/writer: rejected for v1 because the required GitLocal-owned key/value lines are simple and can be handled with a small targeted parser/writer that preserves unrelated lines.
- Add SSH key parsing library: rejected because header-based validation is sufficient for the acceptance criteria without processing private key material.
