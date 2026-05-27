cask "gitlocal" do
  version "0.9.3"
  sha256 "7c15ce09792d3e859718e51bce5a7b7c9689dd9d67d4b2ddd77beb8abc5e364e"

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
