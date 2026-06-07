import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  getLinuxDocumentsPath,
  readStartupFolderPreference,
  rememberStartupFolder,
  resolveStartupFolder,
  writeStartupFolderPreference,
} from '../../../src/services/startup-preferences.js'

describe('startup preferences', () => {
  it('uses a configured Linux documents path when provided', () => {
    expect(getLinuxDocumentsPath('/home/user', { XDG_DOCUMENTS_DIR: '~/Docs' })).toBe('/home/user/Docs')
  })

  it('uses the home Documents folder when no Linux XDG path is configured', () => {
    expect(getLinuxDocumentsPath('/home/user', {})).toBe('/home/user/Documents')
  })

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

  it('reports an unavailable explicit path without falling back to remembered state', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-explicit-missing-home-'))
    const remembered = mkdtempSync(join(tmpdir(), 'gitlocal-startup-explicit-missing-remembered-'))
    const prefPath = join(home, 'pref.json')
    const missing = join(home, 'missing')
    writeStartupFolderPreference(remembered, 'picker-open', prefPath)

    try {
      const resolution = resolveStartupFolder({ explicitPath: missing, preferencePath: prefPath, homePath: home })
      expect(resolution.source).toBe('explicit')
      expect(resolution.path).toBe(missing)
      expect(resolution.exists).toBe(false)
      expect(resolution.fallbackReason).toBe('Explicit folder is unavailable.')
    } finally {
      rmSync(home, { recursive: true, force: true })
      rmSync(remembered, { recursive: true, force: true })
    }
  })

  it('uses the platform Documents folder when there is no remembered folder', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-documents-home-'))
    const documents = join(home, 'Documents')
    mkdirSync(documents)

    try {
      const resolution = resolveStartupFolder({ preferencePath: join(home, 'missing-pref.json'), homePath: home })
      expect(resolution.source).toBe('platform-default')
      expect(resolution.path).toBe(realpathSync(documents))
      expect(resolution.fallbackReason).toBe('')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('falls back to home when remembered and documents folders are unavailable', () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-home-'))
    const prefPath = join(home, 'pref.json')
    writeFileSync(prefPath, JSON.stringify({ path: join(home, 'missing'), openedAt: new Date().toISOString(), source: 'repo-open' }))

    try {
      const resolution = resolveStartupFolder({
        preferencePath: prefPath,
        homePath: home,
        env: { XDG_DOCUMENTS_DIR: join(home, 'missing-documents') },
      })
      expect(resolution.source).toBe('home-fallback')
      expect(resolution.path).toBe(realpathSync(home))
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
})
