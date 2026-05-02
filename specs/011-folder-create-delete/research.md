# Research: Folder Create And Delete

## Decision: Reuse working-tree-only mutation rules

**Rationale**: Folder creation and deletion mutate local filesystem state, so they should follow the same boundary as manual file operations: allowed only for the current working tree and blocked for historical branches or preview contexts. This keeps local browsing, branch previews, and destructive operations conceptually separate.

**Alternatives considered**:

- Allow folder operations on any visible branch: rejected because non-working-tree branches are immutable git object views in the current product model.
- Hide folder operations entirely when git state is dirty: rejected because creating and deleting local files/folders is a working-tree editing action and should remain available, with git status reflecting the result.

## Decision: Validate child names before building target paths

**Rationale**: The user creates a subfolder inside the current folder, not an arbitrary path. Accepting only a single folder name prevents path traversal, accidental nested creation, absolute path entry, and confusing cross-folder behavior. The server still performs repository-boundary resolution before mutation.

**Alternatives considered**:

- Allow slash-separated nested paths in the create dialog: rejected for this release because the primary use case is direct subfolder creation and nested path entry increases validation and UX ambiguity.
- Trust client-side validation: rejected because filesystem mutation must be protected server-side.

## Decision: Count files recursively at preview and confirmation time

**Rationale**: The spec requires the confirmation to explain how many files inside the folder will be deleted. The count must include all nested file entries regardless of tracked, untracked, ignored, hidden, or modified status because the delete action removes local working-tree content, not just git-tracked content. The confirmation-time recount prevents the user from approving stale impact information.

**Alternatives considered**:

- Count only tracked files: rejected because ignored or untracked files would still be deleted and must be disclosed.
- Count folders and files together as one number: rejected because the user explicitly asked for how many files are inside the folder; folder count can be shown separately if helpful, but the required number is file count.
- Use a cached preview count without revalidation: rejected because folder contents may change between opening and confirming.

## Decision: Require exact displayed folder name for deletion

**Rationale**: A GitHub-style typed confirmation is a strong, familiar safeguard for destructive operations. Matching the displayed folder name is easy to understand and prevents one-click accidental deletion. The UI should keep the final action unavailable until the value matches exactly.

**Alternatives considered**:

- Require typing the full repository-relative path: rejected because it is safer in some duplicate-name cases but more error-prone for non-technical users. The confirmation will still display folder location for disambiguation.
- Require typing a generic word such as `delete`: rejected because it does not prove the user read which folder is affected.

## Decision: Block repository root deletion

**Rationale**: The feature is for deleting folders inside a repository, not deleting the repository itself. Blocking root deletion avoids catastrophic mistakes and keeps the scope aligned with folder browsing.

**Alternatives considered**:

- Allow root deletion with extra confirmation: rejected because it is outside the feature scope and would behave like deleting an entire repository.

## Decision: Report blocked and partial failures conservatively

**Rationale**: Recursive deletion can fail due to permissions, file locks, external changes, or operating-system behavior. The product should never claim success unless the selected folder is gone. On failure, it should preserve whatever could not be safely removed and explain the blocking reason.

**Alternatives considered**:

- Best-effort deletion with a success message if most files are removed: rejected because partial destructive changes require explicit reporting.
- Preflight every permission and lock condition: rejected because the filesystem can change between preflight and deletion; confirmation-time validation and clear failure reporting are still required.
