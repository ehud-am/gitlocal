# Implementation Plan: Repo Safety, Search & Review Fixes + PPTX Preview

**Branch**: `039-bugfix-pptx-preview` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/039-bugfix-pptx-preview/spec.md`

## Summary

Four independent, narrowly-scoped bug fixes plus one new read-only preview type, all touching existing modules with no new architecture:

1. **Symlink write escape (US1/FR-001..004)** — `resolveSafeRepoPath` in `src/git/repo.ts` already walks up to the nearest existing ancestor and `realpathSync`-validates it, but the final (not-yet-existing) leaf segment and any *already-existing* intermediate symlinked directory are not re-validated against their resolved real path before use by `createWorkingTreeFolder` and the file-write path. Fix: after locating the nearest existing ancestor, resolve *that* ancestor with `realpathSync` (already done) but also re-validate on every existing intermediate directory encountered while walking down, and re-check containment once more immediately before `mkdir`/`writeFile`, using the fully resolved real parent directory rather than the lexical one.
2. **Branch search colon parsing (US2/FR-005..007)** — `searchGitTreeByContent` in `src/handlers/search.ts` already delimits on NUL for the path and uses `-z`, so the actual defect is narrower than the original report suggested; research.md documents the precise current parsing logic and the minimal fix to guarantee colon-safe paths end-to-end (including the `${branch}:` prefix strip).
3. **Quoted rename paths (US3/FR-008..010)** — `parsePorcelainChangeState` in `src/git/repo.ts` needs to run Git's C-quoting decode (`core.quotePath` output format: `"a\\040b.txt"`-style backslash escapes wrapped in double quotes) on both the single path and the `old\tnew` rename pair before they reach the API response, and must correctly split old/new on the actual porcelain rename separator rather than assuming no quoting.
4. **Hanging non-terminal upgrades (US4/FR-011..012)** — `attachTerminalWebSocketServer` in `src/terminal/websocket.ts` already 404s and destroys the socket for non-matching paths; research.md confirms whether the reported hang is a race (upgrade fired before the listener attached) or a distinct code path, and the fix closes that gap.
5. **PPTX preview (US5/FR-013..019)** — new `pptx` entry in the existing preview registry (`ui/src/components/ContentPanel/preview-registry.tsx`), a new `PptxViewer.tsx` following the Excel viewer's base64-transport + lazy-load pattern, and a new server-side `pptx` branch in `src/handlers/file.ts`/`detectFileType`. Because no free, MIT/Apache-compatible library renders PPTX slides as pixel-faithful graphics in the browser, slides are parsed from the underlying Office Open XML (`.pptx` is a zip of XML) using `jszip` (MIT) + `fast-xml-parser` (MIT) and rendered as a best-effort formatted view (positioned text boxes with basic run formatting, background fill, and embedded images), not a pixel-perfect renderer — an explicit, Constitution-driven scope reduction analogous to spec 038's chart-indicator scope decision. Speaker notes are extracted from each slide's `notesSlide` part.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+ (existing project baseline; unchanged)
**Primary Dependencies**: Existing — Hono ^4.x, React 18, Vite, `ws`, the `specs/036-file-preview-framework/` preview registry, the `specs/038-csv-excel-viewer/` viewer pattern. New — `jszip` (MIT) to unpack the `.pptx` OOXML container, `fast-xml-parser` (MIT) to parse slide/notes XML into JS objects. No PPTX-rendering-as-image library is introduced (see research.md — none is free/license-compatible with pixel-faithful output).
**Storage**: N/A — files are read from the filesystem/git blob at request time, same as today; no persistence layer added
**Testing**: Vitest for both server and UI (existing). New unit tests: `resolveSafeRepoPath`/`createWorkingTreeFolder` symlink-escape cases in `tests/unit/git/repo.test.ts`, colon-filename cases in `tests/unit/handlers/search.test.ts`, quoted-rename cases in `tests/unit/git/repo.test.ts`, non-terminal-upgrade-closes-promptly cases in `tests/unit/terminal/websocket.test.ts`, and a new `PptxViewer.test.tsx` (fixture `.pptx` files, mirroring `ExcelViewer.test.tsx`) plus `preview-registry.test.ts` extension.
**Target Platform**: Cross-platform — npm package and the macOS Homebrew native app wrapper; both share this code per Constitution Principle I
**Project Type**: Web application — existing single-repo layout with `src/` (Hono backend) and `ui/` (Vite/React frontend)
**Performance Goals**: Path-containment re-validation adds at most one extra `realpathSync` call per write/create request — negligible vs. existing filesystem I/O. PPTX parsing/rendering happens client-side after file fetch, consistent with existing PDF/Excel preview responsiveness expectations; large decks must not block the UI thread (research.md documents chunked/async parsing approach).
**Constraints**: Symlink fix must not change behavior for any non-symlink, in-repository path (FR-004); search/porcelain fixes must not change output for filenames without colons/special characters (FR-007, existing tests); WebSocket fix must not change terminal-endpoint behavior (FR-012); PPTX preview must be strictly read-only (FR-017) and must not require changes to `ContentPanel`'s core dispatch logic (FR-019, SC-006); must not regress per-file coverage minimums (Constitution Principle II)
**Scale/Scope**: Single local user; ordinary-sized repositories and presentations (tens of slides, not exhaustively large decks)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TypeScript-First Product Core | PASS | All changes are TypeScript in the existing server/UI stack. `jszip` and `fast-xml-parser` are pure-JS client libraries, not a new language or native addon. |
| II. Test Coverage (NON-NEGOTIABLE) | PASS (design accounts for it) | Each bug fix gets targeted regression tests for both the broken case and the pre-existing-correct case; `PptxViewer` is tested with fixture `.pptx` files and mocked `jszip`/`fast-xml-parser` for corrupted-file error branches, mirroring `ExcelViewer.test.tsx`. |
| III. Local-First with Git Remote Exception | PASS | All four fixes operate on local filesystem/local `git` subprocess output already read today; no network calls added. PPTX parsing operates entirely on bytes already fetched from the local `/api/file` endpoint — no external CDN or remote data-link resolution (FR-017 read-only, no fetch of external images/links). |
| IV. Node.js-Served React UI | PASS | No change to the serving model; `PptxViewer` is additional React UI served the same way. |
| V. Clean & Useful UI | PASS | PPTX preview follows the existing PDF viewer's single-document-with-navigation paradigm and the Excel viewer's minimal, GitHub-inspired presentation; notes panel follows existing side-panel/secondary-content visual language already used elsewhere in the app. |
| VI. Free & Open Source | PASS, with an explicit scope tradeoff | `jszip` (MIT) and `fast-xml-parser` (MIT) are fully free with no feature gating. Pixel-faithful slide rendering is explicitly **not implemented** because every library capable of it (e.g., commercial Office-rendering SDKs, server-based LibreOffice conversion) is either paid or requires a server-side non-JS dependency outside this project's stack — implementing it would violate Principle I and/or VI. Scope is a best-effort formatted view (FR-014, spec.md Assumptions), the same tradeoff pattern as spec 038's chart-data-as-table decision. |
| VII. Repository-Relative Paths | PASS | All new spec-kit artifacts and source paths are repository-relative. |
| VIII. Release Branches / Pre-GA / Contrarian QA | DEFERRED (not a plan-time gate) | Required before this feature ships in a release branch, per existing project practice. |

No violations requiring justification; Complexity Tracking below documents the custom OOXML-parsing approach as a scope tradeoff, not a constitution exception.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`).*

