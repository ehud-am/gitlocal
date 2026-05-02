# Contributing to GitLocal

Thanks for considering a contribution. GitLocal is a local-first repository browser for people who want a GitHub-like reading and light-editing experience without a full IDE.

## Ground Rules

- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Follow the [GitLocal constitution](.specify/memory/constitution.md).
- Keep changes focused and easy to review.
- Preserve local-first behavior: no telemetry, accounts, paid gates, or arbitrary remote service calls.
- Use repository-relative paths in committed documentation.
- Maintain at least 90% branch coverage per source file.

## Development Setup

Requirements:

- Node.js 22+
- git 2.22+

Install dependencies:

```bash
npm ci
npm --prefix ui ci
```

Build the project:

```bash
npm run build
```

Run GitLocal from the repository root:

```bash
node dist/cli.js .
```

## Verification

Before opening a pull request, run:

```bash
npm run verify
```

This runs server tests, UI tests, builds, and dependency audits for both the root package and UI package.

Useful narrower commands:

```bash
npm test
npm run test:server
npm --prefix ui run test:ci
npm run build
```

## Pull Request Guidelines

- Explain the user-facing change and why it matters.
- Link related issues or specs when available.
- Include tests for behavior changes.
- Include documentation updates when user workflows, commands, APIs, or release behavior change.
- Keep unrelated formatting or refactors out of feature PRs.
- Do not commit generated build output unless the release/package process explicitly requires it.

## Release Expectations

Release work must follow the constitution:

- one release increment per release branch;
- package metadata updated before approval;
- changelog updated;
- README reviewed;
- full verification passing;
- contrarian QA review completed before release finalization.

Until the project declares general availability, release versions must stay in the `0.x.y` range.

## Reporting Bugs

When filing a bug, include:

- GitLocal version;
- operating system;
- Node.js version;
- how you started GitLocal;
- the repository state or scenario that reproduces the issue;
- expected behavior and actual behavior.

Avoid sharing private repository content. If a reproduction needs sample files, create a small synthetic repository instead.

## Feature Requests

Good feature requests describe:

- the workflow you are trying to complete;
- what is hard or missing today;
- what a successful outcome would look like;
- any safety or local-first concerns.

For larger features, maintainers may ask for a specification and implementation plan before code changes.
