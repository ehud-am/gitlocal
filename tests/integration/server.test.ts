import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { serve } from '@hono/node-server'
import { createApp, getRepoPath, setRepoPath } from '../../src/server.js'

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
  let serverClose: () => void
  let baseUrl: string

  beforeAll(async () => {
    const repo = makeGitRepo()
    dir = repo.dir
    repoCleanup = repo.cleanup

    const app = createApp(dir)
    await new Promise<void>((resolve) => {
      const server = serve({ fetch: app.fetch, port: 0 }, (info) => {
        baseUrl = `http://localhost:${info.port}`
        resolve()
      })
      serverClose = () => server.close()
    })
  })

  afterAll(() => {
    serverClose?.()
    repoCleanup?.()
  })

  it('GET /api/info returns 200 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/info`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json() as { isGitRepo: boolean }
    expect(body.isGitRepo).toBe(true)
  })

  it('GET / returns 200 HTML (SPA index)', async () => {
    const res = await fetch(`${baseUrl}/`)
    expect(res.status).toBe(200)
  })

  it('GET /api/branches returns array', async () => {
    const res = await fetch(`${baseUrl}/api/branches`)
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
  })

  it('GET /unknown-path returns index.html SPA fallback', async () => {
    const res = await fetch(`${baseUrl}/some/spa/route`)
    expect(res.status).toBe(200)
  })

  it('POST /api/pick updates repo path', async () => {
    const res = await fetch(`${baseUrl}/api/pick`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: dir }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})

describe('getRepoPath / setRepoPath', () => {
  it('setRepoPath updates the value returned by getRepoPath', () => {
    setRepoPath('/tmp/test-repo')
    expect(getRepoPath()).toBe('/tmp/test-repo')
    setRepoPath('')
  })
})
