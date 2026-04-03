import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { chdir } from 'node:process'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { createApp, getRepoPath, setRepoPath } from '../../src/server.js'

const APP_VERSION = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as { version: string }

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-int-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir })
  writeFileSync(join(dir, 'README.md'), '# Integration Test')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('Server integration', () => {
  let dir: string
  let repoCleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    repoCleanup = repo.cleanup
  })

  afterAll(() => {
    repoCleanup?.()
  })

  it('GET /api/info returns 200 JSON', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/info'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json() as { isGitRepo: boolean; version: string }
    expect(body.isGitRepo).toBe(true)
    expect(body.version).toBe(APP_VERSION.version)
  })

  it('GET / returns 200 HTML (SPA index)', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/'))
    expect(res.status).toBe(200)
  })

  it('GET /api/branches returns array', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/branches'))
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
  })

  it('GET /unknown-path returns index.html SPA fallback', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/some/spa/route'))
    expect(res.status).toBe(200)
  })

  it('GET /api/pick/browse returns folder metadata for picker mode', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/pick/browse'))
    expect(res.status).toBe(200)
    const body = await res.json() as { currentPath: string; entries: unknown[] }
    expect(body.currentPath).toBe(process.cwd())
    expect(Array.isArray(body.entries)).toBe(true)
  })

  it('GET /api/info enters picker mode when launched with a non-git folder', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'gitlocal-non-git-'))
    try {
      const app = createApp(nonGitDir)
      const res = await app.fetch(new Request('http://localhost/api/info'))
      expect(res.status).toBe(200)
      const body = await res.json() as { pickerMode: boolean; path: string; isGitRepo: boolean; version: string }
      expect(body.pickerMode).toBe(true)
      expect(body.isGitRepo).toBe(false)
      expect(body.path).toBe(nonGitDir)
      expect(body.version).toBe(APP_VERSION.version)
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('POST /api/pick/parent switches a repo view to the parent-folder picker', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/pick/parent', {
      method: 'POST',
    }))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)

    const infoRes = await app.fetch(new Request('http://localhost/api/info'))
    const infoBody = await infoRes.json() as { pickerMode: boolean; path: string }
    expect(infoBody.pickerMode).toBe(true)
    expect(infoBody.path).toBe(dirname(dir))
  })

  it('POST /api/pick updates repo path', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/pick', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: dir }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('GET /api/sync returns sync metadata for the current file path', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/sync?path=README.md'))
    expect(res.status).toBe(200)
    const body = await res.json() as { currentPath: string; workingTreeRevision: string }
    expect(body.currentPath).toBe('README.md')
    expect(body.workingTreeRevision).toBeTruthy()
  })

  it('GET /api/sync respects an explicitly requested branch', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/sync?branch=main'))
    expect(res.status).toBe(200)
    const body = await res.json() as { branch: string }
    expect(body.branch).toBe('main')
  })

  it('GET /api/sync handles missing repositories safely', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/sync'))
    expect(res.status).toBe(200)
    const body = await res.json() as { repoPath: string; fileStatus: string }
    expect(body.repoPath).toBe('')
    expect(body.fileStatus).toBe('unavailable')
  })
})

describe('Server startup path detection', () => {
  let originalCwd: string
  let dir: string
  let repoCleanup: () => void

  beforeAll(() => {
    originalCwd = process.cwd()
    const repo = makeGitRepo()
    dir = repo.dir
    repoCleanup = repo.cleanup
  })

  afterAll(() => {
    chdir(originalCwd)
    repoCleanup?.()
  })

  it('opens the current working directory as a repo when launched without an explicit path', async () => {
    chdir(dir)
    const app = createApp('', { detectCurrentRepoOnEmptyPath: true })
    const res = await app.fetch(new Request('http://localhost/api/info'))
    expect(res.status).toBe(200)
    const body = await res.json() as { pickerMode: boolean; isGitRepo: boolean; path: string }
    expect(body.pickerMode).toBe(false)
    expect(body.isGitRepo).toBe(true)
    expect(realpathSync(body.path)).toBe(realpathSync(dir))
  })
})

describe('getRepoPath / setRepoPath', () => {
  it('setRepoPath updates the value returned by getRepoPath', () => {
    setRepoPath('/tmp/test-repo')
    expect(getRepoPath()).toBe('/tmp/test-repo')
    setRepoPath('')
  })
})
