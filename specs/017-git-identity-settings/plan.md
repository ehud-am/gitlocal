# Implementation Plan: Git Identity Settings

**Branch**: `017-git-identity-settings` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/017-git-identity-settings/spec.md`

## Summary

Mature the repository git identity workflow so each project can persist author name, author email, and SSH private key path in project-local private settings, while keeping the existing repository-local git configuration in sync for git operations. Add server-side SSH private key discovery and validation, expose UI support for selecting valid keys from the user's conventional SSH folder plus manual path entry, and warn before persisting private settings when the project does not ignore the private settings file.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+; React 18 TypeScript UI  
**Primary Dependencies**: Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Radix UI primitives; no new runtime dependency planned  
**Storage**: Project-local `.env` file for GitLocal identity values, repository-local git config for active git command behavior, `.gitignore` for private-file protection  
**Testing**: Vitest with @vitest/coverage-v8 for server, React Testing Library/Vitest for UI; maintain 90% per-file branch coverage  
**Target Platform**: Local Node.js server serving a browser UI on macOS, Windows, and Linux-capable local machines  
**Project Type**: Single npm package with Node.js backend/CLI and React SPA frontend  
**Performance Goals**: SSH key list returns within 500ms for conventional SSH folders containing up to 200 entries; identity save completes within 1 second for normal local repositories  
**Constraints**: Local-first only; no remote service calls; do not expose SSH private key contents; no contributor-local absolute paths in committed docs; do not update `.gitignore` without explicit user approval  
**Scale/Scope**: One open repository/project per GitLocal server session; project-local settings for the currently opened repository; one identity form and supporting server endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First**: PASS. Work remains in the existing TypeScript server/CLI and React TypeScript UI.
- **Test Coverage**: PASS. Plan includes unit, handler, integration, and UI tests for all changed files to preserve the 90% per-file threshold.
- **Local-First with Git Remote Exception**: PASS. All identity, key discovery, and ignore-file checks use local filesystem and local git behavior only.
- **Node.js-Served React UI**: PASS. UI remains the existing React SPA served by the Node.js backend.
- **Clean & Useful UI**: PASS. The workflow adds focused controls to the existing identity dialog rather than a separate surface.
- **Free & Open Source**: PASS. No proprietary components or paid features; no new runtime dependency planned.
- **Repository-Relative Paths and Release Documentation**: PASS. Planning artifacts use repository-relative links and paths.
- **Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. Not a release task; no version bump or release artifact required in this feature plan.

## Project Structure

### Documentation (this feature)

```text
specs/017-git-identity-settings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── git-identity-api.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── git/
│   ├── repo.ts                  # Existing git identity read/write behavior
│   └── identity-settings.ts     # Project-local identity persistence, SSH key validation, ignore protection
├── handlers/
│   └── repo.ts                  # Identity, SSH key listing, ignore protection handlers
├── server.ts                    # Route registration
└── types.ts                     # Shared server contracts

ui/src/
├── App.tsx                      # Identity dialog state orchestration
├── components/
│   └── AppDialogs.tsx           # Identity dialog file picker/manual path UI and warnings
├── services/
│   └── api.ts                   # Client calls for identity, keys, protection
└── types/
    └── index.ts                 # Shared UI contracts

tests/
├── integration/
│   └── server.test.ts           # End-to-end server behavior for identity persistence and protection
└── unit/
    ├── git/
    │   └── repo.test.ts         # Persistence, key validation, ignore protection
    └── handlers/
        └── repo.test.ts         # API contract behavior

ui/src/
├── App.test.tsx
├── App.logic.test.tsx
├── App.branch-coverage.test.tsx
└── components/
    └── AppDialogs.test.tsx
```

**Structure Decision**: Extend the existing `src/git/repo.ts`, `src/handlers/repo.ts`, `src/types.ts`, `ui/src/App.tsx`, `ui/src/components/AppDialogs.tsx`, and `ui/src/services/api.ts` boundaries. Add one server helper module only if needed to keep private settings, SSH key validation, and ignore-file protection cohesive and testable.

## Complexity Tracking

No constitution violations require justification.

## Phase 0: Research Summary

See [research.md](research.md).

Resolved decisions:

- Use project-local `.env` as the v1 private settings file, with GitLocal-owned key names.
- Keep repository-local git config synchronized for `user.name`, `user.email`, and `core.sshCommand` so existing git workflows continue to work.
- Detect SSH private keys by local file inspection using recognized private key headers, while never returning file contents.
- Default SSH browsing to `~/.ssh` on POSIX/macOS and `%USERPROFILE%\.ssh` on Windows when present; fall back to manual path entry.
- Model ignore protection as an explicit status returned to the UI, with a separate approval action to create or update `.gitignore`.

## Phase 1: Design Summary

See [data-model.md](data-model.md), [contracts/git-identity-api.md](contracts/git-identity-api.md), and [quickstart.md](quickstart.md).

Post-design constitution check: PASS. The design remains local-first, TypeScript-only, dependency-light, and testable under the repository's coverage requirements.
