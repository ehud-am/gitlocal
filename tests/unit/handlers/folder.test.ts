import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp, getPickerPath, getRepoPath } from '../../../src/server.js'

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-folder-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  writeFileSync(join(dir, 'README.md'), '# folder test')
  mkdirSync(join(dir, 'docs'))
  writeFileSync(join(dir, 'docs', 'guide.md'), 'guide')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

function makeMixedPlainParent(): {
  parentDir: string
  repoChild: string
  regularChild: string
  emptyRepoChild: string
  linkedRepoChild: string
  linkedRegularChild: string
  worktreeChild: string
  brokenLink: string
  cleanup: () => void
} {
  const parentDir = mkdtempSync(join(tmpdir(), 'gitlocal-mixed-parent-'))
  const repoChild = join(parentDir, 'app-repo')
  const regularChild = join(parentDir, 'notes')
  const emptyRepoChild = join(parentDir, 'empty-repo')
  mkdirSync(repoChild)
  mkdirSync(regularChild)
  mkdirSync(emptyRepoChild)
  spawnSync('git', ['init'], { cwd: repoChild })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: repoChild })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: repoChild })
  writeFileSync(join(repoChild, 'README.md'), '# repo child')
  spawnSync('git', ['add', '.'], { cwd: repoChild })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoChild })

  const linkedRepoTarget = mkdtempSync(join(tmpdir(), 'gitlocal-linked-repo-target-'))
  spawnSync('git', ['init'], { cwd: linkedRepoTarget })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: linkedRepoTarget })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: linkedRepoTarget })
  writeFileSync(join(linkedRepoTarget, 'README.md'), '# linked repo child')
  spawnSync('git', ['add', '.'], { cwd: linkedRepoTarget })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: linkedRepoTarget })

  const linkedRepoChild = join(parentDir, 'linked-repo')
  symlinkSync(linkedRepoTarget, linkedRepoChild)

  spawnSync('git', ['init'], { cwd: emptyRepoChild })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: emptyRepoChild })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: emptyRepoChild })

  const linkedRegularTarget = mkdtempSync(join(tmpdir(), 'gitlocal-linked-folder-target-'))
  writeFileSync(join(linkedRegularTarget, 'notes.txt'), 'plain linked folder')
  const linkedRegularChild = join(parentDir, 'linked-notes')
  symlinkSync(linkedRegularTarget, linkedRegularChild)

  const worktreeBase = mkdtempSync(join(tmpdir(), 'gitlocal-worktree-base-'))
  spawnSync('git', ['init'], { cwd: worktreeBase })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: worktreeBase })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: worktreeBase })
  writeFileSync(join(worktreeBase, 'README.md'), '# worktree base')
  spawnSync('git', ['add', '.'], { cwd: worktreeBase })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: worktreeBase })
  const worktreeChild = join(parentDir, 'worktree-repo')
  spawnSync('git', ['worktree', 'add', '-b', 'worktree-child', worktreeChild], { cwd: worktreeBase })

  const brokenLink = join(parentDir, 'broken-link')
  symlinkSync(join(parentDir, 'missing-target'), brokenLink)

  return {
    parentDir,
    repoChild,
    regularChild,
    emptyRepoChild,
    linkedRepoChild,
    linkedRegularChild,
    worktreeChild,
    brokenLink,
    cleanup: () => {
      spawnSync('git', ['worktree', 'remove', '--force', worktreeChild], { cwd: worktreeBase })
      rmSync(parentDir, { recursive: true, force: true })
      rmSync(linkedRepoTarget, { recursive: true, force: true })
      rmSync(linkedRegularTarget, { recursive: true, force: true })
      rmSync(worktreeBase, { recursive: true, force: true })
    },
  }
}

