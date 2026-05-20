# Research: Fix Nested Repository Detection

## Decision: Reproduce Mixed Plain-Parent Classification First

**Decision**: The implementation must begin with a focused reproducer where a regular filesystem parent contains at least one repository child and one regular child. The repository child must be validated through browse metadata, open routing, and active-root info.

**Rationale**: The reported behavior differs by entry point: direct startup in the repository works, while discovery from a plain parent can classify the same folder as regular. A mixed-parent reproducer isolates that exact boundary and prevents regressions where sibling folders inherit the wrong classification.

**Alternatives considered**:
- Reusing only repository-root tests from the previous patch. Rejected because those tests do not prove behavior when the browse root is non-repository.
- Manual-only verification. Rejected because this failure is a classification regression and should be covered automatically.

## Decision: Keep Git Top-Level Resolution as the Source of Truth

**Decision**: A repository child is detected by classifying the child folder itself and treating it as a repository only when the folder's canonical path equals Git's resolved worktree top-level path.

**Rationale**: This preserves the previous patch's distinction between a true repository root and an ordinary folder inside a repository. It also supports standard repositories, worktrees, and repository metadata indirection without parsing `.git` manually.

**Alternatives considered**:
- Checking only for a `.git` directory under the child. Rejected because valid repository roots can use a `.git` file.
- Treating a child as a repository when any ancestor or descendant contains git metadata. Rejected because ordinary folders near repositories would be mislabeled.

## Decision: Verify All Entry Points Against the Same Classification

**Decision**: Startup path handling, typed path opening, folder-browser Open, and folder-browser double-click should all result in the same repository-vs-folder classification for the same selected folder.

**Rationale**: The user specifically observed that direct startup is correct while parent-folder discovery is not. A shared expectation across entry points makes the bug measurable and keeps future UI changes from reintroducing the inconsistency.

**Alternatives considered**:
- Patching only the double-click interaction. Rejected because the Open button and typed-path submission could still disagree.
- Patching only server browse labels. Rejected because correct labels without correct open routing would still leave git features disabled.

## Decision: Preserve Plain Folder Sibling Behavior

**Decision**: Regular child folders listed beside repository children must remain regular folders, with repository-only labels and controls disabled.

**Rationale**: The fix must be precise. The previous feature explicitly protected ordinary nested folders and regular folders from being promoted to repositories, and this patch must preserve that behavior while correcting missed repository children.

**Alternatives considered**:
- Promoting all child folders under a known project parent to repository candidates. Rejected because the project has no reliable concept of a project parent and would create misleading labels.

## Decision: Keep the Patch Local and Dependency-Free

**Decision**: Do not add runtime dependencies or network behavior. Use existing local filesystem and git-command based classification.

**Rationale**: Repository classification is local metadata. A repository with no commits, no remote, or missing identity is still a repository, and detection should not depend on optional repository state or remote availability.

**Alternatives considered**:
- Reading remote configuration, branches, or commit history before classifying. Rejected because those details are optional and unrelated to whether the folder is a repository root.
