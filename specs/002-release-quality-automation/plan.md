# Implementation Plan: Release Quality and Automation

**Branch**: `002-release-quality-automation` | **Date**: 2026-03-28 | **Spec**: [specs/002-release-quality-automation/spec.md](specs/002-release-quality-automation/spec.md)
**Input**: Feature specification from `specs/002-release-quality-automation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Improve the release-readiness experience of GitLocal across four slices: redesign the no-path repository selector, add required pull-request automation, eliminate current build and dependency health warnings, and publish the npm package automatically from repository releases. The implementation will extend the existing local React UI, formalize new GitHub workflow automation, tighten build/dependency hygiene, preserve picker navigation context across startup and in-app transitions, and enforce automated accessibility assertions in the shared verification path without changing the product's fully local runtime model.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ for server, CLI, and React UI; YAML-based GitHub workflow configuration  
**Primary Dependencies**: Hono, @hono/node-server, React 18, Vite 5, @tanstack/react-query, react-markdown, remark-gfm, rehype-highlight, highlight.js, Vitest, esbuild, npm registry publishing tooling, GitHub Actions runners  
**Storage**: No application database; local filesystem and git repository data at runtime, repository-hosted workflow definitions and secrets for automation, npm registry package metadata for publication  
**Testing**: Vitest for backend and frontend, jest-axe accessibility assertions in UI tests, npm build verification, dependency health checks, GitHub Actions workflow runs for pull requests and releases  
**Target Platform**: Local desktop browsers on macOS, Windows, and Linux for the picker experience; GitHub-hosted automation for pull requests and releases  
**Project Type**: Local-first CLI application with a Node.js-served React web app plus repository automation workflows  
**Performance Goals**: Folder selection should feel immediate for normal local directory navigation, picker transitions between repository view and parent-folder browsing should not require process restarts, pull-request checks should start promptly after PR updates, and release builds should complete without targeted warning noise  
**Constraints**: Fully local product runtime, read-only repository browsing behavior preserved, cross-platform picker usability, maintain at least 90% branch coverage per file, keep npm publishing secure and automated, remove targeted build and dependency warnings without regressing functionality, preserve the user's launch or parent-folder context when entering picker mode, and ensure automated accessibility checks participate in the same verification gate as tests and builds  
**Scale/Scope**: Single repository-selection session at a time in the UI, one required PR verification pipeline for every PR, one release publication flow per created release, focused remediation of the known current build/dependency health issues, and one mutable picker launch context shared by startup and in-app parent-folder navigation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **TypeScript-First**: Pass. The UI and CLI changes stay within the existing TypeScript/Node.js stack, and the automation work supplements the npm-distributed product rather than replacing it.
- **Test Coverage**: Pass. The plan assumes workflow enforcement of the existing test suite and preserves the ≥90% per-file branch coverage expectation for all product code changes.
- **Fully Local**: Pass. The product runtime remains local-only; GitHub Actions and npm publication affect repository delivery workflow, not the user's in-app runtime behavior.
- **Node.js-Served React UI**: Pass. The folder selector improvements remain within the current React UI served by the Node.js backend.
- **Clean & Useful UI**: Pass. The redesign specifically improves clarity, guidance, and usability of the no-path experience while preserving the established GitLocal look and feel.
- **Free & Open Source**: Pass. The plan assumes continued MIT-compatible dependencies and public-package publishing without proprietary feature gating.

**Post-Design Check**: Pass. The research, contracts, and data model keep the runtime local-first, maintain test enforcement, and add delivery automation without violating the constitution.

## Project Structure

### Documentation (this feature)

```text
specs/002-release-quality-automation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ci-release-workflows.md
│   ├── picker-ui.md
│   └── release-health.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── cli.ts
├── server.ts
├── handlers/
│   └── pick.ts
└── types.ts

tests/
├── integration/
│   └── server.test.ts
└── unit/
    └── handlers/

ui/
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── services/
│   │   └── api.ts
│   └── components/
│       └── Picker/
│           ├── PickerPage.tsx
│           └── PickerPage.test.tsx

.github/
└── workflows/
    ├── ci.yml
    └── publish.yml

package.json
package-lock.json
ui/package.json
ui/package-lock.json
```

**Structure Decision**: Keep the existing single-repository TypeScript/React application structure and add two new workflow files under `.github/workflows/` for CI and release publication. UI redesign work stays localized to the picker components, app shell, shared styling, and test setup, while runtime state for repository view versus picker view is coordinated in the Node.js server so startup paths and parent-folder navigation share one source of truth. Accessibility enforcement is implemented inside the existing UI component test suite so CI can reuse the shared `npm run verify` entrypoint.

## Complexity Tracking

No constitutional violations or exceptional complexity allowances are required for this feature.
