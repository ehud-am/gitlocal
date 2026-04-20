import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp, getPickerPath, getRepoPath } from '../../../src/server.js'

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-pick-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  writeFileSync(join(dir, 'README.md'), '# pick test')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('pickHandler', () => {
  let validDir: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    validDir = repo.dir
    cleanup = repo.cleanup
  })

  afterAll(() => cleanup())

  it('returns ok:true for a valid git repo path', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.pick.$post({ json: { path: validDir } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.error).toBe('')
  })

  it('returns ok:false for a non-existent path', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.pick.$post({ json: { path: '/nonexistent/path/xyz' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('updates server repoPath on success', async () => {
    const app = createApp('')
    const client = testClient(app)
    await client.api.pick.$post({ json: { path: validDir } })
    expect(getRepoPath()).toBe(validDir)
  })

  it('returns ok:false when path field is missing', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.pick.$post({ json: { path: '' } })
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('returns ok:false for invalid JSON body', async () => {
    const app = createApp('')
    const res = await app.fetch(
      new Request('http://localhost/api/pick', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-valid-json{{',
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toContain('Invalid JSON')
  })

  it('returns ok:false for a non-git directory', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'not-git-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.pick.$post({ json: { path: nonGitDir } })
      const body = await res.json()
      expect(body.ok).toBe(false)
      expect(body.error).toBeTruthy()
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('returns browse results when loading folders', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.pick.browse.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.currentPath).toBe(process.cwd())
    expect(Array.isArray(body.entries)).toBe(true)
    expect(Array.isArray(body.roots)).toBe(true)
    expect(body.canCreateChild).toBe(true)
    expect(body.canCloneIntoChild).toBe(true)
  })

  it('uses a non-git startup folder as the initial picker location', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'picker-start-'))
    try {
      const app = createApp(nonGitDir)
      const client = testClient(app)
      const res = await client.api.pick.browse.$get()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.currentPath).toBe(nonGitDir)
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('returns browse error details for a missing path', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.pick.browse.$get({
      query: { path: '/definitely/missing/path/xyz' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.entries).toEqual([])
    expect(body.error).toContain('Path does not exist')
  })

  it('returns an empty entry list when browse target is not a directory', async () => {
    const app = createApp('')
    const client = testClient(app)
    const filePath = join(validDir, 'README.md')
    const res = await client.api.pick.browse.$get({
      query: { path: filePath },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.currentPath).toBe(filePath)
    expect(body.entries).toEqual([])
    expect(body.error).toBe('')
    expect(body.canCreateChild).toBe(false)
    expect(body.canInitGit).toBe(false)
  })

  it('returns no parent path when browsing the filesystem root', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.pick.browse.$get({
      query: { path: '/' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.currentPath).toBe('/')
    expect(body.parentPath).toBeNull()
  })

  it('reports setup capabilities for git and non-git folders', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'pick-capabilities-'))
    try {
      let app = createApp('')
      let client = testClient(app)
      let res = await client.api.pick.browse.$get({ query: { path: validDir } })
      let body = await res.json()
      expect(body.isGitRepo).toBe(true)
      expect(body.canOpen).toBe(true)
      expect(body.canInitGit).toBe(false)

      app = createApp('')
      client = testClient(app)
      res = await client.api.pick.browse.$get({ query: { path: nonGitDir } })
      body = await res.json()
      expect(body.isGitRepo).toBe(false)
      expect(body.canOpen).toBe(false)
      expect(body.canInitGit).toBe(true)
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('switches from a repo view into picker mode at the parent folder', async () => {
    const app = createApp(validDir)
    const client = testClient(app)
    const res = await client.api.pick.parent.$post()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(getRepoPath()).toBe('')
    expect(getPickerPath()).toBe(dirname(validDir))
  })

  it('returns an error when asking for a parent picker without an open repo', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.pick.parent.$post()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain('No repository is currently open')
  })

  it('creates child folders from the setup routes', async () => {
    const parentDir = mkdtempSync(join(tmpdir(), 'pick-create-folder-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.pick['create-folder'].$post({
        json: { parentPath: parentDir, name: 'child' },
      })
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.path).toBe(join(parentDir, 'child'))

      const duplicate = await client.api.pick['create-folder'].$post({
        json: { parentPath: parentDir, name: 'child' },
      })
      expect((await duplicate.json()).error).toContain('already exists')

      const missingFields = await client.api.pick['create-folder'].$post({
        json: {} as { parentPath?: string; name?: string },
      })
      expect((await missingFields.json()).error).toContain('folder name is required')
    } finally {
      rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('initializes git repositories from the setup routes', async () => {
    const parentDir = mkdtempSync(join(tmpdir(), 'pick-init-folder-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.pick.init.$post({
        json: { path: parentDir },
      })
      expect((await res.json()).ok).toBe(true)

      const duplicate = await client.api.pick.init.$post({
        json: { path: parentDir },
      })
      expect((await duplicate.json()).error).toContain('already a git repository')

      const missingPath = await client.api.pick.init.$post({
        json: {} as { path?: string },
      })
      expect((await missingPath.json()).error).toContain('not available')
    } finally {
      rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('clones repositories from the setup routes and validates bad requests', async () => {
    const parentDir = mkdtempSync(join(tmpdir(), 'pick-clone-folder-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const cloned = await client.api.pick.clone.$post({
        json: { parentPath: parentDir, name: 'clone-target', repositoryUrl: validDir },
      })
      const clonedBody = await cloned.json()
      expect(clonedBody.ok).toBe(true)
      expect(clonedBody.path).toBe(join(parentDir, 'clone-target'))

      const invalid = await client.api.pick.clone.$post({
        json: { parentPath: parentDir, name: 'another', repositoryUrl: '' },
      })
      expect((await invalid.json()).error).toContain('repository URL is required')

      const missingParent = await client.api.pick.clone.$post({
        json: { name: 'broken', repositoryUrl: validDir } as { parentPath?: string; name: string; repositoryUrl: string },
      })
      expect((await missingParent.json()).error).toContain('parent folder is not available')
    } finally {
      rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('returns invalid JSON errors for setup mutation routes', async () => {
    const app = createApp('')
    const createRes = await app.fetch(new Request('http://localhost/api/pick/create-folder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    }))
    expect((await createRes.json()).error).toContain('Invalid JSON')

    const initRes = await app.fetch(new Request('http://localhost/api/pick/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    }))
    expect((await initRes.json()).error).toContain('Invalid JSON')

    const cloneRes = await app.fetch(new Request('http://localhost/api/pick/clone', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    }))
    expect((await cloneRes.json()).error).toContain('Invalid JSON')
  })
})
