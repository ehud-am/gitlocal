import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, delimiter } from 'node:path'
import { tmpdir } from 'node:os'
import { isPtySupported, isCliAvailable, detectCapabilities } from '../../../src/terminal/cli-detection.js'

// Coverage-closing tests for already-implemented Foundational code: this file's dedicated test
// task (T035) is scoped to a later phase (US4) not yet authorized, but the project's global
// coverage gate applies to every src file regardless of phase, so these keep `npm test` green
// in the meantime without implementing any later-phase feature.

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
  it('reports pty support alongside claude/codex CLI availability', () => {
    const capabilities = detectCapabilities()
    expect(capabilities).toEqual({
      available: isPtySupported(),
      claudeCliFound: expect.any(Boolean),
      codexCliFound: expect.any(Boolean),
    })
  })
})
