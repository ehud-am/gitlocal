import { describe, expect, it } from 'vitest'
import { classifyTerminalKey, detectTerminalPlatform } from './terminal-shortcuts'

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
    expect(['mac', 'windows', 'other']).toContain(detectTerminalPlatform())
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
