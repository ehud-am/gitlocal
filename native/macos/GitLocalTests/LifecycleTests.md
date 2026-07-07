# Native Lifecycle Test Plan

These checks verify that the macOS wrapper behaves like a native app while still running the shared GitLocal server and React viewer.

## Launch

- Build `GitLocal.app`.
- Package the app with `dist/cli.js`, `dist/index.js`, `ui/dist`, `package.json`, and a Node runtime.
- Launch the app from Finder or `open`.
- Confirm no terminal window is required.
- Confirm the app loads a URL whose host is `localhost`, `127.0.0.1`, or `::1`.

## Failure Display

- Temporarily remove the packaged Node runtime.
- Launch the app.
- Confirm a native error explains that the runtime is missing.

## Quit Cleanup

- Launch the app.
- Record the child service process ID.
- Quit the app.
- Confirm the child service process is no longer running.

## Relaunch

- Launch and quit the app twice.
- Confirm each launch creates a fresh local service URL and the viewer loads.

## Startup Folder

- Launch `GitLocal.app` with no remembered folder preference. Confirm the app starts from the user's Documents folder when it exists, or home folder if Documents is unavailable.
- Open a different local folder successfully, then quit the app.
- Relaunch `GitLocal.app` without specifying a folder. Confirm it reopens the last used folder.
- Delete or rename the remembered folder, then relaunch. Confirm the app falls back to Documents or home without a blocking startup error.

## Markdown Default Reader Prompt

- Launch `GitLocal.app` with no saved default-reader prompt decision. Confirm the viewer asks before making GitLocal the default Markdown reader.
- Choose `Not now`, quit, and relaunch. Confirm the prompt does not reappear and `.md` ownership is unchanged.
- Clear the saved prompt decision, relaunch, choose `Set as default`, and confirm macOS accepts GitLocal as a Markdown viewer only after that action.
- After declining or after a fresh install, choose `GitLocal > Set as Default Markdown Reader` from the macOS app menu. Confirm the same explicit setup flow runs without requiring the first-run prompt.
- Force LaunchServices setup to fail, then choose `Set as default`. Confirm the viewer reports the failure and does not mark the setup as accepted.

## Markdown File Association

- Inspect `Info.plist` and confirm Markdown document types are declared with `LSHandlerRank` set to `Alternate`.
- Confirm installing or launching `GitLocal.app` does not automatically make it the default handler for `.md` or `.markdown` files.
- After opting in, double-click a `.md` file from Finder. Confirm GitLocal activates, opens the file's containing folder, and selects the Markdown file in preview.
- Double-click a second `.md` file while GitLocal is already running. Confirm the existing window activates and switches to the second file without restarting the service.
- Double-click a Markdown file in a path containing spaces. Confirm the selected preview path matches the requested file.

## Markdown Open Failure Handling

- Try to open a missing Markdown file through an explicit launch path. Confirm GitLocal shows a missing-file message and does not show stale preview content.
- Try to open a non-Markdown file through an explicit launch path. Confirm GitLocal reports an unsupported file type.
- Send multiple Markdown open events quickly. Confirm the most recent event wins and no older file remains selected as if it were the latest request.
