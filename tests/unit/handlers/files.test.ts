import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp } from '../../../src/server.js'

function makeGitRepo(): { dir: string; branch: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-files-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir })

  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'README.md'), '# Hello')
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const x = 1')
  // Simulate a small PNG (valid 1x1 pixel PNG bytes)
  const pngBytes = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
    'hex',
  )
  writeFileSync(join(dir, 'logo.png'), pngBytes)

  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  spawnSync('git', ['checkout', '-b', 'feature-files'], { cwd: dir })
  writeFileSync(join(dir, 'feature.txt'), 'feature branch file')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'feature'], { cwd: dir })
  spawnSync('git', ['checkout', '-'], { cwd: dir })

  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: dir, encoding: 'utf-8',
  }).stdout.trim()

  return { dir, branch, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('treeHandler', () => {
  let dir: string
  let branch: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    branch = repo.branch
    cleanup = repo.cleanup
  })
  afterAll(() => cleanup())

  it('returns sorted array with dirs first', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.tree.$get({ query: { path: '', branch } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    const types = body.map((n: { type: string }) => n.type)
    const firstFile = types.indexOf('file')
    const lastDir = types.lastIndexOf('dir')
    if (lastDir >= 0 && firstFile >= 0) {
      expect(lastDir).toBeLessThan(firstFile)
    }
  })

  it('returns entries for root path', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.tree.$get({ query: { path: '', branch } })
    const body = await res.json()
    const names = body.map((n: { name: string }) => n.name)
    expect(names).toContain('src')
    expect(names).toContain('README.md')
  })

  it('uses default path and branch when params are absent', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/tree'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('reads a non-current branch tree through git data', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.tree.$get({ query: { path: '', branch: 'feature-files' } })
    const body = await res.json()
    expect(body.some((node: { name: string }) => node.name === 'feature.txt')).toBe(true)
  })

  it('excludes untracked files from the current branch tree', async () => {
    writeFileSync(join(dir, 'local-only.txt'), 'draft')
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.tree.$get({ query: { path: '', branch } })
    const body = await res.json()
    expect(body.some((node: { name: string }) => node.name === 'local-only.txt')).toBe(false)
  })
})

describe('treeHandler — empty repoPath', () => {
  it('returns empty array when no repo loaded', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.tree.$get({ query: { path: '', branch: 'main' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})

describe('fileHandler — error cases', () => {
  it('returns 400 when path is missing', async () => {
    const { dir, cleanup } = (() => {
      const d = mkdtempSync(join(tmpdir(), 'gf-err-'))
      spawnSync('git', ['init'], { cwd: d })
      spawnSync('git', ['config', 'user.email', 'x@x.com'], { cwd: d })
      spawnSync('git', ['config', 'user.name', 'X'], { cwd: d })
      writeFileSync(join(d, 'f.ts'), '')
      spawnSync('git', ['add', '.'], { cwd: d })
      spawnSync('git', ['commit', '-m', 'i'], { cwd: d })
      const b = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: d, encoding: 'utf-8' }).stdout.trim()
      return { dir: d, branch: b, cleanup: () => rmSync(d, { recursive: true, force: true }) }
    })()
    try {
      const app = createApp(dir)
      const client = testClient(app)
      const res = await client.api.file.$get({ query: { path: '', branch: 'main' } })
      expect(res.status).toBe(400)
    } finally {
      cleanup()
    }
  })

  it('returns empty content for binary files', async () => {
    const dir2 = mkdtempSync(join(tmpdir(), 'gf-bin-'))
    spawnSync('git', ['init'], { cwd: dir2 })
    spawnSync('git', ['config', 'user.email', 'x@x.com'], { cwd: dir2 })
    spawnSync('git', ['config', 'user.name', 'X'], { cwd: dir2 })
    writeFileSync(join(dir2, 'app.exe'), Buffer.from([0x4d, 0x5a, 0x00]))
    spawnSync('git', ['add', '.'], { cwd: dir2 })
    spawnSync('git', ['commit', '-m', 'i'], { cwd: dir2 })
    const branch2 = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir2, encoding: 'utf-8' }).stdout.trim()
    try {
      const app = createApp(dir2)
      const client = testClient(app)
      const res = await client.api.file.$get({ query: { path: 'app.exe', branch: branch2 } })
      const body = await res.json()
      expect(body.type).toBe('binary')
      expect(body.content).toBe('')
      expect(body.encoding).toBe('none')
    } finally {
      rmSync(dir2, { recursive: true, force: true })
    }
  })

  it('returns 400 when no repo loaded', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'README.md', branch: 'main' } })
    expect(res.status).toBe(400)
  })
})

describe('fileHandler — 404 and error cases', () => {
  let dir: string
  let branch: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    branch = repo.branch
    cleanup = repo.cleanup
  })
  afterAll(() => cleanup())

  it('returns 404 when file does not exist in repo', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'nonexistent.ts', branch } })
    expect(res.status).toBe(404)
  })

  it('returns 404 for untracked files in the current branch', async () => {
    writeFileSync(join(dir, 'scratch.txt'), 'local-only')
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'scratch.txt', branch } })
    expect(res.status).toBe(404)
  })
})

describe('fileHandler', () => {
  let dir: string
  let branch: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    branch = repo.branch
    cleanup = repo.cleanup
  })
  afterAll(() => cleanup())

  it('returns markdown type for .md files', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'README.md', branch } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('markdown')
    expect(body.encoding).toBe('utf-8')
    expect(body.content).toContain('Hello')
  })

  it('returns text type with language for .ts files', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'src/index.ts', branch } })
    const body = await res.json()
    expect(body.type).toBe('text')
    expect(body.language).toBe('typescript')
  })

  it('returns image type with base64 encoding for .png files', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'logo.png', branch } })
    const body = await res.json()
    expect(body.type).toBe('image')
    expect(body.encoding).toBe('base64')
    expect(body.content.length).toBeGreaterThan(0)
  })

  it('reads file content from a non-current branch through git cat-file', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'feature.txt', branch: 'feature-files' } })
    const body = await res.json()
    expect(body.content).toContain('feature branch file')
  })

  it('uses HEAD branch and empty path when params are absent', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/file'))
    expect(res.status).toBe(400)
  })

  it('returns 404 for a missing file in a non-current branch', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'missing.txt', branch: 'feature-files' } })
    expect(res.status).toBe(404)
  })
})
