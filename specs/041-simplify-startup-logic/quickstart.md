# Quickstart: Validating Simplified Startup Resolution

This guide exercises the acceptance scenarios from `spec.md` against a locally built GitLocal, to
confirm the simplified resolution behaves correctly end-to-end. Run after implementation, before
marking the feature complete.

## Prerequisites

```bash
npm ci
npm --prefix ui ci
npm run build
```

Use an isolated preference file so this doesn't touch your real `~/.gitlocal` state:

```bash
export GITLOCAL_STARTUP_PREFERENCE_PATH=/tmp/gitlocal-quickstart/startup-folder.json
mkdir -p /tmp/gitlocal-quickstart/repo-a/.git   # placeholder; use `git init` for a real repo below
mkdir -p /tmp/gitlocal-quickstart/plain-folder
mkdir -p /tmp/gitlocal-quickstart/repo-a/sub/deep
rm -rf /tmp/gitlocal-quickstart/repo-a/.git && (cd /tmp/gitlocal-quickstart/repo-a && git init -q)
echo "# Test" > /tmp/gitlocal-quickstart/repo-a/README.md
echo "# Deep" > /tmp/gitlocal-quickstart/repo-a/sub/deep/notes.md
echo "# Independent" > /tmp/gitlocal-quickstart/plain-folder/notes.md
```

## US1 — Startup always reaches a working screen

1. **Explicit valid folder**:
   ```bash
   node dist/cli.js /tmp/gitlocal-quickstart/repo-a --no-open
   ```
   Expect: log line `Serving: /tmp/gitlocal-quickstart/repo-a`; `GET /api/info` returns
   `pickerMode: false`, `isGitRepo: true`, `path` = that repo.

2. **No argument, healthy remembered folder** (run right after step 1 so it was remembered):
   ```bash
   node dist/cli.js --no-open
   ```
   Expect: log line `Serving current repository:` or equivalent showing
   `/tmp/gitlocal-quickstart/repo-a` reopened; `GET /api/startup-folder` → `source: "last-used"`.

3. **No argument, remembered folder deleted**:
   ```bash
   rm -rf /tmp/gitlocal-quickstart/repo-a
   node dist/cli.js --no-open
   ```
   Expect: process starts without error; `GET /api/startup-folder` → `source: "os-default"`,
   non-empty `fallbackReason` explaining the remembered folder is gone; `GET /api/info` →
   `pickerMode: false` (the OS-default location — the home directory — is itself a perfectly
   usable, readable folder, so it opens directly as a normal folder view rather than forcing
   the picker; `isGitRepo: false` since it's not a repository).

4. **Explicit path that does not exist**:
   ```bash
   node dist/cli.js /tmp/gitlocal-quickstart/does-not-exist --no-open
   ```
   Expect: process starts without error (does not crash/hang); `GET /api/startup-folder` →
   `source: "os-default"`, `fallbackReason` mentions the requested path could not be opened.

5. **Confirm single fallback location across failure types**: compare the resolved `path` from
   steps 3 and 4 — they MUST be identical (both land on the same `os-default` location), per
   FR-007.

## US2 — Repo vs. independent-folder classification for direct file opens

6. **File inside a repo, opened directly**:
   ```bash
   (cd /tmp/gitlocal-quickstart && git init -q repo-a 2>/dev/null; true)
   node dist/cli.js /tmp/gitlocal-quickstart/repo-a/sub/deep/notes.md --no-open
   ```
   Expect: `GET /api/startup-open-target` → `rootPath` = the repo root (`.../repo-a`),
   `selectedPath` = `sub/deep/notes.md`, `gitState` indicates inside-repository. In the browser,
   the left tree is rooted at the repo and shows branch/sync context.

7. **File in an independent folder, opened directly**:
   ```bash
   node dist/cli.js /tmp/gitlocal-quickstart/plain-folder/notes.md --no-open
   ```
   Expect: `rootPath` = `/tmp/gitlocal-quickstart/plain-folder`, `selectedPath` = `notes.md`,
   no `repositoryRootPath` in the response. In the browser, the left tree is rooted at
   `plain-folder` and no git-only actions are shown.

## US3 — "Last viewed" only ever stores a top-level location

8. **Browse deep inside a repo, then relaunch bare**:
   - Start `node dist/cli.js /tmp/gitlocal-quickstart/repo-a --no-open`, open the app, navigate to
     `sub/deep/notes.md` via the UI (or `POST /api/repo/open` with that file's path).
   - Inspect the preference file:
     ```bash
     cat "$GITLOCAL_STARTUP_PREFERENCE_PATH"
     ```
     Expect: `path` is the repo root (`.../repo-a`) — never `.../sub/deep/notes.md` or
     `.../sub/deep`.
   - Stop the server, run `node dist/cli.js --no-open` again.
   - Expect: `GET /api/info` → repo root reopened, `pathType` starts at `none` (no file
     preselected) — confirm in the browser that no file is open on load.

9. **Attempt to violate the guarantee directly (defense-in-depth check)**: with the app not
   running, exercise the writer function's guard via a unit test rather than the (removed) HTTP
   endpoint — see `tests/unit/services/startup-preferences.test.ts` for the automated version of
   this check. There is no manual HTTP step here since `PUT /api/startup-folder` no longer exists
   (confirm with `curl -X PUT http://127.0.0.1:<port>/api/startup-folder` → 404).

## Cleanup

```bash
rm -rf /tmp/gitlocal-quickstart
unset GITLOCAL_STARTUP_PREFERENCE_PATH
```

## Automated equivalent

All of the above are also captured as Vitest cases in:
- `tests/unit/services/startup-preferences.test.ts` (US1, US3)
- `tests/unit/handlers/repo.test.ts` (US2, US3, removed-endpoint 404)
- `tests/integration/server.test.ts` (end-to-end `createApp` scenarios for all three stories)

Run `npm test` for the full, non-interactive equivalent of this quickstart.
