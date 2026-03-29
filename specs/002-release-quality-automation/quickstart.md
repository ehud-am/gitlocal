# Quickstart: Release Quality and Automation

## Purpose

Use this guide to validate the four release goals covered by this feature: improved picker UX, pull-request quality gates, clean builds, and automated package publication.

## Prerequisites

- Node.js 22+
- git 2.22+
- Repository access with permissions to view Actions and create releases
- Package publication credentials configured in the repository secret store

## 1. Validate the Folder Selector Experience

1. Start GitLocal without a repository path:

```sh
node --experimental-strip-types src/cli.ts
```

2. Confirm the opening screen explains why a repository must be chosen.
3. Confirm the page visually matches the main GitLocal viewer rather than the old plain form.
4. Browse folders using the new finder-style selector.
5. Choose a valid repository and verify GitLocal opens it successfully.
6. Attempt to choose an invalid or inaccessible location and verify the error state is clear.

## 2. Validate Pull Request Quality Gates

1. Open or update a pull request against the repository.
2. Confirm the pull-request workflow starts automatically.
3. Verify the workflow runs `npm run verify`, which covers tests, builds, and both root and UI dependency audits.
4. In GitHub repository settings, confirm branch protection for `main` requires the `CI / verify` status check before merge.
5. Confirm that a failing run leaves the pull request in a blocked state.
6. Confirm that a passing run satisfies the required review gate.

## 3. Validate Build and Dependency Health

1. Install dependencies:

```sh
npm ci
npm --prefix ui ci
```

2. Run the standard verification flow:

```sh
npm run verify
```

3. Confirm the build output does not include the targeted chunk-size warning.
4. Confirm the verification flow does not surface the previously targeted deprecated or moderate-severity dependency issues above the release threshold.

## 4. Validate Automated Release Publishing

1. Create a repository release using the normal maintainer workflow.
2. Confirm the release publication workflow starts automatically for full releases.
3. Create or inspect a prerelease and confirm the publish job is skipped for prerelease events.
4. Verify that publication runs the same `npm run verify` prerequisite gate before `npm publish`.
5. Confirm successful releases publish the package version automatically with the repository's `NPM_TOKEN` secret.
6. Confirm failing publication attempts report a clear failure reason without silently succeeding.

## Expected Outcome

GitLocal should present a polished cross-platform repository selector when launched without a path, enforce required pull-request verification, complete release builds without the targeted warning noise, and publish new package versions automatically from repository releases.
