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
