# Research: Fix Git Folder Detection

## Decision: Classify Paths with Git Top-Level Plus Canonical Path Comparison

**Decision**: A folder is a repository root only when Git reports a worktree top-level path and the folder's canonical path exactly matches that top-level canonical path. A folder is inside a repository when Git reports a top-level path but the folder's canonical path is a descendant of that top-level path. A folder is regular when Git cannot resolve a containing worktree.

**Rationale**: The current broad repository validation is based on whether a path is inside a worktree, which is not the same as whether the selected folder is the repository root. Git's own top-level resolution is the authoritative source for standard repositories, worktrees, and submodule-style checkouts. Canonical path comparison removes ambiguity from symlinks, relative paths, and differently formatted input paths.

**Alternatives considered**:
- Checking only for a `.git` directory. Rejected because worktrees and submodules can use a `.git` file.
- Treating every path inside a worktree as a repository. Rejected because ordinary nested folders would receive repository labels and git-only actions.
- Walking parent directories manually. Rejected because Git already owns the rules for worktree discovery and repository metadata indirection.

## Decision: Introduce a Shared Local Path Classification Result

**Decision**: Replace scattered boolean checks with one shared classification result that identifies file, missing path, regular folder, repository root, and folder inside a repository. Existing booleans such as `isGitRepo` can remain in transport responses for compatibility, but they should be derived from the shared classification.

**Rationale**: The bug exists because different surfaces answer slightly different questions: the picker asks whether an entry should be badged, startup asks what active root should load, and handlers ask whether git features should be enabled. One shared classification keeps these answers consistent and testable.

**Alternatives considered**:
- Patch only the picker double-click behavior. Rejected because typed paths, startup paths, and server handlers could still disagree.
- Add more UI-only flags. Rejected because server-side active-root behavior would remain the source of capability mismatches.

## Decision: Open Repository Rows Instead of Browsing Into Them

**Decision**: When a picker entry is classified as a repository root, every supported open path should open it as the active repository root. Plain folders and folders inside a repository continue to browse or open as regular folders depending on the user's chosen action.

**Rationale**: The user expects a folder marked as a repository to enable repository-specific functionality immediately. Browsing into that row first keeps the app in picker/folder context and hides the expected git features.

**Alternatives considered**:
- Keep double-click as browse and require the Open button for repositories. Rejected because it preserves the confusing path that triggered the bug.
- Add separate "Browse" and "Open repository" actions. Rejected because the existing product direction is a single Open action with type-aware behavior.

## Decision: Preserve Folder-Inside-Repository as a Distinct Classification

**Decision**: A folder inside a repository but not equal to the repository root should be distinguishable from both a repository root and a folder outside git. For this patch, it remains user-visible as a folder, but the classification should be available for future behavior and tests.

**Rationale**: The user explicitly asked to detect a folder within a repo versus a regular folder. Even if both currently open as folder roots in many flows, keeping the distinction prevents future ambiguity and makes nested-folder tests explicit.

**Alternatives considered**:
- Collapse folder-inside-repository and regular-folder into one "not repo" state. Rejected because it loses the requested distinction and makes regressions harder to detect.

## Decision: Keep Classification Local and Fast

**Decision**: Classification must use local filesystem checks and local git metadata only. It should not fetch, contact remotes, inspect remote configuration, or require repository history to exist.

**Rationale**: A repository with no commits, no remote, or missing identity is still a repository. Classification should not depend on optional git details that are unrelated to whether a folder is a repository root.

**Alternatives considered**:
- Require branch, commits, or remote metadata before enabling repository mode. Rejected because empty repositories and local-only repositories are valid.
