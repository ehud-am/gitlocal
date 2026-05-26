# Contract: macOS Native App

## Purpose

Define the externally observable behavior of `GitLocal.app`.

The native app serves less-technical builders who need to browse, read, and review AI-maintained codebases in a Mac app experience without keeping a terminal open.

## Launch Contract

### User Action

The user launches GitLocal from macOS after installing through Homebrew.

### Expected Behavior

1. App starts without requiring an open terminal.
2. App starts a local GitLocal service for the session.
3. Service binds only to loopback by default.
4. App opens a native macOS window containing the GitLocal viewer.
5. Viewer shows the same GitLocal product version as the app release.

### Failure Behavior

The app shows a clear native error if:

- the local service cannot start;
- no loopback port is available;
- packaged assets are missing or unreadable;
- macOS blocks the app because of security/signing state;
- the selected repository cannot be accessed.

## Lifecycle Contract

### Normal Quit

When the user closes or quits the app:

1. The app asks the local service to shut down or terminates the managed child process.
2. The app exits without requiring terminal cleanup.
3. No normal-session GitLocal service process remains running.

### Relaunch

When the user launches the app again:

1. A new local session starts.
2. The app handles stale state from a previous failed session.
3. The viewer opens with a valid local service URL.

## Existing npm Installation Contract

The app must not require a globally installed npm package. If a user also has npm `gitlocal` installed, the app should not call it during normal launch and should not change npm package files.

## Security Contract

- The viewer service binds to `127.0.0.1` or equivalent loopback only by default.
- The app must not open a remotely accessible service by default.
- The app must not send telemetry or app launch events to a remote service.
- Signing/notarization status must be visible in release documentation.
