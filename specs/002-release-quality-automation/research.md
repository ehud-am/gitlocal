# Research: Release Quality and Automation

## Decision 1: Deliver the picker upgrade inside the existing web UI

- **Decision**: Improve the no-path repository selector as a richer in-app browser experience instead of switching to native operating-system dialogs.
- **Rationale**: This preserves the cross-platform browser-based workflow, matches the current product architecture, and supports consistent UX across macOS, Windows, and Linux without relying on platform-specific dialogs.
- **Alternatives considered**:
  - Native folder picker dialogs. Rejected because they add platform-specific complexity and do not align with the current browser-first interaction model.
  - Keep the current plain text path entry. Rejected because it does not satisfy the usability goals of this release.

## Decision 2: Introduce dedicated pull-request and release workflows

- **Decision**: Model pull-request verification and release publishing as separate GitHub Actions workflows with distinct triggers and responsibilities.
- **Rationale**: Pull-request verification and release publication have different entry conditions, permissions, and failure modes. Separating them improves clarity and reduces the risk of accidental publish behavior during normal review activity.
- **Alternatives considered**:
  - A single all-purpose workflow. Rejected because it would blur review and release responsibilities and make permission handling harder to reason about.
  - Manual release publishing with only PR automation. Rejected because the feature explicitly requires automated publication from release creation.

## Decision 3: Treat build-health remediation as a release gate, not cosmetic cleanup

- **Decision**: Plan targeted remediation for bundle-size warnings, deprecated dependency warnings, and currently known moderate dependency issues as release-blocking work.
- **Rationale**: The feature specification and project constitution both frame build integrity and release confidence as non-negotiable. Treating these issues as gates keeps the release pipeline trustworthy.
- **Alternatives considered**:
  - Document the warnings and defer cleanup. Rejected because the release scope explicitly calls for eliminating them.
  - Silence warnings without reducing the underlying causes. Rejected because it would hide risk rather than improve release quality.

## Decision 4: Keep runtime-local behavior separate from repository-hosted automation

- **Decision**: Draw a clear boundary between local product behavior and cloud-hosted repository automation in the design artifacts and contracts.
- **Rationale**: GitLocal must remain fully local at runtime. CI and publishing automation support development and release workflow, not the user-facing runtime environment.
- **Alternatives considered**:
  - Treat automation workflows as part of the product runtime. Rejected because that would blur the constitution's local-runtime requirement.
  - Exclude automation from the design artifacts. Rejected because these workflows are a first-class part of the requested release scope.

## Implementation Notes

- The picker experience now uses a server-backed directory browser with quick-access roots, home navigation, parent traversal, and repository badges so the no-path flow matches the main GitLocal shell more closely.
- Pull request verification now uses a shared `npm run verify` entrypoint so local release checks and CI checks stay aligned.
- Release-health validation now includes both the repository root and `ui/` dependency trees in the same verification path.
- Frontend bundle cleanup uses lazy loading for heavy content renderers plus a dedicated markdown chunk to stay below the prior Vite chunk-size warning threshold.
