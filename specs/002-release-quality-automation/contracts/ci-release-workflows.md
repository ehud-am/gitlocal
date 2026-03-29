# CI and Release Workflow Contract: Release Quality and Automation

## Pull Request Verification Contract

- Every pull request creation, update, and reopening event must trigger the repository verification workflow.
- The workflow must run the project's required verification suite for pull requests, using the shared `npm run verify` entrypoint.
- The result must be visible on the pull request.
- Repository branch protection must require the `CI / verify` status check on the default branch so failed runs block merges.
- Failed required verification must leave the pull request blocked from acceptance.
- Successful required verification must satisfy the automated gate for maintainers.

## Release Publication Contract

- Creating a repository release must trigger the publication workflow.
- Publication must only proceed when release preconditions are satisfied, including a successful `npm run verify` run in the workflow job.
- Prereleases must not publish to npm.
- Publication failures must be visible and actionable.
- Successful release runs must publish the intended package version to the project's registry.

## Security and Safety Expectations

- Pull-request workflows must not expose publication credentials unnecessarily.
- Release publication must rely on repository-managed credentials and fail safely if they are missing or invalid.
- Publication must not succeed silently when versioning or release metadata is invalid.
