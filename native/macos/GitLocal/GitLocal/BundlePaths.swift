import Foundation

struct BundlePaths {
    let resources: URL
    let gitlocalRoot: URL
    let cliScript: URL
    let nodeRuntime: URL

    init?(bundle: Bundle = .main) {
        guard let resources = bundle.resourceURL else { return nil }
        self.resources = resources
        self.gitlocalRoot = resources.appendingPathComponent("gitlocal", isDirectory: true)
        self.cliScript = gitlocalRoot.appendingPathComponent("dist/cli.js")
        self.nodeRuntime = resources.appendingPathComponent("runtime/node")
    }
}
