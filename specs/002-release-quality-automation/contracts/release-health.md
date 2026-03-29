# Release Health Contract: Release Quality and Automation

## Build Cleanliness

- The standard build flow must complete without the currently targeted release-quality warnings.
- Build output must remain understandable enough for maintainers to detect new problems quickly.

## Dependency Health

- The currently targeted deprecated dependency warning must be removed from the release path.
- The currently targeted moderate dependency issues must be remediated or reduced below the release threshold defined for this feature.
- The release verification path must check both the repository root and `ui/` dependency trees.

## Release Readiness Decision

- A release is considered ready only when build success, warning cleanup, and dependency health all meet the required threshold.
- If any targeted release-health condition fails, the release path must remain blocked until it is addressed.
