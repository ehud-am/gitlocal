import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
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

  it('includes untracked files in the current branch tree', async () => {
    writeFileSync(join(dir, 'local-only.txt'), 'draft')
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.tree.$get({ query: { path: '', branch } })
    const body = await res.json()
    expect(body.some((node: { name: string }) => node.name === 'local-only.txt')).toBe(true)
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

  it('returns untracked files from the current branch', async () => {
    writeFileSync(join(dir, 'scratch.txt'), 'local-only')
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'scratch.txt', branch } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.content).toBe('local-only')
    expect(body.editable).toBe(true)
  })
})

describe('manual file operation handlers', () => {
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

  it('creates a new file through POST /api/file', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'notes/new-file.ts', content: 'export const created = true\n' }),
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe('created')

    const readRes = await app.fetch(new Request(`http://localhost/api/file?path=${encodeURIComponent('notes/new-file.ts')}&branch=${branch}`))
    const readBody = await readRes.json()
    expect(readBody.content).toContain('created = true')
  })

  it('updates a file through PUT /api/file with a matching revision token', async () => {
    const app = createApp(dir)
    const readRes = await app.fetch(new Request(`http://localhost/api/file?path=${encodeURIComponent('README.md')}&branch=${branch}`))
    const readBody = await readRes.json()

    const updateRes = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'README.md',
        content: '# Updated',
        revisionToken: readBody.revisionToken,
      }),
    }))

    expect(updateRes.status).toBe(200)
    const updateBody = await updateRes.json()
    expect(updateBody.status).toBe('updated')
  })

  it('rejects stale updates through PUT /api/file', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'README.md',
        content: '# stale',
        revisionToken: 'stale-token',
      }),
    }))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.status).toBe('conflict')
  })

  it('rejects creates with an empty path or non-string content', async () => {
    const app = createApp(dir)

    const missingPath = await app.fetch(new Request('http://localhost/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '', content: 'x' }),
    }))
    expect(missingPath.status).toBe(400)

    const badContent = await app.fetch(new Request('http://localhost/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'bad.json', content: 42 }),
    }))
    expect(badContent.status).toBe(400)

    const invalidJson = await app.fetch(new Request('http://localhost/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }))
    expect(invalidJson.status).toBe(400)
  })

  it('rejects creates for existing or escaped paths', async () => {
    const app = createApp(dir)

    const existing = await app.fetch(new Request('http://localhost/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'README.md', content: 'x' }),
    }))
    expect(existing.status).toBe(409)

    const escaped = await app.fetch(new Request('http://localhost/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '../escape.txt', content: 'x' }),
    }))
    expect(escaped.status).toBe(400)
  })

  it('deletes a file through DELETE /api/file with a matching revision token', async () => {
    writeFileSync(join(dir, 'delete-me.txt'), 'temporary')
    const app = createApp(dir)
    const readRes = await app.fetch(new Request(`http://localhost/api/file?path=${encodeURIComponent('delete-me.txt')}&branch=${branch}`))
    const readBody = await readRes.json()

    const deleteRes = await app.fetch(new Request('http://localhost/api/file', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'delete-me.txt',
        revisionToken: readBody.revisionToken,
      }),
    }))

    expect(deleteRes.status).toBe(200)
    const deleteBody = await deleteRes.json()
    expect(deleteBody.status).toBe('deleted')
  })

  it('rejects updates without required fields or for non-text files', async () => {
    const app = createApp(dir)

    const invalidJson = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }))
    expect(invalidJson.status).toBe(400)

    const missingPath = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '', content: '# missing', revisionToken: 'token' }),
    }))
    expect(missingPath.status).toBe(400)

    const missingContent = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'README.md' }),
    }))
    expect(missingContent.status).toBe(400)

    const missingToken = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'README.md', content: '# Updated again' }),
    }))
    expect(missingToken.status).toBe(409)

    const imageRead = await app.fetch(new Request(`http://localhost/api/file?path=${encodeURIComponent('logo.png')}&branch=${branch}`))
    const imageBody = await imageRead.json()
    const nonText = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'logo.png',
        content: 'nope',
        revisionToken: imageBody.revisionToken,
      }),
    }))
    expect(nonText.status).toBe(400)

    const missingFile = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'missing.txt',
        content: 'missing',
        revisionToken: 'token',
      }),
    }))
    expect(missingFile.status).toBe(404)
  })

  it('blocks updates and deletes on non-current branches', async () => {
    const app = createApp(dir)
    const readRes = await app.fetch(new Request(`http://localhost/api/file?path=${encodeURIComponent('README.md')}&branch=${branch}`))
    const readBody = await readRes.json()

    const updateRes = await app.fetch(new Request('http://localhost/api/file?branch=feature-files', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'README.md',
        content: '# blocked',
        revisionToken: readBody.revisionToken,
      }),
    }))
    expect(updateRes.status).toBe(409)

    const deleteRes = await app.fetch(new Request('http://localhost/api/file?branch=feature-files', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'README.md',
        revisionToken: readBody.revisionToken,
      }),
    }))
    expect(deleteRes.status).toBe(409)
  })

  it('rejects deletes without a revision token or for missing files', async () => {
    const app = createApp(dir)

    const invalidJson = await app.fetch(new Request('http://localhost/api/file', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }))
    expect(invalidJson.status).toBe(400)

    const missingPath = await app.fetch(new Request('http://localhost/api/file', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '', revisionToken: 'token' }),
    }))
    expect(missingPath.status).toBe(400)

    const missingToken = await app.fetch(new Request('http://localhost/api/file', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'README.md' }),
    }))
    expect(missingToken.status).toBe(409)

    const missingFile = await app.fetch(new Request('http://localhost/api/file', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'missing.md', revisionToken: 'missing-token' }),
    }))
    expect(missingFile.status).toBe(404)
  })

  it('rejects stale deletes and surfaces filesystem delete failures', async () => {
    writeFileSync(join(dir, 'locked.txt'), 'locked')
    const app = createApp(dir)
    const readRes = await app.fetch(new Request(`http://localhost/api/file?path=${encodeURIComponent('locked.txt')}&branch=${branch}`))
    const readBody = await readRes.json()

    const staleDelete = await app.fetch(new Request('http://localhost/api/file', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'locked.txt',
        revisionToken: 'stale-token',
      }),
    }))
    expect(staleDelete.status).toBe(409)

    chmodSync(dir, 0o500)
    try {
      const failedDelete = await app.fetch(new Request('http://localhost/api/file', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: 'locked.txt',
          revisionToken: readBody.revisionToken,
        }),
      }))
      expect(failedDelete.status).toBe(400)
    } finally {
      chmodSync(dir, 0o700)
      rmSync(join(dir, 'locked.txt'), { force: true })
    }
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
    expect(body.editable).toBe(true)
    expect(body.revisionToken).toBeTruthy()
  })

  it('returns text type with language for .ts files', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.file.$get({ query: { path: 'src/index.ts', branch } })
    const body = await res.json()
    expect(body.type).toBe('text')
    expect(body.language).toBe('typescript')
    expect(body.editable).toBe(true)
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
    expect(body.editable).toBe(false)
    expect(body.revisionToken).toBeNull()
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
