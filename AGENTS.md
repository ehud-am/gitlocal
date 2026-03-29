# gitlocal Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-28

## Active Technologies

- **Runtime**: Node.js 22+ (active LTS), TypeScript 5.x
- **HTTP server**: Hono ^4.x + @hono/node-server ^1.x
- **Frontend**: React 18, Vite 5, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight
- **Build**: esbuild (server bundle), Vite 5 (UI bundle)
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

## Code Style

TypeScript 5.x + Node.js 22+: follow standard conventions. Use `.js` extensions on all imports (NodeNext module resolution). No Go, no Makefile, no shell scripts.

## Recent Changes

- 003-simplify-tech-stack: Replaced Go backend with Node.js/TypeScript/Hono; removed Makefile and all shell script dependencies; single `npm` toolchain for build, test, and install
- 001-baseline-product-spec: Added baseline planning artifacts, contracts, quickstart, task breakdown, and contributor guidance for the documented current product baseline

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
