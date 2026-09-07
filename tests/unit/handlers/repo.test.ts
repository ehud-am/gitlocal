import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { platform, tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp } from '../../../src/server.js'
import { writeStartupFolderPreference } from '../../../src/services/startup-preferences.js'

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

const OPENSSH_PRIVATE_KEY = [
  '-----BEGIN OPENSSH PRIVATE KEY-----',
  'b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAA=',
  '-----END OPENSSH PRIVATE KEY-----',
  '',
].join('\n')

function writeFakePrivateKey(path: string): string {
  writeFileSync(path, OPENSSH_PRIVATE_KEY)
  return path
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

  it('returns repo metadata for a symlinked repository root using the canonical git root', async () => {
    const linkPath = `${dir}-link`
    try {
      symlinkSync(dir, linkPath)
      const app = createApp(linkPath)
      const client = testClient(app)
      const res = await client.api.info.$get()
      const body = await res.json()

      expect(body.path).toBe(realpathSync(dir))
      expect(body.isGitRepo).toBe(true)
      expect(body.pickerMode).toBe(false)
      expect(body.currentBranch).toBeTruthy()
    } finally {
      rmSync(linkPath, { recursive: true, force: true })
    }
  })

  it('detects the current working directory as a repository when empty startup path detection is enabled', async () => {
    const previousCwd = process.cwd()
    process.chdir(dir)
    try {
      const app = createApp('', { detectCurrentRepoOnEmptyPath: true })
      const client = testClient(app)
      const res = await client.api.info.$get()
      const body = await res.json()

      expect(body.path).toBe(realpathSync(dir))
      expect(body.isGitRepo).toBe(true)
      expect(body.pickerMode).toBe(false)
    } finally {
      process.chdir(previousCwd)
    }
  })

  it('returns folder metadata for a plain folder root', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'gitlocal-info-folder-'))
    try {
      writeFileSync(join(folder, 'README.md'), '# Folder')
      const app = createApp(folder)
      const client = testClient(app)
      const res = await client.api.info.$get()
      const body = await res.json()

      expect(body.isGitRepo).toBe(false)
      expect(body.currentBranch).toBe('')
      expect(body.hasCommits).toBe(false)
      expect(body.gitContext).toBeNull()
      expect(body.rootEntryCount).toBe(1)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('recovers into picker mode with a clear message on the second consecutive check, tolerating one transient read failure first', async () => {
    if (platform() === 'win32') return // chmod-based permission denial is not meaningful on Windows

    const folder = mkdtempSync(join(tmpdir(), 'gitlocal-info-unreadable-'))
    try {
      // Becomes unreadable only *after* createApp already committed to it — simulating a
      // permission change during a long-running session. (An unreadable folder passed directly
      // to createApp is now caught even earlier, at startup — see server.test.ts.)
      const app = createApp(folder)
      chmodSync(folder, 0o000)
      const client = testClient(app)

      // First check: the directory still exists, so a single failed readability check is
      // treated as possibly transient and does not yet self-heal — this preserves the
      // pre-existing FR-004 guard (a real read failure surfaces as a request failure, never a
      // fake rootEntryCount: 0) for exactly one blip.
      const firstRes = await client.api.info.$get()
      expect(firstRes.status).toBe(500)
      const firstBody = await firstRes.json() as { code: string }
      expect(firstBody.code).toBe('PERMISSION_DENIED')

      // Second consecutive check against the same still-unreadable path: now recovers into
      // picker mode instead of failing (or faking) forever. The explanation lives in the
      // startup-folder resolution snapshot (read via GET /api/startup-folder, same channel
      // every other fallback path in this feature uses), not an inline field on this response.
      const secondRes = await client.api.info.$get()
      expect(secondRes.status).toBe(200)
      const secondBody = await secondRes.json() as { pickerMode: boolean }
      expect(secondBody.pickerMode).toBe(true)

      const startupRes = await client.api['startup-folder'].$get()
      const startupBody = await startupRes.json() as { source: string; fallbackReason: string }
      expect(startupBody.source).toBe('os-default')
      expect(startupBody.fallbackReason).toMatch(/no longer readable/i)
    } finally {
      chmodSync(folder, 0o755)
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('resets the unreadable-path streak once the folder becomes readable again', async () => {
    if (platform() === 'win32') return // chmod-based permission denial is not meaningful on Windows

    const folder = mkdtempSync(join(tmpdir(), 'gitlocal-info-flaky-'))
    try {
      const app = createApp(folder)
      chmodSync(folder, 0o000)
      const client = testClient(app)

      // One transient failure, then recovery before a second consecutive failure — should not
      // trip the self-heal, and a later unrelated failure should require two fresh consecutive
      // hits again rather than inheriting the earlier, now-stale count.
      expect((await client.api.info.$get()).status).toBe(500)
      chmodSync(folder, 0o755)
      expect((await client.api.info.$get()).status).toBe(200)

      chmodSync(folder, 0o000)
      const secondBlipRes = await client.api.info.$get()
      expect(secondBlipRes.status).toBe(500)
    } finally {
      chmodSync(folder, 0o755)
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('returns folder metadata for a nested folder inside a repository', async () => {
    const repo = makeGitRepo()
    const nested = join(repo.dir, 'docs')
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(nested, 'guide.md'), 'guide')

    try {
      const app = createApp(nested)
      const client = testClient(app)
      const res = await client.api.info.$get()
      const body = await res.json()

      expect(body.path).toBe(realpathSync(nested))
      expect(body.isGitRepo).toBe(false)
      expect(body.currentBranch).toBe('')
      expect(body.hasCommits).toBe(false)
      expect(body.gitContext).toBeNull()
    } finally {
      repo.cleanup()
    }
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

describe('repository viewer usability handlers', () => {
  it('returns startup-open target state and default-reader preferences', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-default-reader-handler-'))
    const previousPreferencePath = process.env.GITLOCAL_DEFAULT_READER_PREFERENCE_PATH
    process.env.GITLOCAL_DEFAULT_READER_PREFERENCE_PATH = join(dir, 'default-reader.json')

    try {
      const app = createApp('')

      const startupTargetRes = await app.fetch(new Request('http://localhost/api/startup-open-target'))
      expect(startupTargetRes.status).toBe(200)
      expect(await startupTargetRes.json()).toEqual({ target: null })

      const initialPreferenceRes = await app.fetch(new Request('http://localhost/api/default-reader-preference'))
      expect(initialPreferenceRes.status).toBe(200)
      expect(await initialPreferenceRes.json()).toMatchObject({
        ok: true,
        preference: { status: 'not-asked', askedAt: '', answeredAt: '', message: '' },
      })

      const updateRes = await app.fetch(new Request('http://localhost/api/default-reader-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          askedAt: '2026-07-05T12:00:00.000Z',
          answeredAt: '2026-07-05T12:01:00.000Z',
          message: 'Not now.',
        }),
      }))
      expect(updateRes.status).toBe(200)
      expect(await updateRes.json()).toMatchObject({
        ok: true,
        preference: {
          status: 'declined',
          askedAt: '2026-07-05T12:00:00.000Z',
          answeredAt: '2026-07-05T12:01:00.000Z',
          message: 'Not now.',
        },
      })

      const invalidJsonRes = await app.fetch(new Request('http://localhost/api/default-reader-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }))
      expect(invalidJsonRes.status).toBe(400)
      expect(await invalidJsonRes.json()).toMatchObject({
        ok: false,
        message: 'Invalid JSON body.',
      })

      process.env.GITLOCAL_DEFAULT_READER_PREFERENCE_PATH = dir
      const writeFailureRes = await app.fetch(new Request('http://localhost/api/default-reader-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      }))
      expect(writeFailureRes.status).toBe(400)
      expect(await writeFailureRes.json()).toMatchObject({
        ok: false,
      })
    } finally {
      if (previousPreferencePath === undefined) {
        delete process.env.GITLOCAL_DEFAULT_READER_PREFERENCE_PATH
      } else {
        process.env.GITLOCAL_DEFAULT_READER_PREFERENCE_PATH = previousPreferencePath
      }
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('creates startup-open targets for repository and non-repository Markdown files', async () => {
    const repo = makeGitRepo()
    const plain = mkdtempSync(join(tmpdir(), 'gitlocal-startup-open-plain-'))
    const docs = join(repo.dir, 'docs with spaces')
    mkdirSync(docs)
    const repoFile = join(docs, 'guide.md')
    const plainFile = join(plain, 'notes.md')
    writeFileSync(repoFile, '# Guide')
    writeFileSync(plainFile, '# Notes')

    try {
      const repoApp = createApp(repoFile, { initialOpenSource: 'explicit-launch' })
      const repoTargetRes = await repoApp.fetch(new Request('http://localhost/api/startup-open-target'))
      const repoTarget = await repoTargetRes.json() as { target: { status: string; rootPath: string; selectedPath: string; selectedPathType: string; gitState: string } }
      expect(repoTarget.target).toMatchObject({
        status: 'accepted',
        selectedPath: 'docs with spaces/guide.md',
        selectedPathType: 'file',
        gitState: 'inside-repository',
      })
      expect(realpathSync(repoTarget.target.rootPath)).toBe(realpathSync(repo.dir))

      const plainApp = createApp(plainFile, { initialOpenSource: 'explicit-launch' })
      const plainTargetRes = await plainApp.fetch(new Request('http://localhost/api/startup-open-target'))
      const plainTarget = await plainTargetRes.json() as { target: { status: string; rootPath: string; selectedPath: string; gitState: string } }
      expect(plainTarget.target).toMatchObject({
        status: 'accepted',
        selectedPath: 'notes.md',
        gitState: 'outside-repository',
      })
      expect(realpathSync(plainTarget.target.rootPath)).toBe(realpathSync(plain))
    } finally {
      repo.cleanup()
      rmSync(plain, { recursive: true, force: true })
    }
  })

  it('returns distinct startup-open failure targets for missing and unsupported files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-startup-open-fail-'))
    const unsupported = join(dir, 'notes.txt')
    const missing = join(dir, 'missing.md')
    writeFileSync(unsupported, 'plain text')

    try {
      const unsupportedApp = createApp(unsupported, { initialOpenSource: 'explicit-launch' })
      const unsupportedRes = await unsupportedApp.fetch(new Request('http://localhost/api/startup-open-target'))
      const unsupportedBody = await unsupportedRes.json() as { target: { status: string; message: string; selectedPathType: string } }
      expect(unsupportedBody.target).toMatchObject({
        status: 'blocked',
        selectedPathType: 'none',
      })
      expect(unsupportedBody.target.message).toMatch(/unsupported file type/i)

      const missingApp = createApp(missing, { initialOpenSource: 'explicit-launch' })
      const missingRes = await missingApp.fetch(new Request('http://localhost/api/startup-open-target'))
      const missingBody = await missingRes.json() as { target: { status: string; message: string; selectedPathType: string } }
      expect(missingBody.target).toMatchObject({
        status: 'failed',
        selectedPathType: 'none',
      })
      expect(missingBody.target.message).toMatch(/path does not exist/i)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns repository summary with plain-language status and key docs', async () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/summary?branch=main'))
      expect(res.status).toBe(200)
      const body = await res.json() as {
        repoName: string
        branch: string
        statusSummary: { text: string; syncState: string; localChangeCount: number }
        keyDocuments: Array<{ path: string }>
      }

      expect(body.repoName).toBeTruthy()
      expect(body.branch).toBe('main')
      expect(body.statusSummary.text).toContain('no upstream remote configured')
      expect(body.statusSummary.syncState).toBe('local-only')
      expect(body.keyDocuments).toContainEqual(expect.objectContaining({ path: 'README.md' }))
    } finally {
      cleanup()
    }
  })

  it('returns changed-file items and summary counts', async () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, 'README.md'), '# changed')
      writeFileSync(join(dir, 'new-note.md'), 'new')
      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/changes?includeGeneratedLocal=true'))
      expect(res.status).toBe(200)
      const body = await res.json() as {
        summary: { total: number; modified: number; untracked: number }
        items: Array<{ path: string; changeState: string }>
      }

      expect(body.summary).toMatchObject({ total: 2, modified: 1, untracked: 1 })
      expect(body.items).toContainEqual(expect.objectContaining({ path: 'README.md', changeState: 'modified' }))
      expect(body.items).toContainEqual(expect.objectContaining({ path: 'new-note.md', changeState: 'untracked' }))
    } finally {
      cleanup()
    }
  })

  it('returns navigation hints with key documents and changed items', async () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, 'README.md'), '# changed')
      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/navigation-hints'))
      expect(res.status).toBe(200)
      const body = await res.json() as {
        keyDocuments: Array<{ path: string }>
        recentItems: unknown[]
        changedItems: Array<{ path: string }>
      }

      expect(body.keyDocuments).toContainEqual(expect.objectContaining({ path: 'README.md' }))
      expect(body.recentItems).toEqual([])
      expect(body.changedItems).toContainEqual(expect.objectContaining({ path: 'README.md' }))
    } finally {
      cleanup()
    }
  })

  it('returns 400 for repo summary when no repository is loaded', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/repo/summary'))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'No repository loaded' })
  })

  it('returns 400 for changed files and navigation hints when no repository is loaded', async () => {
    const app = createApp('')
    const changesRes = await app.fetch(new Request('http://localhost/api/repo/changes'))
    const hintsRes = await app.fetch(new Request('http://localhost/api/repo/navigation-hints'))

    expect(changesRes.status).toBe(400)
    expect(hintsRes.status).toBe(400)
    expect(await changesRes.json()).toMatchObject({ error: 'No repository loaded' })
    expect(await hintsRes.json()).toMatchObject({ error: 'No repository loaded' })
  })
})

