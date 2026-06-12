cask "gitlocal" do
  version "0.9.9"
  sha256 "777025243eae59a9d1e1db70e0cf480ef66a376eb96ace444d94a0f6e081961b"

  url "https://github.com/ehud-am/gitlocal/releases/download/v0.9.9/GitLocal-0.9.9-macos.zip"
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
