import { describe, expect, it, vi } from 'vitest'
import { classifyTerminalKey, createTerminalKeyHandler, detectTerminalPlatform } from './terminal-shortcuts'

function key(keyName: string, modifiers: Partial<Record<'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey', boolean>> = {}, type = 'keydown') {
  return { type, key: keyName, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...modifiers }
}

describe('detectTerminalPlatform', () => {
  it('recognizes macOS, Windows, and everything else', () => {
    expect(detectTerminalPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15')).toBe('mac')
    expect(detectTerminalPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows')
    expect(detectTerminalPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('other')
  })

  it('defaults to the current navigator', () => {
    const spy = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    try {
      expect(detectTerminalPlatform()).toBe('windows')
    } finally {
      spy.mockRestore()
    }
  })
})

describe('classifyTerminalKey', () => {
  it('toggles the panel on Ctrl+` on every platform, and only on keydown with no other modifier', () => {
    for (const platform of ['mac', 'windows', 'other'] as const) {
      expect(classifyTerminalKey(key('`', { ctrlKey: true }), platform, false)).toBe('toggle-panel')
    }
    expect(classifyTerminalKey(key('`', { ctrlKey: true }, 'keyup'), 'other', false)).toBeNull()
    expect(classifyTerminalKey(key('`', { ctrlKey: true, shiftKey: true }), 'other', false)).toBeNull()
    expect(classifyTerminalKey(key('`'), 'other', false)).toBeNull()
  })

  it('leaves Cmd+C/Cmd+V to the native copy/paste events on macOS, and clears on Cmd+K', () => {
    expect(classifyTerminalKey(key('c', { metaKey: true }), 'mac', true)).toBeNull()
    expect(classifyTerminalKey(key('v', { metaKey: true }), 'mac', false)).toBeNull()
    expect(classifyTerminalKey(key('k', { metaKey: true }), 'mac', false)).toBe('clear')
    expect(classifyTerminalKey(key('k', { metaKey: true, shiftKey: true }), 'mac', false)).toBeNull()
    // Ctrl+C stays an interrupt on macOS, selection or not.
    expect(classifyTerminalKey(key('c', { ctrlKey: true }), 'mac', true)).toBeNull()
  })

  it('copies on Ctrl+Shift+C, and on Ctrl+C only while text is selected', () => {
    expect(classifyTerminalKey(key('C', { ctrlKey: true, shiftKey: true }), 'other', false)).toBe('copy')
    expect(classifyTerminalKey(key('c', { ctrlKey: true }), 'windows', true)).toBe('copy')
    expect(classifyTerminalKey(key('c', { ctrlKey: true }), 'other', false)).toBeNull()
  })

  it('pastes on Ctrl+Shift+V everywhere, and on Ctrl+V only on Windows', () => {
    expect(classifyTerminalKey(key('V', { ctrlKey: true, shiftKey: true }), 'other', false)).toBe('paste')
    expect(classifyTerminalKey(key('v', { ctrlKey: true }), 'windows', false)).toBe('paste')
    expect(classifyTerminalKey(key('v', { ctrlKey: true }), 'other', false)).toBeNull()
  })

  it('passes everything else through to the shell', () => {
    expect(classifyTerminalKey(key('ArrowUp'), 'other', false)).toBeNull()
    expect(classifyTerminalKey(key('c', { ctrlKey: true, altKey: true }), 'windows', true)).toBeNull()
    expect(classifyTerminalKey(key('v', { ctrlKey: true, metaKey: true }), 'windows', false)).toBeNull()
    expect(classifyTerminalKey(key('a', { ctrlKey: true }), 'windows', false)).toBeNull()
  })
})

function handlerSetup(platform: 'mac' | 'windows' | 'other', selection = '', copyWorks = true) {
  const terminal = {
    hasSelection: () => selection !== '',
    getSelection: () => selection,
    clearSelection: vi.fn(),
    clear: vi.fn(),
  }
  const env = {
    platform,
    onTogglePanel: vi.fn(),
    copyViaCommand: vi.fn(() => copyWorks),
    writeClipboard: vi.fn(() => Promise.resolve()),
  }
  return { terminal, env, handle: createTerminalKeyHandler(terminal, env) }
}

function handledKey(...args: Parameters<typeof key>) {
  return { ...key(...args), preventDefault: vi.fn(), stopPropagation: vi.fn() }
}

describe('createTerminalKeyHandler', () => {
  it('passes ordinary keys through to xterm untouched', () => {
    const { handle } = handlerSetup('other')
    const event = handledKey('ArrowUp')
    expect(handle(event)).toBe(true)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('toggles the panel once, stopping the event so the window listener does not toggle it back', () => {
    const { env, handle } = handlerSetup('mac')
    const event = handledKey('`', { ctrlKey: true })
    expect(handle(event)).toBe(false)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(env.onTogglePanel).toHaveBeenCalledTimes(1)
  })

  it('copies the selection with the synchronous copy command and clears it', () => {
    const { terminal, env, handle } = handlerSetup('windows', 'text')
    const event = handledKey('c', { ctrlKey: true })
    expect(handle(event)).toBe(false)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(env.copyViaCommand).toHaveBeenCalled()
    expect(env.writeClipboard).not.toHaveBeenCalled()
    expect(terminal.clearSelection).toHaveBeenCalled()
  })

  it('falls back to the clipboard API when the copy command fails, clearing only once it succeeds', async () => {
    const { terminal, env, handle } = handlerSetup('other', 'text', false)
    handle(handledKey('c', { ctrlKey: true, shiftKey: true }))
    expect(env.writeClipboard).toHaveBeenCalledWith('text')
    await Promise.resolve()
    await Promise.resolve()
    expect(terminal.clearSelection).toHaveBeenCalled()

    const failing = handlerSetup('other', 'text', false)
    failing.env.writeClipboard.mockReturnValue(Promise.reject(new Error('denied')))
    failing.handle(handledKey('c', { ctrlKey: true, shiftKey: true }))
    await Promise.resolve()
    await Promise.resolve()
    expect(failing.terminal.clearSelection).not.toHaveBeenCalled()
  })

  it('does nothing on copy with an empty selection or no clipboard at all', () => {
    const empty = handlerSetup('other')
    expect(empty.handle(handledKey('c', { ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(empty.env.copyViaCommand).not.toHaveBeenCalled()

    const terminal = { hasSelection: () => true, getSelection: () => 'x', clearSelection: vi.fn(), clear: vi.fn() }
    const handle = createTerminalKeyHandler(terminal, { platform: 'other', onTogglePanel: vi.fn(), copyViaCommand: () => false })
    handle(handledKey('c', { ctrlKey: true }))
    expect(terminal.clearSelection).not.toHaveBeenCalled()
  })

  it('clears the screen on Cmd+K and leaves paste to the browser paste event', () => {
    const { terminal, handle } = handlerSetup('mac')
    const clearEvent = handledKey('k', { metaKey: true })
    expect(handle(clearEvent)).toBe(false)
    expect(terminal.clear).toHaveBeenCalled()

    const paste = handlerSetup('windows')
    const pasteEvent = handledKey('v', { ctrlKey: true })
    expect(paste.handle(pasteEvent)).toBe(false)
    expect(pasteEvent.preventDefault).not.toHaveBeenCalled()
  })
})
