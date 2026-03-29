# Data Model: Release Quality and Automation

## Overview

This feature adds no persistent end-user database. Its model is a combination of UI interaction state, workflow run state, and release readiness state.

## Entities

### Folder Selection Session

- **Purpose**: Represents the repository-selection experience shown when GitLocal starts without an initial repository path.
- **Fields**:
  - `entryReason`: Why the selector is shown, including the absence of a launch path.
  - `visibleLocation`: The current folder or logical browsing context shown to the user.
  - `selection`: The currently highlighted candidate repository path.
  - `validationState`: Whether the current selection is valid, invalid, loading, or blocked.
  - `errorMessage`: User-facing explanation when selection fails.
- **Validation rules**:
  - The entry reason must explain that no repository location was provided at launch.
  - A selection cannot be opened successfully unless it resolves to a valid git repository.
  - The interaction must remain understandable across supported desktop platforms.
- **State transitions**:
  - `uninitialized -> browsing`: Picker screen loads.
  - `browsing -> validating`: User attempts to open a selection.
  - `validating -> opened`: Valid repository chosen.
  - `validating -> error`: Invalid or inaccessible selection.

### Pull Request Verification Run

- **Purpose**: Represents a single automated verification cycle associated with a pull request event.
- **Fields**:
  - `triggerEvent`: Pull request creation, synchronization, or reopening event.
  - `checksExecuted`: Verification steps run for that pull request.
  - `status`: Pending, passed, failed, or cancelled.
  - `blockingState`: Whether the pull request can be accepted.
  - `reportedOutcome`: The visible result shown to reviewers and contributors.
- **Validation rules**:
  - Every pull request event in scope must create a verification run.
  - A failed required run must map to a blocking state.
  - A passed run must be visible as a non-blocking result.
- **State transitions**:
  - `queued -> running -> passed`
  - `queued -> running -> failed`
  - `queued/running -> cancelled`

### Build Health Outcome

- **Purpose**: Represents the release-readiness state of the build and dependency health checks.
- **Fields**:
  - `buildStatus`: Whether the standard build completed successfully.
  - `warningStatus`: Whether targeted warnings remain present.
  - `deprecationStatus`: Whether targeted deprecated dependency warnings remain present.
  - `securityStatus`: Whether targeted dependency issues remain above the allowed threshold.
  - `releaseReady`: Whether the build health is acceptable for release progression.
- **Validation rules**:
  - `releaseReady` can be true only when build, warning, deprecation, and security conditions all meet the release standard for this feature.
  - Targeted warning categories must be explicitly tracked rather than assumed resolved.
- **State transitions**:
  - `unknown -> evaluating`
  - `evaluating -> ready`
  - `evaluating -> blocked`

### Release Publication Run

- **Purpose**: Represents an automated publication attempt triggered by repository release creation.
- **Fields**:
  - `releaseIdentifier`: The release that triggered publication.
  - `preconditions`: Required release checks, credentials, and package readiness inputs.
  - `status`: Pending, running, published, or failed.
  - `publishedVersion`: Package version published when successful.
  - `failureReason`: User-visible publication failure summary when unsuccessful.
- **Validation rules**:
  - Publication can begin only from a valid release trigger.
  - Publication cannot complete successfully without required credentials and release readiness.
  - A duplicate or invalid publish attempt must fail safely.
- **State transitions**:
  - `queued -> running -> published`
  - `queued -> running -> failed`

## Relationships Summary

- One Folder Selection Session is created when the product launches without a repository path.
- One pull request may produce many Pull Request Verification Runs over time.
- One Build Health Outcome summarizes the current release readiness for a given build/review cycle.
- One repository release can trigger one Release Publication Run per release event.
- A successful Build Health Outcome is a precondition for an unblocked Release Publication Run.
