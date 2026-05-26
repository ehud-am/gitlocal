# gitlocal Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-25

## Active Technologies

- **Runtime**: Node.js 22+ (active LTS), TypeScript 5.x
- **HTTP server**: Hono ^4.x + @hono/node-server ^1.x
- **Frontend**: React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight
- **Build**: esbuild (server bundle), Vite 7 (UI bundle)
- **Test**: Vitest + @vitest/coverage-v8 (≥90% per-file branch coverage enforced)
- **State**: All state in-process or derived from filesystem/git at request time

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
```

## Product Direction

GitLocal is for less-technical builders working in an AI-driven development lifecycle. The product should optimize for codebase browsing, Markdown reading, review, and lightweight human intervention rather than full-IDE workflows.

GitLocal has two distributions using the same app code:
- npm package: cross-platform, one-command install, browser-based, requires the terminal process to stay open.
- macOS Homebrew cask: native `GitLocal.app`, embedded WebKit browser, managed local service lifecycle.

Measured on the current branch, 93.3% of implementation lines are shared between both distributions, excluding tests, docs, and generated build output.

## Code Style

TypeScript 5.x + Node.js 22+: follow standard conventions. Use `.js` extensions on all imports (NodeNext module resolution). Keep product server, CLI, and UI behavior in the existing TypeScript/React stack. Swift is permitted only for the scoped macOS native wrapper under `native/macos/`, and shell/Ruby packaging files are permitted only for Homebrew/macOS release automation under `packaging/macos/` and `.github/workflows/`.

## Recent Changes

- 018-macos-homebrew-app: Added scoped macOS native app packaging around the shared GitLocal server/UI while preserving the npm package distribution.
- 017-git-identity-settings: Added project-persistent git identity settings with SSH key validation and `.env` protection.
- 003-simplify-tech-stack: Replaced Go backend with Node.js/TypeScript/Hono; removed Makefile and all shell script dependencies from the product core; single `npm` toolchain for the cross-platform package.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
