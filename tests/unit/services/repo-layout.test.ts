import { describe, expect, it } from 'vitest'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { platform, tmpdir } from 'node:os'
import { readRepoLayout, writeRepoLayout } from '../../../src/services/repo-layout.js'

const DEFAULT_LAYOUT = { branch: null, path: null, pathType: 'none' as const, raw: false }

describe('repo layout service', () => {
  it('returns defaults when no .gitlocal/.layout exists yet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-missing-'))
    try {
      expect(readRepoLayout(dir)).toEqual(DEFAULT_LAYOUT)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('writes and reads back a full roundtrip', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-roundtrip-'))
    try {
      const layout = { branch: 'main', path: 'docs/guide.md', pathType: 'file' as const, raw: true }
      writeRepoLayout(dir, layout)
      expect(readRepoLayout(dir)).toEqual(layout)

      const written = readFileSync(join(dir, '.gitlocal', '.layout'), 'utf-8')
      expect(written).toBe(`${JSON.stringify(layout, null, 2)}\n`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('creates the .gitlocal directory when it does not already exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-mkdir-'))
    try {
      writeRepoLayout(dir, { branch: null, path: 'README.md', pathType: 'file', raw: false })
      expect(readRepoLayout(dir).path).toBe('README.md')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('behaves identically for a plain non-git folder path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-nongit-'))
    try {
      expect(readRepoLayout(dir)).toEqual(DEFAULT_LAYOUT)
      const layout = { branch: null, path: 'notes.md', pathType: 'file' as const, raw: false }
      writeRepoLayout(dir, layout)
      expect(readRepoLayout(dir)).toEqual(layout)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('falls back to defaults for malformed JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-malformed-'))
    try {
      mkdirSync(join(dir, '.gitlocal'))
      writeFileSync(join(dir, '.gitlocal', '.layout'), '{bad-json')
      expect(readRepoLayout(dir)).toEqual(DEFAULT_LAYOUT)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('falls back to defaults for an empty file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-empty-'))
    try {
      mkdirSync(join(dir, '.gitlocal'))
      writeFileSync(join(dir, '.gitlocal', '.layout'), '')
      expect(readRepoLayout(dir)).toEqual(DEFAULT_LAYOUT)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('treats .gitlocal existing but .layout missing as defaults', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-dir-only-'))
    try {
      mkdirSync(join(dir, '.gitlocal'))
      expect(readRepoLayout(dir)).toEqual(DEFAULT_LAYOUT)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('ignores unrecognized fields without erroring', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-unknown-fields-'))
    try {
      mkdirSync(join(dir, '.gitlocal'))
      writeFileSync(join(dir, '.gitlocal', '.layout'), JSON.stringify({
        branch: 'main',
        path: 'README.md',
        pathType: 'file',
        raw: false,
        futureField: { nested: true },
        anotherFutureField: 'value',
      }))
      expect(readRepoLayout(dir)).toEqual({ branch: 'main', path: 'README.md', pathType: 'file', raw: false })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('normalizes an invalid pathType and non-string fields to safe defaults', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-invalid-fields-'))
    try {
      mkdirSync(join(dir, '.gitlocal'))
      writeFileSync(join(dir, '.gitlocal', '.layout'), JSON.stringify({
        branch: 42,
        path: false,
        pathType: 'bogus',
        raw: 'yes',
      }))
      expect(readRepoLayout(dir)).toEqual(DEFAULT_LAYOUT)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not throw when the .gitlocal location is unwritable', () => {
    if (platform() === 'win32') return // chmod-based permission denial is not meaningful on Windows

    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-layout-unwritable-'))
    chmodSync(dir, 0o500)

    try {
      expect(() => writeRepoLayout(dir, { branch: 'main', path: 'README.md', pathType: 'file', raw: false })).not.toThrow()
    } finally {
      chmodSync(dir, 0o755)
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