Design choices (registry-only PPTX integration with no new server round-trips beyond the existing base64 file-content pattern; custom best-effort slide layout instead of any paid/AGPL rendering dependency; symlink/search/porcelain fixes contained entirely within their existing functions with no new modules) introduce no new constitution risk beyond what's tracked in Complexity Tracking. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/039-bugfix-pptx-preview/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── file-content-api.md  # Phase 1 output — FileContent type/API changes for pptx
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this plan)
```

### Source Code (repository root)

This feature extends GitLocal's existing web-application layout (backend `src/` + frontend `ui/`) and the `specs/036-file-preview-framework/` registry; no new top-level projects are introduced.

```text
src/
├── git/repo.ts                     # EXISTING — resolveSafeRepoPath/createWorkingTreeFolder symlink re-validation fix; parsePorcelainChangeState quoted-path decode fix; detectFileType() gains 'pptx'
├── handlers/search.ts              # EXISTING — searchGitTreeByContent colon-safe path/line parsing fix
├── terminal/websocket.ts           # EXISTING — non-terminal upgrade socket-close fix
├── handlers/file.ts                # EXISTING — fileHandler gains explicit pptx response branch (base64 content mode, matching excel)
└── types.ts                        # EXISTING — FileContent['type'] union extended with 'pptx'

tests/unit/
├── git/repo.test.ts                 # EXISTING — extend for symlink-escape and quoted-rename cases, plus detectFileType 'pptx'
├── handlers/search.test.ts          # EXISTING — extend for colon-filename cases
├── terminal/websocket.test.ts       # EXISTING — extend for non-terminal-upgrade-closes-promptly case
└── handlers/file.test.ts            # EXISTING — extend fileHandler coverage for pptx branch

ui/src/components/ContentPanel/
├── preview-registry.tsx            # EXISTING — gains 'pptx' entry, no changes to its dispatch logic
├── preview-registry.test.ts        # EXISTING — extend for the new entry
├── PptxViewer.tsx                  # NEW — jszip + fast-xml-parser slide/notes extraction, slide navigation, best-effort formatted render
└── PptxViewer.test.tsx             # NEW — fixture .pptx files (multi-slide, with/without notes, corrupted) + mocked jszip/fast-xml-parser error branches

ui/vitest.config.ts                  # EXISTING — coverage include list, verified to already cover new PptxViewer.tsx (per spec 038's fixed pattern)
```

**Structure Decision**: Existing web-application layout (`src/` Hono backend, `ui/` Vite/React frontend) is retained unchanged. All four bug fixes are localized edits inside their existing owning functions/files. The PPTX preview is added purely as new registry entries plus new files, matching the extension pattern spec 036 established and spec 038 already exercised — zero new top-level directories or build targets.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| Custom OOXML slide-layout parsing (via `jszip` + `fast-xml-parser`) instead of an off-the-shelf PPTX renderer | No free/MIT/Apache-licensed browser library renders PPTX slides as pixel-faithful graphics; existing options are paid SDKs or require a server-side LibreOffice/headless-Office conversion step outside this project's Node/TS-only stack (Constitution I, VI) | A full pixel-faithful renderer was rejected because it either costs money (violates VI) or requires shelling out to a non-JS conversion binary as a hard runtime dependency (violates I); a best-effort formatted view reuses the same license-safe, client-only pattern already validated for Excel/CSV in spec 038 |
