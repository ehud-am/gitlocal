# gitlocal Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-06-08

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
- TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI + Hono, @hono/node-server, React 18, Vite 7, react-markdown, rehype-highlight, highlight.js, Vitest, React Testing Library, esbuild (005-version-line-numbers)
- No database; runtime state comes from local filesystem metadata, git metadata, build/package metadata, URL state, and in-memory server state (005-version-line-numbers)
- TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI + Hono, @hono/node-server, React 18, @tanstack/react-query, Vite 7, Vitest, React Testing Library, esbuild (006-manual-file-editing)
- No database; runtime state is derived from the local filesystem, git metadata, browser URL state, and in-memory server/UI state (006-manual-file-editing)
- TypeScript 5.x on Node.js 22+ for server and CLI, TypeScript + React 18 for the UI + Hono, @hono/node-server, React 18, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, Vite 7, Vitest, React Testing Library, esbuild (007-editor-empty-repo)
- TypeScript 5.x on Node.js 22+ + Hono, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, Vitest, React Testing Library (007-editor-empty-repo)
- None; runtime state is derived from local filesystem metadata, git metadata, browser URL state, and in-memory server/UI state (007-editor-empty-repo)
- TypeScript 5.x on Node.js 22+ + Hono, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library (008-ignored-files-visibility)
- None; runtime state is derived from local filesystem contents, git metadata, browser URL state, and in-memory server/UI state (008-ignored-files-visibility)
- TypeScript 5.x on Node.js 22+ + Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library, Radix UI primitives (011-folder-create-delete)
- None; folder state is derived from local filesystem contents, git metadata, browser URL state, and in-memory server/UI state (011-folder-create-delete)
- None; UI state is derived from local filesystem metadata, git metadata, browser URL state, and in-memory server/UI state (012-folder-delete-action-tags)
- TypeScript 5.x on Node.js 22+; React 18 TypeScript UI + Hono, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present in the UI (014-folder-repo-capabilities)
- No database; state is derived from local filesystem contents, git metadata/config, browser URL state, and in-memory server/UI state (014-folder-repo-capabilities)
- TypeScript 5.x on Node.js 22+; React 18 TypeScript UI + Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Radix UI primitives; no new runtime dependency planned (015-fix-git-folder-detection)
- No database; classification is derived from local filesystem metadata and local git metadata at request time (015-fix-git-folder-detection)
- No database; classification derives from local filesystem metadata, local git metadata, browser URL state, and in-memory server/UI state (016-fix-subrepo-detection)
- TypeScript 5.x on Node.js 22+ for the existing server/CLI and React UI; Swift 5.x for the macOS native wrapper; Ruby cask metadata for the Homebrew tap + Existing Hono server, @hono/node-server, React 18, Vite 7, current npm build/test stack; macOS AppKit/WebKit for the wrapper; Homebrew cask packaging conventions; GitHub Releases for versioned app artifacts (018-macos-homebrew-app)
- No new application database; bundled release assets for the native app, user-local app preferences only if needed for native window/session state, Homebrew cask metadata in a project-owned tap repository (018-macos-homebrew-app)
- Repository-local Git configuration for identity values; no application-owned `.env` identity storage (020-local-git-identity)
- TypeScript 5.x on Node.js 22+ for the shared app; React 18 TypeScript UI; Swift 5.x for the scoped macOS wrapper + Existing Hono local server, React/Vite UI, AppKit/WebKit native wrapper, Vitest/React Testing Library, xcodebuild for wrapper validation (021-native-shortcuts)
- No database; runtime state remains derived from local filesystem/git metadata, browser URL state, in-memory UI/server state, and native app session state (021-native-shortcuts)
- TypeScript 5.x on Node.js 22+ for server/CLI and React UI; Swift 5.x only for the existing scoped macOS wrapper + Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned (022-markdown-share-actions)
- No database; runtime state from local filesystem/git, browser URL/local UI state, in-memory server state, and optional user-local startup preference file (022-markdown-share-actions)
- TypeScript 5.x on Node.js 22+ for server/CLI and React UI; Swift 5.x only if existing macOS wrapper command parity is touched + Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned (023-share-copy-regressions)
- No database; runtime state remains derived from local filesystem contents, git metadata, browser URL/local UI state, in-memory server state, and optional user-local startup preference file (023-share-copy-regressions)

## Project Structure

```text
src/          # TypeScript server source
tests/        # Vitest unit and integration tests
ui/           # React frontend (Vite)
dist/         # Compiled server bundle (gitignored)
ui/dist/      # Compiled UI bundle (gitignored)
```

## Product Direction

GitLocal is for less-technical builders working in an AI-driven development lifecycle. The product should optimize for codebase browsing, Markdown reading, review, and lightweight human intervention rather than full-IDE workflows.

GitLocal has two distributions using the same app code:
- npm package: cross-platform, one-command install, browser-based, requires the terminal process to stay open.
- macOS Homebrew cask: native `GitLocal.app`, embedded WebKit browser, managed local service lifecycle.

Measured on the current branch, 90.7% of implementation lines are shared between both distributions, excluding tests, docs, and generated build output.

## Commands

```sh
npm test      # Run all tests with coverage
npm run lint  # tsc --noEmit type check
npm run build # Build server + UI bundles
npm run verify # Run tests, builds, and dependency audits
```

## Code Style

TypeScript 5.x + Node.js 22+: follow standard conventions. Use `.js` extensions on all imports (NodeNext module resolution). Keep product server, CLI, and UI behavior in the existing TypeScript/React stack. Swift is permitted only for the scoped macOS native wrapper under `native/macos/`, and shell/Ruby packaging files are permitted only for Homebrew/macOS release automation under `packaging/macos/` and `.github/workflows/`.

## Recent Changes
- 023-share-copy-regressions: Added TypeScript 5.x on Node.js 22+ for server/CLI and React UI; Swift 5.x only if existing macOS wrapper command parity is touched + Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned
- 022-markdown-share-actions: Added TypeScript 5.x on Node.js 22+ for server/CLI and React UI; Swift 5.x only for the existing scoped macOS wrapper + Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Radix UI primitives already present; no new runtime dependency planned
- 021-native-shortcuts: Added TypeScript 5.x on Node.js 22+ for the shared app; React 18 TypeScript UI; Swift 5.x for the scoped macOS wrapper + Existing Hono local server, React/Vite UI, AppKit/WebKit native wrapper, Vitest/React Testing Library, xcodebuild for wrapper validation

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/023-share-copy-regressions/plan.md`
<!-- SPECKIT END -->
