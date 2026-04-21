import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
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

function makeBareRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-int-remote-'))
  spawnSync('git', ['init', '--bare'], { cwd: dir })
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
    const body = await res.json() as { isGitRepo: boolean; version: string; hasCommits: boolean; rootEntryCount: number }
    expect(body.isGitRepo).toBe(true)
    expect(body.version).toBe(APP_VERSION.version)
    expect(body.hasCommits).toBe(true)
    expect(body.rootEntryCount).toBeGreaterThan(0)
  })

  it('GET /api/info reports newly initialized repositories as empty landing states', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'gitlocal-empty-int-'))
    spawnSync('git', ['init'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: emptyDir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: emptyDir })

    try {
      const app = createApp(emptyDir)
      const res = await app.fetch(new Request('http://localhost/api/info'))
      expect(res.status).toBe(200)
      const body = await res.json() as { isGitRepo: boolean; currentBranch: string; hasCommits: boolean; rootEntryCount: number }
      expect(body.isGitRepo).toBe(true)
      expect(body.currentBranch).toBe('')
      expect(body.hasCommits).toBe(false)
      expect(body.rootEntryCount).toBe(0)
    } finally {
      rmSync(emptyDir, { recursive: true, force: true })
    }
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

  it('GET /api/info includes git context for the repo header', async () => {
    const repo = makeGitRepo()
    const remoteDir = mkdtempSync(join(tmpdir(), 'gitlocal-remote-context-'))
    spawnSync('git', ['init', '--bare'], { cwd: remoteDir })
    spawnSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: repo.dir })

    try {
      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/info'))
      const body = await res.json() as {
        gitContext?: {
          user?: { name: string; email: string }
          remote?: { name: string }
        }
      }

      expect(body.gitContext?.user?.name).toBe('Test User')
      expect(body.gitContext?.remote?.name).toBe('origin')
    } finally {
      repo.cleanup()
      rmSync(remoteDir, { recursive: true, force: true })
    }
  })

  it('GET /api/tree returns immediate child entries for content-panel folder browsing', async () => {
    mkdirSync(join(dir, 'docs'), { recursive: true })
    writeFileSync(join(dir, 'docs', 'guide.md'), '# Guide')
    writeFileSync(join(dir, 'docs', 'tree-view.md'), '# Notes')
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/tree?path=docs'))
    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ name: string; path: string; type: 'file' | 'dir' }>
    expect(body).toEqual([
      { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false, syncState: 'local-uncommitted' },
      { name: 'tree-view.md', path: 'docs/tree-view.md', type: 'file', localOnly: false, syncState: 'local-uncommitted' },
    ])
  })

  it('GET /api/tree includes ignored local entries with localOnly metadata', async () => {
    writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
    writeFileSync(join(dir, 'ignored.txt'), 'local only')
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/tree'))
    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ path: string; localOnly?: boolean }>
    expect(body).toContainEqual(expect.objectContaining({ path: 'ignored.txt', localOnly: true }))
  })

  it('GET /api/search includes ignored local matches with localOnly metadata', async () => {
    writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
    writeFileSync(join(dir, 'ignored.txt'), 'search me locally')
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/search?query=ignored&mode=name'))
    expect(res.status).toBe(200)
    const body = await res.json() as { results: Array<{ path: string; localOnly?: boolean }> }
    expect(body.results).toContainEqual(expect.objectContaining({ path: 'ignored.txt', localOnly: true }))
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

  it('POST /api/branches/switch returns confirmation details for dirty working trees', async () => {
    const repo = makeGitRepo()

    try {
      const currentBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repo.dir,
        encoding: 'utf-8',
      }).stdout.trim()
      spawnSync('git', ['checkout', '-b', 'feature-switch'], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'feature-switch.txt'), 'feature')
      spawnSync('git', ['add', '.'], { cwd: repo.dir })
      spawnSync('git', ['commit', '-m', 'feature switch'], { cwd: repo.dir })
      spawnSync('git', ['checkout', currentBranch], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'README.md'), '# Dirty')

      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/branches/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target: 'feature-switch', resolution: 'preview' }),
      }))
      expect(res.status).toBe(409)
      const body = await res.json() as { status: string; trackedChangeCount: number }
      expect(body.status).toBe('confirmation-required')
      expect(body.trackedChangeCount).toBeGreaterThan(0)
    } finally {
      repo.cleanup()
    }
  })

  it('POST /api/branches/switch creates a local tracking branch from a remote-only branch', async () => {
    const repo = makeGitRepo()
    const remote = makeBareRepo()

    try {
      const currentBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repo.dir,
        encoding: 'utf-8',
      }).stdout.trim()
      spawnSync('git', ['remote', 'add', 'origin', remote.dir], { cwd: repo.dir })
      spawnSync('git', ['push', '-u', 'origin', currentBranch], { cwd: repo.dir })
      spawnSync('git', ['checkout', '-b', 'release'], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'release.txt'), 'release')
      spawnSync('git', ['add', '.'], { cwd: repo.dir })
      spawnSync('git', ['commit', '-m', 'release'], { cwd: repo.dir })
      spawnSync('git', ['push', '-u', 'origin', 'release'], { cwd: repo.dir })
      spawnSync('git', ['checkout', currentBranch], { cwd: repo.dir })
      spawnSync('git', ['branch', '-D', 'release'], { cwd: repo.dir })
      spawnSync('git', ['fetch', 'origin'], { cwd: repo.dir })

      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/branches/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target: 'origin/release', resolution: 'preview' }),
      }))

      expect(res.status).toBe(200)
      const body = await res.json() as { status: string; currentBranch: string; createdTrackingBranch?: string }
      expect(body.status).toBe('switched')
      expect(body.currentBranch).toBe('release')
      expect(body.createdTrackingBranch).toBe('release')
    } finally {
      repo.cleanup()
      remote.cleanup()
    }
  })

  it('supports setup bootstrap routes for create-folder, init, and clone', async () => {
    const parentDir = mkdtempSync(join(tmpdir(), 'gitlocal-bootstrap-'))

    try {
      const app = createApp('')

      const createRes = await app.fetch(new Request('http://localhost/api/pick/create-folder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parentPath: parentDir, name: 'child' }),
      }))
      expect(createRes.status).toBe(200)
      const createBody = await createRes.json() as { ok: boolean; path: string }
      expect(createBody.ok).toBe(true)
      expect(existsSync(createBody.path)).toBe(true)

      const initRes = await app.fetch(new Request('http://localhost/api/pick/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: createBody.path }),
      }))
      expect(initRes.status).toBe(200)
      const initBody = await initRes.json() as { ok: boolean }
      expect(initBody.ok).toBe(true)

      const cloneRes = await app.fetch(new Request('http://localhost/api/pick/clone', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parentPath: parentDir, name: 'clone-target', repositoryUrl: dir }),
      }))
      expect(cloneRes.status).toBe(200)
      const cloneBody = await cloneRes.json() as { ok: boolean; path: string }
      expect(cloneBody.ok).toBe(true)
      expect(existsSync(join(cloneBody.path, '.git'))).toBe(true)
    } finally {
      rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('supports updating the repository-local git identity', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/git/identity', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration User',
        email: 'integration@example.com',
      }),
    }))

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; user: { name: string; email: string; source: string } }
    expect(body.ok).toBe(true)
    expect(body.user).toEqual({
      name: 'Integration User',
      email: 'integration@example.com',
      source: 'local',
    })
  })

  it('GET /api/sync returns sync metadata for the current file path', async () => {
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/sync?path=README.md'))
    expect(res.status).toBe(200)
    const body = await res.json() as { currentPath: string; workingTreeRevision: string; pathSyncState: string; repoSync: { mode: string } }
    expect(body.currentPath).toBe('README.md')
    expect(body.workingTreeRevision).toBeTruthy()
    expect(body.pathSyncState).toBe('clean')
    expect(body.repoSync.mode).toBeTruthy()
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
    const body = await res.json() as { repoPath: string; fileStatus: string; repoSync: { mode: string } }
    expect(body.repoPath).toBe('')
    expect(body.fileStatus).toBe('unavailable')
    expect(body.repoSync.mode).toBe('unavailable')
  })

  it('POST /api/git/commit creates a local commit', async () => {
    writeFileSync(join(dir, 'README.md'), '# Integration commit')
    const app = createApp(dir)
    const res = await app.fetch(new Request('http://localhost/api/git/commit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'integration commit' }),
    }))

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; status: string; shortHash?: string }
    expect(body.ok).toBe(true)
    expect(body.status).toBe('committed')
    expect(body.shortHash).toBeTruthy()
    expect(spawnSync('git', ['log', '-1', '--pretty=%s'], { cwd: dir, encoding: 'utf-8' }).stdout.trim()).toBe('integration commit')
  })

  it('supports create, update, and delete through /api/file mutation routes', async () => {
    const app = createApp(dir)

    const createRes = await app.fetch(new Request('http://localhost/api/file', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'docs/notes.md', content: '# Draft' }),
    }))
    expect(createRes.status).toBe(201)

    const readCreated = await app.fetch(new Request('http://localhost/api/file?path=docs%2Fnotes.md'))
    const createdBody = await readCreated.json() as { content: string; revisionToken: string }
    expect(createdBody.content).toContain('# Draft')
    expect(createdBody.revisionToken).toBeTruthy()

    const updateRes = await app.fetch(new Request('http://localhost/api/file', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'docs/notes.md',
        content: '# Updated Draft',
        revisionToken: createdBody.revisionToken,
      }),
    }))
    expect(updateRes.status).toBe(200)

    const reread = await app.fetch(new Request('http://localhost/api/file?path=docs%2Fnotes.md'))
    const rereadBody = await reread.json() as { revisionToken: string }

    const deleteRes = await app.fetch(new Request('http://localhost/api/file', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'docs/notes.md',
        revisionToken: rereadBody.revisionToken,
      }),
    }))
    expect(deleteRes.status).toBe(200)

    const missingRes = await app.fetch(new Request('http://localhost/api/file?path=docs%2Fnotes.md'))
    expect(missingRes.status).toBe(404)
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
