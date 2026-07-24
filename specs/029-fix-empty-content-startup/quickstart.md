# Quickstart: Validating the Empty-Content-on-Startup Fix

This guide exercises each user story from [spec.md](spec.md) end-to-end against a local build, using environment-variable overrides that already exist in the codebase (`GITLOCAL_STARTUP_PREFERENCE_PATH`) so scenarios can be reproduced without touching a real `~/Documents` or `~/.gitlocal`.

**These scenarios must be checked in an actual browser, not just via `curl`/API-level checks.** During implementation, checking the API responses alone (via `curl`) showed the fix "working" while the real browser UI still displayed the old bug — the root cause (research.md item #4a: React Query's retry logic pausing indefinitely on perceived offline/unfocused state) only manifests at the browser query-client layer, invisible to a plain HTTP check. Confirm the server response *and* what actually renders on screen.

## Prerequisites

```bash
npm install
npm run build
```

All scenarios below assume the server is started via `node dist/cli.js <args>` (or `npm run <dev-equivalent>` if one exists) from a scratch working directory, with `GITLOCAL_STARTUP_PREFERENCE_PATH` pointed at a temp file so runs don't interfere with a real machine's preferences:

```bash
export GITLOCAL_STARTUP_PREFERENCE_PATH=/tmp/gitlocal-quickstart/startup-folder.json
mkdir -p /tmp/gitlocal-quickstart
```

## Scenario 1 (User Story 1, P1) — Unreadable default startup folder

1. Create a folder and strip read permission on it: `mkdir -p /tmp/gitlocal-quickstart/no-access && chmod 000 /tmp/gitlocal-quickstart/no-access`.
2. Launch GitLocal pointed explicitly at that folder: `node dist/cli.js /tmp/gitlocal-quickstart/no-access`.
3. Open the served URL in a browser.
4. **Expected (post-fix)**: a clear message explaining the folder could not be read, with an option to choose a different folder — not a blank content pane.
5. Restore permissions afterward: `chmod 755 /tmp/gitlocal-quickstart/no-access`.

## Scenario 2 (User Story 1, P1) — Genuinely empty folder is visually distinct from a failure

1. `mkdir -p /tmp/gitlocal-quickstart/truly-empty`
2. `node dist/cli.js /tmp/gitlocal-quickstart/truly-empty`
3. **Expected**: the existing "this folder is ready for a first file" landing state — confirm it still renders, and confirm it looks different from Scenario 1's failure message (regression guard per contract Guarantee 4).

## Scenario 3 (User Story 2, P2) — Remembered folder disappears between sessions

1. `mkdir -p /tmp/gitlocal-quickstart/will-vanish && echo hello > /tmp/gitlocal-quickstart/will-vanish/file.txt`
2. Launch and open that folder once so it's remembered: `node dist/cli.js /tmp/gitlocal-quickstart/will-vanish`, confirm it loads, stop the server.
3. `rm -rf /tmp/gitlocal-quickstart/will-vanish`
4. Relaunch with no explicit path so GitLocal falls back to the remembered folder: `node dist/cli.js`.
5. **Expected**: a message identifying that the remembered folder is no longer available, with a path to choose a new folder — not a blank pane, not a silent switch to an unrelated folder.

## Scenario 4 (User Story 3, P3) — Invalid explicit path argument

1. `node dist/cli.js /tmp/gitlocal-quickstart/does-not-exist`
2. **Expected**: the picker view opens showing a message stating the given path could not be found (contract Guarantee 3) — not a silent folder listing of an unrelated directory (e.g., the shell's cwd) with no explanation.

## Scenario 5 (User Story 4, P4) — Browser auto-open fails

1. Launch in an environment where the `open` package cannot find a browser (e.g., temporarily unset `BROWSER` and any GUI session, or run in a minimal container).
2. **Expected**: terminal output prominently instructs the user to open the printed local address manually, in addition to the existing "gitlocal listening on ..." line.

## Cross-cutting check — sidebar/content-pane consistency (FR-003)

1. Open any folder, then simulate a tree-fetch failure for a specific subfolder (e.g., temporarily revoke read permission on a subfolder after initial load, then navigate into it).
2. **Expected**: both the folder navigation panel and the main content area show a failure state — never one showing "empty" while the other shows "failed" for the same location.

## Automated coverage

Run the full suite and confirm coverage gates still pass per constitution Principle II (≥90% branch coverage per touched file):

```bash
npm test
```

Specifically confirm new/updated test cases exist for:
- `src/server.ts` — the new `onError` handler, for at least one thrown-exception case
- `src/git/repo.ts` — `listWorkingTreeDirectoryEntries` and `canonicalizeExistingPath` failure branches
- `src/services/startup-preferences.ts` — `isReadableDirectory` rejecting an existing-but-unlistable directory
- `src/cli.ts` — invalid explicit path no longer misclassified as a file-launch attempt; manual browser-open fallback message
- `ui/src/App.tsx` — `['info']` query `isError` branch
- `ui/src/components/ContentPanel/ContentPanel.tsx` — `isDirectoryError` handled in the root/default and folder views
- `ui/src/components/Picker/PickerPage.tsx` — rendering the `startup-open-target` failure message
