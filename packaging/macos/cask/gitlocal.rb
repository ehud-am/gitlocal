cask "gitlocal" do
  version "0.9.4"
  sha256 "161efd3fe3ea64f8f5b8c2cb0fb7ebdecba92535770558faf3958099b19dcd60"

  url "https://github.com/ehud-am/gitlocal/releases/download/v0.9.4/GitLocal-0.9.4-macos.zip"
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
