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
