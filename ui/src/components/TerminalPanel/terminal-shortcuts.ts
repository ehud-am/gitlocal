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
