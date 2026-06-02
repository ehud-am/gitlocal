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
                    self?.installMainMenu(for: controller)
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

    private func installMainMenu(for controller: ViewerWindowController) {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu(title: "GitLocal")
        appMenu.addItem(
            NSMenuItem(
                title: "Quit GitLocal",
                action: #selector(NSApplication.terminate(_:)),
                keyEquivalent: "q"
            )
        )
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        let editMenuItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(
            NSMenuItem(
                title: "Cut",
                action: #selector(NSText.cut(_:)),
                keyEquivalent: "x"
            )
        )
        editMenu.addItem(
            NSMenuItem(
                title: "Copy",
                action: #selector(NSText.copy(_:)),
                keyEquivalent: "c"
            )
        )
        editMenu.addItem(
            NSMenuItem(
                title: "Paste",
                action: #selector(NSText.paste(_:)),
                keyEquivalent: "v"
            )
        )
        editMenu.addItem(NSMenuItem.separator())
        let findItem = NSMenuItem(
            title: "Find",
            action: #selector(ViewerWindowController.findInPreview(_:)),
            keyEquivalent: "f"
        )
        findItem.target = controller
        editMenu.addItem(findItem)
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        let viewMenuItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        let refreshItem = NSMenuItem(
            title: "Refresh",
            action: #selector(ViewerWindowController.refreshViewer(_:)),
            keyEquivalent: "r"
        )
        refreshItem.target = controller
        viewMenu.addItem(refreshItem)
        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)

        NSApp.mainMenu = mainMenu
    }
}