function makeRepoWithNestedIndependentRepo(): { outerRepo: string; vendorDir: string; innerRepo: string; cleanup: () => void } {
  const outerRepo = mkdtempSync(join(tmpdir(), 'gitlocal-outer-repo-'))
  const vendorDir = join(outerRepo, 'vendor')
  const innerRepo = join(vendorDir, 'inner-repo')
  mkdirSync(vendorDir)
  mkdirSync(innerRepo)
  spawnSync('git', ['init'], { cwd: outerRepo })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: outerRepo })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: outerRepo })
  writeFileSync(join(outerRepo, 'README.md'), '# outer')
  writeFileSync(join(vendorDir, 'plain.txt'), 'plain vendor file')
  spawnSync('git', ['add', 'README.md', 'vendor/plain.txt'], { cwd: outerRepo })
  spawnSync('git', ['commit', '-m', 'outer init'], { cwd: outerRepo })

  spawnSync('git', ['init'], { cwd: innerRepo })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: innerRepo })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: innerRepo })
  writeFileSync(join(innerRepo, 'README.md'), '# inner')
  spawnSync('git', ['add', '.'], { cwd: innerRepo })
  spawnSync('git', ['commit', '-m', 'inner init'], { cwd: innerRepo })

  return { outerRepo, vendorDir, innerRepo, cleanup: () => rmSync(outerRepo, { recursive: true, force: true }) }
}

