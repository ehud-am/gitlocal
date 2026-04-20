<!--
  Sync Impact Report
  ==================
  Version change: 2.1.0 → 3.0.0 (MAJOR — redefined the local-only principle to allow
  user-initiated remote git activity through the local git executable)
  Modified principles:
    - Principle III: renamed to "Local-First with Git Remote Exception" and updated to keep
      all local-only flows fully supported while allowing explicit remote git operations via git
  Added sections: none
  Removed sections: none
  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ no change needed
    - .specify/templates/spec-template.md — ✅ no change needed
    - .specify/templates/tasks-template.md — ✅ no change needed
    - .specify/templates/checklist-template.md — ✅ no change needed
    - .specify/templates/constitution-template.md — ✅ no change needed
    - README.md — ✅ no change needed
    - AGENTS.md — ✅ no change needed
    - CLAUDE.md — ✅ no change needed
  Follow-up TODOs: none
-->

# GitLocal Constitution

## Core Principles

### I. TypeScript-First

All server-side and CLI code MUST be written in TypeScript, running on Node.js 22+ (active LTS).
The single deliverable is an npm package, distributed via the npm registry and runnable via
`npx gitlocal` or `npm install -g gitlocal`. No other backend language or runtime is permitted;
Go is no longer used in this project. Third-party npm dependencies are allowed but MUST be
justified by clear need — avoid dependency bloat.

### II. Test Coverage (NON-NEGOTIABLE)

Every TypeScript source file MUST maintain a minimum of 90% test coverage.
Coverage is measured per file, not as an aggregate. A release MUST NOT ship if any file
falls below this threshold. Frontend (React) code MUST also meet 90% coverage using the
project's chosen JS testing framework. CI MUST enforce these gates automatically.

### III. Local-First with Git Remote Exception

GitLocal MUST remain fully functional for local-only use. Browsing, reading, editing,
repository inspection, setup, and other core workflows MUST continue to work when the
user stays entirely on the local machine. No telemetry, no account registration, no
license activation, and no arbitrary remote-service APIs are permitted.

The only allowed network exception is user-initiated remote Git activity performed through
the locally installed `git` executable. When a repository has or is being given a remote
Git relationship, and network connectivity is available, GitLocal MAY expose remote Git
operations such as clone, fetch, pull, push, or similar remote-sync actions, but only by
invoking local Git commands. GitLocal itself MUST NOT implement custom remote protocols or
direct non-Git network integrations on the user's behalf.

If connectivity is unavailable or a repository has no remote relationship, the product
must still preserve its full local-only usability and fail remote Git actions clearly
without compromising local workflows.

### IV. Node.js-Served React UI

The user interface MUST be built with React and MUST be served as static assets by the
Node.js backend at runtime. The Node.js HTTP server serves the React SPA over a local port.
The build pipeline compiles React assets first (via Vite), then the Node.js backend serves
them from the package directory. Node.js 22+ is required both to build and to run the
application.

### V. Clean & Useful UI

The UI MUST prioritize clarity, readability, and utility over visual flair. Design language:
minimal, content-focused, GitHub-inspired. Markdown files MUST render with full
GitHub-Flavored Markdown support (headings, code blocks, tables, task lists, links, images).
The folder tree MUST be easy to navigate. Raw file editing is supported but is not the
primary optimization target.

### VI. Free & Open Source

GitLocal is released under the MIT License. All dependencies MUST be compatible with MIT.
No proprietary components, no paid tiers, no feature gating. Contributions are welcome
under the same license.

### VII. Repository-Relative Paths

Repository documentation, specifications, templates, generated planning artifacts, and
Markdown links MUST use repository-relative paths rather than contributor-local absolute
filesystem paths. Local absolute paths such as `/Users/...` or platform-specific machine paths
MUST NOT be committed because they do not resolve on GitHub or on other contributors' machines.
Absolute paths remain acceptable only for local runtime behavior that genuinely requires them,
such as user-provided CLI arguments or operating-system file selection.

## Technology Stack

- **Backend**: TypeScript on Node.js 22+ (active LTS)
- **Frontend**: React (TypeScript), built with Vite, served as static assets by the backend
- **Build**: `npm run build` at repository root; Vite produces frontend assets; TypeScript
  compiler produces the backend; single npm package contains both
- **Distribution**: npm registry (`npm install -g gitlocal` / `npx gitlocal`)
- **Testing**: Vitest for both backend and frontend; single test run via `npm test`
- **Packaging**: npm package with a `bin` entry point; Node.js 22+ required at runtime
- **License**: MIT

## Target Audience & UX Philosophy

GitLocal is built for **non-developers** who collaborate on code repositories using AI tools
like Claude Code but do not need or want a full IDE. The primary use cases are:

- Browsing a local Git repository's file tree
- Reading rendered Markdown documentation
- Viewing source files with syntax highlighting
- Reviewing Git history, branches, and diffs
- Light raw-file editing when needed

The UX MUST assume users are comfortable with a browser but not necessarily with terminal
commands or IDE workflows. Every interaction should feel as natural as browsing a repo
on GitHub.

## Governance

This constitution is the highest-authority document for the GitLocal project. All
implementation decisions, code reviews, and release gates MUST comply with these principles.

- **Amendments**: Any change to this constitution MUST be documented with a version bump,
  rationale, and updated date. Principle removals or redefinitions require a MAJOR version
  bump. New principles or material expansions require MINOR. Clarifications and typo fixes
  require PATCH.
- **Compliance**: Every pull request MUST pass CI checks that enforce test coverage
  thresholds and build integrity. Reviewers MUST verify alignment with constitution
  principles.
- **Documentation paths**: Reviews for specs, plans, task lists, README updates, and other
  committed documentation MUST reject newly introduced absolute contributor-local paths.
- **Runtime guidance**: See `AGENTS.md` and `CLAUDE.md` for development-time conventions and
  workflow details that supplement but do not override this constitution.

**Version**: 3.0.0 | **Ratified**: 2026-03-28 | **Last Amended**: 2026-04-19
