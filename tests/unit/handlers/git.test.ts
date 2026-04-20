import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp } from '../../../src/server.js'

const APP_VERSION = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8'),
) as { version: string }

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
    expect(body.version).toBe(APP_VERSION.version)
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
    expect(body.version).toBe(APP_VERSION.version)
    expect(body.hasCommits).toBe(true)
    expect(body.rootEntryCount).toBeGreaterThan(0)
  })

  it('counts ignored local root entries in repo metadata', async () => {
    writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
    writeFileSync(join(dir, 'ignored.txt'), 'local only')

    const app = createApp(dir)
    const client = testClient(app)
    const res = await client.api.info.$get()
    const body = await res.json()

    expect(body.rootEntryCount).toBe(2)
  })

  it('returns empty-repo metadata for a repo with no commits and no browseable entries', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'gitlocal-empty-info-'))
    spawnSync('git', ['init'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: emptyDir })

    try {
      const app = createApp(emptyDir)
      const client = testClient(app)
      const res = await client.api.info.$get()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.isGitRepo).toBe(true)
      expect(body.currentBranch).toBe('')
      expect(body.hasCommits).toBe(false)
      expect(body.rootEntryCount).toBe(0)
    } finally {
      rmSync(emptyDir, { recursive: true, force: true })
    }
  })
})

describe('gitIdentityUpdateHandler', () => {
  it('returns blocked when no repository is open', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/git/identity', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated User',
        email: 'updated@example.com',
      }),
    }))

    expect(res.status).toBe(400)
    const body = await res.json() as { ok: boolean; message: string }
    expect(body.ok).toBe(false)
    expect(body.message).toBe('No repository is currently open.')
  })

  it('rejects invalid JSON bodies', async () => {
    const repo = makeGitRepo()

    try {
      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/identity', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: '{bad-json',
      }))

      expect(res.status).toBe(400)
      const body = await res.json() as { ok: boolean; message: string }
      expect(body.ok).toBe(false)
      expect(body.message).toBe('Invalid JSON body.')
    } finally {
      repo.cleanup()
    }
  })

  it('updates the repository-local git identity', async () => {
    const repo = makeGitRepo()

    try {
      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/identity', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated User',
          email: 'updated@example.com',
        }),
      }))

      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean; user: { name: string; email: string; source: string } }
      expect(body.ok).toBe(true)
      expect(body.user).toEqual({
        name: 'Updated User',
        email: 'updated@example.com',
        source: 'local',
      })
      expect(spawnSync('git', ['config', '--local', 'user.name'], { cwd: repo.dir, encoding: 'utf-8' }).stdout.trim()).toBe('Updated User')
      expect(spawnSync('git', ['config', '--local', 'user.email'], { cwd: repo.dir, encoding: 'utf-8' }).stdout.trim()).toBe('updated@example.com')
    } finally {
      repo.cleanup()
    }
  })

  it('rejects invalid git identity payloads', async () => {
    const repo = makeGitRepo()

    try {
      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/identity', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'updated@example.com',
        }),
      }))

      expect(res.status).toBe(400)
      const body = await res.json() as { ok: boolean; message: string }
      expect(body.ok).toBe(false)
      expect(body.message).toBe('Git name is required.')
    } finally {
      repo.cleanup()
    }
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

  it('returns a working-tree README path for newly initialized repositories before the first commit', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'working-tree-readme-handler-'))
    spawnSync('git', ['init'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: emptyDir })
    writeFileSync(join(emptyDir, 'README.md'), '# Draft')

    try {
      const app = createApp(emptyDir)
      const client = testClient(app)
      const res = await client.api.readme.$get()
      const body = await res.json()
      expect(body.path).toBe('README.md')
    } finally {
      rmSync(emptyDir, { recursive: true, force: true })
    }
  })

  it('supports folder-scoped README lookup with explicit path and branch parameters', async () => {
    const nestedRepo = makeGitRepo()

    try {
      mkdirSync(join(nestedRepo.dir, 'docs'), { recursive: true })
      writeFileSync(join(nestedRepo.dir, 'docs', 'README.md'), '# Docs')
      spawnSync('git', ['add', 'docs/README.md'], { cwd: nestedRepo.dir })
      spawnSync('git', ['commit', '-m', 'add docs readme'], { cwd: nestedRepo.dir })

      const app = createApp(nestedRepo.dir)
      const client = testClient(app)
      const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: nestedRepo.dir,
        encoding: 'utf-8',
      }).stdout.trim()
      const res = await client.api.readme.$get({ query: { path: 'docs', branch } })
      const body = await res.json()

      expect(body.path).toBe('docs/README.md')
    } finally {
      nestedRepo.cleanup()
    }
  })
})

