# Research: Mac Markdown Open Preview

## Decision: Make default Markdown-reader setup opt-in on first run

**Rationale**: Finder double-click behavior is controlled by the user's operating-system file association. GitLocal should offer the convenience, but becoming the default Markdown reader changes a user preference outside the app, so it must happen only after an explicit first-run opt-in.

**Alternatives considered**:

- **Automatic default-reader change on install or first launch**: Rejected because it changes an OS-level preference without consent.
- **No prompt, only macOS System Settings**: Rejected because the feature should still be discoverable to less-technical users.
- **Ask every launch until accepted**: Rejected because declining users should keep using GitLocal without repeated interruption.

## Decision: Advertise Markdown open capability while making default-reader setup opt-in

**Rationale**: The app bundle can advertise that GitLocal can open Markdown files so users can choose it through macOS controls. Changing the default Markdown reader enables the requested normal double-click workflow and must be gated by the user's first-run consent.

**Alternatives considered**:

- **Browser-only file open**: Rejected because browsers cannot become a normal Finder double-click target for local Markdown files in the same way a native app can.
- **Custom URL scheme only**: Rejected because it would require a separate launcher action and would not satisfy double-clicking a Markdown file in Finder.
- **CLI-only file argument**: Useful for parity and tests, but insufficient for the requested macOS double-click workflow.

## Decision: Keep Swift as a thin open-request forwarding layer

**Rationale**: The constitution permits a scoped macOS wrapper only as a shell around the shared Node.js-served React UI. The wrapper should capture file-open events, queue them when the service is still starting, and forward the local file target to the existing app path once the local service and web view are available.

**Alternatives considered**:

- **Native Markdown preview in Swift**: Rejected because it forks product behavior and violates the shared UI model.
- **Native filesystem/repository classification in Swift**: Rejected because the TypeScript server already owns local path classification and repository context behavior.
- **Separate native persistence for opened files**: Rejected because startup/open state can remain in process or existing startup preference flows.

## Decision: Add an explicit startup/open target contract

**Rationale**: The existing open-folder/file behavior already supports resolving a file to `rootPath`, `selectedPath`, and `selectedPathType`. Finder-open startup needs equivalent first-load state so the React app can select the requested file before default README or saved viewer state wins.

**Alternatives considered**:

- **Encode selected file only in browser local storage**: Rejected because native open requests must override previous viewer state and work before the user has interacted with the UI.
- **Infer target from URL fragment only**: Rejected because the local server still needs the folder/repository context for all API calls.
- **Use default README selection after opening the folder**: Rejected because it misses the primary user intent: show the exact double-clicked file.

## Decision: Finder-open requests override last-opened and README defaults

**Rationale**: A direct user action to open a specific file is stronger than automatic recovery state. It should select the requested Markdown document even if GitLocal has a saved folder, saved selected file, startup preference, or default README discovery.

**Alternatives considered**:

- **Preserve last selected file within the same repository**: Rejected because it makes double-clicking a file appear unreliable.
- **Show a prompt when state conflicts**: Rejected because the intent is unambiguous and extra confirmation slows a simple open action.

## Decision: Use a GitHub-like folder page with tree first and README below

**Rationale**: The current tree/README tab distinction is too subtle for the target audience. GitHub's folder page pattern is familiar: show the file/folder list first, then render the README below when present. This makes navigation unavoidable without sacrificing README reading. A quick README link near the top lets readers jump down immediately, while keeping the tree as the first visible object on the page.

**Alternatives considered**:

- **README-first folder tabs**: Rejected because hiding the tree behind a top-level tab caused the reported discoverability problem.
- **Persistent split pane with tree beside preview**: Rejected after clarification because the desired design should return to the GitHub pattern rather than introduce an IDE-like split workspace.
- **Tree-only first screen with preview after selection**: Rejected because it weakens GitLocal's Markdown reading orientation and makes README discovery less direct.
- **Full IDE layout with multiple editor panes**: Rejected because GitLocal should optimize for reading, browsing, and lightweight intervention rather than full editing workflows.

## Decision: Show dotfiles by default with a checkbox to hide them

**Rationale**: Dotfiles often contain important project configuration. Showing them by default avoids hiding meaningful repository context, while a simple checkbox gives users a density control when they want a cleaner folder view. The checkbox should not reset the active folder, selected file, or scroll target.

**Alternatives considered**:

- **Hide dotfiles by default**: Rejected because it can make important project files appear missing.
- **Put dotfiles behind an advanced settings menu**: Rejected because the density control should be visible and lightweight near the folder tree.
- **Persist separate dotfile settings per folder**: Deferred because it adds state complexity without being necessary for this usability fix.

## Decision: Scope association to `.md` first

**Rationale**: The user explicitly requested Markdown file double-click behavior, and `.md` is the common extension already used throughout the product and tests. Other Markdown-like extensions can follow only if the product already treats them as first-class Markdown files.

**Alternatives considered**:

- **Register all text files**: Rejected because it would make GitLocal an overly broad file handler.
- **Register every Markdown-like extension immediately**: Deferred to avoid surprising OS-level ownership for extensions not yet clearly supported by the product.

## Decision: Validate native metadata through build/package smoke checks

**Rationale**: TypeScript coverage cannot validate macOS document type registration. The implementation should add or update native validation notes/scripts to confirm the built app advertises Markdown file handling and still starts the same local service.

**Alternatives considered**:

- **Manual validation only**: Rejected because packaging metadata can regress silently.
- **UI tests only**: Rejected because browser/UI tests cannot inspect app bundle registration metadata.
