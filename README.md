# GitLocal

<p align="center">
  <img src="https://raw.githubusercontent.com/ehud-am/gitlocal/main/ui/public/gitlocal-logo.svg" alt="GitLocal icon" width="96" height="96">
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

| Dependency | npm package | macOS app |
|-----------|-------------|-----------|
| Node.js | 22+ | Bundled in the app |
| git | 2.22+ | 2.22+ |

---

## Choose an Install

GitLocal has two ways to install the same product. The npm package is the mature cross-platform option. The macOS app is newer, easier to launch on a Mac, and currently unsigned.

| Option | Best for | What you get | Tradeoff |
|--------|----------|--------------|----------|
| npm package | macOS, Windows, and Linux users who are comfortable with a terminal | One-command install, opens in your browser, mature distribution | The terminal process must stay open while GitLocal is running |
| macOS app beta | Mac users who want GitLocal to behave like an app | Homebrew install, opens as `GitLocal.app`, no terminal needed after install | Unsigned beta app, so macOS shows security warnings on first launch |

Both options use the same GitLocal server and React viewer for a given release. The Mac app is a native wrapper around the same local app code, not a separate fork.

### Option 1: npm Package

```bash
npm install -g gitlocal
```

Open a folder or repository:

```bash
gitlocal .
```

GitLocal starts a local server, opens your default browser, and prints the local URL:

```text
gitlocal listening on http://localhost:54321
```

Keep that terminal window open while you use GitLocal. Press **Ctrl+C** when you want to stop it.

You can also run GitLocal without installing it globally:

```bash
npx gitlocal
```

### Option 2: macOS App Beta

Install with Homebrew:

```bash
brew tap ehud-am/gitlocal
brew install --cask gitlocal
```

Then open `GitLocal.app` from your Applications folder.

The macOS app starts the same local GitLocal service in the background for the app session, shows the viewer in an embedded WebKit window, and stops the service when the app quits. You do not need to keep a terminal open.

**Unsigned beta notice:** the current Mac app is not signed or notarized with an Apple Developer ID. macOS will show security warnings the first time you open it. After installing, approve the app with:

```bash
xattr -dr com.apple.quarantine /Applications/GitLocal.app
```

Then open `GitLocal.app` normally. Future signed releases should remove this extra step.

Upgrade the app:

```bash
brew update
brew upgrade --cask gitlocal
```

Uninstall the app:

```bash
brew uninstall --cask gitlocal
```

### Which One Should I Use?

Use the npm package if you want the most mature and portable install path, especially on Windows or Linux.

Use the macOS app beta if you are on a Mac and want a normal app experience without a running terminal. It is aligned with the npm version, but the first-launch security warnings are expected until the app is signed and notarized.

---

## What GitLocal Helps With

- **Browse local projects** with a lazy-loading file tree for regular folders and git repositories.
- **Read Markdown clearly** with GitHub-like rendering for READMEs, specs, plans, tables, task lists, and code blocks.
- **Review code with context** using line numbers, branch information, local path, remote details, and file sync state.
- **Search intentionally** with repository search from the header and file-level find inside the current file.
- **Make small edits** by creating, updating, and deleting files directly from the viewer.
- **Manage folders** by creating child folders or deleting subfolders with typed confirmation and impact counts.
- **Switch branches safely** with commit or discard confirmation when the working tree is dirty.
- **Manage local git identity** by saving repo-local `user.name`, `user.email`, and optional SSH key settings.
- **Share rendered Markdown** through print, Save as PDF, local email/share flows, copy, and download fallbacks.
- **Stay local-first** because browsing, editing, and git actions run against your local filesystem and installed `git`; there are no accounts or telemetry.

GitLocal supports light and dark themes. The macOS app also supports native menu and keyboard shortcuts for standard editing commands, preview-scoped Find, panel-scoped Select All, and Refresh.

---

## Homebrew Troubleshooting

- If `brew` is not found, install Homebrew first from the official Homebrew site.
- If installation reports a checksum mismatch, run `brew update` and retry. Do not bypass checksum verification.
- If macOS blocks the beta app, run `xattr -dr com.apple.quarantine /Applications/GitLocal.app`, then launch it again.
- If your macOS version or processor architecture is unsupported, use the npm package until a compatible native artifact is available.
- If app launch fails, the npm browser workflow remains available as a fallback.

---

## From Source

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
