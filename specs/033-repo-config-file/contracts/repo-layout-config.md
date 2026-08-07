# Contract: Per-Repo/Folder Layout Configuration

## Scope

This contract defines the API and user-facing behavior for persisting and restoring a repo/folder's last-viewed branch, path, and raw/pretty view mode via `.gitlocal/.layout`. It applies to both GitLocal distributions (npm-served browser UI and macOS app), since both use the same server and UI.

## API: `GET /api/repo/layout`

Given the currently open repo/folder (`repoPath`), returns the saved layout, or defaults if none exists.

- Response `200`: `{ "layout": { "branch": string | null, "path": string | null, "pathType": "file" | "dir" | "none", "raw": boolean } }`.
- Never returns an error status for a missing or malformed `.gitlocal/.layout` file — a missing/malformed file resolves to the default object (`{ branch: null, path: null, pathType: 'none', raw: false }`), not a `4xx`/`5xx`.
- Only returns `5xx` for a genuinely unexpected failure (e.g. the repo path itself is invalid), consistent with other repo-scoped endpoints.

## API: `PUT /api/repo/layout`

Given a full `RepoLayout` object in the request body, writes it to `.gitlocal/.layout` at the currently open repo/folder's root, creating the `.gitlocal/` directory if needed.

- Request body: `{ "layout": { "branch": string | null, "path": string | null, "pathType": "file" | "dir" | "none", "raw": boolean } }`.
- Response `200`: `{ "layout": <the now-saved value> }`.
- Response `400`: invalid JSON body, or a `layout` object missing/mistyping a required field.
- On a write failure (e.g. read-only filesystem), the handler MUST NOT return `5xx` in a way that the client treats as a hard error requiring user action — the client's fire-and-forget call already ignores the outcome (see below), so the response code only needs to be honest, not necessarily successful.

## Client Behavior: Fetching On Load

On opening a repo/folder, the content panel must:

- Fetch the saved layout via `GET /api/repo/layout` once, alongside the existing startup-target and startup-folder fetches.
- Apply the saved `branch`/`path`/`pathType`/`raw` as the initial view **only if** there is no explicit startup open-target (e.g. a double-clicked file launch) for this session — the open-target always wins.
- Fall through to the existing URL-param-derived initial state when the saved layout has no `path` and no `branch` recorded (i.e. this repo/folder has never been visited before).
- Never show an error, warning, or blocked state to the user because the saved layout could not be fetched or parsed — treat it exactly like "nothing saved yet."

## Client Behavior: Saving On Navigate

Whenever the user's active branch, file path, or raw/pretty toggle changes, the client must:

- Send a fire-and-forget `PUT /api/repo/layout` reflecting the new state — the interaction that triggered the change (switching branch, opening a file, toggling raw view) must not wait on this call.
- Not surface a toast, warning, or any other UI indication if the save fails — this matches how other ergonomic state (recent items, startup folder) is already persisted silently.

## Non-Git Folder Behavior

Given a plain filesystem folder (no `.git`) is opened, the contract above applies identically — `branch` is simply always `null` for such a folder, `path`/`pathType`/`raw` behave the same as for a git repo.

## Cross-Distribution Behavior

Given a repo/folder's layout was saved while open via one GitLocal distribution (npm-served browser UI or the macOS app), opening the same repo/folder via the other distribution must restore the same saved layout — the file lives in the repo/folder itself, not in either distribution's browser storage.

## Non-Regression

- `.git/config`-based git identity settings (`user.name`, `user.email`, SSH key config, per 020-local-git-identity) are unaffected — no shared code path with this feature.
- Existing URL-param-derived viewer state (`viewerState.ts`) and its fields not covered by this feature (`sidebarCollapsed`, `generatedLocalVisibility`, `search*` fields) are unaffected and continue to work exactly as they do today.
- Existing branch-validation fallback (falling back to the repo's current default branch when a saved branch no longer exists) applies identically whether the saved branch came from `.gitlocal/.layout` or the existing URL-param path.

## Regression Samples

Implementation must include automated coverage for:

- First-ever open of a repo/folder (no `.gitlocal/.layout` yet) — falls back to existing default behavior.
- Reopening a repo/folder with a valid saved layout — branch/path/raw restored.
- A saved layout whose branch no longer exists — falls back to the repo's current default branch, without erroring.
- A saved layout whose path no longer exists on disk — falls back to a default view rather than erroring.
- A malformed `.gitlocal/.layout` file (invalid JSON) — repo/folder still opens normally at default state.
- An unwritable `.gitlocal/` location — browsing continues to work; only persistence is skipped.
- An explicit startup open-target present alongside a saved layout — the open-target wins.
- A plain non-git folder — same restore behavior as a git repo, with `branch` always `null`.
- Setting the layout via one distribution and reopening via the other — same saved layout restored.
