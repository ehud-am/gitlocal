import AppKit
import CoreServices

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var service: GitLocalService?
    private var windowController: ViewerWindowController?
    private var pendingOpenFilePaths: [String] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        let service = GitLocalService()
        self.service = service
        // Only the most recent pre-launch "Open With" target becomes the initial window's
        // content; any earlier ones queued before launch are dropped here (as opposed to
        // application(_:open:)'s post-launch path, which flushes every pending path to the
        // already-open window instead of picking just one).
        let initialOpenPath = pendingOpenFilePaths.last

        service.start(openPath: initialOpenPath) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let url):
                    let controller = ViewerWindowController(
                        url: url,
                        onDefaultReaderSetupRequested: { [weak self] in
                            self?.setDefaultMarkdownReader() ?? .failure(AppDelegateError.unavailable)
                        }
                    )
                    self?.windowController = controller
                    self?.installMainMenu(for: controller)
                    controller.showWindow(self)
                    self?.flushPendingOpenFiles(excluding: initialOpenPath)
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

    func application(_ application: NSApplication, open urls: [URL]) {
        let markdownPaths = urls
            .filter { $0.isFileURL && Self.isSupportedMarkdownURL($0) }
            .map(\.path)
        guard !markdownPaths.isEmpty else { return }

        NSApp.activate(ignoringOtherApps: true)
        pendingOpenFilePaths.append(contentsOf: markdownPaths)
        flushPendingOpenFiles()
    }

    private static func isSupportedMarkdownURL(_ url: URL) -> Bool {
        let ext = url.pathExtension.lowercased()
        return ext == "md" || ext == "markdown"
    }

    private func flushPendingOpenFiles(excluding excludedPath: String? = nil) {
        guard let controller = windowController else { return }
        let pathsToSend = pendingOpenFilePaths.filter { $0 != excludedPath }
        pendingOpenFilePaths.removeAll()
        for path in pathsToSend {
            controller.openMarkdownFile(path)
        }
    }

    private func installMainMenu(for controller: ViewerWindowController) {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu(title: "GitLocal")
        let defaultMarkdownReaderItem = NSMenuItem(
            title: "Set as Default Markdown Reader",
            action: #selector(ViewerWindowController.setDefaultMarkdownReader(_:)),
            keyEquivalent: ""
        )
        defaultMarkdownReaderItem.target = controller
        appMenu.addItem(defaultMarkdownReaderItem)
        appMenu.addItem(NSMenuItem.separator())
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
        viewMenu.addItem(NSMenuItem.separator())
        let toggleTerminalItem = NSMenuItem(
            title: "Toggle Terminal",
            action: #selector(ViewerWindowController.toggleTerminal(_:)),
            keyEquivalent: "`"
        )
        toggleTerminalItem.keyEquivalentModifierMask = [.control]
        toggleTerminalItem.target = controller
        viewMenu.addItem(toggleTerminalItem)
        viewMenu.addItem(NSMenuItem.separator())
        let toggleDotfilesItem = NSMenuItem(
            title: "Hide Dotfiles",
            action: #selector(ViewerWindowController.toggleDotfiles(_:)),
            keyEquivalent: "."
        )
        toggleDotfilesItem.keyEquivalentModifierMask = [.command, .shift]
        toggleDotfilesItem.target = controller
        // Matches DEFAULTS.hideDotfiles (false) in ui/src/services/viewerState.ts, so the checkmark
        // is already correct for a fresh viewer before the page's first dotfiles-state round-trip.
        toggleDotfilesItem.state = .off
        viewMenu.addItem(toggleDotfilesItem)
        controller.dotfilesMenuItem = toggleDotfilesItem
        viewMenu.addItem(NSMenuItem.separator())
        let trackedVisibilityItem = NSMenuItem(title: "Tracked/All/Local", action: nil, keyEquivalent: "")
        let trackedVisibilityMenu = NSMenu(title: "Tracked/All/Local")
        let trackedItem = NSMenuItem(
            title: "Tracked",
            action: #selector(ViewerWindowController.setTrackedVisibilityHide(_:)),
            keyEquivalent: ""
        )
        trackedItem.target = controller
        // Matches DEFAULTS.generatedLocalVisibility ('hide') in ui/src/services/viewerState.ts, so
        // the checkmark is already correct for a fresh viewer before the page's first
        // tracked-visibility-state round-trip.
        trackedItem.state = .on
        trackedVisibilityMenu.addItem(trackedItem)
        controller.trackedVisibilityHideItem = trackedItem
        let allFilesItem = NSMenuItem(
            title: "All",
            action: #selector(ViewerWindowController.setTrackedVisibilityShow(_:)),
            keyEquivalent: ""
        )
        allFilesItem.target = controller
        allFilesItem.state = .off
        trackedVisibilityMenu.addItem(allFilesItem)
        controller.trackedVisibilityShowItem = allFilesItem
        let localOnlyItem = NSMenuItem(
            title: "Local",
            action: #selector(ViewerWindowController.setTrackedVisibilityOnly(_:)),
            keyEquivalent: ""
        )
        localOnlyItem.target = controller
        localOnlyItem.state = .off
        trackedVisibilityMenu.addItem(localOnlyItem)
        controller.trackedVisibilityOnlyItem = localOnlyItem
        trackedVisibilityItem.submenu = trackedVisibilityMenu
        viewMenu.addItem(trackedVisibilityItem)
        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)

        NSApp.mainMenu = mainMenu
    }

    private func setDefaultMarkdownReader() -> Result<String, Error> {
        guard let bundleIdentifier = Bundle.main.bundleIdentifier else {
            return .failure(AppDelegateError.missingBundleIdentifier)
        }

        if isDefaultMarkdownReader(bundleIdentifier: bundleIdentifier) {
            return .success("GitLocal is already the default Markdown reader.")
        }

        let contentTypes = ["net.daringfireball.markdown", "public.markdown"]
        var failedTypes: [String] = []
        for contentType in contentTypes {
            let status = LSSetDefaultRoleHandlerForContentType(
                contentType as CFString,
                LSRolesMask.all,
                bundleIdentifier as CFString
            )
            if status != noErr {
                failedTypes.append(contentType)
            }
        }

        if failedTypes.count == contentTypes.count {
            return .failure(AppDelegateError.defaultReaderSetupFailed)
        }

        return .success("GitLocal is now the default Markdown reader.")
    }

    private func isDefaultMarkdownReader(bundleIdentifier: String) -> Bool {
        let contentTypes = ["net.daringfireball.markdown", "public.markdown"]
        return contentTypes.contains { contentType in
            guard let handler = LSCopyDefaultRoleHandlerForContentType(
                contentType as CFString,
                LSRolesMask.all
            )?.takeRetainedValue() as String? else {
                return false
            }
            return handler == bundleIdentifier
        }
    }
}

private enum AppDelegateError: LocalizedError {
    case missingBundleIdentifier
    case defaultReaderSetupFailed
    case unavailable

    var errorDescription: String? {
        switch self {
        case .missingBundleIdentifier:
            return "GitLocal could not read its bundle identifier."
        case .defaultReaderSetupFailed:
            return "macOS did not allow GitLocal to become the default Markdown reader."
        case .unavailable:
            return "Default Markdown reader setup is unavailable."
        }
    }
}
