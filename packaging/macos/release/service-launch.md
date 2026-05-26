# Local Service Launch Contract

The native app starts GitLocal with:

```text
<app>/Contents/Resources/runtime/node <app>/Contents/Resources/gitlocal/dist/cli.js --app-mode [optional repository path]
```

Expected stdout includes:

```text
gitlocal listening on http://localhost:<port>
```

The native wrapper reads stdout, extracts the loopback URL, verifies that the URL uses a local host, and then loads that URL in WebKit.

This launch contract keeps the native Mac app aligned with the npm distribution by running the same CLI/service entry point in app mode.

## Failure Rules

- Missing node runtime: show a native startup error.
- Missing CLI bundle: show a native startup error.
- No listening URL within the readiness timeout: terminate the child process and show a native startup error.
- Non-loopback URL: terminate the child process and show a security error.
