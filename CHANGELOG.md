# Changelog

## 0.13.0 - 2026-09-04

- Added PowerPoint preview: `.pptx` files render each slide as a best-effort formatted view (positioned text, background fill, embedded images) with next/previous navigation and a speaker-notes panel, replacing the previous binary-file fallback. Pixel-faithful rendering is not attempted — no free, license-compatible renderer exists for that.
- Fixed a repository write-path containment gap where a symlink placed at an intermediate path segment could let a file write escape the repository root; the containment check now re-verifies every intermediate segment, not just the final path.
- Fixed branch-search file-path parsing so filenames containing a colon are no longer misparsed as a branch delimiter.
- Fixed the changed-files review panel to correctly display renamed files whose paths contain spaces, non-ASCII characters, or quote characters.
- Fixed the integrated terminal to close non-terminal WebSocket upgrade attempts immediately instead of leaving them open.

## 0.12.0 - 2026-08-31

- Added CSV file preview: `.csv` files render as a scrollable table with the first row as headers (via lazily-loaded parsing), with a raw/pretty toggle matching Markdown/JSON/SVG, correct handling of quoted fields and embedded commas/newlines, and a clear fallback for malformed or empty files.
- Added Excel workbook preview: `.xlsx`/`.xls` files render the active worksheet as a table with a per-sheet tab strip, replacing the previous binary-file fallback. Cell values are the file's last-saved cached values only — formulas are never recalculated, external data links are never refreshed, and macros/dynamic content are never executed.
- Added a chart indicator for Excel sheets that are themselves dedicated chart tabs (a static "this sheet contains a chart" label); charts embedded inside a normal worksheet aren't flagged, since the underlying library exposes no reliable signal for that case.
- Fixed a gap where the UI test coverage gate wasn't actually checking the file-preview framework's own viewer components.

## 0.11.0 - 2026-08-29

- Added PDF preview (read-only, rendered locally with no network fetch) and SVG preview (rendered as an inert image so embedded scripts never execute).
- Introduced a registry-based file preview framework so new preview types can be added without touching the shared content panel, and fixed a gap where a file type's own editability flag could override the registry's read-only setting.
- Fixed two GitHub code-scanning alerts: incomplete HTML-comment stripping in Markdown rendering, and missing least-privilege permissions on a CI workflow.
- Linked gitlocal.dev from the npm and GitHub READMEs, and optimized the gitlocal.dev site for AI answer engines and search engines (structured data, a visible FAQ section, robots.txt, sitemap.xml, and llms.txt).

## 0.10.4 - 2026-08-27

- Replaced the README demo animation with a sharper, shorter promo GIF.

## 0.10.3 - 2026-08-26

- Fixed the file view's name/action-button header (Back to folder, Find in file, Copy, etc.) scrolling out of view on large files; it now stays pinned at the top in both view and edit mode.
- Added full keyboard navigation to the file tree (arrow keys, Enter/Space, roving tab focus), matching standard tree-widget behavior.
- Made the folder picker's directory list keyboard-accessible (Tab to move focus, Enter/Space to activate), matching the file tree's interaction model.
- Fixed the folder picker's directory rows always announcing "collapsed" to screen readers regardless of actual state.
- Fixed the sync status incorrectly reporting a directory or missing path as a file when viewing a non-current branch.
- Fixed the file name shown after opening a file outside a git repository sometimes not matching the actual opened file (symlinks, path casing).
- Fixed a failed file-tree subdirectory fetch showing no error indicator; it now shows an inline "Failed to load — click to retry" message.
- Fixed "Find in file" clearing its search query every time the panel was reopened, instead of only when closed.
- Fixed search "Load more" pagination potentially reissuing a stale result page against the wrong branch after a branch switch.
- Fixed a potential JavaScript-injection issue in the macOS app when opening a file whose name contains a quote or other special character via Finder.
- Fixed a race condition and missing forced-termination step in the macOS app's local server process lifecycle that could leave a wedged process running after quit.
- Fixed the macOS app resolving an incorrect fallback path when its app bundle's resource location can't be determined.
- Fixed a startup crash risk when the user's home directory is unreadable and no other startup folder preference is available.
- Fixed a macOS bug where setting GitLocal as the default Markdown reader could leave one file type unregistered if a prior registration was partial.
- Internal: full architecture and code review of all 15 reviewable units (110 findings), with dead-code removal, duplicate-code consolidation, and efficiency/readability improvements across the server, UI, and macOS app — no behavior change beyond the fixes listed above.

