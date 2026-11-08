import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, platform, tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../../../src/server.js'
import { completePath, PATH_COMPLETION_LIMIT } from '../../../src/handlers/path-complete.js'

describe('completePath', () => {
  let root: string

  beforeAll(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'gitlocal-complete-')))
    mkdirSync(join(root, 'docs'))
    mkdirSync(join(root, 'Downloads'))
    mkdirSync(join(root, '.git'))
    mkdirSync(join(root, '.config'))
    writeFileSync(join(root, 'docs', 'guide.md'), 'g')
    writeFileSync(join(root, 'docs', 'api.md'), 'a')
    writeFileSync(join(root, 'data.csv'), 'x')
    if (platform() !== 'win32') {
      symlinkSync(join(root, 'docs'), join(root, 'docs-link'))
      symlinkSync(join(root, 'missing-target'), join(root, 'dangling-link'))
    }
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('lists folders first, then files, matching a case-insensitive prefix relative to the base', () => {
    const names = completePath('d', root).map((item) => `${item.type}:${item.value}`)
    expect(names.slice(0, 2)).toEqual(['dir:docs/', 'dir:docs-link/'].filter((name) => platform() !== 'win32' || !name.includes('link')))
    expect(names).toContain('dir:Downloads/')
    expect(names).toContain('file:data.csv')
    expect(names.indexOf('file:data.csv')).toBeGreaterThan(names.indexOf('dir:Downloads/'))
  })

  it('lists the contents of a typed folder and keeps the typed part verbatim', () => {
    expect(completePath('docs/', root).map((item) => item.value)).toEqual(['docs/api.md', 'docs/guide.md'])
    expect(completePath('./docs/g', root)).toEqual([{ value: './docs/guide.md', name: 'guide.md', type: 'file' }])
  })

  it('completes absolute paths regardless of the base', () => {
    expect(completePath(`${root}/docs/a`, '/')).toEqual([{ value: `${root}/docs/api.md`, name: 'api.md', type: 'file' }])
  })

  it('expands ~ to the home folder and offers ~/ for a bare ~', () => {
    expect(completePath('~', root)).toEqual([{ value: '~/', name: '~', type: 'dir' }])
    const suggestions = completePath('~/', root)
    for (const suggestion of suggestions) expect(suggestion.value.startsWith('~/')).toBe(true)
    expect(homedir()).toBeTruthy()
  })

  it('hides dotfiles unless the prefix starts with a dot, and never offers .git', () => {
    expect(completePath('', root).some((item) => item.name.startsWith('.'))).toBe(false)
    expect(completePath('.', root).map((item) => item.name)).toEqual(['.config'])
  })

  it('returns nothing for a folder that cannot be listed', () => {
    expect(completePath('no-such-folder/', root)).toEqual([])
    expect(completePath('data.csv/', root)).toEqual([])
  })

  it('caps the number of suggestions', () => {
    const many = mkdtempSync(join(tmpdir(), 'gitlocal-complete-many-'))
    try {
      for (let index = 0; index < PATH_COMPLETION_LIMIT + 5; index += 1) writeFileSync(join(many, `f${index}.txt`), '')
      expect(completePath('', many)).toHaveLength(PATH_COMPLETION_LIMIT)
    } finally {
      rmSync(many, { recursive: true, force: true })
    }
  })

  it('treats a dangling symlink as a file', () => {
    if (platform() === 'win32') return
    expect(completePath('dangling', root)).toEqual([{ value: 'dangling-link', name: 'dangling-link', type: 'file' }])
  })

  it('serves completions relative to the open root over HTTP', async () => {
    const app = createApp(root)
    const res = await app.fetch(new Request('http://localhost/api/path/complete?input=docs/g'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ suggestions: [{ value: 'docs/guide.md', name: 'guide.md', type: 'file' }] })
  })

  it('falls back to the picker folder, then home, when no root is open', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/path/complete'))
    expect(res.status).toBe(200)
    const body = await res.json() as { suggestions: unknown[] }
    expect(Array.isArray(body.suggestions)).toBe(true)
  })
})
