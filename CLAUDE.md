# gitlocal Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-08-30

## Active Technologies
- **Runtime**: Node.js 22+ (active LTS), TypeScript 5.x
- **HTTP server**: Hono ^4.x + @hono/node-server ^1.x
- **Frontend**: React 18, Vite 7, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight
- **Build**: esbuild (server bundle), Vite 7 (UI bundle)
- **Test**: Vitest + @vitest/coverage-v8 (≥90% per-file branch coverage enforced)
- **State**: All state in-process or derived from filesystem/git at request time
- **Terminal (032)**: `node-pty` (server PTY sessions), `ws` (per-tab WebSocket I/O), `@xterm/xterm` + `@xterm/addon-fit` (UI rendering) — see `specs/032-integrated-terminal-panel/research.md`
- **File preview (036)**: `pdfjs-dist` (PDF rendering, lazy-loaded, worker bundled locally via Vite `?url` import — never a CDN URL) — see `specs/036-file-preview-framework/research.md`
- **CSV/Excel preview (038)**: `papaparse` (CSV parsing, MIT), `xlsx` (SheetJS Community Edition, Apache-2.0, pinned to the SheetJS-published CDN tarball rather than the stale npm registry copy) — both lazy-loaded — see `specs/038-csv-excel-viewer/research.md`
- **PPTX preview (039)**: `jszip` (MIT, unzips the OOXML container) + `fast-xml-parser` (MIT, parses slide/notes XML) — both lazy-loaded, no pixel-faithful rendering library used (none is free/license-compatible) — see `specs/039-bugfix-pptx-preview/research.md`

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

Measured on the current branch, 90.7% of implementation lines are shared between both distributions, excluding tests, docs, and generated build output.

## Code Style

TypeScript 5.x + Node.js 22+: follow standard conventions. Use `.js` extensions on all imports (NodeNext module resolution). Keep product server, CLI, and UI behavior in the existing TypeScript/React stack. Swift is permitted only for the scoped macOS native wrapper under `native/macos/`, and shell/Ruby packaging files are permitted only for Homebrew/macOS release automation under `packaging/macos/` and `.github/workflows/`.

