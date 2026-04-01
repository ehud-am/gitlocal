import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp } from '../../../src/server.js'

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-handler-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir })
  writeFileSync(join(dir, 'README.md'), '# Test Repo')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('infoHandler', () => {
  let dir: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    cleanup = repo.cleanup
  })

  afterAll(() => cleanup())

  it('returns pickerMode:true when no repo path set', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.info.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pickerMode).toBe(true)
    expect(body.isGitRepo).toBe(false)
    expect(body.version).toBe('0.4.2')
  })

  it('returns repo metadata for valid repo', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.info.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isGitRepo).toBe(true)
    expect(body.pickerMode).toBe(false)
    expect(body.name).toBeTruthy()
    expect(body.currentBranch).toBeTruthy()
    expect(body.version).toBe('0.4.2')
  })
})

describe('branchesHandler — empty repoPath', () => {
  it('returns empty array when no repo loaded', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.branches.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})

describe('branchesHandler', () => {
  let dir: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    cleanup = repo.cleanup
  })

  afterAll(() => cleanup())

  it('returns array of branches with one current', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.branches.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    const current = body.filter((b: { isCurrent: boolean }) => b.isCurrent)
    expect(current.length).toBe(1)
  })
})

describe('commitsHandler — empty repoPath', () => {
  it('returns empty array when no repo loaded', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.commits.$get({ query: { branch: 'main', limit: '5' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})

describe('commitsHandler', () => {
  let dir: string
  let branch: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    cleanup = repo.cleanup
    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf-8' })
    branch = result.stdout.trim()
  })

  afterAll(() => cleanup())

  it('returns commits array with required fields', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.commits.$get({ query: { branch, limit: '5' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toHaveProperty('hash')
    expect(body[0]).toHaveProperty('shortHash')
    expect(body[0]).toHaveProperty('author')
    expect(body[0]).toHaveProperty('date')
    expect(body[0]).toHaveProperty('message')
  })

  it('uses default limit when limit param is non-numeric', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.commits.$get({ query: { branch, limit: 'abc' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('uses default values when branch and limit params are absent', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/commits'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

describe('readmeHandler — empty repoPath', () => {
  it('returns empty path when no repo loaded', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.readme.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.path).toBe('')
  })
})

describe('readmeHandler', () => {
  let dir: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    cleanup = repo.cleanup
  })

  afterAll(() => cleanup())

  it('returns path to README when present', async () => {
    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.readme.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.path).toMatch(/readme/i)
  })

  it('returns empty path for non-git directory', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'no-git-readme-'))
    try {
      const app = createApp(nonGitDir)
      const client = testClient(app)
      const res = await client.api.readme.$get()
      const body = await res.json()
      expect(body.path).toBe('')
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('returns empty path when no README', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'no-readme-'))
    spawnSync('git', ['init'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: emptyDir })
    writeFileSync(join(emptyDir, 'main.ts'), '')
    spawnSync('git', ['add', '.'], { cwd: emptyDir })
    spawnSync('git', ['commit', '-m', 'init'], { cwd: emptyDir })

    const app = createApp(emptyDir)
    const client = testClient(app)
    const res = await client.api.readme.$get()
    const body = await res.json()
    expect(body.path).toBe('')

    rmSync(emptyDir, { recursive: true, force: true })
  })
})
