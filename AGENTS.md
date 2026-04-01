# gitlocal Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-31

## Active Technologies
- **Runtime**: Node.js 22+ (active LTS), TypeScript 5.x
- **HTTP server**: Hono ^4.x + @hono/node-server ^1.x
- **Frontend**: React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight
- **Build**: esbuild (server bundle), Vite 7 (UI bundle)
- **Test**: Vitest + @vitest/coverage-v8 (≥90% per-file branch coverage enforced)
- **State**: All state in-process or derived from filesystem/git at request time
- TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI + Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, esbuild (003-viewer-usability-search)
- No database; all runtime state is derived from the local filesystem, git metadata, URL state, and in-memory server process state (003-viewer-usability-search)
- No database; runtime state is derived from the filesystem, git metadata, browser URL state, and in-memory UI state (004-copy-control-polish)

## Project Structure

```text
src/          # TypeScript server source
tests/        # Vitest unit and integration tests
ui/           # React frontend (Vite)
dist/         # Compiled server bundle (gitignored)
ui/dist/      # Compiled UI bundle (gitignored)
```

## Commands

```sh
npm test      # Run all tests with coverage
npm run lint  # tsc --noEmit type check
npm run build # Build server + UI bundles
npm run verify # Run tests, builds, and dependency audits
```

## Code Style

TypeScript 5.x + Node.js 22+: follow standard conventions. Use `.js` extensions on all imports (NodeNext module resolution). No Go, no Makefile, no shell scripts.

## Recent Changes
- 004-copy-control-polish: Added TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI + Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, esbuild
- 004-copy-control-polish: Added TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI + Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, esbuild
- 003-viewer-usability-search: Added TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI + Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, esbuild

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
