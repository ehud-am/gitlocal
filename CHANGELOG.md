# Changelog

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
