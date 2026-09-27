export type TerminalPlatform = 'mac' | 'windows' | 'other'

export type TerminalShortcut = 'toggle-panel' | 'copy' | 'paste' | 'clear'

type KeyEventLike = Pick<KeyboardEvent, 'type' | 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'>

export function detectTerminalPlatform(userAgent: string = navigator.userAgent): TerminalPlatform {
  if (/Mac|iPhone|iPad/.test(userAgent)) return 'mac'
  if (/Windows/.test(userAgent)) return 'windows'
  return 'other'
}

// Decides which keys the panel handles itself instead of sending them to the shell. On macOS,
// Cmd+C/Cmd+V already reach xterm as native copy/paste events (in the browser and in the app's
// Edit menu alike), so only Cmd+K is added. Elsewhere Ctrl+C and Ctrl+V are terminal control keys,
// so copy and paste follow the Windows Terminal / VS Code conventions: Ctrl+Shift+C and
// Ctrl+Shift+V everywhere, Ctrl+C when text is selected, and Ctrl+V on Windows only (on Linux it
// stays ^V, which editors such as vim use).
export function classifyTerminalKey(
  event: KeyEventLike,
  platform: TerminalPlatform,
  hasSelection: boolean,
): TerminalShortcut | null {
  if (event.type !== 'keydown') return null
  const key = event.key.toLowerCase()

  if (key === '`' && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) return 'toggle-panel'

  if (platform === 'mac') {
    if (key === 'k' && event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) return 'clear'
    return null
  }

  if (!event.ctrlKey || event.altKey || event.metaKey) return null
  if (key === 'c' && (event.shiftKey || hasSelection)) return 'copy'
  if (key === 'v' && (event.shiftKey || platform === 'windows')) return 'paste'
  return null
}

export interface ShortcutTerminal {
  hasSelection: () => boolean
  getSelection: () => string
  clearSelection: () => void
  clear: () => void
}

export interface ShortcutEnvironment {
  platform: TerminalPlatform
  onTogglePanel: () => void
  /** Synchronous copy through the focused xterm textarea's own copy handler (document.execCommand). */
  copyViaCommand: () => boolean
  writeClipboard?: (text: string) => Promise<void>
}

type HandledKeyEvent = KeyEventLike & Pick<KeyboardEvent, 'preventDefault' | 'stopPropagation'>

// Builds the handler for xterm's attachCustomKeyEventHandler: returns false for keys the panel
// handles itself (xterm then leaves them alone), true for everything the shell should get.
export function createTerminalKeyHandler(terminal: ShortcutTerminal, env: ShortcutEnvironment) {
  const copySelection = () => {
    const text = terminal.getSelection()
    if (!text) return
    // The copy command runs inside the key press, where every browser allows it, and copies the
    // current selection through xterm's own copy handler. The async clipboard API is the fallback;
    // the selection is only cleared once one of them has the text.
    if (env.copyViaCommand()) {
      terminal.clearSelection()
    } else if (env.writeClipboard) {
      void env.writeClipboard(text).then(() => terminal.clearSelection(), () => {})
    }
  }

  return (event: HandledKeyEvent): boolean => {
    const shortcut = classifyTerminalKey(event, env.platform, terminal.hasSelection())
    if (shortcut === null) return true
    if (shortcut === 'toggle-panel') {
      // Stop the event here: the panel's window-level Ctrl+` listener would otherwise toggle a
      // second time, leaving the panel as it was (and a keyboard user with no way out).
      event.preventDefault()
      event.stopPropagation()
      env.onTogglePanel()
    } else if (shortcut === 'copy') {
      event.preventDefault()
      copySelection()
    } else if (shortcut === 'clear') {
      event.preventDefault()
      terminal.clear()
    }
    // 'paste': no preventDefault, so the browser fires its paste event, which xterm turns into
    // input (with bracketed-paste markers when the shell asks for them).
    return false
  }
}