describe('branchSwitchHandler', () => {
  it('returns blocked when no repo is open', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.branches.switch.$post({
      json: { target: 'main', resolution: 'preview' },
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual(expect.objectContaining({
      ok: false,
      status: 'blocked',
    }))
  })

  it('returns blocked for invalid JSON bodies', async () => {
    const repo = makeGitRepo()
    try {
      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/branches/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{bad-json',
      }))

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
      }))
    } finally {
      repo.cleanup()
    }
  })

  it('returns confirmation responses and switched responses with matching status codes', async () => {
    const repo = makeGitRepo()

    try {
      const mainBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repo.dir,
        encoding: 'utf-8',
      }).stdout.trim()
      spawnSync('git', ['checkout', '-b', 'feature'], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'feature.txt'), 'feature')
      spawnSync('git', ['add', '.'], { cwd: repo.dir })
      spawnSync('git', ['commit', '-m', 'feature'], { cwd: repo.dir })
      spawnSync('git', ['checkout', mainBranch], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'main.ts'), 'dirty')

      const app = createApp(repo.dir)
      const client = testClient(app)

      const confirmRes = await client.api.branches.switch.$post({
        json: { target: 'feature', resolution: 'preview' },
      })
      expect(confirmRes.status).toBe(409)
      expect(await confirmRes.json()).toEqual(expect.objectContaining({
        ok: false,
        status: 'confirmation-required',
      }))

      const cancelRes = await client.api.branches.switch.$post({
        json: { target: mainBranch, resolution: 'cancel' },
      })
      expect(cancelRes.status).toBe(200)
      expect(await cancelRes.json()).toEqual(expect.objectContaining({
        ok: false,
        status: 'cancelled',
      }))
    } finally {
      repo.cleanup()
    }
  })

  it('returns second-confirmation responses when untracked blockers still need deletion', async () => {
    const repo = makeGitRepo()

    try {
      const mainBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repo.dir,
        encoding: 'utf-8',
      }).stdout.trim()
      spawnSync('git', ['checkout', '-b', 'feature-blocked'], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'blocker.txt'), 'tracked on feature')
      spawnSync('git', ['add', 'blocker.txt'], { cwd: repo.dir })
      spawnSync('git', ['commit', '-m', 'add blocker'], { cwd: repo.dir })
      spawnSync('git', ['checkout', mainBranch], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'blocker.txt'), 'local untracked blocker')

      const app = createApp(repo.dir)
      const client = testClient(app)

      const res = await client.api.branches.switch.$post({
        json: { target: 'feature-blocked', resolution: 'discard' },
      })

      expect(res.status).toBe(409)
      expect(await res.json()).toEqual(expect.objectContaining({
        ok: false,
        status: 'second-confirmation-required',
      }))
    } finally {
      repo.cleanup()
    }
  })
})

describe('tree responses', () => {
  it('returns ignored entries with localOnly metadata for the working tree', async () => {
    const { dir, cleanup } = makeGitRepo()

    try {
      writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
      writeFileSync(join(dir, 'ignored.txt'), 'local only')

      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/tree'))
      const body = await res.json() as Array<{ path: string; localOnly?: boolean }>

      expect(body).toContainEqual(expect.objectContaining({ path: 'ignored.txt', localOnly: true }))
    } finally {
      cleanup()
    }
  })
})

describe('treeHandler', () => {
  it('returns immediate child files and folders for the requested directory', async () => {
    const repo = makeGitRepo()
    const dir = repo.dir

    mkdirSync(join(dir, 'docs', 'nested'), { recursive: true })
    writeFileSync(join(dir, 'docs', 'guide.md'), '# guide')
    writeFileSync(join(dir, 'docs', 'notes.md'), '# notes')
    writeFileSync(join(dir, 'docs', 'nested', 'child.md'), '# nested')

    try {
      const app = createApp(dir)
      const client = testClient(app)
      const res = await client.api.tree.$get({ query: { path: 'docs' } })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual([
        { name: 'nested', path: 'docs/nested', type: 'dir', localOnly: false },
        { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false },
        { name: 'notes.md', path: 'docs/notes.md', type: 'file', localOnly: false },
      ])
    } finally {
      repo.cleanup()
    }
  })
})
