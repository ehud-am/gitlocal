# Implementation Plan: Local Git Identity

**Branch**: `020-local-git-identity` | **Date**: 2026-05-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/020-local-git-identity/spec.md`

## Summary

Change GitLocal identity persistence so repository-local Git configuration is the source of truth for author name, author email, and SSH key path. The implementation should keep the existing shared Node.js service and React UI flow, use Git's local configuration behavior for reads/writes, remove `.env` identity persistence and `.gitignore` protection from the identity workflow, and preserve SSH private key discovery/validation without exposing key contents.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+; React 18 TypeScript UI
**Primary Dependencies**: Existing Hono server, @hono/node-server, React 18, Vite 7, @tanstack/react-query, Radix UI primitives; no new runtime dependency planned
**Storage**: Repository-local Git configuration for identity values; no application-owned `.env` identity storage
**Testing**: Vitest with @vitest/coverage-v8 for server, React Testing Library/Vitest for UI; maintain 90% per-file branch coverage
**Target Platform**: Local Node.js service serving browser mode on macOS, Windows, and Linux-capable machines; macOS native wrapper using the same local service
**Project Type**: Single npm package with Node.js backend/CLI and React SPA frontend, plus thin macOS native wrapper distribution
**Performance Goals**: Identity read completes within 250ms for normal local repositories; identity save completes within 1 second; SSH key validation completes within 500ms for normal local files
**Constraints**: Local-first only; no remote service calls; use local Git behavior for repository config; do not expose SSH private key contents; preserve unrelated Git config values; use repository-relative paths in committed docs
**Scale/Scope**: One active repository per GitLocal service session; one identity settings surface; shared behavior for browser mode and native app mode

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First Product Core**: PASS. Work stays in the existing TypeScript server/CLI and React TypeScript UI. The native macOS app remains a thin wrapper around the same service behavior.
- **Test Coverage**: PASS. Plan includes focused unit, handler, integration, and UI tests for changed files to preserve the 90% per-file threshold.
- **Local-First with Git Remote Exception**: PASS. Identity operations use local filesystem and local Git behavior only. No custom remote protocol or external service is introduced.
- **Node.js-Served React UI**: PASS. Browser and native app modes continue to use the React SPA served by the Node.js backend.
- **Clean & Useful UI**: PASS. The identity dialog is simplified by removing private settings protection copy and keeping direct repository identity controls.
- **Free & Open Source**: PASS. No proprietary services, telemetry, paid tiers, or new license concerns.
- **Repository-Relative Paths and Release Documentation**: PASS. Planning artifacts use repository-relative paths.
- **Release Branches, Pre-GA Versioning, and Contrarian QA**: PASS. This is not a release branch or release task; no version/changelog/release review is required by this plan.

## Project Structure

### Documentation (this feature)

```text
specs/020-local-git-identity/
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
│   ├── repo.ts                  # Repository identity read/write behavior through Git
│   └── identity-settings.ts     # SSH key discovery/validation; remove app-owned identity persistence
├── handlers/
│   └── repo.ts                  # Identity and SSH key handlers
├── server.ts                    # Route registration cleanup
└── types.ts                     # Shared server contracts

ui/src/
├── App.tsx                      # Identity dialog state and save flow
├── components/
│   └── AppDialogs.tsx           # Identity dialog UI; remove private settings protection warning
├── services/
│   └── api.ts                   # Client identity/SSH calls
└── types/
    └── index.ts                 # Shared UI contracts

tests/
├── integration/
│   └── server.test.ts           # End-to-end server identity behavior
└── unit/
    ├── git/
    │   └── repo.test.ts         # Git config read/write, clearing, SSH command parsing
    └── handlers/
        └── repo.test.ts         # API contract behavior

ui/src/
├── App.test.tsx
├── App.logic.test.tsx
├── App.branch-coverage.test.tsx
└── components/
    └── AppDialogs.test.tsx
```

**Structure Decision**: Extend the existing repository boundaries rather than adding a new service layer. Keep repository identity reads/writes in `src/git/repo.ts`, keep SSH private key discovery/validation in the existing identity helper module if still useful, and remove `.env` persistence/protection paths from server handlers, UI state, API clients, and tests.

## Complexity Tracking

No constitution violations require justification.

## Phase 0: Research Summary

See [research.md](research.md).

Resolved decisions:

- Use Git's local configuration behavior as the persistence mechanism for name, email, and SSH key path.
- Do not directly edit `.git/config`.
- Remove `.env` and `.gitignore` protection from the identity settings workflow.
- Preserve existing SSH private key path validation and key listing behavior.
- Route both browser mode and native app mode through the same local service endpoints.

## Phase 1: Design Summary

See [data-model.md](data-model.md), [contracts/git-identity-api.md](contracts/git-identity-api.md), and [quickstart.md](quickstart.md).

Post-design constitution check: PASS. The design remains local-first, TypeScript-first, dependency-light, testable under the repository's coverage requirements, and shared between the browser and native app distributions.
