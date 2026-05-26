cask "gitlocal" do
  version "0.9.1"
  sha256 "3017f87dabf9dd70a602d7164e9d265344b208cb661dd16a113d7a2bd6ba6c8d"

  url "https://github.com/ehud-am/gitlocal/releases/download/v0.9.1/GitLocal-0.9.1-macos.zip"
  name "GitLocal"
  desc "Native macOS repository viewer for GitLocal"
  homepage "https://github.com/ehud-am/gitlocal"

  app "GitLocal.app"

  zap trash: [
    "~/Library/Application Support/GitLocal",
    "~/Library/Caches/com.gitlocal.app",
    "~/Library/HTTPStorages/com.gitlocal.app",
    "~/Library/Preferences/com.gitlocal.app.plist",
    "~/Library/Saved Application State/com.gitlocal.app.savedState",
  ]
end
