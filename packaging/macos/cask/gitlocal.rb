cask "gitlocal" do
  version "0.9.10"
  sha256 "0d1b0d86c172858172dd16375cd817b3f81df6aa8fe0473ee97e1c3827052b7d"

  url "https://github.com/ehud-am/gitlocal/releases/download/v0.9.10/GitLocal-0.9.10-macos.zip"
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