describe('repositoryParentFolderHandler', () => {
  it('returns 400-style ok:false when no repository is currently open', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/repo/parent-folder', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: false, error: 'No repository is currently open' })
  })

  it('opens the parent folder in picker mode for a non-root repository path', async () => {
    const { dir, cleanup } = makeGitRepo()
    const nested = join(dir, 'docs')
    mkdirSync(nested)
    writeFileSync(join(nested, 'guide.md'), '# Guide')

    try {
      const app = createApp(nested)
      const res = await app.fetch(new Request('http://localhost/api/repo/parent-folder', { method: 'POST' }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, error: '' })
    } finally {
      cleanup()
    }
  })

  it('refuses to navigate above the true filesystem root', async () => {
    const app = createApp('/')
    const res = await app.fetch(new Request('http://localhost/api/repo/parent-folder', { method: 'POST' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: false,
      error: 'GitLocal is already at the root of the file system.',
    })
  })

  it('walks past an unreadable immediate parent to the nearest readable ancestor', async () => {
    if (platform() === 'win32') return // chmod-based permission denial is not meaningful on Windows

    const grandparent = mkdtempSync(join(tmpdir(), 'gitlocal-parent-walk-'))
    const middle = join(grandparent, 'middle')
    const child = join(middle, 'child')
    mkdirSync(child, { recursive: true })
    // Execute-only: traversal into `child` still works, but `middle` itself can't be listed —
    // unlike 0o000, which would also block traversal and make `child` itself unreachable.
    chmodSync(middle, 0o111)

    try {
      const app = createApp(child)
      const res = await app.fetch(new Request('http://localhost/api/repo/parent-folder', { method: 'POST' }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, error: '' })

      const infoRes = await app.fetch(new Request('http://localhost/api/info'))
      const infoBody = await infoRes.json() as { pickerMode: boolean; path: string }
      expect(infoBody.pickerMode).toBe(true)
      expect(infoBody.path).toBe(realpathSync(grandparent))
    } finally {
      chmodSync(middle, 0o755)
      rmSync(grandparent, { recursive: true, force: true })
    }
  })
})

