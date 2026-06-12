# Changelog

## Unreleased

## 0.9.8 - 2026-06-12

- Added viewer usability upgrades for README-first folder views, rendered Markdown find highlights, scoped repository search, changed-file review, repository status summaries, and safer rare-edit conflict handling.
- Added QA-level automated coverage for search partial results, stale external-edit refresh handling, narrow-window layout, stale save protection, and large search result pagination.
- Fixed repository status summaries so external file refreshes invalidate summary and navigation hint data instead of leaving stale local-change counts visible.
- Improved narrow-window layout so the sidebar stacks above content instead of squeezing the viewer into a narrow strip.
- Removed obsolete commit dialog/header callback code and stale CSS selectors left behind by earlier UI revisions.

## 0.9.7 - 2026-06-09

- Fixed the README logo so it renders reliably from the hosted project README while staying backed by a committed repository asset.
- Moved rendered Markdown share actions into the same toolbar row as Find in file, removing the dedicated sharing row and reclaiming vertical reading space.
- Removed the redundant "Sharing uses the saved Markdown content." helper text while preserving existing Save PDF, Share, and Copy behavior.

## 0.9.6 - 2026-06-08

- Fixed patch regressions in the file action surface: Copy is now a visible icon-and-label button for text views, unsupported Email/Slack/Print actions were removed, Share has an icon, and Save PDF opens a clean rendered document for local PDF saving.
- Hardened git folder recognition by preserving the canonical repository root when repositories are opened through path aliases such as symlinks.
- Added icons to Refresh, Find in file, and Light/Dark theme controls without changing their existing behavior.

## 0.9.5 - 2026-06-07

- Added rendered Markdown output actions for printing, Save as PDF through print/save-to-PDF, email, Slack/system sharing, copy, and download fallbacks.
- Added a prominent Refresh button that uses the same current-view reload behavior as the native Refresh command.
- Added focused undo/redo handling for the inline file editor and native macOS Undo/Redo menu forwarding.
- Added panel-scoped Select All handling so Command-A collects the current content panel without selecting app chrome, while focused fields keep native selection.
- Changed no-argument startup to reopen the last used folder when available, otherwise start from the user's Documents folder with home-folder fallback.

## 0.9.4 - 2026-06-01

- Fixed native macOS app menu and keyboard handling for standard Copy, Cut, Paste, Find, and Refresh commands.
- Scoped native Command-F to GitLocal's current file preview instead of searching app chrome.
- Added native Refresh handling that reloads repository, tree, file, README, branch, and sync state without restarting the app.
- Added focused UI coverage and native manual acceptance notes for shortcut command behavior.

## 0.9.3 - 2026-05-27

- Changed git identity settings to read and write repository-local git config for `user.name`, `user.email`, and SSH command behavior, removing the separate project `.env` identity store.
- Kept SSH private key discovery and validation while making saved identity values visible to normal Git commands through the repository's own local config.
- Added a channel-specific npm README so the npm package stays focused on browser usage while the GitHub README carries native macOS and source-build details.
- Documented the alpha unsigned macOS app status, first-run quarantine approval command, and GitLocal icon in the GitHub README.

## 0.9.2 - 2026-05-26

- Fixed the folder picker sidebar collapse/expand regression introduced in 0.9.0 so the native app and browser picker collapse to a narrow navigation rail instead of leaving a blank sidebar column.

## 0.9.1 - 2026-05-26

- Fixed the macOS app package by signing the finalized bundle after packaged Node, server, UI, and icon resources are copied into `GitLocal.app`.
- Added release validation that fails if the macOS app bundle signature is invalid before packaging.

## 0.9.0 - 2026-05-26

- Added the macOS Homebrew native app distribution scaffold, including a Swift/WebKit wrapper, cask template, packaging and validation scripts, and a macOS app artifact workflow.
- Preserved the npm package as the primary cross-platform distribution and added regression coverage to keep native packaging artifacts out of the npm package.
- Amended project governance to allow a scoped macOS native wrapper while keeping the TypeScript/Node product core intact.
- Updated product documentation to position GitLocal for less-technical builders in AI-driven development workflows, where browsing, Markdown review, and lightweight intervention matter more than a full IDE.

