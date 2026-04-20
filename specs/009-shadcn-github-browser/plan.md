# Implementation Plan: Shadcn GitHub-Style Browser Refresh

**Branch**: `009-shadcn-github-browser` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/009-shadcn-github-browser/spec.md`

## Summary

Refresh GitLocal around a shadcn-driven, GitHub-like light theme with full dark-theme support across the whole app. The implementation will replace the current global CSS shell with reusable shadcn primitives and theme tokens, move repository context into a richer content-panel header, convert branch switching into a real local checkout workflow with server-side safety checks, render folder views with a synthetic parent row plus README content below the file list, and replace the full-screen picker with a true setup modal that can create folders, initialize git, and clone into a child folder.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+  
**Primary Dependencies**: Hono, React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library, Tailwind CSS, shadcn/ui, Radix UI primitives  
**Storage**: None; runtime state is derived from local filesystem contents, git metadata, browser URL state, in-memory server/UI state, and a small persisted theme preference in browser storage  
**Testing**: Vitest, React Testing Library, existing backend unit/integration suites, existing frontend component suites  
**Target Platform**: Local desktop browser served by the Node-based local server  
**Project Type**: Full-stack web application  
**Performance Goals**: Preserve current browsing responsiveness, keep theme changes instant, keep branch-switch and setup flows within the existing local-app interaction model, and avoid unnecessary full-page reloads outside explicit repository-open transitions  
**Constraints**: Local-only flows remain fully functional without network, optional remote git activities must run only through the local `git` executable, GitHub-like light/dark presentation, >=90% per-file branch coverage, repository-relative documentation only, no silent destructive git actions  
**Scale/Scope**: Whole-app UI refresh plus repository metadata, branch-switch, folder-view, and setup-bootstrap flows for a single local repository session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `TypeScript-first`: Pass. All planned work stays inside the existing TypeScript server and React client.
- `Test coverage`: Pass. The feature fits the current backend, integration, and UI test suites, though it will expand the number of scenarios covered per component and handler.
- `Local-first with Git remote exception`: Pass. Theme, folder creation, `git init`, local browsing, and branch switching remain fully usable without network, while clone and future remote-sync actions stay inside the allowed exception because they are user-initiated and executed through the local `git` binary.
- `Node.js-served React UI`: Pass. The work remains inside the existing Hono server plus Vite-built React SPA.
- `Clean & useful UI`: Pass. The refresh intentionally moves closer to GitHub's hierarchy while keeping content-first behavior and lightweight workflows.
- `Repository-relative paths`: Pass. This plan and its supporting artifacts use repository-relative links and paths.
- `Post-Phase-1 re-check`: Pass. The design remains aligned with the current architecture and product philosophy, including the limited remote-git exception.

## Project Structure

### Documentation (this feature)

```text
specs/009-shadcn-github-browser/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── folder-view-and-readme.md
│   ├── repo-context-and-branch-switch.md
│   └── setup-modal-bootstrap.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── handlers/
│   ├── files.ts
│   ├── git.ts
│   └── pick.ts
├── git/
│   └── repo.ts
├── server.ts
└── types.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    ├── git/
    │   └── repo.test.ts
    └── handlers/
        ├── git.test.ts
        ├── pick.test.ts
        └── files.test.ts

ui/
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── services/
    │   └── api.ts
    ├── types/
    │   └── index.ts
    ├── lib/
    │   └── utils.ts
    ├── components/
    │   ├── AppFooter.tsx
    │   ├── ContentPanel/
    │   │   ├── ContentPanel.tsx
    │   │   └── DeleteFileDialog.tsx
    │   ├── GitInfo/
    │   │   ├── GitInfo.tsx
    │   │   └── GitInfo.test.tsx
    │   ├── Picker/
    │   │   ├── PickerPage.tsx
    │   │   └── PickerPage.test.tsx
    │   ├── RepoContext/
    │   ├── Setup/
    │   └── ui/
    └── styles/
        └── globals.css
```

**Structure Decision**: Keep the existing single Hono server plus single React SPA. Server changes stay inside the current repo/picker handlers and git helper layer, while the UI gains a shared shadcn foundation under `ui/src/components/ui/`, app-wide theme tokens, a repo-context header slice inside the content panel, and modal-based setup/bootstrap flows instead of a separate picker-first screen.

## Phase 0: Research Focus

- Choose the app-wide shadcn/Tailwind foundation and GitHub-like light/dark token strategy that can replace the current one-file CSS shell without fragmenting component ownership.
- Define the smallest extension to repository metadata and branch option payloads that can support the new header and local/remote branch switching.
- Confirm a safe branch-switch flow that stages all changes for commit, warns before discard, and handles untracked blockers with an explicit second confirmation.
- Confirm folder-view composition so `..` stays a UI navigation affordance while README lookup remains server-authoritative for current and non-current branches.
- Define the setup modal action surface, including how create-folder, `git init`, and clone flows map onto the existing `/api/pick` family while keeping local-only use complete when no network is available.

## Phase 1: Design Focus

- Define the enriched `RepoInfo`, branch-option, branch-switch, setup-modal, and theme-preference models shared across server and UI.
- Define the component migration map from the current global CSS layout to shadcn-based app-shell, content-panel, setup-modal, and dialog primitives.
- Define the folder-view README contract, remote-link conversion rules, and current-branch upstream/remote selection rules used by the right-panel header.
- Define the validation strategy for theme parity, branch switching, destructive confirmation flows, README ordering, setup-bootstrap actions, and repository-open transitions.

## Complexity Tracking

No constitution violations are expected for this feature.
