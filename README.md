# GitLocal

[![CI](https://github.com/ehud-am/gitlocal/actions/workflows/ci.yml/badge.svg)](https://github.com/ehud-am/gitlocal/actions/workflows/ci.yml)
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

```bash
npm install -g gitlocal
```

Or run without installing:

```bash
npx gitlocal
```

### From source

```bash
git clone https://github.com/ehud-am/gitlocal.git
cd gitlocal
npm install
npm run build
```

---

## Usage

### Open a specific repository

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

GitLocal starts an HTTP server on a random available port, prints the URL, and opens your default browser automatically. The README is shown immediately if one is found.

```
gitlocal listening on http://localhost:54321
```

Press **Ctrl+C** to stop the server.

### Open with a folder picker

Run `gitlocal` with no arguments to open a browser-based folder picker:

```bash
gitlocal
```

Type the path to your git repository and click **Open**. The viewer loads immediately without restarting.

---

## What it does

- **Browse the file tree** — expand and collapse folders lazily, just like GitHub
- **Read files beautifully** — Markdown renders as formatted HTML with GitHub Flavored Markdown; code files get syntax highlighting; images display inline
- **See git status** — current branch, recent commits, and a branch switcher (read-only)
- **Auto-opens README** — when you open a repo, the README is shown immediately if one exists
- **Folder picker** — run `gitlocal` with no arguments to open a browser-based folder picker
- **No internet required** — everything runs locally; no accounts, no telemetry, no registration

---

## Development

### Prerequisites

- Node.js 22+

### Run in dev mode

```bash
# Terminal 1: Vite dev server for the frontend (hot-reload)
npm run dev:ui

# Terminal 2: Backend with auto-restart on changes
npm run dev:server
```

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

Builds the React frontend (Vite) and compiles the Node.js backend (esbuild) into `dist/cli.js`.

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
│       └── pick.ts      — /api/pick (folder picker submit)
└── ui/src/
    ├── App.tsx                      — layout, state, README auto-load, picker mode
    ├── components/
    │   ├── FileTree/                — lazy expand/collapse tree
    │   ├── Breadcrumb/              — path navigation
    │   ├── ContentPanel/            — Markdown, code, image, binary rendering
    │   ├── GitInfo/                 — branch switcher + commit list
    │   └── Picker/                  — PickerPage folder input form
    └── services/api.ts              — typed fetch wrappers for all endpoints
```

**Key design decisions:**

- **No external runtime dependencies beyond Node.js** — all git operations shell out to the local `git` binary via `child_process.spawnSync`
- **Single npm toolchain** — build, test, and install all via `npm`; no Go, no Makefile, no shell scripts
- **Hash-based routing** — `HashRouter` means the server only needs to serve `index.html` for all non-asset routes
- **Read-only** — GitLocal never writes to the repository; it only reads via `git ls-tree`, `git cat-file`, and `git log`

---

## API

All endpoints are served under `/api/`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/info` | Repository metadata (name, branch, isGitRepo, pickerMode) |
| `GET /api/readme` | Detects and returns the README filename for the current repo |
| `GET /api/branches` | List of branches with `isCurrent` flag |
| `GET /api/tree?path=&branch=` | Directory listing (dirs first, alphabetical) |
| `GET /api/file?path=&branch=` | File content with type and language detection |
| `GET /api/commits?branch=&limit=` | Recent commits (default 10, max 100) |
| `POST /api/pick` | Set the repo path from the picker UI (body: `{"path":"..."}`) |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Issues and pull requests are welcome. This project follows the [GitLocal constitution](.specify/memory/constitution.md) — all changes must maintain ≥90% branch coverage per file.