## 0.10.2 - 2026-08-15

- Fixed the folder/content view losing the ability to scroll to the last entry depending on the terminal panel's visibility, expanded/collapsed state, or height.
- Fixed Claude and Codex terminal tabs failing to launch with a "not found on PATH" error when the CLI is only resolvable via shell profile scripts (e.g. `~/.zshrc`/`~/.bashrc`), by resolving them the same way an interactive login shell would; a genuinely missing CLI still shows the existing error.
- Added a Ctrl+\` terminal-toggle shortcut and a matching native macOS "Toggle Terminal" menu item.
- Unified dotfile visibility ("Hide .* files") into a single global setting driving both the sidebar file tree and the content panel, replacing two independent, unsynchronized toggles; exposed via a native app-menu item (macOS) or a single toolbar "View options" control (browser).
- Moved Refresh into the "View options" control/native menu behind a Ctrl+Alt+R shortcut, removing the standalone toolbar Refresh button while keeping it reachable via shortcut and a non-keyboard-only control in the browser distribution.
- Moved the Tracked/All/Local files-visibility selector out of the sidebar and into the same "View options" control/native menu.
- Fixed the folder picker (used when browsing outside a repository) losing independent scrolling in its sidebar and main panes, floated its sidebar collapse toggle to match the main app, and added a "Parent Folder" button to its header.

## 0.10.1 - 2026-08-09

- Restructured the repository block into two lines (name, search, and branch selection on line 1; tags, root, and readme on line 2) so the repository name is no longer clipped on narrower windows, and reduced its internal spacing.
- Moved the "Parent Folder" control out of the repository block and into the persistent top toolbar so it's always available in a consistent place, and reordered the toolbar to Parent Folder, Refresh, Terminal, then the theme switch, grouping controls from most page-specific to most global.
- Restyled the top toolbar: Refresh and Parent Folder are now plain/low-emphasis controls, and Terminal uses a new soft-green "highlight" style so it reads as a higher-value action without looking like a primary/submit or danger control.
- Tightened row spacing in the current folder view (both git repository and local folder browsing) for a denser, more scannable layout, and removed a redundant nested container in the git repository view.
- Fixed the terminal panel's collapsed-state expand button falling outside the viewport, and reduced the terminal's default font size.
- Fixed the terminal panel's collapse/expand chevron pointing the wrong direction; it now points toward where the panel will move.
- Added an "X" close button to the file view so a file can be closed back to its containing folder without navigating manually; it respects the existing unsaved-edit discard confirmation.

## 0.10.0 - 2026-08-09

- First official release of the integrated terminal panel across both distributions, including the macOS Homebrew app (0.9.17 published the feature to npm only; its Homebrew build failed at packaging validation and never shipped).
- Fixed a path-resolution bug in the macOS packaging script's node-pty verification step (`packaging/macos/release/test-package.sh`) that used a relative path across a working-directory change, causing the Homebrew build to fail validation. No product code changes since 0.9.17.

## 0.9.17 - 2026-08-08

- Added an integrated terminal panel, docked at the bottom of the window, with support for a regular shell as well as Claude Code and Codex CLI tab kinds; sessions persist across page navigation and follow the currently viewed folder's working directory.
- Added a "Terminal" header button and the `Ctrl+\`` shortcut (matching VS Code, also intercepted while focus is inside the terminal) to make opening the panel more discoverable.
- Added drag-to-resize and keyboard resize (arrow keys on the resize handle) for the terminal panel's height, with a clearer collapse/expand toggle and a taller default height.
- Moved keyboard focus into the terminal whenever the panel opens, so keyboard and screen-reader users land in it immediately instead of needing to tab through the rest of the page to find it.
- Capped concurrent terminal sessions and inbound WebSocket frame size per process, and bounded resize requests to a sane range, so the terminal endpoints can't be used to exhaust local system resources.
- Fixed `node-pty`'s prebuilt native binding failing to load on some platforms/Node versions by automatically rebuilding it during install instead of leaving the terminal feature silently broken.
- Updated `nanoid` to clear a high-severity advisory (GHSA-2v37-7h3g-55p8) in the `vitest`/`vite` devDependency chain.

## 0.9.16 - 2026-08-04

- Fixed the macOS app packaging script, which had been failing on every release since 0.9.13 for unrelated CI/release-automation reasons and, as of this release, because newer Node.js 24.x macOS builds no longer ship a separate `libnode` shared library. The packaged app only ever executed the standalone `node` binary as a subprocess, so the shared library was never actually required; the dead dependency has been removed.

