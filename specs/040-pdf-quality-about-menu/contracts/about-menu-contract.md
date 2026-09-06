# Contract: "About GitLocal" Menu Item

**Component**: `native/macos/GitLocal/GitLocal/AppDelegate.swift` (`installMainMenu(for:)`)
**Type**: Native macOS UI contract (no network/API surface)

## Contract

1. The app menu (the menu titled with the app's name, first in the menu bar) MUST contain a menu item titled "About GitLocal" as its first item.
2. Selecting "About GitLocal" MUST invoke `NSApplication.orderFrontStandardAboutPanel(_:)` (target `nil`, resolved via the responder chain), with no custom window or view controller introduced.
3. A separator MUST follow "About GitLocal" before the existing "Set as Default Markdown Reader" item, preserving existing item order and behavior below it (`Set as Default Markdown Reader`, separator, `Quit GitLocal`).
4. No new target/action wiring on `ViewerWindowController` or `AppDelegate` is introduced for this item — it relies entirely on AppKit's built-in handling.

## Non-goals

- No custom About window, no custom version-string plumbing, no npm/browser-distribution equivalent (macOS-native-app-only per spec Assumptions).
