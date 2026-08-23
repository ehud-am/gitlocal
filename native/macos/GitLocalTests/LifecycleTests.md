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

## Startup Race Under Slow or Failing Service Launch

- Temporarily rename or corrupt the packaged CLI script so the bundled service process starts but exits immediately (e.g. a Node syntax error), then launch the app repeatedly (10+ times in a row). Confirm each launch shows exactly one error dialog (never zero, never a duplicate/double-fired dialog) and the app does not hang or crash.
- Restore the CLI script, then throttle startup so it takes longer than 10 seconds (e.g. temporarily add a startup delay, or simulate load by launching several instances at once), and launch the app. Confirm exactly one startup-timeout error is shown and the child service process is not left running afterward.
- With a normal (fast, successful) startup, quit the app immediately after the viewer window appears, repeated several times. Confirm no crash, hang, or console-visible race warning occurs and the child service process always exits cleanly.

## Quit Escalation Under an Unresponsive Child Process

- Launch the app, then replace/wrap the child service so it ignores SIGTERM and SIGINT (e.g. temporarily swap in a script that traps both signals and does nothing), and quit the app. Confirm `applicationWillTerminate` does not return until the escalation sequence completes, the child process is killed (via SIGKILL) within a few seconds, and no orphaned process remains afterward.
- With a normally-behaving child service (responds to SIGTERM promptly), quit the app repeatedly. Confirm each quit completes quickly (no multi-second delay) and the child process always exits cleanly on the first signal, without needing to escalate to SIGINT or SIGKILL.
- Trigger the 10-second startup timeout (see "Startup Race Under Slow or Failing Service Launch") with a child process that also ignores SIGTERM and SIGINT. Confirm the timeout path still forces the process to exit (via the same SIGTERM -> SIGINT -> SIGKILL escalation) before the startup-timeout error is shown.

## Bundle Resource Failure Handling

- Launch the app in a way that makes `Bundle.main.resourceURL` unavailable (e.g. a malformed or relocated app bundle missing its `Resources` directory). Confirm GitLocal shows a native error explaining it could not locate its app bundle resources, rather than silently attempting to start the service from an unrelated working-directory-relative path.

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
- Double-click a Markdown file whose name contains a single quote, double quote, or both (e.g. `O'Brien's "notes".md`). Confirm the selected preview path matches the requested file exactly, no JavaScript error or blank page appears, and no unrelated native command fires.

## Markdown Open Failure Handling

- Try to open a missing Markdown file through an explicit launch path. Confirm GitLocal shows a missing-file message and does not show stale preview content.
- Try to open a non-Markdown file through an explicit launch path. Confirm GitLocal reports an unsupported file type.
- Send multiple Markdown open events quickly. Confirm the most recent event wins and no older file remains selected as if it were the latest request.
