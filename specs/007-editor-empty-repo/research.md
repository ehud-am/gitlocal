# Research: Editor Workspace, Folder-First Main View, and Markdown Comment Hiding

## Decision 1: Expand the inline editor inside the current content panel instead of introducing a new editing surface

- **Decision**: Keep editing inside the existing content panel and make the editor container and textarea stretch to use substantially more of the available panel width and height.
- **Rationale**: The current edit flow already handles file mutation, action controls, and data refresh. The problem is presentation density, not workflow coverage, so improving the existing surface is the lowest-risk change.
- **Alternatives considered**:
  - Full-screen or modal editor: rejected because it adds navigation overhead and breaks the lightweight browsing flow.
  - New multi-pane IDE layout: rejected because it expands scope beyond the product's current design direction.

## Decision 2: Use the current folder as the default main-panel fallback instead of a custom recovery or empty-state panel

- **Decision**: When no primary file is selected, render the current folder's immediate child files and folders in the main panel rather than a dedicated "pick up where you left off" or repository-landing message.
- **Rationale**: The user wants the main view to remain actionable and consistent with browsing behavior. Showing the current folder contents gives immediate utility and avoids making the panel feel like a dead end.
- **Alternatives considered**:
  - Dedicated recovery panel after repo changes: rejected because the clarified requirement explicitly removes that experience.
  - Generic no-selection placeholder: rejected because it provides less value than showing actual repository contents.

## Decision 3: Reuse the non-git folder browser's visual and interaction pattern inside repository browsing

- **Decision**: The in-repo folder list should adopt the same basic row layout and interaction style as the existing non-git folder browser, including a visible action affordance on the right and double-click support on the row.
- **Rationale**: Reusing an already-familiar pattern keeps the product consistent and reduces the amount of new UI users need to learn.
- **Alternatives considered**:
  - Introduce a brand-new folder-view design for repositories: rejected because it would create unnecessary visual inconsistency.
  - Rely on double-click alone: rejected because the user explicitly asked for an `Open` button as well.

## Decision 4: Keep lightweight repository metadata so the client can choose a sensible default folder context

- **Decision**: Continue exposing enough repository metadata for the client to know whether the repo has commits and whether the root has browseable entries, while using current-folder navigation data for the main-panel list itself.
- **Rationale**: Even after removing the custom recovery panel, the client still needs authoritative local signals to decide how to seed the initial browsing view and avoid awkward empty states in freshly initialized repositories.
- **Alternatives considered**:
  - Infer all fallback behavior from ad hoc tree calls only: rejected because it makes the no-selection experience harder to reason about.
  - Drop repo metadata entirely: rejected because fresh `git init` repositories still need to be distinguished from populated repos.

## Decision 5: Hide markdown comments only in rendered mode

- **Decision**: Strip or suppress markdown comment content only for rendered markdown presentation, while leaving raw mode unchanged.
- **Rationale**: Users expect rendered markdown to hide commented content, but raw mode should remain a faithful view of the file source.
- **Alternatives considered**:
  - Show comments in rendered mode: rejected because it directly conflicts with the clarified requirement.
  - Strip comments from both rendered and raw views: rejected because it would make raw mode inaccurate.
