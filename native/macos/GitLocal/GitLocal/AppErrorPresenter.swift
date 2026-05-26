import AppKit

enum AppErrorPresenter {
    static func show(_ error: Error) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "GitLocal could not start"
        alert.informativeText = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        alert.addButton(withTitle: "Quit")
        alert.runModal()
    }
}