describe('folder and repository open handlers', () => {
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
    const res = await client.api.repo.open.$post({ json: { path: validDir } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.error).toBe('')
    expect(body.gitState).toBe('repository-root')
    expect(body.openMode).toBe('repository')
  })

  it('returns ok:false for a non-existent path', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.repo.open.$post({ json: { path: '/nonexistent/path/xyz' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('rejects invalid repository open JSON', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/repo/open', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json',
    }))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Invalid JSON body')
  })

  it('opens a selected file by using its parent folder as the active root', async () => {
    const app = createApp('')
    const client = testClient(app)
    const filePath = join(validDir, 'README.md')
    const res = await client.api.repo.open.$post({ json: { path: filePath } })
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.error).toBe('')
    expect(body.rootPath).toBe(realpathSync(validDir))
    expect(body.selectedPath).toBe('README.md')
    expect(body.selectedPathType).toBe('file')
    expect(body.gitState).toBe('inside-repository')
    expect(body.openMode).toBe('file')
    expect(body.repositoryRootPath).toBe(realpathSync(validDir))
    expect(getRepoPath()).toBe(realpathSync(validDir))
  })

  it('opens a selected file outside git by using its parent folder as the active root', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'plain-file-open-'))
    try {
      const filePath = join(folder, 'notes.txt')
      writeFileSync(filePath, 'notes')
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.repo.open.$post({ json: { path: filePath } })
      const body = await res.json()

      expect(body.ok).toBe(true)
      expect(body.rootPath).toBe(realpathSync(folder))
      expect(body.selectedPath).toBe('notes.txt')
      expect(body.selectedPathType).toBe('file')
      expect(body.gitState).toBe('outside-repository')
      expect(body.openMode).toBe('file')
      expect(body.repositoryRootPath).toBeUndefined()
      expect(getRepoPath()).toBe(realpathSync(folder))
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('updates server repoPath on success', async () => {
    const prefPath = join(validDir, 'startup-preference.json')
    process.env.GITLOCAL_STARTUP_PREFERENCE_PATH = prefPath
    const app = createApp('')
    const client = testClient(app)
    try {
      await client.api.repo.open.$post({ json: { path: validDir } })
      expect(getRepoPath()).toBe(realpathSync(validDir))
      expect(existsSync(prefPath)).toBe(true)
    } finally {
      delete process.env.GITLOCAL_STARTUP_PREFERENCE_PATH
      rmSync(prefPath, { force: true })
    }
  })

  it('opens a symlinked git repository as the canonical repository root', async () => {
    const linkPath = `${validDir}-link`
    try {
      symlinkSync(validDir, linkPath)
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.repo.open.$post({ json: { path: linkPath } })
      const body = await res.json()

      expect(body.ok).toBe(true)
      expect(body.rootPath).toBe(realpathSync(validDir))
      expect(body.path).toBe(realpathSync(validDir))
      expect(body.gitState).toBe('repository-root')
      expect(body.openMode).toBe('repository')
      expect(body.repositoryRootPath).toBe(realpathSync(validDir))
      expect(getRepoPath()).toBe(realpathSync(validDir))
    } finally {
      rmSync(linkPath, { recursive: true, force: true })
    }
  })

  it('returns ok:false when path field is missing', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.repo.open.$post({ json: { path: '' } })
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('returns ok:false for invalid JSON body', async () => {
    const app = createApp('')
    const res = await app.fetch(
      new Request('http://localhost/api/repo/open', {
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

  it('opens a non-git directory as a folder root', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'not-git-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.repo.open.$post({ json: { path: nonGitDir } })
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.error).toBe('')
      expect(body.gitState).toBe('outside-repository')
      expect(body.openMode).toBe('folder')
      expect(getRepoPath()).toBe(realpathSync(nonGitDir))
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('opens a nested folder inside a repository as a folder root', async () => {
    const nestedDir = join(validDir, 'docs')
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.repo.open.$post({ json: { path: nestedDir } })
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.error).toBe('')
    expect(body.rootPath).toBe(realpathSync(nestedDir))
    expect(body.gitState).toBe('inside-repository')
    expect(body.openMode).toBe('folder')
    expect(body.repositoryRootPath).toBe(realpathSync(validDir))
    expect(getRepoPath()).toBe(realpathSync(nestedDir))
  })

  it('returns browse results when loading folders', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.folder.browse.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.currentPath).toBe(process.cwd())
    expect(Array.isArray(body.entries)).toBe(true)
    expect(Array.isArray(body.roots)).toBe(true)
    expect(body.canCreateChild).toBe(true)
    expect(body.canCloneIntoChild).toBe(true)
  })

  it('uses a non-git startup folder as the active folder root', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'picker-start-'))
    try {
      const app = createApp(nonGitDir)
      const client = testClient(app)
      const res = await client.api.info.$get()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.path).toBe(realpathSync(nonGitDir))
      expect(body.pickerMode).toBe(false)
      expect(body.isGitRepo).toBe(false)
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('returns browse error details for a missing path', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.folder.browse.$get({
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
    const res = await client.api.folder.browse.$get({
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
    const res = await client.api.folder.browse.$get({
      query: { path: '/' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.currentPath).toBe('/')
    expect(body.parentPath).toBeNull()
  })

  it('reports setup capabilities for git and non-git folders', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'folder-capabilities-'))
    try {
      let app = createApp('')
      let client = testClient(app)
      let res = await client.api.folder.browse.$get({ query: { path: validDir } })
      let body = await res.json()
      expect(body.isGitRepo).toBe(true)
      expect(body.gitState).toBe('repository-root')
      expect(body.openMode).toBe('repository')
      expect(body.canOpen).toBe(true)
      expect(body.canInitGit).toBe(false)

      app = createApp('')
      client = testClient(app)
      res = await client.api.folder.browse.$get({ query: { path: nonGitDir } })
      body = await res.json()
      expect(body.isGitRepo).toBe(false)
      expect(body.gitState).toBe('outside-repository')
      expect(body.openMode).toBe('folder')
      expect(body.canOpen).toBe(true)
      expect(body.canInitGit).toBe(true)
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('returns files and folders when browsing a plain folder', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'folder-entry-list-'))
    try {
      const nestedDir = join(nonGitDir, 'docs')
      spawnSync('mkdir', [nestedDir])
      writeFileSync(join(nonGitDir, 'README.md'), '# Folder')

      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.folder.browse.$get({ query: { path: nonGitDir } })
      const body = await res.json()

      expect(body.entries).toMatchObject([
        { name: 'docs', path: nestedDir, type: 'dir', isGitRepo: false, gitState: 'outside-repository', openMode: 'folder' },
        { name: 'README.md', path: join(nonGitDir, 'README.md'), type: 'file', isGitRepo: false, openMode: 'file' },
      ])
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true })
    }
  })

  it('marks repository children inside plain folders as repositories', async () => {
    const mixed = makeMixedPlainParent()
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.folder.browse.$get({ query: { path: mixed.parentDir } })
      const body = await res.json()

      expect(body.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'app-repo',
          path: mixed.repoChild,
          type: 'dir',
          isGitRepo: true,
          gitState: 'repository-root',
          openMode: 'repository',
          repositoryRootPath: realpathSync(mixed.repoChild),
        }),
        expect.objectContaining({
          name: 'linked-repo',
          path: mixed.linkedRepoChild,
          type: 'dir',
          isGitRepo: true,
          gitState: 'repository-root',
          openMode: 'repository',
          repositoryRootPath: realpathSync(mixed.linkedRepoChild),
        }),
        expect.objectContaining({
          name: 'worktree-repo',
          path: mixed.worktreeChild,
          type: 'dir',
          isGitRepo: true,
          gitState: 'repository-root',
          openMode: 'repository',
          repositoryRootPath: realpathSync(mixed.worktreeChild),
        }),
      ]))
    } finally {
      mixed.cleanup()
    }
  })

  it('opens repository children from a plain parent as repository roots', async () => {
    const mixed = makeMixedPlainParent()
    try {
      const app = createApp('')
      const client = testClient(app)

      for (const repositoryPath of [mixed.linkedRepoChild, mixed.worktreeChild, mixed.emptyRepoChild]) {
        const res = await client.api.repo.open.$post({ json: { path: repositoryPath } })
        const body = await res.json()

        expect(body.ok).toBe(true)
        expect(body.rootPath).toBe(realpathSync(repositoryPath))
        expect(body.gitState).toBe('repository-root')
        expect(body.openMode).toBe('repository')
        expect(body.repositoryRootPath).toBe(realpathSync(repositoryPath))
        expect(getRepoPath()).toBe(realpathSync(repositoryPath))
      }
    } finally {
      mixed.cleanup()
    }
  })

  it('marks empty repository children inside plain folders as repositories', async () => {
    const mixed = makeMixedPlainParent()
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.folder.browse.$get({ query: { path: mixed.parentDir } })
      const body = await res.json()

      expect(body.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'empty-repo',
          path: mixed.emptyRepoChild,
          type: 'dir',
          isGitRepo: true,
          gitState: 'repository-root',
          openMode: 'repository',
          repositoryRootPath: realpathSync(mixed.emptyRepoChild),
        }),
      ]))
    } finally {
      mixed.cleanup()
    }
  })

  it('keeps regular siblings beside repository children in folder mode', async () => {
    const mixed = makeMixedPlainParent()
    try {
      const app = createApp('')
      const client = testClient(app)
      const browseRes = await client.api.folder.browse.$get({ query: { path: mixed.parentDir } })
      const browseBody = await browseRes.json()

      expect(browseBody.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'notes',
          path: mixed.regularChild,
          type: 'dir',
          isGitRepo: false,
          gitState: 'outside-repository',
          openMode: 'folder',
        }),
        expect.objectContaining({
          name: 'linked-notes',
          path: mixed.linkedRegularChild,
          type: 'dir',
          isGitRepo: false,
          gitState: 'outside-repository',
          openMode: 'folder',
        }),
      ]))

      const openRes = await client.api.repo.open.$post({ json: { path: mixed.regularChild } })
      const openBody = await openRes.json()

      expect(openBody.ok).toBe(true)
      expect(openBody.rootPath).toBe(realpathSync(mixed.regularChild))
      expect(openBody.gitState).toBe('outside-repository')
      expect(openBody.openMode).toBe('folder')
      expect(openBody.repositoryRootPath).toBeUndefined()
    } finally {
      mixed.cleanup()
    }
  })

  it('keeps browsing a parent folder when one child is a broken symlink', async () => {
    const mixed = makeMixedPlainParent()
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.folder.browse.$get({ query: { path: mixed.parentDir } })
      const body = await res.json()

      expect(body.error).toBe('')
      expect(body.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'app-repo', isGitRepo: true }),
        expect.objectContaining({
          name: 'broken-link',
          path: mixed.brokenLink,
          type: 'file',
          isGitRepo: false,
          openMode: 'blocked',
        }),
      ]))
    } finally {
      mixed.cleanup()
    }
  })

  it('marks nested independent repositories as repositories without promoting their parent folder', async () => {
    const nested = makeRepoWithNestedIndependentRepo()
    try {
      const app = createApp('')
      const client = testClient(app)

      const outerRes = await client.api.folder.browse.$get({ query: { path: nested.outerRepo } })
      const outerBody = await outerRes.json()
      expect(outerBody.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'vendor',
          path: nested.vendorDir,
          type: 'dir',
          isGitRepo: false,
          gitState: 'inside-repository',
          openMode: 'folder',
          repositoryRootPath: realpathSync(nested.outerRepo),
        }),
      ]))

      const vendorRes = await client.api.folder.browse.$get({ query: { path: nested.vendorDir } })
      const vendorBody = await vendorRes.json()
      expect(vendorBody.entries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'inner-repo',
          path: nested.innerRepo,
          type: 'dir',
          isGitRepo: true,
          gitState: 'repository-root',
          openMode: 'repository',
          repositoryRootPath: realpathSync(nested.innerRepo),
        }),
      ]))
    } finally {
      nested.cleanup()
    }
  })

  it('marks nested folders inside repositories as folders, not repositories', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.folder.browse.$get({ query: { path: validDir } })
    const body = await res.json()

    expect(body.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'docs',
        type: 'dir',
        isGitRepo: false,
        gitState: 'inside-repository',
        openMode: 'folder',
        repositoryRootPath: realpathSync(validDir),
      }),
    ]))
  })

  it('switches from a repo view into folder browsing at the parent folder', async () => {
    const app = createApp(validDir)
    const client = testClient(app)
    const res = await client.api.repo['parent-folder'].$post()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(getRepoPath()).toBe('')
    expect(getPickerPath()).toBe(realpathSync(dirname(validDir)))
  })

  it('returns an error when asking for a parent folder without an open repository', async () => {
    const app = createApp('')
    const client = testClient(app)
    const res = await client.api.repo['parent-folder'].$post()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain('No repository is currently open')
  })

  it('creates child folders from the setup routes', async () => {
    const parentDir = mkdtempSync(join(tmpdir(), 'folder-create-child-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.folder['create-child'].$post({
        json: { parentPath: parentDir, name: 'child' },
      })
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.path).toBe(join(parentDir, 'child'))

      const duplicate = await client.api.folder['create-child'].$post({
        json: { parentPath: parentDir, name: 'child' },
      })
      expect((await duplicate.json()).error).toContain('already exists')

      const missingFields = await client.api.folder['create-child'].$post({
        json: {} as { parentPath?: string; name?: string },
      })
      expect((await missingFields.json()).error).toContain('folder name is required')
    } finally {
      rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('initializes git repositories from the setup routes', async () => {
    const parentDir = mkdtempSync(join(tmpdir(), 'folder-init-repo-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const res = await client.api.folder['init-repository'].$post({
        json: { path: parentDir },
      })
      expect((await res.json()).ok).toBe(true)

      const duplicate = await client.api.folder['init-repository'].$post({
        json: { path: parentDir },
      })
      expect((await duplicate.json()).error).toContain('already a git repository')

      const missingPath = await client.api.folder['init-repository'].$post({
        json: {} as { path?: string },
      })
      expect((await missingPath.json()).error).toContain('not available')
    } finally {
      rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('clones repositories from the setup routes and validates bad requests', async () => {
    const parentDir = mkdtempSync(join(tmpdir(), 'folder-clone-repo-'))
    try {
      const app = createApp('')
      const client = testClient(app)
      const cloned = await client.api.folder['clone-repository'].$post({
        json: { parentPath: parentDir, name: 'clone-target', repositoryUrl: validDir },
      })
      const clonedBody = await cloned.json()
      expect(clonedBody.ok).toBe(true)
      expect(clonedBody.path).toBe(join(parentDir, 'clone-target'))

      const invalid = await client.api.folder['clone-repository'].$post({
        json: { parentPath: parentDir, name: 'another', repositoryUrl: '' },
      })
      expect((await invalid.json()).error).toContain('repository URL is required')

      const missingParent = await client.api.folder['clone-repository'].$post({
        json: { name: 'broken', repositoryUrl: validDir } as { parentPath?: string; name: string; repositoryUrl: string },
      })
      expect((await missingParent.json()).error).toContain('parent folder is not available')
    } finally {
      rmSync(parentDir, { recursive: true, force: true })
    }
  })

  it('returns invalid JSON errors for setup mutation routes', async () => {
    const app = createApp('')
    const createRes = await app.fetch(new Request('http://localhost/api/folder/create-child', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    }))
    expect((await createRes.json()).error).toContain('Invalid JSON')

    const initRes = await app.fetch(new Request('http://localhost/api/folder/init-repository', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    }))
    expect((await initRes.json()).error).toContain('Invalid JSON')

    const cloneRes = await app.fetch(new Request('http://localhost/api/folder/clone-repository', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    }))
    expect((await cloneRes.json()).error).toContain('Invalid JSON')
  })
})
