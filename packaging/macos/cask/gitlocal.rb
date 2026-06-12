cask "gitlocal" do
  version "0.9.8"
  sha256 "8bccfa65486f075f4bb95c5a3d4c4a54441cf12045540918002f65e624a73957"

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
