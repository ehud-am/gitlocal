# Research: Folder and Repository Capabilities

## Decision: Treat a Regular Folder as the Active Local Root

**Rationale**: The existing product already tracks one active repository or picker folder and exposes tree/file mutation operations relative to a root. Generalizing that active root to support non-git folders keeps the user model simple: open a local root, browse entries, view files, and mutate files relative to that root.

**Alternatives considered**:
- Add a separate non-git folder mode with distinct endpoints. Rejected because it duplicates file viewing and mutation behavior.
- Require users to initialize git before editing files. Rejected because the feature specifically targets folders that are not under git.

## Decision: Reuse File Operation Semantics for Non-Git Folders

**Rationale**: Existing create, update, delete, file content, and tree contracts already describe the interactions users need. The implementation should preserve revision tokens, editable-file checks, binary handling, duplicate-path checks, and clear blocked/conflict/failed outcomes for both git working trees and regular folders.

**Alternatives considered**:
- Make non-git folders read-only. Rejected because create, update, and delete are core requirements.
- Add bulk file operations. Rejected as outside the requested scope and riskier for local filesystem safety.

## Decision: Enforce Root-Relative Path Safety for Every Folder Operation

**Rationale**: Regular folder operations mutate local filesystem contents, so path normalization must prevent traversal outside the selected root. This mirrors repository-relative safety expectations for git working trees and is required for predictable local-first behavior.

**Alternatives considered**:
- Accept absolute file paths in mutation requests. Rejected because it increases accidental edits outside the selected folder.
- Trust UI-only validation. Rejected because server-side validation is required for safety.

## Decision: Keep Folder Browsing Hierarchical and Complete per Directory

**Rationale**: The app's current tree interaction is directory-oriented. For regular folders, each opened directory should show the complete list of immediate child files and folders, allowing the user to reach all nested files without loading an entire large filesystem subtree at once.

**Alternatives considered**:
- Load every descendant into one flat list. Rejected because it is less usable for nested projects and can degrade performance on large folders.
- Limit regular folders to top-level files. Rejected because the spec requires the full file list.

## Decision: Move Remote Repository Identity into the First Expanded Repository Row

**Rationale**: The compact repository view already shows the current branch. The expanded view should instead put local path and remote repository together so users can compare local and remote identity in one scan.

**Alternatives considered**:
- Keep branch, remote, and upstream sync together. Rejected because this repeats compact-row information and preserves the confusing expanded layout.
- Hide remote repository identity entirely. Rejected because the user explicitly wants local-vs-remote in a single line.

## Decision: Remove Commit and Remote Sync Actions from Repository Context UI

**Rationale**: The user handles commit and remote sync in another tool. Removing these actions from the visible repository context reduces distraction and prevents users from assuming GitLocal is the primary workflow for those operations.

**Alternatives considered**:
- Keep the actions behind an advanced menu. Rejected because the requested behavior is that the options are not needed.
- Remove backend handlers immediately. Deferred because the requirement targets the option surface; retaining backend handlers avoids unnecessary contract churn unless implementation confirms they are unused.

## Decision: Represent SSH Key Path as Editable Git Identity Data

**Rationale**: The SSH key path belongs with repository identity because it determines how the local repository authenticates to its remote. The value should be visible with existing identity fields and editable from the same identity dialog.

**Alternatives considered**:
- Show SSH key path near remote sync controls. Rejected because remote sync controls are being removed.
- Make SSH key path read-only. Rejected because the feature requires editing.

## Decision: Store SSH Key Path in Repository-Local Git Configuration

**Rationale**: Repository-local configuration keeps the setting scoped to the selected repository and avoids changing a user's global git identity. The implementation should read an existing repository-local SSH command when possible and update the repository-local value when the user saves a path.

**Alternatives considered**:
- Store SSH key path in app-only state. Rejected because runtime state is derived from filesystem/git metadata and should persist outside the process.
- Write global git configuration. Rejected because the user is editing repository identity, not all repositories on the machine.
