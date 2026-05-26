# Signing And Notarization

Public macOS distribution should be signed and notarized before the Homebrew cask is promoted.

Signing and notarization apply to the Mac wrapper artifact only. They do not change the shared GitLocal app code used by both distributions.

## Required Release Secrets

- `MACOS_DEVELOPER_ID_APPLICATION`: Developer ID Application certificate identity.
- `MACOS_NOTARY_APPLE_ID`: Apple ID used for notarization.
- `MACOS_NOTARY_TEAM_ID`: Apple Developer Team ID.
- `MACOS_NOTARY_PASSWORD`: App-specific password or notarization credential.

## Expected Public Release Steps

1. Codesign `GitLocal.app` with hardened runtime.
2. Create the final archive.
3. Submit the archive for notarization.
4. Staple notarization to the app or packaged artifact where applicable.
5. Verify Gatekeeper acceptance before updating the public cask.

## Internal Testing

Unsigned artifacts may be used for internal validation only. Public release notes and cask documentation must clearly state signing/notarization status if a test-only artifact is distributed.