## 0.9.15 - 2026-08-03

- Added a structured, collapsible tree view for `.json` files (keys, values, arrays, nesting), matching the existing Markdown pretty-view pattern.
- Added a raw/pretty toggle for valid JSON files, reusing the existing view-mode control; malformed or empty JSON always falls back to raw view with an inline notice instead of a broken pane.
- Added a non-blocking warning when saving an edit that is not valid JSON, without blocking the save.
- Updated `hono` to 4.13.0 to clear a moderate ReDoS advisory in the CORS middleware (GHSA-8j4g-w8fx-2239).

## 0.9.14 - 2026-08-01

- Replaced the synthetic ".." row in folder listings with a dedicated "Parent Folder" toolbar button, available in folder listing, file view, and file edit modes, and visibly disabled (not hidden) at the true filesystem root.
- Added a "Root" toolbar button (visible inside git repositories) that jumps directly to the nearest enclosing repository's root folder in one click, correctly targeting a nested sub-repository's own root when applicable.
- Added a "Readme" toolbar button (visible inside git repositories) that always opens the repository's root README, disabled when the root folder has no README.
- Removed the standalone breadcrumb and repository-status-summary boxes; the local-changes count now appears as a compact tag alongside the other repository tags, mutually exclusive with the "Up to date" tag.
- Removed a duplicate "Readme" jump-link that appeared next to the dotfile-visibility toggle.
- Fixed insufficient text contrast on the light-blue "local changes" tag in dark mode (was 3.21:1, now 4.62:1, meeting WCAG AA).

## 0.9.13 - 2026-07-24

- Fixed GitLocal silently showing empty-looking content on startup instead of a clear error, across several distinct causes: an unreadable default or remembered folder, an invalid explicit launch path, and a query-retry pause that could get stuck indefinitely (especially in the macOS app's embedded browser).
- Added a global server error handler so unexpected read failures surface as specific, plain-language messages (e.g. permission denied, not found) instead of a generic error or a blank screen.
- Added a clear failure screen with a retry action when the app cannot load repository information on startup, distinct from the existing "empty folder" landing state.
- Added a message explaining why GitLocal fell back to a different folder when a previously remembered folder is no longer available (deleted, permission denied, or on a disconnected drive), both in the folder picker and the main app view.
- Added a clear message identifying an invalid startup path (e.g. a missing CLI argument or a moved "Open With" target) instead of silently browsing an unrelated folder.
- Fixed a bug where a failed automatic browser launch (npm/terminal distribution) could crash the entire GitLocal server; it now prints a manual-open instruction instead.

## 0.9.12 - 2026-07-07

- Added optional macOS Markdown default-reader setup, including first-run consent and a later `GitLocal > Set as Default Markdown Reader` menu action.
- Added Finder Markdown open handling so double-clicked `.md` and `.markdown` files activate GitLocal, select the requested file, and render it in preview with the right folder context.
- Reworked folder pages to show visible file navigation first and README content below it, with a quick README jump link when available.
- Added a dotfile visibility checkbox for denser folder browsing and hardened failed native file opens so stale previews are not shown.

## 0.9.11 - 2026-06-21

- Added structured rendering for Markdown YAML front matter so skill files and similar docs show metadata separately from the Markdown body instead of as a broken bold text block.
- Preserved raw Markdown source, copy/share output, relative links, local images, find highlighting, heading anchors, and code-block copy behavior for files with front matter.
- Added regression coverage for nested metadata, arrays, booleans, malformed front matter, incomplete delimiters, horizontal rules, and delimiter-like fenced code.

## 0.9.10 - 2026-06-12

- Fixed background Markdown refresh flicker by avoiding active-file refetches when only other repository paths changed.
- Kept local Markdown image sources visible across rerenders while still refreshing them in the background.
- Fixed parent-folder navigation so cached empty directory results cannot make a non-empty parent appear empty.
- Updated audited build dependencies to clear current `esbuild`/Vite security advisories.

## 0.9.9 - 2026-06-12

- Cleaned up the collapsed left navigation rail so it shows only one expand control instead of several one-letter shortcut buttons.
- Preserved repository search, changed-file review, recent files, key documents, and current-folder workflows through the expanded panel and main dashboard.
- Fixed the README logo so the same committed asset renders on GitHub and inside GitLocal's local Markdown viewer.
- Added regression coverage for collapsed-sidebar usability, keyboard/a11y behavior, picker parity, responsive rail styling, and local README image rendering.

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
