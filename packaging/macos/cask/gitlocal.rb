cask "gitlocal" do
  version "0.9.8"
  sha256 "2d2d8c50b215d12dc115d89e54571b50b536bd31eda8b47ae0cd7f652770957f"

  url "https://github.com/ehud-am/gitlocal/releases/download/v0.9.8/GitLocal-0.9.8-macos.zip"
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
