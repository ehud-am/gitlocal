# Research: Ignored Local File Visibility

## Decision 1: Add a shared `localOnly` flag to browse and search records

- **Decision**: Extend the server/client tree and search models with a single `localOnly: boolean` field instead of creating ignored-only endpoints or separate view-specific state.
- **Rationale**: The feature needs one consistent signal that the UI can reuse everywhere it lists repository items. A boolean keeps the shared types compact, avoids duplicating view logic, and lets the UI express the user-facing language as "Local only" without leaking git jargon into every component.
- **Alternatives considered**:
  - Separate ignored-item lists per surface: rejected because it would fragment the browsing model and create inconsistent filtering rules.
  - `ignored: boolean`: rejected because it pushes git terminology into the presentation model when the product goal is a clearer local-only explanation.
  - Multi-value status enum: rejected because the feature currently needs only two display states.

## Decision 2: Use filesystem-backed working-tree enumeration for current-branch visibility

- **Decision**: Keep historical and non-current branch browsing on git tree data, but enumerate current working-tree entries from the filesystem so tracked, untracked, and ignored local items can all be surfaced when appropriate.
- **Rationale**: Ignored items do not exist in git tree listings for the working tree, so current-branch visibility must come from the local filesystem. The existing working-tree directory listing already follows that model and can be extended without changing historical branch behavior.
- **Alternatives considered**:
  - Merge `git ls-files` output with filesystem scans at render time: rejected because it complicates deduplication and still requires a filesystem walk for ignored folders.
  - Continue using tracked-only search helpers while changing tree browsing only: rejected because the feature would feel inconsistent and incomplete.

## Decision 3: Keep `.git` and other intentionally hidden internals excluded

- **Decision**: Expand working-tree visibility to ignored local content while continuing to hide repository internals such as `.git`, and continue treating hidden dotfiles separately in root-entry empty-state logic.
- **Rationale**: The feature is about showing meaningful local project content, not exposing repository internals or every hidden filesystem artifact. Preserving those exclusions keeps the UI understandable and aligned with current product behavior.
- **Alternatives considered**:
  - Show every ignored filesystem path including `.git`: rejected because it would surface internal metadata that users should not browse as project content.
  - Reuse the previous tracked-only root-count logic unchanged: rejected because ignored-only repositories or folders would still look empty.

## Decision 4: Treat ignored visible items as real content for empty-state decisions

- **Decision**: Count visible ignored local items when determining whether the current repository root or folder should display content instead of an empty-state message.
- **Rationale**: Once ignored items are intentionally shown in the browser, empty-state logic must treat them as legitimate visible content. Otherwise the UI would contradict itself by showing "empty" while also displaying local-only items elsewhere.
- **Alternatives considered**:
  - Reserve empty-state suppression for tracked items only: rejected because it would leave ignored-only repositories and folders feeling broken.
  - Add a separate ignored-only empty-state mode: rejected because it adds state complexity without improving user comprehension.

## Decision 5: Reuse a compact "Local only" cue across all visible surfaces

- **Decision**: Apply the same local-only wording and styling pattern anywhere a user can discover or act on an ignored item, including tree nodes, directory rows, search results, and the active content context.
- **Rationale**: A single cue pattern makes the feature easier to learn and reduces the chance that users misread ignored items as tracked repository content in one surface but not another.
- **Alternatives considered**:
  - Use different indicators in each surface: rejected because it would create unnecessary cognitive load.
  - Use warning-like colors or heavy alerts: rejected because the feature is informational, not an error state.