describe('repositoryLocationHandler', () => {
  it('returns the zero-value shape when no repository is currently open', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/repo/location'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      repositoryRootPath: '',
      isRepositoryRoot: false,
      homeReadmePath: '',
      atFilesystemRoot: false,
    })
  })

  it('resolves the opened repository root itself as isRepositoryRoot with its home README', async () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/location'))
      expect(res.status).toBe(200)
      const body = await res.json() as { repositoryRootPath: string; isRepositoryRoot: boolean; homeReadmePath: string; atFilesystemRoot: boolean }
      expect(realpathSync(body.repositoryRootPath)).toBe(realpathSync(dir))
      expect(body.isRepositoryRoot).toBe(true)
      expect(body.homeReadmePath).toBe('README.md')
      expect(body.atFilesystemRoot).toBe(false)
    } finally {
      cleanup()
    }
  })

  it('resolves a subfolder of the opened repository as not-root, with the same home README', async () => {
    const { dir, cleanup } = makeGitRepo()
    const nested = join(dir, 'docs')
    mkdirSync(nested)
    writeFileSync(join(nested, 'guide.md'), '# Guide')

    try {
      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/location?path=docs'))
      expect(res.status).toBe(200)
      const body = await res.json() as { repositoryRootPath: string; isRepositoryRoot: boolean; homeReadmePath: string }
      expect(realpathSync(body.repositoryRootPath)).toBe(realpathSync(dir))
      expect(body.isRepositoryRoot).toBe(false)
      expect(body.homeReadmePath).toBe('README.md')
    } finally {
      cleanup()
    }
  })

  it('targets the nearest enclosing nested sub-repository, not the outer repository', async () => {
    const outer = makeGitRepo()
    const innerDir = join(outer.dir, 'vendor', 'inner-repo')
    mkdirSync(innerDir, { recursive: true })
    spawnSync('git', ['init'], { cwd: innerDir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: innerDir })
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: innerDir })
    writeFileSync(join(innerDir, 'README.md'), '# Inner')
    spawnSync('git', ['add', '.'], { cwd: innerDir })
    spawnSync('git', ['commit', '-m', 'init'], { cwd: innerDir })

    try {
      const app = createApp(outer.dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/location?path=vendor/inner-repo'))
      expect(res.status).toBe(200)
      const body = await res.json() as { repositoryRootPath: string; isRepositoryRoot: boolean; homeReadmePath: string }
      expect(realpathSync(body.repositoryRootPath)).toBe(realpathSync(innerDir))
      expect(body.isRepositoryRoot).toBe(true)
      expect(body.homeReadmePath).toBe('README.md')
    } finally {
      outer.cleanup()
    }
  })

  it('returns the zero-value shape for a path that is not inside any git repository', async () => {
    const outer = makeGitRepo()
    const plainFolder = join(outer.dir, 'vendor', 'plain-folder')
    mkdirSync(plainFolder, { recursive: true })

    try {
      const app = createApp(outer.dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/location?path=vendor/plain-folder'))
      expect(res.status).toBe(200)
      const body = await res.json() as { repositoryRootPath: string; isRepositoryRoot: boolean; homeReadmePath: string; atFilesystemRoot: boolean }
      expect(body.repositoryRootPath).not.toBe('')
      expect(realpathSync(body.repositoryRootPath)).toBe(realpathSync(outer.dir))
    } finally {
      outer.cleanup()
    }
  })

  it('returns an empty homeReadmePath when the resolved repository root has no README', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-location-no-readme-'))
    spawnSync('git', ['init'], { cwd: dir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir })
    writeFileSync(join(dir, 'notes.txt'), 'no readme here')
    spawnSync('git', ['add', '.'], { cwd: dir })
    spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })

    try {
      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/repo/location'))
      expect(res.status).toBe(200)
      const body = await res.json() as { repositoryRootPath: string; isRepositoryRoot: boolean; homeReadmePath: string }
      expect(body.isRepositoryRoot).toBe(true)
      expect(body.homeReadmePath).toBe('')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('is reachable and returns 200 for both a git-repo path and a non-git path', async () => {
    const { dir, cleanup } = makeGitRepo()
    const plain = mkdtempSync(join(tmpdir(), 'gitlocal-location-plain-'))

    try {
      const repoApp = createApp(dir)
      const repoRes = await repoApp.fetch(new Request('http://localhost/api/repo/location'))
      expect(repoRes.status).toBe(200)

      const plainApp = createApp(plain)
      const plainRes = await plainApp.fetch(new Request('http://localhost/api/repo/location'))
      expect(plainRes.status).toBe(200)
      expect(await plainRes.json()).toEqual({
        repositoryRootPath: '',
        isRepositoryRoot: false,
        homeReadmePath: '',
        atFilesystemRoot: false,
      })
    } finally {
      cleanup()
      rmSync(plain, { recursive: true, force: true })
    }
  })

  it('reports atFilesystemRoot when the opened root is the true filesystem root, even for a non-git folder', async () => {
    const app = createApp('/')
    const res = await app.fetch(new Request('http://localhost/api/repo/location'))
    expect(res.status).toBe(200)
    const body = await res.json() as { atFilesystemRoot: boolean }
    expect(body.atFilesystemRoot).toBe(true)
  })
})

