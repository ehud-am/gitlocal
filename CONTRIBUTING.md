# Contributing to GitLocal

Thanks for considering a contribution. GitLocal is a local-first repository browser for people who want a GitHub-like reading and light-editing experience without a full IDE.

## Ways to Take Part

GitLocal is built in the open, and you don't need to write code to help shape it. Pick whichever level fits you:

1. **Use it and tell us what's confusing.** Share how you use GitLocal with your AI coding tools in [Show and tell](https://github.com/ehud-am/gitlocal/discussions/categories/show-and-tell), or ask a question in [Q&A](https://github.com/ehud-am/gitlocal/discussions/categories/q-a).
2. **Share an idea.** Post in [Ideas](https://github.com/ehud-am/gitlocal/discussions/categories/ideas), or add your voice to someone else's. Describe the job you're trying to get done, not just the feature. Ideas that take shape become issues.
3. **Report a bug.** [Open an issue](https://github.com/ehud-am/gitlocal/issues/new/choose) with a screenshot and what you expected. Plain language is fine.
4. **Build it.** Pick up an issue labeled [`help wanted`](https://github.com/ehud-am/gitlocal/labels/help%20wanted) or [`good first issue`](https://github.com/ehud-am/gitlocal/labels/good%20first%20issue), or comment on an idea to say you'd like to try it. Using Claude, Codex, or another AI coding tool to write the change is fine, as long as you've read the diff and the checks below pass.

Participating happens on GitHub and needs a free GitHub account. GitLocal itself still needs no account and sends no telemetry.

Where things go: **Discussions** for ideas, questions, and open-ended conversation; **Issues** for specific bugs and well-scoped improvements. If you're unsure, start in Discussions and we'll move it if needed. Report security problems privately as described in [SECURITY.md](SECURITY.md).

The sections below are for changing code. If you're at levels 1 to 3, you can stop here.

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

Still working out what you want? Post it in [Ideas](https://github.com/ehud-am/gitlocal/discussions/categories/ideas) first; the [improvement form](https://github.com/ehud-am/gitlocal/issues/new/choose) is for well-scoped requests.
