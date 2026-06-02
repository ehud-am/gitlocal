# GitLocal

<p align="center">
  <img src="ui/public/gitlocal-logo.svg" alt="GitLocal icon" width="96" height="96">
</p>

[![CI](https://github.com/ehud-am/gitlocal/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ehud-am/gitlocal/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/gitlocal)](https://www.npmjs.com/package/gitlocal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

GitLocal is a local folder and git repository viewer for less-technical builders working in today's AI-driven development lifecycle.

When AI agents do most of the code generation, direct hand-editing source files becomes the exception rather than the default. A full IDE can be overkill. GitLocal focuses on the work humans still need to do constantly: browse the codebase, understand structure, read Markdown documents clearly, inspect changes, and make small edits when needed. Editing remains possible, but the product is optimized first for navigation, reading, review, and lightweight intervention.

Everything runs locally, there are no accounts or telemetry, and any clone, fetch, pull, or push action goes through your installed `git` only when you choose it.

---

## Requirements

| Dependency | Version |
|-----------|---------|
| Node.js | 22+ |
| git | 2.22+ |

---

## Install

GitLocal has two distributions that run the same app code.

Measured on this branch, **90.7% of the implementation is shared** between the npm and macOS native distributions: 10,187 lines of shared app code in `src/` and `ui/src/`, compared with 1,040 macOS-distribution-specific lines in the Swift wrapper, Xcode/plist config, cask/package scripts, and release workflows. This excludes tests, docs, and generated build outputs.

Choose the workflow that fits how you want to use GitLocal:

### NPM package

```bash
npm install -g gitlocal
```

This is the simple cross-platform distribution for any system that supports Node.js and JavaScript. It installs with one command and opens GitLocal in your browser.

Tradeoff: it is not a native app. The terminal process that starts GitLocal must stay open while you use it.

### macOS native app

Mac users can install the native app distribution from the project tap when a macOS app artifact is published:

```bash
brew tap ehud-am/gitlocal
brew install --cask gitlocal
```

**Alpha and unsigned app notice:** `GitLocal.app` is currently an alpha native distribution and is not signed or notarized. macOS will show Apple security warning messages on first launch. To approve the unsigned app after installing it, run:

```bash
xattr -dr com.apple.quarantine /Applications/GitLocal.app
```

Then open `GitLocal.app` normally.

The Homebrew cask installs `GitLocal.app`, which runs as a native Mac app with an embedded WebKit browser. It uses the same GitLocal server and React viewer as the npm package, starts the local service for the app session, and does not require `npm install -g gitlocal` for normal app launch.

Upgrade the native app through Homebrew:

```bash
brew update
brew upgrade --cask gitlocal
```

Uninstall:

```bash
brew uninstall --cask gitlocal
```

### Run without installing

```bash
npx gitlocal
```

### From source

```bash
git clone https://github.com/ehud-am/gitlocal.git
cd gitlocal
npm ci
npm --prefix ui ci
npm run build
```

Run the built CLI from the repository root:

```bash
# Open the current repository
node dist/cli.js .

# Open a specific repository
node dist/cli.js ~/projects/my-app

# Open the folder picker
node dist/cli.js
```

---

## Usage

GitLocal starts a local HTTP server on a random available port, prints the URL, and opens your default browser automatically.

```text
gitlocal listening on http://localhost:54321
```

Press **Ctrl+C** to stop the server.

The macOS native app starts the same local server for the app session, loads it in an embedded WebKit window, and stops the managed service when the app quits.
Native app menu and keyboard shortcuts support standard editing commands, preview-scoped Find, and Refresh for the current repository view.

### Open a folder or repository

```bash
gitlocal <path-to-git-repo>
```

**Examples:**

```bash
# View this repo
gitlocal .

# View a project by absolute path
gitlocal ~/projects/my-app

# View any folder; git repositories add branch and remote context
gitlocal /tmp/not-a-repo
```

When a repository opens, GitLocal shows the README immediately if one is found. Plain folders open in the same viewer, without branch, remote, or git identity controls.

### Open the folder picker

Run `gitlocal` with no arguments:

```bash
gitlocal
```

If your current shell is already inside a git repository, GitLocal opens that repository immediately instead of showing the picker.

From the picker you can:

- double-click a regular folder row to move deeper into it, or double-click a git repository row to open it as a repository
- select a file, folder, or git repository and open it with the single **Open** button
- use the folder actions menu to create a subfolder, run `git init`, or clone into a child folder

GitLocal also clears stale saved branch and path state when you switch folders, so reopening the app does not strand you on an invalid branch or file from a previous root.

---

## What it does

- **Browse the file tree** — expand and collapse folders lazily, whether the root is a plain folder or a git repository
- **Read project knowledge comfortably** — Markdown renders with GitHub-like typography, tables, task lists, and code blocks so specs, plans, READMEs, and agent-generated docs are easy to review
- **Reference code precisely** — code-oriented views include left-side line numbers for easier review and discussion
- **Track file sync state in repositories** — repository file rows show when content changed locally, exists in local-only commits, changed upstream, or diverged between local and remote history
- **Make small local file edits** — create, edit, and delete files from the viewer when human intervention is needed, without making editing the main product center of gravity
- **Manage folders in the viewer** — create direct child folders and delete the current subfolder from the main folder view with a typed-name confirmation that shows the affected file and folder counts
- **Switch branches safely** — checkout local or remote-tracking branches, with commit/discard confirmation when the working tree is dirty
- **Manage repo identity locally** — save repository-local git `user.name`, `user.email`, and SSH private key path, choose valid keys from your SSH folder, and make those settings visible to regular Git commands
- **See repo context clearly** — GitHub-like header with branch, local path, remote repository, remote linkage, and repo-local identity loaded after the initial viewer shell
- **Search deliberately** — repository-wide search opens only from the header search button, while file-level `Find in file` searches just the file you are currently viewing
- **Auto-opens README** — when you open a repo, the README is shown immediately if one exists
- **Folder picker** — run `gitlocal` with no arguments to open a browser-based folder picker with files, folders, and git repository detection
- **Smart startup detection** — running `gitlocal` inside a repo opens that repo immediately; passing a plain folder opens that folder as the active root
- **Clear folder actions** — picker folders can be browsed deeper, initialized as git repos, or used as clone targets
- **Light and dark themes** — GitHub-inspired light mode with matching dark mode support
- **Local-first, remote optional** — core browsing and editing stay local-first, while remote clone/setup actions use the local `git` executable only when you choose them

The fixed footer now shows the actual running GitLocal release version instead of a placeholder value, so support and release verification can rely on what the UI displays.
Repository-wide search no longer takes over `Cmd/Ctrl+F`, so the browser's native page find stays available while GitLocal offers its own explicit repository search and current-file find tools.

---

## Distribution Options

| Channel | Platforms | Runtime experience | Best for | Tradeoff |
|---------|-----------|--------------------|----------|----------|
| npm | macOS, Windows, Linux | Local server opened in your browser | Cross-platform installs and automation | Requires a terminal process to stay open |
| Homebrew cask | macOS | `GitLocal.app` with embedded WebKit viewer | Mac users who want native app launch | macOS only |

Both channels use the same GitLocal server and React viewer for a given release. The native macOS app is a thin wrapper around the local service; it is not a separate product fork.

### Homebrew troubleshooting

- If `brew` is not found, install Homebrew first from the official Homebrew site.
- If installation reports a checksum mismatch, run `brew update` and retry. Do not bypass checksum verification.
- If macOS blocks the current alpha app, approve the unsigned bundle with `xattr -dr com.apple.quarantine /Applications/GitLocal.app`, then launch it again. Future signed/notarized releases should not require this approval path.
- If your macOS version or processor architecture is unsupported, use the npm package until a compatible native artifact is available.
- If a launch fails, the app should show a native error. The npm browser workflow remains available as a fallback.

---

## Development

### Prerequisites

- Node.js 22+

### Run in dev mode

```bash
# Terminal 1: backend with auto-restart on changes
npm run dev:server

# Terminal 2: Vite dev server for the frontend
npm run dev:ui
```

Use both commands together during development:

- `npm run dev:server` starts the backend in watch mode
- `npm run dev:ui` starts the Vite frontend with hot reload

### Run tests

```bash
npm test
```

Runs backend tests (Vitest + coverage) and frontend tests. All source files must maintain **≥90% branch coverage** per file.
Frontend component tests also include automated accessibility checks for key browsing surfaces.

### Backend tests only

```bash
npm run test:server
```

### Build

```bash
npm run build
```

Builds the React frontend and compiles the Node.js CLI into `dist/cli.js`.

### Build and run the macOS native app from source

On macOS with Xcode installed, build the shared GitLocal app and the native wrapper:

```bash
packaging/macos/release/package-app.sh
```

This runs the normal npm build, builds `GitLocal.app`, bundles the server/UI assets, copies the local Node runtime into the app bundle, and creates a local unsigned artifact in `packaging/macos/release/artifacts/`.

List the generated artifacts:

```bash
ls packaging/macos/release/artifacts/
```

Or open the artifact folder in Finder:

```bash
open packaging/macos/release/artifacts/
```

Launch the locally built app:

```bash
open native/macos/build/Build/Products/Release/GitLocal.app
```

Validate the local app bundle:

```bash
packaging/macos/release/test-package.sh
```

Validate the local Homebrew cask against the generated artifact:

```bash
packaging/macos/cask/test-install-cask.sh \
  packaging/macos/cask/gitlocal.rb \
  packaging/macos/release/artifacts/GitLocal-$(node -p "require('./package.json').version")-macos.zip
```

The local app is unsigned unless you run the signing/notarization release flow. It is intended for development validation, not public distribution.

### Full verification

```bash
npm run verify
```

Runs tests, builds, and dependency audits for both the root package and the UI package.

---

## Architecture

GitLocal is a Node.js CLI that serves a React SPA:

```
gitlocal/
├── src/
│   ├── cli.ts           — entry point: arg parsing, server start, browser/app-mode launch
│   ├── server.ts        — Hono app, route registration, static serving + SPA fallback
│   ├── git/
│   │   ├── repo.ts      — repo metadata, branch helpers, deferred git context, README lookup, repository-local identity, and file sync state
│   │   ├── identity-settings.ts — SSH private key path expansion, discovery, and validation
│   │   └── tree.ts      — listDir (git ls-tree wrapper, sorted dirs-first)
│   ├── services/
│   │   └── repo-watch.ts — working-tree revision and sync status snapshots for the UI
│   └── handlers/
│       ├── repo.ts      — /api/info, /api/readme, /api/branches, /api/commits, /api/repo/open, and git-specific repo actions
│       ├── file.ts      — /api/tree and /api/file
│       ├── folder.ts    — /api/folder browsing, setup, create, and delete actions
│       ├── sync.ts      — /api/sync
│       └── search.ts    — /api/search
└── ui/src/
    ├── App.tsx                      — layout, repo sync polling, deferred git context, dialogs, README auto-load, picker mode
    ├── components/
    │   ├── FileTree/                — lazy expand/collapse tree
    │   ├── Breadcrumb/              — path navigation
    │   ├── ContentPanel/            — Markdown, code, image, binary rendering, and local file editing
    │   ├── RepoContext/             — branch switcher, sync summary, repo metadata, and identity editing
    │   └── Picker/                  — PickerPage table browser with setup actions
    └── services/api.ts              — typed fetch wrappers for all endpoints
```

Optional macOS native app distribution:

```
native/macos/           — Swift/AppKit/WebKit wrapper for GitLocal.app
packaging/macos/        — Homebrew cask, package, checksum, and release helpers
```

**Key design decisions:**

- **No external runtime dependencies beyond Node.js for the product core** — all git operations shell out to the local `git` binary via `child_process.spawnSync`
- **Primary npm toolchain** — build, test, and install the cross-platform package via `npm`; macOS app packaging adds scoped Swift and shell/Ruby release helpers outside the npm package
- **Shared app code across distributions** — npm and Homebrew use the same TypeScript server and React UI; the Mac wrapper only owns native windowing, service lifecycle, and packaging
- **Hash-based routing** — `HashRouter` means the server only needs to serve `index.html` for all non-asset routes
- **Local-first editing and repo awareness** — GitLocal can create, update, and delete files in folder roots and repository working trees while using git commands for branch and repository metadata

---

## API

All endpoints are served under `/api/`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/info` | Active root metadata (name, branch, isGitRepo, pickerMode) |
| `GET /api/git/context` | Deferred git identity and selected remote context for the active repository |
| `GET /api/readme` | Detects and returns the README filename for the current repo |
| `GET /api/branches` | List of branches with `isCurrent` flag |
| `POST /api/branches/switch` | Switch branches with dirty-tree confirmation flows |
| `POST /api/git/commit` | Compatibility route for creating a local commit; not exposed in the current repository UI |
| `POST /api/git/sync` | Compatibility route for remote sync; not exposed in the current repository UI |
| `PUT /api/git/identity` | Save repository-local `user.name`, `user.email`, and optional SSH command behavior in local git config |
| `GET /api/git/identity/ssh-keys` | List valid SSH private keys from the user's conventional SSH folder |
| `POST /api/git/identity/ssh-key/validate` | Validate an arbitrary SSH private key path before saving it |
| `GET /api/tree?path=&branch=` | Directory listing (dirs first, alphabetical) |
| `GET /api/file?path=&branch=` | File content with type and language detection |
| `GET /api/search?query=&branch=&mode=&caseSensitive=` | Repository search across file names, file contents, or both |
| `POST /api/file` | Create a new file in the current folder root or repository working tree |
| `PUT /api/file` | Update an existing file using its revision token |
| `DELETE /api/file` | Delete an existing file using its revision token |
| `POST /api/folder` | Create a direct child folder in the current folder root or repository working tree |
| `GET /api/folder/delete-preview?path=` | Preview recursive folder deletion impact before confirmation |
| `DELETE /api/folder` | Delete a subfolder after exact typed-name confirmation and preview-impact validation |
| `GET /api/commits?branch=&limit=` | Recent commits (default 10, max 100) |
| `GET /api/sync?path=&branch=` | Working-tree and upstream sync summary for the current path and branch |
| `GET /api/folder/browse?path=` | Folder-picker directory listing with files, folders, and git-repo detection |
| `POST /api/repo/open` | Open a local folder or repository root from the picker UI (body: `{"path":"..."}`) |
| `POST /api/folder/create-child` | Create a child folder from the picker setup flow |
| `POST /api/folder/init-repository` | Initialize git in the selected picker folder |
| `POST /api/folder/clone-repository` | Clone a repository into a child folder from the picker |
| `POST /api/repo/parent-folder` | Leave the current repository view and browse its parent folder |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md). This project follows the [GitLocal constitution](.specify/memory/constitution.md) — all changes must maintain ≥90% branch coverage per file.
