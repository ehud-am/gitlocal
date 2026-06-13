cask "gitlocal" do
  version "0.9.10"
  sha256 "56c79dcd3b844466be569bf90b55e4b32274ba5251d118ad0f989952bc875f7e"

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