describe('startup folder handlers', () => {
  it('returns the resolved startup folder', async () => {
    const home = mkdtempSync(join(tmpdir(), 'gitlocal-startup-handler-home-'))
    const remembered = mkdtempSync(join(tmpdir(), 'gitlocal-startup-handler-remembered-'))
    const prefPath = join(home, 'preference.json')
    process.env.GITLOCAL_STARTUP_PREFERENCE_PATH = prefPath
    writeStartupFolderPreference(remembered, 'repo-open', prefPath)

    try {
      const app = createApp('')
      const res = await app.fetch(new Request('http://localhost/api/startup-folder'))
      expect(res.status).toBe(200)
      const body = await res.json() as { path: string; source: string }
      expect(body.path).toBe(realpathSync(remembered))
      expect(body.source).toBe('last-used')
    } finally {
      delete process.env.GITLOCAL_STARTUP_PREFERENCE_PATH
      rmSync(home, { recursive: true, force: true })
      rmSync(remembered, { recursive: true, force: true })
    }
  })

  it('no longer exposes PUT /api/startup-folder (unused, unvalidated surface removed per FR-010/FR-011)', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/startup-folder', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/tmp', source: 'repo-open' }),
    }))
    expect(res.status).toBe(404)
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

  it('updates and clears the repository-local SSH key path with git identity', async () => {
    const repo = makeGitRepo()
    const keyPath = writeFakePrivateKey(join(repo.dir, 'id_ed25519'))

    try {
      const app = createApp(repo.dir)
      const update = await app.fetch(new Request('http://localhost/api/git/identity', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated User',
          email: 'updated@example.com',
          sshKeyPath: keyPath,
        }),
      }))

      expect(update.status).toBe(200)
      let body = await update.json() as { user: { sshKeyPath?: string } }
      expect(body.user.sshKeyPath).toBe(keyPath)
      expect(spawnSync('git', ['config', '--local', 'core.sshCommand'], { cwd: repo.dir, encoding: 'utf-8' }).stdout.trim()).toContain(keyPath)

      const clear = await app.fetch(new Request('http://localhost/api/git/identity', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated User',
          email: 'updated@example.com',
          sshKeyPath: '',
        }),
      }))

      expect(clear.status).toBe(200)
      body = await clear.json() as { user: { sshKeyPath?: string } }
      expect(body.user.sshKeyPath).toBeUndefined()
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
      expect(body.message).toBe('Git name and email must both be set or both be cleared.')
    } finally {
      repo.cleanup()
    }
  })

  it('lists and validates SSH private keys', async () => {
    const originalHome = process.env.HOME
    const homeDir = mkdtempSync(join(tmpdir(), 'gitlocal-handler-home-'))
    const sshDir = join(homeDir, '.ssh')
    mkdirSync(sshDir)
    const keyPath = writeFakePrivateKey(join(sshDir, 'id_ed25519'))
    writeFileSync(join(sshDir, 'id_ed25519.pub'), 'ssh-ed25519 AAAAC3Nza public@example\n')
    const repo = makeGitRepo()

    try {
      process.env.HOME = homeDir
      const app = createApp(repo.dir)
      const list = await app.fetch(new Request('http://localhost/api/git/identity/ssh-keys'))
      expect(list.status).toBe(200)
      const listBody = await list.json() as { keys: Array<{ name: string; path: string }> }
      expect(listBody.keys).toEqual([{ name: 'id_ed25519', path: keyPath }])

      const valid = await app.fetch(new Request('http://localhost/api/git/identity/ssh-key/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sshKeyPath: keyPath }),
      }))
      expect(valid.status).toBe(200)

      const invalid = await app.fetch(new Request('http://localhost/api/git/identity/ssh-key/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sshKeyPath: join(sshDir, 'id_ed25519.pub') }),
      }))
      expect(invalid.status).toBe(400)
    } finally {
      process.env.HOME = originalHome
      repo.cleanup()
      rmSync(homeDir, { recursive: true, force: true })
    }
  })

  it('returns identity helper errors when no repository is open or JSON is invalid', async () => {
    const app = createApp('')

    expect((await app.fetch(new Request('http://localhost/api/git/identity/ssh-keys'))).status).toBe(400)
    expect((await app.fetch(new Request('http://localhost/api/git/identity/ssh-key/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sshKeyPath: '/missing' }),
    }))).status).toBe(400)

    const repo = makeGitRepo()
    try {
      const repoApp = createApp(repo.dir)
      expect((await repoApp.fetch(new Request('http://localhost/api/git/identity/ssh-key/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{bad-json',
      }))).status).toBe(400)
      expect((await repoApp.fetch(new Request('http://localhost/api/git/identity/ssh-key/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }))).status).toBe(400)
    } finally {
      repo.cleanup()
    }
  })
})

