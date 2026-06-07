import AppKit
import WebKit

final class ViewerWindowController: NSWindowController {
    private let webView: WKWebView
    private let initialURL: URL

    init(url: URL) {
        self.initialURL = url
        self.webView = WKWebView(frame: .zero)

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

    private func dispatchNativeCommand(_ command: String) {
        let escapedCommand = command.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let script = """
        window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
          detail: { command: '\(escapedCommand)' }
        }));
        """
        webView.evaluateJavaScript(script)
    }
}