## Recent Changes
- 0.13.0 (standalone fix, same release as 039): Fixed a long-standing "empty folder view on launch" problem. `initializePaths` (`src/server.ts`) previously committed to a repo path that had never been checked for existence or readability, so a deleted/renamed/no-longer-readable "last used" or explicit-launch folder silently rendered as a normal, empty, non-git folder with no explanation — matching an existing test (`tests/integration/server.test.ts`) that had locked in this behavior as intentional. Added `resolveGuaranteedFallbackPath` (`src/services/startup-preferences.ts`), a cross-platform chain (Documents → home → cwd → OS temp dir → filesystem/drive root) that always resolves to a verified-readable directory; wired it into `initializePaths`, a new self-healing check at the top of `infoHandler` (recovers mid-session, e.g. an external drive unmounted while the app was already open, on the next `/api/info` fetch), and `repositoryParentFolderHandler` (walks past an unreadable ancestor instead of landing on it, fixing the "go up a folder" workaround so it can't hit the same dead end one level up). A new `'safe-fallback'` `StartupFolderSource` surfaces a clear on-screen message via the existing picker-page banner mechanism in all these cases.
- 039-bugfix-pptx-preview: Four security/correctness/reliability bug fixes (repo symlink write-escape containment re-check on every intermediate path segment and immediately before `mkdir`/`writeFile`; branch-search colon-in-filename path parsing fixed to a length-based `${branch}:` prefix strip instead of colon-splitting; changed-file review now reads `git status` via `--porcelain=v1 -z` (NUL-delimited records) instead of the newline-delimited default, sidestepping Git's C-quoting of renamed paths entirely rather than decoding it; non-terminal WebSocket upgrade attempts close promptly) plus a new read-only PPTX preview capability (`PptxViewer.tsx`, via lazily-loaded `jszip` + `fast-xml-parser`, best-effort formatted slide rendering — positioned text runs, background fill, embedded images — with speaker notes and next/previous navigation, following the same registry-pattern integration as PDF/CSV/Excel with zero `ContentPanel`/registry-dispatch changes, matching spec 036's pattern). Pixel-faithful slide rendering is explicitly out of scope (no free/license-compatible renderer exists), the same tradeoff pattern as spec 038's chart-data-as-table decision. See `specs/039-bugfix-pptx-preview/`.
- 038-csv-excel-viewer: Extended the preview registry with `.csv` (`CsvViewer.tsx`, lazily-loaded `papaparse`, rendered as a scrollable table with raw/pretty toggle) and `.xlsx`/`.xls` (`ExcelViewer.tsx`, lazily-loaded `xlsx`/SheetJS CE, per-sheet tab strip, cached cell values only — never formula recalculation) preview support, both `editable: false`, with zero changes to `ContentPanel.tsx`'s core dispatch logic (SC-006, matching spec 036's pattern). User Story 3 (chart indicators) shipped at reduced scope after empirically confirming SheetJS Community Edition exposes no chart title or cached series data for any chart shape and gives no detectable signal at all for a chart embedded inside a normal worksheet — only a static "this sheet contains a chart" label is shown, and only on a sheet that is itself a dedicated chart tab; confirmed with the feature requester before implementation. Also fixed a pre-existing gap where `ui/vitest.config.ts`'s coverage `include` list omitted the preview-framework's own viewer components. See `specs/038-csv-excel-viewer/`.
- 0.11.0: Linked gitlocal.dev from the npm and GitHub READMEs (website badge, homepage field) and optimized the gitlocal.dev site for AI answer engines and search engines (canonical/OG/Twitter meta tags, JSON-LD `SoftwareApplication`/`FAQPage` structured data, a matching visible FAQ section, `robots.txt`, `sitemap.xml`, `llms.txt`) — see `releases/0.11.0-release-review.md`.
- 036-file-preview-framework: Introduced a registry-pattern preview framework (`ui/src/components/ContentPanel/preview-registry.tsx`) mapping each file content type to its preview component, migrating all existing preview behavior (markdown, json, text, image, binary) onto it with zero behavioral change, and extended it with read-only PDF preview (`PdfViewer.tsx`, via lazily-loaded `pdfjs-dist` with a locally-bundled worker) and read-only SVG preview (`SvgViewer.tsx`, rendered as an inert `<img>` data URI to prevent script execution) — see `specs/036-file-preview-framework/`.
- 035-quality-hardening (0.10.3): Full architecture/code review of all 15 reviewable units (110 findings logged) and disposition of all of them — bug fixes (sync-status path-type misreporting on non-current branches, an opened-file name mismatch outside git repos, macOS app JS-injection and process-lifecycle races, missing file-tree keyboard navigation, incorrect picker `aria-expanded` state, a silent failed-subdirectory-fetch with no retry indicator, "Find in file" losing its query on reopen, stale search pagination across a branch switch, a macOS default-Markdown-reader partial-registration gap), plus dead-code removal, duplicate-code consolidation, and efficiency/readability polish across the server, UI, and macOS app (Phases 5-8). A pre-release contrarian QA pass found and fixed two additional issues: a non-keyboard-accessible folder-picker sidebar (converted to native buttons) and an unfixed effect-dependency inefficiency in the file tree. See `specs/035-quality-hardening/` and `releases/0.10.3-release-review.md`.
- 034-patch-bugfixes: Six patch-level bug fixes/relocations — restored folder-view scrolling (`min-h-0` on `content-area`), fixed the Claude/Codex terminal-tab PATH detection error, added a Ctrl+` terminal-toggle shortcut, unified the dotfile-toggle checkboxes into a single toolbar "View options" dropdown (with a native macOS View-menu counterpart), moved Refresh into that dropdown behind a Ctrl+Alt+R shortcut, and moved the Tracked/All/Local selector into the same dropdown (plus a native submenu) — see `specs/034-patch-bugfixes/`.
- 033-ui-density-navigation-fixes: UI-only density/navigation fixes — two-row repository block, Parent Folder control moved to the top toolbar, toolbar button restyling, denser folder-view spacing with a redundant nested container removed, terminal collapsed-state viewport fix, smaller terminal font — see `specs/033-ui-density-navigation-fixes/`.
- 032-integrated-terminal-panel: Added a persistent bottom-docked terminal panel (Regular/Claude/Codex tab kinds, cross-page session persistence via `node-pty` + per-tab WebSocket I/O, cwd-follows-visible-content) — see `specs/032-integrated-terminal-panel/`.
- 018-macos-homebrew-app: Added scoped macOS native app packaging around the shared GitLocal server/UI while preserving the npm package distribution.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
