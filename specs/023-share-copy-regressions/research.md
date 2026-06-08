# Research: Share and Copy Regression Patch

## Decision: Promote Copy to a Primary Text Action

Copy should be shown as an icon-and-label button anywhere the app already presents readable text content. The button should be available for raw source text and for rendered text output when both representations exist.

**Rationale**: Copy is a frequent lightweight intervention workflow. A link-style control under-communicates the action and makes it inconsistent with the rest of the toolbar.

**Alternatives considered**:

- Keep Copy as a link and only restyle it in Markdown views. Rejected because the regression report explicitly asks for a button and copy across all text-based files.
- Hide Copy in menus. Rejected because discoverability is part of the bug.

## Decision: Treat Raw and Rendered Copy as Active-Representation Actions

When the user is viewing raw text, Copy copies raw source text. When the user is viewing rendered text, Copy copies a useful plain-text representation of the rendered content.

**Rationale**: This keeps behavior predictable without adding extra controls for every view. It also satisfies the requirement that copy be available for raw data and rendered data.

**Alternatives considered**:

- Always copy raw source. Rejected because rendered views are specifically in scope.
- Always show separate "Copy Raw" and "Copy Rendered" buttons. Rejected for the patch unless the existing UI already has a compact place for representation-specific menu items; the primary requirement is broad availability and clarity.

## Decision: Remove Email, Slack, and Visible Print Actions

The share/action surface should no longer show Email, Slack, or Print.

**Rationale**: Email and Slack imply destination-specific behavior that the product does not integrate with. Print was requested for removal and overlaps with the internal mechanics needed to save PDFs in browser environments.

**Alternatives considered**:

- Keep Email and Slack behind feature detection. Rejected because the requested patch explicitly removes them.
- Keep Print as a fallback next to Save PDF. Rejected because the requested patch explicitly removes Print from the visible action surface.

## Decision: Keep Save PDF, Backed by a Dedicated Rendered Output Flow

Save PDF should remain a visible action for rendered text content. The implementation should prepare a clean rendered-output document and start the browser/OS save-to-PDF flow where available, with a clear failure message when the environment cannot complete it.

**Rationale**: Web runtimes generally do not expose a cross-platform direct PDF writer without adding a heavy dependency or remote service. A dedicated output document makes the existing browser/OS PDF path more reliable while preserving local-first behavior and avoiding a new dependency.

**Alternatives considered**:

- Add a PDF generation dependency. Rejected for this patch because the scope is regression repair and the current stack can use local browser/OS PDF saving.
- Remove Save PDF. Rejected because the reported bug is that Save PDF did not work, not that it should disappear.

## Decision: Use Existing Icon Conventions With Text or Accessible Names

Copy, Share, Find in File, Refresh, and Light/Dark Theme should use recognizable icons from the existing UI conventions and keep visible labels where those labels already exist or are requested.

**Rationale**: Icons make scanning faster, but controls still need accessible names and should not become ambiguous icon-only affordances unless the surrounding UI already uses that pattern.

**Alternatives considered**:

- Convert all toolbar actions to icon-only buttons. Rejected because the requested Copy control requires icon plus label, and hidden labels can reduce discoverability for less-technical users.

## Decision: Re-test Git Classification Across All Open Entrypoints

The git-folder regression should be fixed by validating one classification model across folder browse, typed path open, double-click open, current-folder open, direct CLI launch, and startup preference launch.

**Rationale**: The current code already has `classifyLocalPath`, `repositoryOpenHandler`, picker browse metadata, and `getInfo`. A regression can occur when one entrypoint sets active root state differently from the classification that the UI later reads. The plan should pin tests around these seams before changing logic.

**Likely cause to verify**: A repository root can be detected in one path flow but later shown as a folder if startup/open routing stores a nested or canonicalized path that does not match the repository root, or if an entrypoint bypasses `openMode: "repository"` and only sets a folder active root.

**Proposed fix direction**: Make the server's open/startup paths consume `classifyLocalPath` consistently, store `classification.repositoryRootPath || classification.canonicalPath` when opening a repository root, and return enough `gitState/openMode/repositoryRootPath` data for the UI to keep repository mode. Add regression tests for root repositories, nested folders, git worktrees where `.git` is a file, and non-git folders.

**Alternatives considered**:

- Add UI-only heuristics based on badges. Rejected because repository-aware behavior depends on server state and `/api/info`.
- Treat any folder inside a repository as a repository. Rejected because previous specs require nested folders inside a repository to remain folder-mode unless they are independent repository roots.
