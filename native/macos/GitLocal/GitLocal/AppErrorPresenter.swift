import AppKit

enum AppErrorPresenter {
    /// Only presents the alert — does not terminate the app. Callers that show this for a
    /// fatal startup error must call NSApp.terminate() themselves afterward.
    static func show(_ error: Error) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "GitLocal could not start"
        alert.informativeText = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        alert.addButton(withTitle: "Quit")
        alert.runModal()
    }
}
