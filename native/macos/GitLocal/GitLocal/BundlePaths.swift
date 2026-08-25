import Foundation

// Layout contract owned by the Homebrew cask build scripts under packaging/macos/, which stage
// the CLI and a Node runtime into the app bundle's Resources directory at these fixed subpaths.
// A missing file surfaces only as a generic runtime error at launch, not a structural check here.
private enum BundleLayout {
    static let gitlocalDirectoryName = "gitlocal"
    static let cliScriptRelativePath = "dist/cli.js"
    static let nodeRuntimeRelativePath = "runtime/node"
}

struct BundlePaths {
    let resources: URL
    let gitlocalRoot: URL
    let cliScript: URL
    let nodeRuntime: URL

    init?(bundle: Bundle = .main) {
        guard let resources = bundle.resourceURL else { return nil }
        self.resources = resources
        self.gitlocalRoot = resources.appendingPathComponent(BundleLayout.gitlocalDirectoryName, isDirectory: true)
        self.cliScript = gitlocalRoot.appendingPathComponent(BundleLayout.cliScriptRelativePath)
        self.nodeRuntime = resources.appendingPathComponent(BundleLayout.nodeRuntimeRelativePath)
    }
}
