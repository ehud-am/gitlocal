import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Only the fallback-path test below needs a fake home directory; every other test in this file
// passes an explicit path, so mocking here (rather than in a separate un-mocked test file) keeps
// the whole suite hermetic without touching the real ~/.gitlocal.
let fakeHomedir = ''
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return { ...actual, homedir: () => fakeHomedir }
})

const {
  isValidDockPosition,
  readTerminalPanelPreference,
  writeTerminalPanelPreference,
} = await import('../../../src/services/terminal-panel-preference.js')

describe('terminal-panel-preference default path resolution', () => {
  const originalEnv = process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH
    else process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH = originalEnv
  })

  it('uses GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH when set', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-terminal-panel-pref-env-'))
    const path = join(dir, 'terminal-panel-preference.json')
    process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH = path
    try {
      writeTerminalPanelPreference('left')
      expect(readTerminalPanelPreference()).toEqual({ dockPosition: 'left' })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('falls back to the home-directory default location when the env var is unset', () => {
    delete process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH
    const fakeHome = mkdtempSync(join(tmpdir(), 'gitlocal-terminal-panel-pref-home-'))
    fakeHomedir = fakeHome
    try {
      // Nothing has ever been written under this freshly-created fake home, so this exercises
      // the fallback branch of defaultPreferencePath() (env var unset) without touching the
      // real ~/.gitlocal, however that machine happens to be configured.
      expect(readTerminalPanelPreference()).toEqual({ dockPosition: 'right' })
    } finally {
      rmSync(fakeHome, { recursive: true, force: true })
    }
  })
})

describe('terminal-panel-preference', () => {
  let dir: string
  let prefPath: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'gitlocal-terminal-panel-pref-'))
    prefPath = join(dir, 'nested', 'terminal-panel-preference.json')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  describe('isValidDockPosition', () => {
    it.each(['bottom', 'left', 'right'])('accepts %s', (value) => {
      expect(isValidDockPosition(value)).toBe(true)
    })

    it.each([undefined, null, 42, 'top', ''])('rejects %s', (value) => {
      expect(isValidDockPosition(value)).toBe(false)
    })
  })

  it('returns the default "right" position when the preference file does not exist', () => {
    expect(readTerminalPanelPreference(prefPath)).toEqual({ dockPosition: 'right' })
  })

  it('persists a chosen position and reads it back', () => {
    writeTerminalPanelPreference('left', prefPath)
    expect(readTerminalPanelPreference(prefPath)).toEqual({ dockPosition: 'left' })

    writeTerminalPanelPreference('bottom', prefPath)
    expect(readTerminalPanelPreference(prefPath)).toEqual({ dockPosition: 'bottom' })
  })

  it('creates parent directories as needed when writing', () => {
    expect(() => writeTerminalPanelPreference('right', prefPath)).not.toThrow()
    expect(readTerminalPanelPreference(prefPath)).toEqual({ dockPosition: 'right' })
  })

  it('falls back to the default when the file contains invalid JSON', () => {
    mkdirSync(join(dir, 'nested'), { recursive: true })
    writeFileSync(prefPath, '{not json')
    expect(readTerminalPanelPreference(prefPath)).toEqual({ dockPosition: 'right' })
  })

  it('falls back to the default when the file contains an invalid dockPosition value', () => {
    mkdirSync(join(dir, 'nested'), { recursive: true })
    writeFileSync(prefPath, JSON.stringify({ dockPosition: 'top' }))
    expect(readTerminalPanelPreference(prefPath)).toEqual({ dockPosition: 'right' })
  })

  it('falls back to the default when the file is unreadable (e.g. missing parent directory)', () => {
    expect(readTerminalPanelPreference(join(dir, 'does-not-exist', 'terminal-panel-preference.json'))).toEqual({
      dockPosition: 'right',
    })
  })
})
