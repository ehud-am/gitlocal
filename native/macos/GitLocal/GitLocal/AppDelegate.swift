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
        let undoItem = NSMenuItem(
            title: "Undo",
            action: #selector(ViewerWindowController.undoEdit(_:)),
            keyEquivalent: "z"
        )
        undoItem.target = controller
        editMenu.addItem(undoItem)
        let redoItem = NSMenuItem(
            title: "Redo",
            action: #selector(ViewerWindowController.redoEdit(_:)),
            keyEquivalent: "Z"
        )
        redoItem.target = controller
        editMenu.addItem(redoItem)
        editMenu.addItem(NSMenuItem.separator())
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
        let selectAllItem = NSMenuItem(
            title: "Select All",
            action: #selector(ViewerWindowController.selectAllInPanel(_:)),
            keyEquivalent: "a"
        )
        selectAllItem.target = controller
        editMenu.addItem(selectAllItem)
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
        viewMenu.addItem(NSMenuItem.separator())
        let printMarkdownItem = NSMenuItem(
            title: "Print Rendered Markdown",
            action: #selector(ViewerWindowController.printMarkdown(_:)),
            keyEquivalent: "p"
        )
        printMarkdownItem.target = controller
        viewMenu.addItem(printMarkdownItem)
        let shareMarkdownItem = NSMenuItem(
            title: "Share Markdown",
            action: #selector(ViewerWindowController.shareMarkdown(_:)),
            keyEquivalent: ""
        )
        shareMarkdownItem.target = controller
        viewMenu.addItem(shareMarkdownItem)
        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)

        NSApp.mainMenu = mainMenu
    }
}
