# Phase 0 Research: Repo Safety, Search & Review Fixes + PPTX Preview

## 1. Symlink write escape — precise defect and fix shape

**Decision**: In `src/git/repo.ts`, `resolveSafeRepoPath(repoPath, filePath)` already walks up to the nearest *existing* ancestor and validates it with `realpathSync` before returning a resolved path, but two gaps remain: (a) intermediate directories that exist and are themselves symlinks (or contain a symlinked ancestor) further down the walked path are not independently re-validated once the walk reaches them, and (b) `createWorkingTreeFolder`'s recursive `mkdir` and the file-write path both re-derive a parent directory without re-running the real-path containment check immediately before the actual filesystem mutation, so a TOCTOU-shaped or nested-symlink case can slip through. The fix adds a final `realpathSync`-based containment check on the fully resolved parent directory immediately before `mkdir`/`writeFile`, in addition to the existing ancestor walk, and applies the same check to every existing intermediate segment (not just the nearest existing ancestor) during the walk.

**Rationale**: Re-checking only at the boundary closest to the mutation closes the gap regardless of how many symlink hops occur earlier in the path, without having to enumerate every possible symlink topology up front. This mirrors the standard "resolve then validate, as close to the syscall as possible" pattern for path-containment guards.

**Alternatives considered**:
- *Reject any symlink anywhere in the repo outright*: rejected — overly broad, would break legitimate in-repository symlinks (e.g., symlinked node_modules or config files) that resolve to a location still inside the repo root.
- *Use `fs.realpath` only once at the very top of the request*: rejected — the vulnerable case is specifically a symlink introduced *after* the initial resolution but before the mutation, or one nested deeper than the nearest existing ancestor; a single top-level check doesn't cover mid-path symlinks reliably.

## 2. Branch search colon parsing — precise defect and fix shape

**Decision**: `searchGitTreeByContent` already invokes `git grep -n -z` and uses NUL-delimited parsing for the path/line boundary rather than naive colon-splitting, which is the correct approach for the path itself. The residual defect (per the bug report) is in a related, less-defended step: stripping the `${branch}:` treeish prefix from the NUL-delimited path field. If that strip is done via a colon-based operation (e.g., `split(':')[1]`) rather than a length-based prefix removal (`path.slice(branch.length + 1)` after confirming the field starts with `${branch}:`), a colon inside the filename after the treeish prefix still corrupts the result even though NUL delimiting is otherwise correct. The fix uses an explicit prefix-length removal instead of any colon-splitting, anywhere in the parsing path.

**Rationale**: The treeish prefix (`branch` or ref name) is already known by the caller, so its length is known exactly — removing exactly `branch.length + 1` characters from the front of the field is unambiguous regardless of what characters follow, including colons.

**Alternatives considered**:
- *Regex-based colon splitting with a "last colon before line number" heuristic*: rejected — still ambiguous when a filename contains digits after a colon that could be mistaken for a line number field; a known-length prefix strip has no such ambiguity.
- *Re-run `git grep` with a different output format (e.g., `--null` plus JSON)*: rejected — `git grep` has no built-in JSON output mode; the current NUL-delimited format is already the standard robust approach and only needs the prefix-strip fixed.

## 3. Quoted rename paths — precise defect and fix shape

**Decision**: `parsePorcelainChangeState` reads raw porcelain records without decoding Git's C-style quoting, which Git applies by default (`core.quotePath=true`) to any path containing spaces, non-ASCII bytes, or special characters, wrapping the path in double quotes and backslash-escaping special bytes (e.g., a space may trigger quoting depending on Git version/config, and embedded quotes/backslashes are always escaped as `\"`/`\\`). For renames, the porcelain `-z` record format separates old and new paths with a NUL rather than a tab, and the current parser must correctly consume two NUL-delimited fields for a rename record. The fix adds a small `unquoteGitPath(raw: string): string` helper that detects a leading/trailing `"` and applies Git's escape decoding (octal byte escapes plus `\\`, `\"`, `\t`, `\n` sequences) before the path is used anywhere in the API response, applied to both the single-path and rename-pair cases.

**Rationale**: Decoding once, in one small shared helper, at the point paths are extracted from porcelain output is the minimal, single-responsibility fix and matches the pattern already used elsewhere in the codebase for isolated parsing helpers.

**Alternatives considered**:
- *Pass `-z --no-renames` or set `core.quotePath=false` when invoking git*: rejected — `-z` already NUL-delimits records (which the existing code should already rely on for the old/new separator), but does not disable quoting of individual path *bytes*; `core.quotePath=false` only affects terminal-oriented human output, not guaranteed to be respected consistently, and depending on process-level git config overrides is more fragile than decoding the well-defined quoted format directly.
- *Only handle the space case reported in the bug*: rejected — the same defect applies to any quoted character (non-ASCII, embedded quotes); fixing the general decode is not meaningfully more work than special-casing spaces.

## 4. Non-terminal WebSocket upgrades — precise defect and fix shape

