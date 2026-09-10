# Implementation Plan: Footer/About Links & Cloudflare Hosting Migration

**Branch**: `042-footer-about-links-hosting` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/042-footer-about-links-hosting/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Three independent, low-risk changes for the next patch release. (1) `AppFooter.tsx`
(`ui/src/components/AppFooter.tsx`) already renders one link (to `https://github.com/ehud-am/gitlocal`,
labeled "GitLocal"); add a second, clearly distinguishable link to `https://gitlocal.dev`, keeping
the existing GitHub link and its behavior unchanged. (2) `AppDelegate.swift`
(`native/macos/GitLocal/GitLocal/AppDelegate.swift`) currently wires "About GitLocal" straight to
AppKit's built-in `orderFrontStandardAboutPanel(_:)`, which has no support for arbitrary hyperlinks
— it only accepts a fixed set of `NSApplication.AboutPanelOptionKey` fields (name, version, icon,
credits as an `NSAttributedString`, etc.). To add two clickable links, the credits field (an
`NSAttributedString` that supports `.link` attributes and *is* rendered as clickable text in the
standard panel) is the smallest change that keeps using the standard panel rather than building a
fully custom about window. (3) The Cloudflare hosting migration (User Story 3) is pure operational
documentation — no application code changes — but per explicit user instruction for this planning
pass, the actual step-by-step Cloudflare deployment/DNS instructions (which necessarily reference
the owner's specific Cloudflare account, zone, and DNS configuration) MUST be delivered as
conversation-only guidance and MUST NOT be written into any file that will be committed to git or
pushed to the public remote. The only artifact this plan produces for User Story 3 is a
repository-safe checklist stub (`specs/042-footer-about-links-hosting/quickstart.md`) that says
*what* must be verified, without embedding account identifiers, zone/token values, or other
Cloudflare-account-specific configuration.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ / React 18 (web footer); Swift 5.9 (macOS native About panel) — no new language or runtime
**Primary Dependencies**: None new. Web: existing React/Vite UI stack. macOS: AppKit's `NSApplication`, `NSAttributedString` (both already in use in `AppDelegate.swift`) — no new Swift dependency
**Storage**: N/A — static link labels/URLs only, no persisted state
**Testing**: Vitest + React Testing Library for `AppFooter.tsx` (existing `ui/src/App.logic.test.tsx` / component-level tests exercise the footer today — extend/add a focused `AppFooter` test to cover the new link); no automated test harness exists today for `AppDelegate.swift` menu/about wiring, consistent with the rest of that file, so the About-panel change is verified manually (build + open About box) per constitution Principle II's scope (90% coverage applies to TypeScript source; Swift wrapper code is a thin, largely-untested-by-design shell per Principle I)
**Target Platform**: Browser-based web UI (npm distribution) for the footer change; macOS 12+ native app (Homebrew cask distribution) for the About-box change; the Cloudflare migration targets the public `docs/` static site (currently GitHub Pages, served via `docs/CNAME` = `gitlocal.dev`) with no relation to the Node/React runtime targets above
**Project Type**: Existing single-repo web application (Node/Hono backend + React/Vite frontend) plus its scoped macOS native wrapper (`native/macos/`) — this feature touches one UI component, one Swift file, and (conversation-only, non-committed) operational hosting steps; no backend (`src/`) changes
**Performance Goals**: N/A — two static links added to already-rendered UI surfaces
**Constraints**: Must not change existing footer/About-box behavior (version display, app identity, existing GitHub link's destination/target) — additive only; must not commit any Cloudflare account identifiers, API tokens, zone IDs, or other secrets/PII to the git repository, in this plan, any other spec artifact, or application source, per explicit user instruction and general secret-handling hygiene; the Cloudflare-specific runbook itself is delivered as a chat response, never as a repo file
**Scale/Scope**: Two small source touches (`ui/src/components/AppFooter.tsx`, `native/macos/GitLocal/GitLocal/AppDelegate.swift`) plus their tests/docs; the hosting migration is a manual, one-time operational activity outside the codebase and outside `tasks.md`'s automatable scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: PASS. The footer change stays in existing TypeScript/React. The About-box change is confined to the already-permitted "scoped macOS native wrapper" (`native/macos/`) and adds no new dependency, forks no product behavior, and keeps npm package contents/behavior unchanged.
- **II. Test Coverage (NON-NEGOTIABLE)**: PASS (must remain true through implementation). `AppFooter.tsx` must stay at ≥90% per-file branch coverage after the new link is added — the new branch (rendering the second link) must be covered by a test. Swift wrapper code has no per-file coverage gate under Principle I/II as written; verification there is manual (build + click-through in the running app), matching how the rest of `AppDelegate.swift`'s menu wiring is validated today.
- **III. Local-First with Git Remote Exception**: PASS. Both links are outbound navigation the user explicitly clicks (opening the OS/browser's own network stack), not GitLocal-initiated network calls; no telemetry or background requests are added. The Cloudflare hosting migration is infrastructure for the public marketing site (`docs/`) and is unrelated to the local-first product runtime.
- **IV. Node.js-Served React UI**: PASS. No change to how the SPA is built or served.
- **V. Clean & Useful UI**: PASS. Adding one clearly labeled link to an existing minimal footer, and using the standard (not custom) macOS About panel's built-in credits-link support, both stay within "minimal, content-focused" design language — no new custom chrome.
- **VI. Free & Open Source**: PASS. No new dependencies, no proprietary services; Cloudflare's free tier is sufficient for a static site mirror and is the owner's own infrastructure choice, not a product feature or feature gate.
- **VII. Repository-Relative Paths and Release Documentation**: PASS with an explicit exception carved out by user instruction: this plan and all other committed spec artifacts (spec.md, this plan, research.md, quickstart.md, tasks.md) MUST contain no Cloudflare account-specific values (zone IDs, API tokens, account emails/IDs, nameserver assignments, or similar). The actual step-by-step Cloudflare runbook is delivered as a conversation-only response outside of any committed file, per the user's explicit "no information leak" instruction for this feature — this is a deliberate scoping decision, not an oversight, and is called out here so future readers of this plan understand why User Story 3 has no corresponding detailed doc artifact in the repo.

No unjustified violations — Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/042-footer-about-links-hosting/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command) — verification checklist only, no Cloudflare account specifics
├── contracts/           # Not applicable — no external API/interface surface is introduced (see below)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

`data-model.md` is omitted: this feature introduces no persisted entities, only static UI links and
an operational runbook (see Key Entities in spec.md, which are documentation concepts, not data).

### Source Code (repository root)

```text
ui/
├── src/
│   ├── components/
│   │   └── AppFooter.tsx         # Add gitlocal.dev link (User Story 1)
│   └── App.logic.test.tsx        # Existing footer-adjacent test file; extend or add AppFooter.test.tsx
└── ...

native/macos/GitLocal/GitLocal/
└── AppDelegate.swift              # Add links to the About panel's credits attributed string (User Story 2)

docs/                               # Existing static site (GitHub Pages source, docs/CNAME = gitlocal.dev)
└── ...                             # No file changes here from this feature; referenced only as
                                     # migration source content for the conversation-only Cloudflare runbook (User Story 3)
```

**Structure Decision**: Reuse the existing single-repo layout (`ui/` for the React frontend,
`native/macos/` for the scoped Swift wrapper, `docs/` as the current GitHub Pages site source).
No new top-level directories or projects are introduced. User Story 3 produces no source-tree
artifact by design (see Constitution Check, Principle VII exception above).

## Complexity Tracking

*No violations — table omitted.*
