cask "gitlocal" do
  version "0.9.3"
  sha256 "ec38f5b40f369f967d9ba4ebe4f46c1c863c2f69a316c67cd43859d30e8fb4e8"

  url "https://github.com/ehud-am/gitlocal/releases/download/v0.9.3/GitLocal-0.9.3-macos.zip"
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
