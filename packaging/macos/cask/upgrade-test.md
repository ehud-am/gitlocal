# Homebrew Upgrade Smoke Test

This validates the macOS native distribution path. The app under test must still package the same GitLocal server and React UI used by npm.

1. Install the previous GitLocal cask version from the project tap.

   ```sh
   brew tap ehud-am/gitlocal
   brew install --cask gitlocal
   ```

2. Update the tap cask to the newer release artifact.

3. Run:

   ```sh
   brew update
   brew upgrade --cask gitlocal
   ```

4. Launch `GitLocal.app`.

5. Confirm the app version matches the newer GitLocal release.

6. Confirm the app opens the viewer without requiring a terminal window.
