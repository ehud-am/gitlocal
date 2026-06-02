# GitLocal macOS Wrapper

This directory contains the macOS-native wrapper for the optional Homebrew app distribution. The wrapper is intentionally thin: it starts the packaged GitLocal local service, waits for a loopback URL, displays the existing React viewer in a WebKit window, and shuts the service down when the app quits.

The TypeScript/Node server and React UI remain the product core. The wrapper must not fork GitLocal behavior or depend on a global npm installation during normal launch.

GitLocal is aimed at less-technical builders working with AI agents. The native app should make codebase browsing, Markdown reading, and review feel like a normal Mac app while preserving the same lightweight editing capabilities as the npm/browser distribution.

## Launch Lifecycle

```text
notStarted -> launching -> running -> stopping -> stopped
notStarted -> launching -> failed
running -> failed
failed -> stopped
```

On launch, `AppDelegate` asks `GitLocalService` to start the packaged CLI with `--app-mode`. The CLI prints the listening URL, the app loads that URL in `ViewerWindowController`, and any startup failure is shown through `AppErrorPresenter`.

On quit, `AppDelegate` terminates the managed service process. Normal app sessions should not leave a GitLocal service process running after the app exits.

## Local Binding

The packaged service is expected to bind only to loopback. The native wrapper loads only URLs whose host is `localhost`, `127.0.0.1`, or `::1`.

## Native Responsibilities

- Start one managed local service process per app session.
- Load the existing GitLocal viewer in a native WebKit window.
- Provide standard macOS menu and keyboard commands for Copy, Cut, Paste, preview-scoped Find, and Refresh.
- Show clear native errors for missing assets, startup failures, port readiness failures, and blocked app launch.
- Stop the managed local service on close or quit.

## Native Commands

The wrapper installs app menus for common Mac workflows while keeping product behavior in the shared React viewer:

- Edit > Copy and Command-C copy selected preview or editable text through WebKit.
- Edit > Cut and Command-X cut only when editable WebKit content is focused.
- Edit > Paste and Command-V paste only when editable WebKit content is focused.
- Edit > Find and Command-F dispatch a GitLocal native command event so the React viewer opens the current preview's in-file Find panel.
- View > Refresh and Command-R dispatch a GitLocal native command event so the React viewer reloads local repository, tree, file, README, branch, and sync state without restarting the managed service.

## Out Of Scope

- Reimplementing repository browsing in Swift.
- Depending on `npm install -g gitlocal` for normal app launch.
- Windows or Linux native wrappers.
