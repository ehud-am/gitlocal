cask "gitlocal" do
  version "0.9.9"
  sha256 "98b52d4f67afe7e9904e970d9bbb18324f4fab3369252aec6919ba19658d77fe"

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
