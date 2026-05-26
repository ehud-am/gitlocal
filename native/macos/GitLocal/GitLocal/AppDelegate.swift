import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var service: GitLocalService?
    private var windowController: ViewerWindowController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let service = GitLocalService()
        self.service = service

        service.start { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let url):
                    let controller = ViewerWindowController(url: url)
                    self?.windowController = controller
                    controller.showWindow(self)
                case .failure(let error):
                    AppErrorPresenter.show(error)
                    NSApp.terminate(self)
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        service?.stop()
    }
}
