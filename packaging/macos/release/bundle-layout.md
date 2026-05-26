# macOS App Bundle Layout

The packaged app uses this runtime layout:

```text
GitLocal.app/
└── Contents/
    ├── Info.plist
    ├── MacOS/
    │   └── GitLocal
    └── Resources/
        ├── gitlocal/
        │   ├── package.json
        │   ├── dist/
        │   │   ├── cli.js
        │   │   └── index.js
        │   └── ui/
        │       └── dist/
        │           └── index.html
        └── runtime/
            └── node
```

`GitLocal.app` launches `Resources/runtime/node Resources/gitlocal/dist/cli.js --app-mode`. The `--app-mode` flag prevents opening the system browser, allowing the native wrapper to own the viewer window.

The bundle must include `package.json` so the native app and cask validation can compare app, artifact, and npm package versions.

The bundle layout exists to reuse the same GitLocal app implementation that ships through npm. macOS-specific files should remain limited to app launch, embedded browsing, lifecycle management, and packaging.
