import { describe, expect, it } from 'vitest'
import { chmodSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { platform, tmpdir } from 'node:os'
import {
  readDefaultReaderPreference,
  readStartupFolderPreference,
  rememberStartupFolder,
  resolveOsDefaultLocation,
  resolveStartupFolder,
  writeDefaultReaderPreference,
  writeStartupFolderPreference,
} from '../../../src/services/startup-preferences.js'

describe('startup preferences', () => {
  it('prefers explicit paths over remembered paths and defaults', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-startup-explicit-'))
    const remembered = mkdtempSync(join(tmpdir(), 'gitlocal-startup-remembered-'))
    const prefPath = join(dir, 'pref.json')
    writeStartupFolderPreference(remembered, 'picker-open', prefPath)

    try {
      const resolution = resolveStartupFolder({ explicitPath: dir, preferencePath: prefPath, homePath: dir })
      expect(resolution.source).toBe('explicit')
      expect(resolution.path).toBe(realpathSync(dir))
      expect(resolution.lastUsedPath).toBe(realpathSync(remembered))
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(remembered, { recursive: true, force: true })
    }
  })

  it('reopens a remembered folder when no explicit path is provided', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-startup-last-'))
    const prefPath = join(dir, 'pref.json')
    writeStartupFolderPreference(dir, 'repo-open', prefPath)

    try {
      expect(resolveStartupFolder({ preferencePath: prefPath, homePath: dir }).source).toBe('last-used')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('distinguishes why a remembered folder is unavailable when falling back to the OS default (deleted vs. permission-denied)', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-last-used-gone-'))
    const prefPath = join(home, 'pref.json')

    // Case 1: remembered folder was deleted entirely.
    const deletedRemembered = mkdtempSync(join(tmpdir(), 'gitlocal-startup-deleted-'))
    writeStartupFolderPreference(deletedRemembered, 'repo-open', prefPath)
    rmSync(deletedRemembered, { recursive: true, force: true })

    try {
      const resolution = resolveStartupFolder({ preferencePath: prefPath, homePath: home })
      expect(resolution.source).toBe('os-default')
      expect(resolution.path).toBe(realpathSync(home))
      expect(resolution.fallbackReason).toBe('Last used folder no longer exists. Opened a default location instead.')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('reports a permission-denied reason distinctly when the remembered folder still exists but cannot be read', () => {
    if (process.platform === 'win32') return // chmod-based permission denial is not meaningful on Windows

    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-last-used-denied-'))
    const prefPath = join(home, 'pref.json')
    const remembered = mkdtempSync(join(tmpdir(), 'gitlocal-startup-denied-'))
    writeStartupFolderPreference(remembered, 'repo-open', prefPath)
    chmodSync(remembered, 0o000)

    try {
      const resolution = resolveStartupFolder({ preferencePath: prefPath, homePath: home })
      expect(resolution.source).toBe('os-default')
      expect(resolution.fallbackReason).toBe('Last used folder is no longer accessible (permission denied). Opened a default location instead.')
    } finally {
      chmodSync(remembered, 0o755)
      rmSync(home, { recursive: true, force: true })
      rmSync(remembered, { recursive: true, force: true })
    }
  })

  it('falls back to the OS default when an explicit path does not exist, without reporting the remembered folder as the problem', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-explicit-missing-home-'))
    const remembered = mkdtempSync(join(tmpdir(), 'gitlocal-startup-explicit-missing-remembered-'))
    const prefPath = join(home, 'pref.json')
    const missing = join(home, 'missing')
    writeStartupFolderPreference(remembered, 'picker-open', prefPath)

    try {
      const resolution = resolveStartupFolder({ explicitPath: missing, preferencePath: prefPath, homePath: home })
      expect(resolution.source).toBe('os-default')
      expect(resolution.path).toBe(realpathSync(home))
      expect(resolution.exists).toBe(true)
      expect(resolution.lastUsedPath).toBe(realpathSync(remembered))
      expect(resolution.fallbackReason).toBe('Explicit folder is unavailable — opened a default location instead.')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(remembered, { recursive: true, force: true })
    }
  })

  it('treats an existing-but-unlistable directory as unreadable rather than trusting stat alone', () => {
    if (platform() === 'win32') return // chmod-based permission denial is not meaningful on Windows

    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-unreadable-home-'))
    const unreadable = mkdtempSync(join(tmpdir(), 'gitlocal-startup-unreadable-'))
    chmodSync(unreadable, 0o000)

    try {
      const resolution = resolveStartupFolder({ explicitPath: unreadable, preferencePath: join(home, 'missing-pref.json'), homePath: home })
      // Passes existsSync + statSync().isDirectory() but fails an actual read attempt —
      // FR-006 requires this to be rejected as unreadable, not silently accepted.
      expect(resolution.source).toBe('os-default')
      expect(resolution.fallbackReason).toBe('Explicit folder is unavailable — opened a default location instead.')
    } finally {
      chmodSync(unreadable, 0o755)
      rmSync(home, { recursive: true, force: true })
      rmSync(unreadable, { recursive: true, force: true })
    }
  })

  it('uses the home directory when there is no remembered folder', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-home-only-'))

    try {
      const resolution = resolveStartupFolder({ preferencePath: join(home, 'missing-pref.json'), homePath: home })
      expect(resolution.source).toBe('os-default')
      expect(resolution.path).toBe(realpathSync(home))
      expect(resolution.fallbackReason).toBe('')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('falls back to the filesystem root when the home directory itself is unavailable', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-home-missing-'))
    const missingHome = join(home, 'no-such-home')

    try {
      const resolution = resolveStartupFolder({ preferencePath: join(home, 'missing-pref.json'), homePath: missingHome })
      // Home is unavailable, so resolution falls through to the filesystem root — the single
      // remaining rung of the OS-default fallback — rather than trying Documents/cwd/tmp first.
      const fallback = resolveOsDefaultLocation(missingHome)
      expect(resolution.source).toBe('os-default')
      expect(resolution.path).toBe(fallback.path)
      expect(resolution.exists).toBe(fallback.readable)
      expect(resolution.readable).toBe(fallback.readable)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('resolveOsDefaultLocation returns the home directory when it is readable', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-os-default-home-'))
    try {
      const fallback = resolveOsDefaultLocation(home)
      expect(fallback).toEqual({ path: realpathSync(home), readable: true })
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('resolveOsDefaultLocation falls through to the filesystem root when home is unreadable', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-os-default-missing-'))
    const missingHome = join(home, 'no-such-home')

    try {
      const fallback = resolveOsDefaultLocation(missingHome)
      expect(fallback.readable).toBe(true)
      expect(fallback.path).not.toBe(missingHome)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('ignores invalid preference files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-startup-invalid-'))
    const prefPath = join(dir, 'pref.json')
    writeFileSync(prefPath, '{bad-json')

    try {
      expect(readStartupFolderPreference(prefPath)).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('ignores preference files missing required fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-startup-incomplete-'))
    const prefPath = join(dir, 'pref.json')
    writeFileSync(prefPath, JSON.stringify({ path: dir }))

    try {
      expect(readStartupFolderPreference(prefPath)).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('throws when writing an unavailable startup folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-startup-unavailable-'))
    try {
      expect(() => writeStartupFolderPreference(join(dir, 'missing'), 'repo-open', join(dir, 'pref.json')))
        .toThrow(/startup folder is not available/i)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not throw when remembering an unavailable folder fails', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-startup-remember-fail-'))
    const previousPreferencePath = process.env.GITLOCAL_STARTUP_PREFERENCE_PATH
    process.env.GITLOCAL_STARTUP_PREFERENCE_PATH = join(dir, 'pref.json')

    try {
      expect(() => rememberStartupFolder(join(dir, 'missing'), 'picker-open')).not.toThrow()
    } finally {
      if (previousPreferencePath === undefined) {
        delete process.env.GITLOCAL_STARTUP_PREFERENCE_PATH
      } else {
        process.env.GITLOCAL_STARTUP_PREFERENCE_PATH = previousPreferencePath
      }
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns a not-asked default-reader preference when none is stored', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-default-reader-empty-'))
    try {
      expect(readDefaultReaderPreference(join(dir, 'missing.json'))).toEqual({
        status: 'not-asked',
        askedAt: '',
        answeredAt: '',
        message: '',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('writes and reads default-reader prompt decisions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-default-reader-write-'))
    const prefPath = join(dir, 'default-reader.json')

    try {
      const preference = writeDefaultReaderPreference({
        status: 'declined',
        askedAt: '2026-07-05T12:00:00.000Z',
        answeredAt: '2026-07-05T12:01:00.000Z',
        message: 'Not now.',
      }, prefPath)

      expect(preference).toEqual({
        status: 'declined',
        askedAt: '2026-07-05T12:00:00.000Z',
        answeredAt: '2026-07-05T12:01:00.000Z',
        message: 'Not now.',
      })
      expect(readDefaultReaderPreference(prefPath)).toEqual(preference)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('normalizes invalid default-reader state and fills missing timestamps', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-default-reader-normalize-'))
    const prefPath = join(dir, 'default-reader.json')

    try {
      writeFileSync(prefPath, JSON.stringify({
        status: 'surprise',
        askedAt: 42,
        answeredAt: null,
        message: false,
      }))

      expect(readDefaultReaderPreference(prefPath)).toEqual({
        status: 'not-asked',
        askedAt: '',
        answeredAt: '',
        message: '',
      })

      const accepted = writeDefaultReaderPreference({ status: 'accepted' }, prefPath)
      expect(accepted.status).toBe('accepted')
      expect(accepted.askedAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
      expect(accepted.answeredAt).toMatch(/\d{4}-\d{2}-\d{2}T/)

      const reset = writeDefaultReaderPreference({ status: 'not-asked', message: 'Reset.' }, prefPath)
      expect(reset).toMatchObject({
        status: 'not-asked',
        answeredAt: '',
        message: 'Reset.',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
