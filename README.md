# GitLocal

[![CI](https://github.com/ehud-am/gitlocal/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ehud-am/gitlocal/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/gitlocal)](https://www.npmjs.com/package/gitlocal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

A local git repository viewer that gives you a GitHub-like browsing experience — without leaving your machine. Built for non-developers who use tools like [Claude Code](https://claude.ai/code) to work in git repositories and want a clean way to read, navigate, and review their code without a full IDE. Everything runs locally; no accounts, no telemetry, no internet required.

---

## Requirements

| Dependency | Version |
|-----------|---------|
| Node.js | 22+ |
| git | 2.22+ |

---

## Install

Choose the workflow that fits how you want to use GitLocal:

### Install globally

```bash
npm install -g gitlocal
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

### Open a repository

```bash
gitlocal <path-to-git-repo>
```

**Examples:**

```bash
# View this repo
gitlocal .

# View a project by absolute path
gitlocal ~/projects/my-app

# View any path — GitLocal shows an error screen if it's not a git repo
gitlocal /tmp/not-a-repo
```

When a repository opens, GitLocal shows the README immediately if one is found.

### Open the folder picker

Run `gitlocal` with no arguments:

```bash
gitlocal
```

If your current shell is already inside a git repository, GitLocal opens that repository immediately instead of showing the picker.

From the picker you can:

- double-click a folder row to move deeper into it
- double-click a detected git repository row to open it immediately
- use the folder actions menu to create a subfolder, run `git init`, or clone into a child folder

GitLocal also clears stale saved branch and path state when you switch repositories, so reopening the app does not strand you on an invalid branch or file from a previous repo.

---

## What it does

- **Browse the file tree** — expand and collapse folders lazily, just like GitHub
- **Read files beautifully** — Markdown renders with GitHub-like typography and tables; code files get syntax highlighting; images display inline
- **Reference code precisely** — code-oriented views include left-side line numbers for easier review and discussion
- **Make local file edits** — create, edit, and delete files from the viewer when you are on the repository's working branch
- **Switch branches safely** — checkout local or remote-tracking branches, with commit/discard confirmation when the working tree is dirty
- **Manage repo identity locally** — update the repository-specific git `user.name` and `user.email` without touching your global git config
- **See repo context clearly** — GitHub-like header with branch, local path, remote path, remote linkage, and repo-local identity
- **Auto-opens README** — when you open a repo, the README is shown immediately if one exists
- **Folder picker** — run `gitlocal` with no arguments to open a browser-based folder picker
- **Smart startup detection** — running `gitlocal` inside a repo opens that repo immediately; otherwise GitLocal starts in the folder picker
- **Clear folder actions** — non-git folders can be browsed deeper, initialized as git repos, or used as clone targets
- **Light and dark themes** — GitHub-inspired light mode with matching dark mode support
- **No internet required** — everything runs locally; no accounts, no telemetry, no registration

The fixed footer now shows the actual running GitLocal release version instead of a placeholder value, so support and release verification can rely on what the UI displays.

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

### Backend tests only

```bash
npm run test:server
```

### Build

```bash
npm run build
```

Builds the React frontend and compiles the Node.js CLI into `dist/cli.js`.

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
│   ├── cli.ts           — entry point: arg parsing, server start, browser open
│   ├── server.ts        — Hono app, route registration, static serving + SPA fallback
│   ├── git/
│   │   ├── repo.ts      — getInfo, getBranches, getCommits, findReadme, detectFileType
│   │   └── tree.ts      — listDir (git ls-tree wrapper, sorted dirs-first)
│   └── handlers/
│       ├── git.ts       — /api/info, /api/readme, /api/branches, /api/commits
│       ├── files.ts     — /api/tree, /api/file
│       └── pick.ts      — /api/pick and /api/pick/browse for the folder picker
└── ui/src/
    ├── App.tsx                      — layout, state, README auto-load, picker mode
    ├── components/
    │   ├── FileTree/                — lazy expand/collapse tree
    │   ├── Breadcrumb/              — path navigation
    │   ├── ContentPanel/            — Markdown, code, image, binary rendering, and local file editing
    │   ├── RepoContext/             — branch switcher, repo metadata, identity editing
    │   └── Picker/                  — PickerPage table browser with setup actions
    └── services/api.ts              — typed fetch wrappers for all endpoints
```

**Key design decisions:**

- **No external runtime dependencies beyond Node.js** — all git operations shell out to the local `git` binary via `child_process.spawnSync`
- **Single npm toolchain** — build, test, and install all via `npm`; no Go, no Makefile, no shell scripts
- **Hash-based routing** — `HashRouter` means the server only needs to serve `index.html` for all non-asset routes
- **Local-first editing** — GitLocal can create, update, and delete working-tree files locally while using git commands for branch and remote-aware repository actions

---

## API

All endpoints are served under `/api/`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/info` | Repository metadata (name, branch, isGitRepo, pickerMode) |
| `GET /api/readme` | Detects and returns the README filename for the current repo |
| `GET /api/branches` | List of branches with `isCurrent` flag |
| `PUT /api/git/identity` | Update `user.name` and `user.email` in the current repo's local git config |
| `GET /api/tree?path=&branch=` | Directory listing (dirs first, alphabetical) |
| `GET /api/file?path=&branch=` | File content with type and language detection |
| `POST /api/file` | Create a new file in the current repository working tree |
| `PUT /api/file` | Update an existing file using its revision token |
| `DELETE /api/file` | Delete an existing file using its revision token |
| `GET /api/commits?branch=&limit=` | Recent commits (default 10, max 100) |
| `GET /api/pick/browse?path=` | Folder-picker directory listing with git-repo detection |
| `POST /api/pick` | Set the repo path from the picker UI (body: `{"path":"..."}`) |
| `POST /api/pick/create-folder` | Create a child folder from the picker setup flow |
| `POST /api/pick/init` | Initialize git in the selected picker folder |
| `POST /api/pick/clone` | Clone a repository into a child folder from the picker |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Issues and pull requests are welcome. This project follows the [GitLocal constitution](.specify/memory/constitution.md) — all changes must maintain ≥90% branch coverage per file.
