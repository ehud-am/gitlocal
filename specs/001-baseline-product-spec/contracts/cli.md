# CLI Contract: Current Product Baseline

## Command

`gitlocal [repository-path]`

## Behavior

- When `repository-path` is provided:
  - The command validates runtime prerequisites.
  - The command starts a local HTTP server on an available port.
  - The command prints the listening URL.
  - The command attempts to open the default browser to that URL.
  - The command loads the provided repository path as the initial repository session.
- When `repository-path` is omitted:
  - The command starts the same local HTTP server and browser flow.
  - The product enters picker mode until the user submits a repository path from the browser UI.
- On unsupported Node.js versions:
  - The command exits with a non-zero status after printing a clear upgrade message.
- On process termination:
  - `Ctrl+C` or termination signals stop the local server cleanly.

## Inputs

- `repository-path`: Optional local filesystem path intended to point at a git repository.

## Outputs

- Standard output:
  - Local listening URL
  - Whether a repository was provided or picker mode is active
- Browser side effect:
  - Attempts to open the system browser to the local UI

## Non-Goals

- The CLI does not expose repository mutation commands.
- The CLI does not authenticate users or contact remote services.
