# Research: Current Product Baseline

## Decision 1: Preserve the existing local-first runtime model

- **Decision**: Keep the current runtime shape as a CLI that starts a local HTTP server and serves a browser UI for repository browsing.
- **Rationale**: This matches the implemented product, aligns with the constitution's Fully Local and Node.js-Served React UI principles, and supports the target audience's preference for a browser-based reading experience over an IDE.
- **Alternatives considered**:
  - Reframe the product as a purely terminal application. Rejected because it would not match the current experience or the target audience.
  - Reframe the product as a hosted service. Rejected because it would violate the constitution's local-only requirements.

## Decision 2: Treat repository state as derived, not persisted

- **Decision**: Model repository information, tree contents, file views, branches, and commits as request-time derived data rather than persistent application records.
- **Rationale**: The current code reads from git and the filesystem on demand, uses only in-process session state for the selected repository path, and does not maintain a database or background synchronization layer.
- **Alternatives considered**:
  - Add a local cache or embedded database to persist repository snapshots. Rejected because it is not part of the current product baseline and would add operational complexity.
  - Treat the UI as stateless with no in-memory session. Rejected because the current product keeps the selected repository context in process while the server is running.

## Decision 3: Document the public interfaces as CLI, local HTTP API, and UI navigation contracts

- **Decision**: Produce explicit contracts for the command-line entry point, the local `/api/*` endpoints, and key UI navigation flows.
- **Rationale**: These are the real user-facing and integration-facing boundaries in the current product. Capturing them makes future planning and regression testing more precise.
- **Alternatives considered**:
  - Skip contracts entirely. Rejected because this project exposes stable, testable interfaces that matter to users and future contributors.
  - Document only the HTTP API. Rejected because the CLI entry point and browser navigation patterns are also part of the user-visible contract.

## Decision 4: Use the existing quality gates as planning constraints

- **Decision**: Carry forward Node.js 22+, fully local execution, read-only repository access, and at-least-90%-branch-coverage-per-file as non-negotiable implementation constraints.
- **Rationale**: These constraints come directly from the constitution, the active technology guidance, and the current test/build scripts.
- **Alternatives considered**:
  - Leave performance and quality requirements open-ended. Rejected because the project already has explicit coverage and runtime expectations.
  - Expand the baseline to include editing or remote features. Rejected because those are outside the documented current behavior.