## 0.8.0 - 2026-05-24

- Added project-persistent git identity settings backed by local `.env` values while keeping repository-local git config synchronized for author name, email, and SSH command behavior.
- Added SSH private key discovery from the user's conventional SSH folder, filtering to valid private key files while preserving manual path entry for nonstandard key locations.
- Added validation for selected SSH private key paths, including passphrase-protected key acceptance without reading or exposing key contents.
- Added `.env` protection checks that warn when private identity settings are not ignored and can create or update `.gitignore` after explicit user approval.
- Expanded server, integration, and UI coverage for identity persistence, SSH key validation, and private-settings protection flows.

## 0.7.2 - 2026-05-20

- Fixed folder-picker classification for symlinked repository folders inside plain parent folders so they appear and open as git repositories instead of regular files or folders.

## 0.7.1 - 2026-05-19

- Fixed folder-picker and startup detection so actual git repository roots open with repository capabilities, while ordinary folders inside a repository remain folder roots instead of being mislabeled as repositories.
- Pinned the UI test dependency tree to patched `ws` versions so release verification audits pass cleanly.

## 0.7.0 - 2026-05-18

- Unified folder and repository opening so plain folders open in the main viewer, while git repositories add branch, remote, and identity context.
- Updated the picker to list files, folders, and git repositories, navigate into folders on double-click, and use one explicit Open action for the selected entry.
- Simplified expanded repository context by showing local and remote repositories together while removing repeated branch, upstream sync, commit, and remote sync controls.
- Added repository-local SSH key path viewing and editing to git identity settings.
- Improved git repository startup by rendering the initial viewer before slower remote and identity decoration finishes loading.
- Hid local-only badges for plain folders while preserving them for git repository entries where they distinguish untracked or ignored working-tree content.

## 0.6.3

- Added a non-executing package entry point so package size analyzers and import resolvers can resolve GitLocal without launching the CLI server.
- Kept the `gitlocal` command-line entry separate from the importable package entry while continuing to publish both built files.

## 0.6.2

- Unified optional commands for picker folders, repository folders, and files behind consistent three-dots action menus.
- Styled delete options as red menu items while keeping non-destructive actions in normal menu styling.
- Upgraded file deletion to require exact typed-name confirmation with target location context, matching the existing strong folder delete safety model.
- Added contributor documentation with `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`, and linked them from the README.

## 0.6.1

- Moved folder deletion from the left navigation row icon into the main folder view action area.
- Styled the main folder delete action as a destructive outline control with red text and border while preserving the typed-name confirmation flow.
- Shortened local-only tags to `local` in the repository tree and folder views, with smaller compact tag styling for denser navigation.

## 0.6.0

- Added folder creation from repository and folder views so direct subfolders can be created inside GitLocal.
- Added recursive folder deletion with a strong confirmation dialog that explains the impact, shows file and nested-folder counts, and requires typing the folder name before deletion.
- Added backend safety checks and coverage for folder path validation, stale delete previews, duplicate names, ignored content, and recursive deletion boundaries.

## 0.5.4

- Changed repository search so it opens only from the repository search button and no longer overrides the browser's native `Cmd/Ctrl+F` behavior.
- Added an explicit in-file find panel for the currently viewed file, with match counts, previous/next navigation, and optional case-sensitive matching.
- Pinned patched `postcss` transitive versions through npm overrides so the release verification audit passes cleanly.

## 0.5.3

- Fixed branch switching so untracked files no longer trigger GitLocal confirmation flows, and branches already checked out in another git worktree now fail early with a clearer blocked message.
- Refined the expanded repository header so the git identity edit action sits inline as an icon control, and restyled metadata tags to read more like badges than mini buttons.
- Rebuilt repository search so it runs on explicit submit, supports file-name search, content search, or both, supports case-sensitive matching, and ignores queries shorter than three characters.
- Fixed current-branch search hangs by stopping recursive crawls into ignored local-only directories such as dependency folders or nested worktrees.