describe('gitContextHandler', () => {
  it('returns null for an active folder inside a repository', async () => {
    const repo = makeGitRepo()
    const nested = join(repo.dir, 'docs')
    mkdirSync(nested)

    try {
      const app = createApp(nested)
      const client = testClient(app)
      const res = await client.api.git.context.$get()
      expect(res.status).toBe(200)
      expect(await res.json()).toBeNull()
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
      writeFileSync(join(repo.dir, 'README.md'), 'dirty')

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

  it('returns failed responses when untracked files block the checkout itself', async () => {
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
        json: { target: 'feature-blocked', resolution: 'preview' },
      })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual(expect.objectContaining({
        ok: false,
        status: 'failed',
      }))
    } finally {
      repo.cleanup()
    }
  })

  it('returns blocked responses when the target branch is already checked out in another worktree', async () => {
    const repo = makeGitRepo()
    const workspace = mkdtempSync(join(tmpdir(), 'gitlocal-handler-worktree-'))
    const linkedWorktreePath = join(workspace, 'linked')

    try {
      const mainBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repo.dir,
        encoding: 'utf-8',
      }).stdout.trim()
      spawnSync('git', ['checkout', '-b', 'feature-worktree'], { cwd: repo.dir })
      spawnSync('git', ['checkout', mainBranch], { cwd: repo.dir })
      spawnSync('git', ['worktree', 'add', linkedWorktreePath, 'feature-worktree'], { cwd: repo.dir })

      const app = createApp(repo.dir)
      const client = testClient(app)
      const res = await client.api.branches.switch.$post({
        json: { target: 'feature-worktree', resolution: 'preview' },
      })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
      }))
    } finally {
      spawnSync('git', ['worktree', 'remove', '--force', linkedWorktreePath], { cwd: repo.dir })
      rmSync(workspace, { recursive: true, force: true })
      repo.cleanup()
    }
  })

  it('returns a 400 response for blocked branch switch results', async () => {
    const repo = makeGitRepo()

    try {
      const app = createApp(repo.dir)
      const client = testClient(app)
      const res = await client.api.branches.switch.$post({
        json: { target: '', resolution: 'preview' },
      })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
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
        { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false, syncState: 'local-uncommitted' },
        { name: 'notes.md', path: 'docs/notes.md', type: 'file', localOnly: false, syncState: 'local-uncommitted' },
      ])
    } finally {
      repo.cleanup()
    }
  })
})

