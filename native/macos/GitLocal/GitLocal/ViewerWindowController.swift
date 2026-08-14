import AppKit
import WebKit

final class ViewerWindowController: NSWindowController, WKScriptMessageHandler, WKNavigationDelegate {
    private let webView: WKWebView
    private let initialURL: URL
    private let onDefaultReaderSetupRequested: () -> Result<String, Error>
    private var pageLoaded = false
    private var pendingOpenFilePaths: [String] = []
    weak var dotfilesMenuItem: NSMenuItem?

    init(url: URL, onDefaultReaderSetupRequested: @escaping () -> Result<String, Error>) {
        self.initialURL = url
        self.onDefaultReaderSetupRequested = onDefaultReaderSetupRequested
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.addUserScript(WKUserScript(
            source: "window.gitlocalNative = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        self.webView = WKWebView(frame: .zero, configuration: configuration)

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "GitLocal"
        window.center()
        window.contentView = webView

        super.init(window: window)
        configuration.userContentController.add(self, name: "gitlocalNative")
        webView.navigationDelegate = self
        webView.load(URLRequest(url: initialURL))
    }

    required init?(coder: NSCoder) {
        nil
    }

    override func showWindow(_ sender: Any?) {
        super.showWindow(sender)
        window?.makeKeyAndOrderFront(sender)
    }

    @objc func findInPreview(_ sender: Any?) {
        dispatchNativeCommand("find")
    }

    @objc func refreshViewer(_ sender: Any?) {
        dispatchNativeCommand("refresh")
    }

    @objc func undoEdit(_ sender: Any?) {
        dispatchNativeCommand("undo")
    }

    @objc func redoEdit(_ sender: Any?) {
        dispatchNativeCommand("redo")
    }

    @objc func selectAllInPanel(_ sender: Any?) {
        dispatchNativeCommand("select-all-panel")
    }

    @objc func printMarkdown(_ sender: Any?) {
        dispatchNativeCommand("print-markdown")
    }

    @objc func shareMarkdown(_ sender: Any?) {
        dispatchNativeCommand("share-markdown")
    }

    @objc func toggleTerminal(_ sender: Any?) {
        dispatchNativeCommand("toggle-terminal")
    }

    @objc func toggleDotfiles(_ sender: Any?) {
        dispatchNativeCommand("toggle-dotfiles")
    }

    @objc func setDefaultMarkdownReader(_ sender: Any?) {
        switch onDefaultReaderSetupRequested() {
        case .success(let message):
            dispatchNativeCommand("default-reader-setup-succeeded", message: message)
        case .failure(let error):
            dispatchNativeCommand("default-reader-setup-failed", message: error.localizedDescription)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pageLoaded = true
        dispatchNativeCommand("default-reader-available")
        flushPendingOpenFiles()
    }

    func openMarkdownFile(_ path: String) {
        pendingOpenFilePaths.append(path)
        flushPendingOpenFiles()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "gitlocalNative",
              let body = message.body as? [String: Any],
              let command = body["command"] as? String else {
            return
        }

        if command == "set-default-markdown-reader" {
            setDefaultMarkdownReader(nil)
        }

        if command == "dotfiles-state" {
            let hideDotfiles = (body["value"] as? String) == "true"
            dotfilesMenuItem?.state = hideDotfiles ? .on : .off
        }
    }

    private func flushPendingOpenFiles() {
        guard pageLoaded else { return }
        let paths = pendingOpenFilePaths
        pendingOpenFilePaths.removeAll()
        for path in paths {
            dispatchNativeCommand("open-file", path: path)
        }
    }

    private func dispatchNativeCommand(_ command: String, message: String = "", path: String = "") {
        let escapedCommand = command.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let escapedMessage = message.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let escapedPath = path.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let script = """
        window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
          detail: { command: '\(escapedCommand)', message: '\(escapedMessage)', path: '\(escapedPath)' }
        }));
        """
        webView.evaluateJavaScript(script)
    }
}