## 0.5.2

- Added file-level sync indicators so repository views can show uncommitted local changes, local-only commits, remote-only updates, and diverged file states while you browse.
- Added repository-level commit and safe remote sync actions so GitLocal can stage and commit current work, push ahead branches, and fast-forward pull behind branches directly through the local `git` executable.
- Expanded repository context details with upstream tracking and remote path cues, and clarified local-only state in the viewer header.
- Removed dead UI code and tightened the verification path so the release candidate meets the per-file coverage gate more reliably.

## 0.4.9

- Reissued the ignored-file visibility release from the updated trusted-publishing workflow on `main` after the previous `0.4.8` release still ran the older tag-scoped publish flow.
- Added ignored file and folder visibility across the repository tree, folder listings, and search so local-only content remains discoverable in the UI.
- Marked ignored content consistently as local-only in navigation and active file context to clarify that it exists only on the local machine and will not be pushed to a remote.
- Fixed ignored-only directories and roots so they no longer fall into misleading empty states when ignored content is the only visible content.
- Updated Hono, Vitest, and Vite dependencies to publish-safe versions so the release verification audit passes cleanly.

## 0.4.8

- Reissued the ignored-file visibility release after the previous npm publication attempt failed before the package reached the registry.
- Added ignored file and folder visibility across the repository tree, folder listings, and search so local-only content remains discoverable in the UI.
- Marked ignored content consistently as local-only in navigation and active file context to clarify that it exists only on the local machine and will not be pushed to a remote.
- Fixed ignored-only directories and roots so they no longer fall into misleading empty states when ignored content is the only visible content.
- Updated Hono, Vitest, and Vite dependencies to publish-safe versions so the release verification audit passes cleanly.

## 0.4.7

- Added ignored file and folder visibility across the repository tree, folder listings, and search so local-only content remains discoverable in the UI.
- Marked ignored content consistently as local-only in navigation and active file context to clarify that it exists only on the local machine and will not be pushed to a remote.
- Fixed ignored-only directories and roots so they no longer fall into misleading empty states when ignored content is the only visible content.
- Updated Hono, Vitest, and Vite dependencies to publish-safe versions so the release verification audit passes cleanly.

## 0.4.6

- Reserved the next release version for the upcoming editor workspace and empty-repository UX improvements captured in `007-editor-empty-repo`.

## 0.4.5

- Added manual local file creation, in-place editing, and deletion flows in the repository viewer with dirty-state protection and sync-aware refresh behavior.
- Updated GitHub Actions workflows to current `actions/checkout` and `actions/setup-node` majors so CI and publish runs no longer rely on deprecated Node 20 action runtimes.
- Simplified npm packaging ignore rules so release artifacts are defined by the tracked build outputs and package `files` list instead of a separate `.npmignore`.

## 0.4.4

- Added npm package keywords and richer package metadata so the npm package page is easier to discover and links cleanly back to the GitHub project.

- Fixed footer version rendering so GitLocal shows the actual running release version instead of falling back to `v0.0.0`.
- Added left-side line numbers to code-oriented viewer presentations for easier line-by-line reading and reference.
- Fixed cross-repository navigation so stale saved file or folder paths no longer carry over into a newly opened repository; GitLocal now clears that old location and falls back to the new repo's default landing context.
- Fixed cross-repository loading when a stale saved branch from a previously opened repository is still present in the URL; GitLocal now falls back to a valid branch in the newly opened repo automatically.
- Fixed startup repo detection so running `gitlocal` with no explicit path from inside a git repository opens the repository viewer immediately instead of requiring a picker detour.
- Improved the in-viewer quick finder so it floats as a true overlay, stays file-name focused, and avoids pushing content downward.
- Added a fixed footer that shows the current year, links `GitLocal` to the project repository, and displays the running version.