describe('commitChangesHandler', () => {
  it('returns blocked when no repository is open', async () => {
    const app = createApp('')

    const res = await app.fetch(new Request('http://localhost/api/git/commit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Save from handler' }),
    }))

    expect(res.status).toBe(400)
    const body = await res.json() as { ok: boolean; status: string; message: string }
    expect(body.ok).toBe(false)
    expect(body.status).toBe('blocked')
    expect(body.message).toBe('No repository is currently open.')
  })

  it('rejects invalid JSON bodies', async () => {
    const repo = makeGitRepo()

    try {
      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{bad-json',
      }))

      expect(res.status).toBe(400)
      const body = await res.json() as { ok: boolean; status: string; message: string }
      expect(body.ok).toBe(false)
      expect(body.status).toBe('blocked')
      expect(body.message).toBe('Invalid JSON body.')
    } finally {
      repo.cleanup()
    }
  })

  it('creates a local commit for current repository changes', async () => {
    const repo = makeGitRepo()

    try {
      writeFileSync(join(repo.dir, 'README.md'), '# committed from handler')

      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Save from handler' }),
      }))

      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean; status: string; shortHash?: string }
      expect(body.ok).toBe(true)
      expect(body.status).toBe('committed')
      expect(body.shortHash).toBeTruthy()
      expect(spawnSync('git', ['log', '-1', '--pretty=%s'], { cwd: repo.dir, encoding: 'utf-8' }).stdout.trim()).toBe('Save from handler')
    } finally {
      repo.cleanup()
    }
  })

  it('returns a blocked response when there is nothing to commit', async () => {
    const repo = makeGitRepo()

    try {
      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Nothing changed' }),
      }))

      expect(res.status).toBe(400)
      const body = await res.json() as { ok: boolean; status: string; message: string }
      expect(body.ok).toBe(false)
      expect(body.status).toBe('blocked')
      expect(body.message).toMatch(/no local changes/i)
    } finally {
      repo.cleanup()
    }
  })

  it('rejects missing commit messages from an otherwise valid commit request', async () => {
    const repo = makeGitRepo()

    try {
      writeFileSync(join(repo.dir, 'README.md'), '# default commit message')

      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }))

      expect(res.status).toBe(400)
      const body = await res.json() as { ok: boolean; status: string; message: string }
      expect(body.ok).toBe(false)
      expect(body.status).toBe('blocked')
      expect(body.message).toBe('Enter a commit message before committing changes.')
    } finally {
      repo.cleanup()
    }
  })
})

