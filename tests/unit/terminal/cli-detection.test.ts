import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, delimiter } from 'node:path'
import { tmpdir } from 'node:os'

// T035 (US4): PATH-based CLI detection, used by src/handlers/terminal.ts's pre-flight check
// (FR-010) and the /api/terminal/capabilities endpoint.
// 034-patch-bugfixes/US2: detectCapabilities() also falls back to a login-shell probe
// (execFileSync) when the raw PATH walk misses, since the server process doesn't inherit
// shell-profile-sourced PATH extensions (nvm, ~/.zshrc exports, etc.).

const execFileSyncMock = vi.fn()
vi.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => execFileSyncMock(...args),
}))

// Lets the detectCapabilities tests force the raw PATH walk to always miss, deterministically
// exercising the login-shell fallback regardless of this environment's real PATH contents.
let forceAccessSyncMiss = false
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    accessSync: (...args: Parameters<typeof actual.accessSync>) => {
      if (forceAccessSyncMiss) throw new Error('ENOENT')
      return actual.accessSync(...args)
    },
  }
})

const { isPtySupported, isCliAvailable, detectCapabilities } = await import('../../../src/terminal/cli-detection.js')

describe('isPtySupported', () => {
  it('recognizes the platforms node-pty ships prebuilds for', () => {
    expect(isPtySupported('darwin')).toBe(true)
    expect(isPtySupported('linux')).toBe(true)
    expect(isPtySupported('win32')).toBe(true)
  })

  it('rejects unsupported platforms', () => {
    expect(isPtySupported('aix')).toBe(false)
  })
})

describe('isCliAvailable', () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gitlocal-cli-detect-test-'))
    writeFileSync(join(dir, 'mytool'), '#!/bin/sh\n')
    chmodSync(join(dir, 'mytool'), 0o755)
    writeFileSync(join(dir, 'notexecutable'), '#!/bin/sh\n')
    chmodSync(join(dir, 'notexecutable'), 0o644)
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('finds an executable command on PATH', () => {
    expect(isCliAvailable('mytool', dir, 'linux')).toBe(true)
  })

  it('returns false when the command is not on PATH', () => {
    expect(isCliAvailable('does-not-exist', dir, 'linux')).toBe(false)
  })

  it('returns false for a file on PATH that is not executable', () => {
    expect(isCliAvailable('notexecutable', dir, 'linux')).toBe(false)
  })

  it('skips empty PATH segments and keeps searching later directories', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'gitlocal-cli-detect-empty-'))
    try {
      const pathEnv = ['', emptyDir, dir].join(delimiter)
      expect(isCliAvailable('mytool', pathEnv, 'linux')).toBe(true)
    } finally {
      rmSync(emptyDir, { recursive: true, force: true })
    }
  })

  it('checks Windows-style command suffixes on win32', () => {
    const winDir = mkdtempSync(join(tmpdir(), 'gitlocal-cli-detect-win-'))
    try {
      writeFileSync(join(winDir, 'mytool.exe'), '')
      chmodSync(join(winDir, 'mytool.exe'), 0o755)
      expect(isCliAvailable('mytool', winDir, 'win32')).toBe(true)
      expect(isCliAvailable('missing', winDir, 'win32')).toBe(false)
    } finally {
      rmSync(winDir, { recursive: true, force: true })
    }
  })

  it('defaults to process.env.PATH and process.platform when not given explicit overrides', () => {
    expect(typeof isCliAvailable('definitely-not-a-real-cli-xyz')).toBe('boolean')
  })

  it('falls back to an empty PATH when process.env.PATH is unset', () => {
    const originalPath = process.env.PATH
    delete process.env.PATH
    try {
      expect(isCliAvailable('definitely-not-a-real-cli-xyz')).toBe(false)
    } finally {
      if (originalPath !== undefined) process.env.PATH = originalPath
    }
  })
})

describe('detectCapabilities', () => {
  beforeEach(() => {
    forceAccessSyncMiss = true
    execFileSyncMock.mockReset()
    execFileSyncMock.mockImplementation(() => {
      throw new Error('command not found')
    })
  })

  afterEach(() => {
    forceAccessSyncMiss = false
  })

  it('reports pty support alongside claude/codex CLI availability', () => {
    const capabilities = detectCapabilities()
    expect(capabilities).toEqual({
      available: isPtySupported(),
      claudeCliFound: expect.any(Boolean),
      codexCliFound: expect.any(Boolean),
    })
  })

  it('falls back to a login-shell probe when the raw PATH walk misses the CLI (US2)', () => {
    execFileSyncMock.mockImplementation((_shell, args) => {
      const probe = String(args?.[1] ?? '')
      if (probe.includes('claude')) return Buffer.from('/opt/nvm/bin/claude\n')
      throw new Error('command not found')
    })

    const capabilities = detectCapabilities()

    expect(capabilities.claudeCliFound).toBe(true)
    expect(execFileSyncMock).toHaveBeenCalled()
  })

  it('reports codex as found via the same login-shell fallback (FR-002 acceptance scenario 2)', () => {
    execFileSyncMock.mockImplementation((_shell, args) => {
      const probe = String(args?.[1] ?? '')
      if (probe.includes('codex')) return Buffer.from('/opt/nvm/bin/codex\n')
      throw new Error('command not found')
    })

    expect(detectCapabilities().codexCliFound).toBe(true)
  })

  it('fails closed when the login-shell probe throws (no false positive, FR-003)', () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('command not found')
    })

    const capabilities = detectCapabilities()

    expect(capabilities.claudeCliFound).toBe(false)
    expect(capabilities.codexCliFound).toBe(false)
  })

  it('fails closed when the login-shell probe times out', () => {
    execFileSyncMock.mockImplementation(() => {
      const error = new Error('ETIMEDOUT') as Error & { code?: string }
      error.code = 'ETIMEDOUT'
      throw error
    })

    expect(detectCapabilities().claudeCliFound).toBe(false)
  })
})
