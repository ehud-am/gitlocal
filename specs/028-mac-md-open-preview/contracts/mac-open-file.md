# Contract: macOS Markdown File Open

## Native App Contract

On first run, the macOS app must:

- Ask whether GitLocal should become the default Markdown reader.
- Leave the current default Markdown reader unchanged unless the user explicitly opts in.
- Record a decline so normal GitLocal use is not repeatedly blocked.
- Explain any macOS failure to complete the association after opt-in.

When an opted-in user opens a Markdown file through Finder, the macOS app must:

- Accept the OS-provided local file URL for supported Markdown files.
- Queue the open request if the local service or viewer window is not ready.
- Activate or show the GitLocal window.
- Forward the local file path to the shared GitLocal app path once the service is available.
- Avoid rendering or interpreting Markdown natively.

Observable outcomes:

- Opening `README.md` from Finder starts or activates GitLocal.
- The resulting viewer target is the requested file, not only its folder.
- Multiple open events in one running session select the most recent requested file unless the implementation explicitly handles a list.
- Declining the first-run prompt does not change the default Markdown reader.

## Local Service Contract

The local service must expose enough startup/open state for the shared UI to honor a direct file-open request.

### Existing compatible behavior

`POST /api/repo/open`

Request:

```json
{
  "path": "/absolute/path/to/project/docs/guide.md"
}
```

Successful response:

```json
{
  "ok": true,
  "error": "",
  "path": "/absolute/path/to/project/docs/guide.md",
  "rootPath": "/absolute/path/to/project",
  "selectedPath": "docs/guide.md",
  "selectedPathType": "file",
  "openMode": "file",
  "gitState": "inside-repository",
  "repositoryRootPath": "/absolute/path/to/project"
}
```

Failure response:

```json
{
  "ok": false,
  "error": "Path does not exist: /absolute/path/to/missing.md"
}
```

### Planned startup target behavior

The initial launch path must carry the same semantics as `POST /api/repo/open` when launched from a file:

- `rootPath` becomes the repository root when the file is inside a repository.
- `rootPath` becomes the file's parent folder when outside a repository.
- `selectedPath` is the path to the requested file relative to `rootPath`.
- `selectedPathType` is `file`.
- The startup target overrides saved viewer path and default README selection.
- The startup target exists only after the user opens a file through GitLocal, either after opt-in default-reader setup or another explicit macOS open-with action.

The concrete implementation may add a dedicated startup target endpoint or extend the existing info/startup response, but the UI-observable contract above must hold.

## UI Contract

On first load after a native Markdown open:

- The repository/folder label reflects the resolved folder context.
- The requested Markdown file is selected when visible in the tree.
- The content panel shows rendered Markdown for the requested file.
- Raw mode is off unless the user turns it on after the open.
- The containing folder page remains available with a tree-first, README-below layout.
- Dotfiles are shown by default in folder trees, with a checkbox to hide `.*` entries.
- A clear status or error message appears if the file cannot be read.

## Error Contract

The product must distinguish these cases in user-facing language:

- Missing file
- Unreadable file
- Unsupported item type
- Unavailable containing folder
- Startup/open request superseded by a newer request

In all error cases, GitLocal must avoid showing a stale preview as if it were the requested file.
