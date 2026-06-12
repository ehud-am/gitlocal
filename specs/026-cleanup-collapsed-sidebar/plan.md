# Implementation Plan: Clean Up Collapsed Sidebar

**Branch**: `026-cleanup-collapsed-sidebar` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/026-cleanup-collapsed-sidebar/spec.md`

## Summary

Restore the collapsed left side panel to a single intentional reopen control. The main repository viewer currently renders several compact shortcut buttons in the collapsed rail, causing clipped one-letter controls that look broken. The implementation will remove those collapsed-only shortcuts, keep the existing expand/collapse state behavior, preserve access to search and other functions through the expanded panel or main page, and update automated usability/a11y checks to prevent regression.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+; React 18 TypeScript UI  
**Primary Dependencies**: Existing React 18, Vite 7, @tanstack/react-query, Vitest, React Testing Library, jest-axe setup already present  
**Storage**: No new storage; existing viewer URL/local state continues to preserve sidebar collapsed preference  
**Testing**: Vitest, React Testing Library, existing UI accessibility assertions  
**Target Platform**: Local browser UI served by GitLocal plus the shared macOS wrapper that hosts the same UI  
**Project Type**: Local-first repository viewer with React frontend and Node.js-served static app  
**Performance Goals**: Collapsing or expanding the left side panel remains immediate for normal repository views; no additional data loading is introduced by the collapsed rail itself  
**Constraints**: No new runtime dependencies; no backend/API changes; no removal of search or repository browsing capability; preserve keyboard and assistive-technology operability  
**Scale/Scope**: One UI behavior cleanup affecting collapsed left side panel presentation in the main repository viewer, with parity checked against the existing picker collapsed rail pattern

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript-First Product Core**: Pass. Work stays in the existing TypeScript/React UI and does not alter backend runtime choices.
- **II. Test Coverage**: Pass. Plan includes targeted UI tests and accessibility checks so the 90% per-file coverage gate remains protected.
- **III. Local-First with Git Remote Exception**: Pass. No network, account, telemetry, or remote Git behavior changes.
- **IV. Node.js-Served React UI**: Pass. The existing served React UI remains the only product surface touched.
- **V. Clean & Useful UI**: Pass. Feature directly improves clarity by removing misleading one-letter collapsed controls.
- **VI. Free & Open Source**: Pass. No proprietary components or new dependencies.
- **VII. Repository-Relative Paths and Release Documentation**: Pass. Planning artifacts use repository-relative paths.
- **VIII. Release Branches, Pre-GA Versioning, and Contrarian QA**: Pass. No release is being cut in this planning phase; implementation must still pass normal verification before release.

## Project Structure

### Documentation (this feature)

```text
specs/026-cleanup-collapsed-sidebar/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── collapsed-sidebar-ui.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
ui/src/
├── App.tsx                              # Main repository viewer collapsed rail behavior
├── App.test.tsx                         # Viewer interaction/usability regression coverage
├── App.logic.test.tsx                   # Viewer state initialization/toggle coverage
├── components/Picker/PickerPage.tsx     # Existing one-button collapsed rail reference behavior
├── components/Picker/PickerPage.test.tsx
└── styles/globals.css                   # Sidebar rail responsive styling
```

**Structure Decision**: Use the existing React UI files and tests. No new source modules are required unless implementation reveals repeated rail markup that should be locally simplified without broad refactoring.

## Complexity Tracking

No constitution violations or complexity exceptions.

## Phase 0: Research

Research completed in [research.md](./research.md). Key decision: use the existing picker collapsed rail as the target interaction pattern for the main viewer, with one accessible expand control and no collapsed shortcut buttons.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md): State and UI behavior model for the collapsed sidebar.
- [contracts/collapsed-sidebar-ui.md](./contracts/collapsed-sidebar-ui.md): User-facing UI contract and test expectations.
- [quickstart.md](./quickstart.md): Verification workflow for implementation.

## Post-Design Constitution Check

- **TypeScript/UI scope** remains unchanged and dependency-free.
- **Coverage and QA** are addressed by targeted UI tests for exactly one collapsed rail control, no shortcut buttons, expand behavior, keyboard accessibility, and visual stability.
- **Local-first behavior** is unaffected because this is presentation-only.
- **Repository-relative documentation** is maintained across all generated artifacts.

Result: Pass.