describe('remoteSyncHandler', () => {
  it('returns blocked when no repository is open', async () => {
    const app = createApp('')

    const res = await app.fetch(new Request('http://localhost/api/git/sync', {
      method: 'POST',
    }))

    expect(res.status).toBe(400)
    const body = await res.json() as { ok: boolean; status: string; message: string }
    expect(body.ok).toBe(false)
    expect(body.status).toBe('blocked')
    expect(body.message).toBe('No repository is currently open.')
  })

  it('blocks sync when the working tree is dirty', async () => {
    const repo = makeGitRepo()

    try {
      const remoteDir = mkdtempSync(join(tmpdir(), 'gitlocal-handler-remote-'))
      spawnSync('git', ['init', '--bare'], { cwd: remoteDir })
      const currentBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repo.dir, encoding: 'utf-8' }).stdout.trim()
      spawnSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: repo.dir })
      spawnSync('git', ['push', '-u', 'origin', currentBranch], { cwd: repo.dir })
      writeFileSync(join(repo.dir, 'README.md'), '# dirty sync')

      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }))

      expect(res.status).toBe(400)
      const body = await res.json() as { ok: boolean; status: string; message: string }
      expect(body.ok).toBe(false)
      expect(body.status).toBe('blocked')
      expect(body.message).toMatch(/commit or discard local changes/i)

      rmSync(remoteDir, { recursive: true, force: true })
    } finally {
      repo.cleanup()
    }
  })

  it('accepts sync requests without a JSON body when the branch is up to date', async () => {
    const repo = makeGitRepo()
    const remoteDir = mkdtempSync(join(tmpdir(), 'gitlocal-handler-sync-clean-'))
    spawnSync('git', ['init', '--bare'], { cwd: remoteDir })

    try {
      const currentBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repo.dir, encoding: 'utf-8' }).stdout.trim()
      spawnSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: repo.dir })
      spawnSync('git', ['push', '-u', 'origin', currentBranch], { cwd: repo.dir })

      const app = createApp(repo.dir)
      const res = await app.fetch(new Request('http://localhost/api/git/sync', {
        method: 'POST',
      }))

      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean; status: string }
      expect(body.ok).toBe(true)
      expect(body.status).toBe('up-to-date')
    } finally {
      rmSync(remoteDir, { recursive: true, force: true })
      repo.cleanup()
    }
  })
})

describe('repositoryOpenHandler', () => {
  it('derives selectedPath from the canonicalized file path, not the raw request path, for a non-repo file', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'gitlocal-open-non-repo-'))
    const realFile = join(folder, 'real-name.md')
    const aliasLink = join(folder, 'alias-name.md')
    writeFileSync(realFile, '# Real file')

    try {
      if (platform() !== 'win32') {
        symlinkSync(realFile, aliasLink)
      }
      const requestPath = platform() === 'win32' ? realFile : aliasLink

      const app = createApp('')
      const res = await app.fetch(new Request('http://localhost/api/repo/open', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: requestPath }),
      }))

      expect(res.status).toBe(200)
      const body = await res.json() as { ok: boolean; selectedPath: string; path: string; gitState: string }
      expect(body.ok).toBe(true)
      expect(body.gitState).toBe('outside-repository')
      // The canonicalized path (following the symlink) points at the real file...
      expect(realpathSync(body.path)).toBe(realpathSync(realFile))
      // ...so selectedPath must reflect the real file's basename, not the raw
      // request path's (symlinked alias) basename.
      if (platform() !== 'win32') {
        expect(body.selectedPath).toBe(basename(realFile))
        expect(body.selectedPath).not.toBe(basename(aliasLink))
      }
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
