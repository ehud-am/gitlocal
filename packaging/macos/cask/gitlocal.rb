cask "gitlocal" do
  version "0.9.0"
  sha256 "3f67edc8259fe0d5ef09d506c533c475195bdc722b04a2658f89ad0ef5dc22b7"

  url "https://github.com/ehud-am/gitlocal/releases/download/0.9.0/GitLocal-0.9.0-macos.zip"
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