**Decision**: `attachTerminalWebSocketServer`'s `upgrade` handler already matches `TERMINAL_IO_PATH` and destroys the socket with a 404 for non-matching paths in the common case. Research confirms the originally reported hang is a **registration-order / multiple-listener** issue: if another part of the server (e.g., a future WebSocket-consuming feature, or a test harness) also listens for `'upgrade'` on the same `httpServer` without one of the listeners terminating the socket when it doesn't recognize the path, Node's default `http.Server` behavior leaves the socket without a response when *no* listener calls `socket.destroy()` or writes a response — Node does not auto-reject unhandled upgrades. The fix ensures the terminal upgrade handler is the sole (or first-and-authoritative) handler that unconditionally destroys sockets for any path it doesn't recognize as its own, and that this handler is attached before the HTTP server starts accepting connections, closing any startup-ordering race.

**Rationale**: Node's `http`/`net` upgrade contract requires *some* listener to explicitly end the socket for paths it won't handle; this is already implemented for the known code path, so the fix is about guaranteeing that listener is registered early and is authoritative, plus adding a regression test that asserts the socket transitions out of `CONNECTING` within a bounded time.

**Alternatives considered**:
- *Add a server-wide catch-all `upgrade` listener as a second safety net*: considered as a defense-in-depth addition alongside the ordering fix, to guarantee no future added upgrade-consuming code silently reintroduces the hang; documented as a follow-up in tasks rather than a required behavior change beyond FR-011/FR-012.

## 5. PPTX slide parsing/rendering approach

**Decision**: Use `jszip` (MIT) to unzip the `.pptx` OOXML container and `fast-xml-parser` (MIT) to parse each `ppt/slides/slideN.xml` (and corresponding `ppt/notesSlides/notesSlideN.xml` when present) into JS objects. Render each slide as an absolutely-positioned HTML view scaled from EMU (English Metric Units, OOXML's native unit) to CSS pixels, drawing text boxes with their run-level formatting (bold/italic/font size/color) and any embedded raster images (resolved via the slide's `.rels` relationship file to `ppt/media/imageN.*`, embedded as data URIs). Speaker notes are extracted as plain text runs from the notes slide's body placeholder, if present. This is a best-effort formatted view, not a pixel-faithful reproduction of PowerPoint's own renderer (no support for SmartArt, complex gradients/animations, embedded video/audio, or precise font substitution).

**Rationale**: No free/MIT/Apache-licensed browser library performs full pixel-faithful PPTX rendering — this space is dominated by paid SDKs (e.g., commercial Office-viewer components) or server-side conversion via LibreOffice/unoconv, which would require a non-JS runtime dependency outside the project's Node/TS-only constitution. `jszip` and `fast-xml-parser` are both small, widely-used, MIT-licensed, and browser-safe, matching the project's existing preference (papaparse/xlsx) for minimal, purpose-fit parsing libraries over heavyweight frameworks. This mirrors spec 038's precedent of scoping down (chart-data-as-table instead of chart-graphics) when the fully-faithful option isn't license-compatible.

**Alternatives considered**:
- *`officeparser` (text-extraction-only library)*: rejected — extracts plain text only, discarding layout/formatting/images entirely, which would not meet FR-014's "single formatted view" requirement.
- *Server-side conversion via headless LibreOffice to images/PDF, then reuse the existing PdfViewer*: rejected — requires bundling/depending on a non-Node system binary, violating Constitution Principle I (TypeScript-first, Node-only core) and adding a heavyweight external dependency for a local-first tool.
- *`pptxgenjs`*: rejected — this library is for *generating* PPTX files, not parsing/rendering existing ones; wrong direction for a read-only viewer.

## 6. Slide navigation UX model

**Decision**: Model navigation on Excel viewer's `activeSheetIndex` pattern (single "current index" state driving which slide is rendered) rather than PdfViewer's continuous-scroll multi-canvas approach, since the spec explicitly calls for discrete "next/previous slide" stepping (FR-015) with an optional adjacent notes panel (FR-016) — a per-slide paged view maps more directly to that requirement than a scrollable document.

**Rationale**: Matches the spec's explicit language ("step through," "next slide," "previous slide") and reuses an already-proven state-management pattern (`activeSheetIndex`) from the same preview framework rather than introducing a third distinct navigation paradigm.

**Alternatives considered**:
- *Continuous scroll like PdfViewer*: rejected — spec explicitly frames the experience as slide-by-slide stepping with notes shown per-slide, which reads awkwardly in a continuous-scroll layout where notes would need to interleave between large slide renders.

## 7. Lazy loading and bundle-size handling

**Decision**: `jszip` and `fast-xml-parser` are dynamically imported inside `PptxViewer`'s effect (mirroring `PdfViewer`'s `Promise.all([import(...), import(...)])` pattern), so neither library is included in the main UI bundle. Parsing of slides happens asynchronously after the dynamic import resolves and the file's base64 content is fetched, with slide XML parsing done incrementally (one slide parsed at a time, yielding to the event loop) to avoid blocking the UI thread on decks with many slides.

**Rationale**: Directly reuses the established lazy-loading contract from specs 036/038 (`pdfjs-dist`, `xlsx` are both lazy-loaded); incremental parsing addresses the "large deck must not block/freeze the UI" edge case in spec.md.

**Alternatives considered**:
- *Parse the entire presentation synchronously up front*: rejected for decks with many slides — risks a long blocking parse on the main thread; incremental/yielding parsing is a small addition with clear UX benefit.
