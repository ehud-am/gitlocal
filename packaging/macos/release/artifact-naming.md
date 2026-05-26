# Release Artifact Naming

Use this artifact name for the initial macOS app distribution:

```text
GitLocal-<version>-macos.zip
```

If universal builds become impractical, use architecture-specific artifacts:

```text
GitLocal-<version>-macos-arm64.zip
GitLocal-<version>-macos-x64.zip
```

The artifact version must match:

- `package.json` version;
- `GitLocal.app` bundle short version;
- GitHub Release tag without the leading `v`;
- Homebrew cask version.

Artifact names describe the distribution wrapper, not a separate product fork. The packaged app should keep using the same GitLocal app implementation as the npm release.
