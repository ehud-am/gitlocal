import { describe, it, expect, vi, afterEach } from 'vitest'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import {
  applyFileSyncStates,
  cloneRepositoryInto,
  commitWorkingTreeChanges,
  convertGitRemoteToWebUrl,
  createChildFolder,
  spawnGit,
  validateRepo,
  getInfo,
  getPathSyncState,
  getGitRemoteContext,
  getGitUserIdentity,
  getRepoSyncState,
  setRepoGitIdentity,
  hasCommits,
  getBrowseableRootEntryCount,
  getBranches,
  getCommits,
  findReadme,
  detectFileType,
  getCurrentBranch,
  isWorkingTreeBranch,
  getWorkingTreeRevision,
  getPathType,
  getTrackedPathType,
  getTrackedWorkingTreeFiles,
  nearestExistingRepoPath,
  nearestExistingTrackedRepoPath,
  readWorkingTreeFile,
  getWorkingTreeChanges,
  getWorkingTreeSyncSummary,
  normalizeRepoRelativePath,
  syncCurrentBranchWithRemote,
  isPathInsideRepo,
  resolveSafeRepoPath,
  isIgnoredPath,
  getEditableState,
  getFileRevisionToken,
  initializeGitRepository,
  switchBranch,
  writeWorkingTreeTextFile,
  deleteWorkingTreeFile,
  listWorkingTreeDirectoryEntries,
} from '../../../src/git/repo.js'

afterEach(() => {
  vi.restoreAllMocks()
})

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir })
  writeFileSync(join(dir, 'README.md'), '# Test')
  writeFileSync(join(dir, 'main.ts'), 'console.log("hello")')
  writeFileSync(join(dir, 'notes.txt'), 'notes')
  mkdirSync(join(dir, 'docs'))
  writeFileSync(join(dir, 'docs', 'guide.md'), 'guide')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'initial commit'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

function makeBareRepo(prefix: string = 'gitlocal-remote-'): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  spawnSync('git', ['init', '--bare'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

function git(dir: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf-8' })
  expect(result.status).toBe(0)
  return result.stdout.trim()
}

describe('spawnGit', () => {
  it('returns stdout for a valid git command', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const out = spawnGit(dir, 'rev-parse', '--is-inside-work-tree')
      expect(out).toBe('true')
    } finally {
      cleanup()
    }
  })

  it('throws on non-zero exit', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      expect(() => spawnGit(dir, 'checkout', 'nonexistent-branch-xyz')).toThrow()
    } finally {
      cleanup()
    }
  })
})

describe('validateRepo', () => {
  it('returns true for a valid git repo', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      expect(validateRepo(dir)).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('returns false for a non-git directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'not-git-'))
    try {
      expect(validateRepo(dir)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('getInfo', () => {
  it('returns picker mode when repoPath is empty', () => {
    const info = getInfo('')
    expect(info.pickerMode).toBe(true)
    expect(info.isGitRepo).toBe(false)
  })

  it('returns repo metadata for a valid git repo', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const info = getInfo(dir)
      expect(info.isGitRepo).toBe(true)
      expect(info.pickerMode).toBe(false)
      expect(info.currentBranch).toBeTruthy()
      expect(info.name).toBeTruthy()
      expect(info.hasCommits).toBe(true)
      expect(info.rootEntryCount).toBe(4)
    } finally {
      cleanup()
    }
  })

  it('returns isGitRepo false for non-git path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'not-git-'))
    try {
      const info = getInfo(dir)
      expect(info.isGitRepo).toBe(false)
      expect(info.pickerMode).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('getAppVersion', () => {
  it('falls back to the second package.json candidate when the first read fails', async () => {
    vi.resetModules()
    const readFileSyncMock = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error('missing first candidate')
      })
      .mockImplementationOnce(() => JSON.stringify({ version: '9.9.9' }))

    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
      return {
        ...actual,
        readFileSync: readFileSyncMock,
      }
    })

    const { getAppVersion } = await import('../../../src/git/repo.js?version-fallback-second')
    expect(getAppVersion()).toBe('9.9.9')
    expect(readFileSyncMock).toHaveBeenCalledTimes(2)
  })

  it('returns 0.0.0 when no package.json candidate can be read', async () => {
    vi.resetModules()
    const readFileSyncMock = vi.fn(() => {
      throw new Error('missing package metadata')
    })

    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
      return {
        ...actual,
        readFileSync: readFileSyncMock,
      }
    })

    const { getAppVersion } = await import('../../../src/git/repo.js?version-fallback-none')
    expect(getAppVersion()).toBe('0.0.0')
  })
})

describe('getInfo — empty repo', () => {
  it('returns empty currentBranch for a git repo with no commits', () => {
    const dir = mkdtempSync(join(tmpdir(), 'empty-git-'))
    spawnSync('git', ['init'], { cwd: dir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
    // No commit — git rev-parse --abbrev-ref HEAD will fail
    try {
      const info = getInfo(dir)
      expect(info.isGitRepo).toBe(true)
      expect(info.currentBranch).toBe('')
      expect(info.hasCommits).toBe(false)
      expect(info.rootEntryCount).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('hasCommits', () => {
  it('returns true for a repository with at least one commit', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      expect(hasCommits(dir)).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('returns false for a repository with no commits yet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'empty-git-commits-'))
    spawnSync('git', ['init'], { cwd: dir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
    try {
      expect(hasCommits(dir)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('getBranches', () => {
  it('returns branches with one marked current', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const branches = getBranches(dir)
      expect(branches.length).toBeGreaterThan(0)
      const current = branches.filter((b) => b.isCurrent)
      expect(current.length).toBe(1)
    } finally {
      cleanup()
    }
  })
})

describe('getCommits', () => {
  it('returns commits with required fields', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const branch = getBranches(dir).find((b) => b.isCurrent)!.name
      const commits = getCommits(dir, branch, 10)
      expect(commits.length).toBeGreaterThan(0)
      expect(commits[0].hash).toHaveLength(40)
      expect(commits[0].shortHash).toHaveLength(7)
      expect(commits[0].author).toBe('Test User')
      expect(commits[0].message).toBe('initial commit')
    } finally {
      cleanup()
    }
  })

  it('respects the limit parameter', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const branch = getBranches(dir).find((b) => b.isCurrent)!.name
      const commits = getCommits(dir, branch, 1)
      expect(commits.length).toBeLessThanOrEqual(1)
    } finally {
      cleanup()
    }
  })
})

describe('findReadme', () => {
  it('finds README.md case-insensitively', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const branch = getBranches(dir).find((b) => b.isCurrent)!.name
      const readme = findReadme(dir, branch)
      expect(readme.toLowerCase()).toContain('readme')
    } finally {
      cleanup()
    }
  })

  it('finds an uncommitted working-tree README in a newly initialized repository', () => {
    const dir = mkdtempSync(join(tmpdir(), 'working-tree-readme-'))
    spawnSync('git', ['init'], { cwd: dir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
    writeFileSync(join(dir, 'README.md'), '# Draft readme')

    try {
      expect(findReadme(dir, 'HEAD')).toBe('README.md')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('getBranches — failure paths', () => {
  it('returns empty array for a non-git directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'no-git-'))
    try {
      const result = getBranches(dir)
      expect(result).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('getCommits — failure paths', () => {
  it('returns empty array for an invalid branch', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const result = getCommits(dir, 'nonexistent-branch-xyz', 5)
      expect(result).toEqual([])
    } finally {
      cleanup()
    }
  })

  it('caps limit at 100', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const branch = getBranches(dir).find((b) => b.isCurrent)!.name
      const result = getCommits(dir, branch, 200)
      // Should not throw; limit is capped internally
      expect(Array.isArray(result)).toBe(true)
    } finally {
      cleanup()
    }
  })
})

describe('findReadme — no readme', () => {
  it('returns empty string when no README file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'no-readme-'))
    spawnSync('git', ['init'], { cwd: dir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
    spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
    writeFileSync(join(dir, 'main.ts'), '')
    spawnSync('git', ['add', '.'], { cwd: dir })
    spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
    const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf-8' }).stdout.trim()
    try {
      expect(findReadme(dir, branch)).toBe('')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns empty string for invalid branch', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      expect(findReadme(dir, 'no-such-branch')).toBe('')
    } finally {
      cleanup()
    }
  })
})

describe('detectFileType', () => {
  it('detects markdown', () => {
    expect(detectFileType('README.md').type).toBe('markdown')
    expect(detectFileType('docs.mdx').type).toBe('markdown')
  })

  it('detects images', () => {
    expect(detectFileType('logo.png').type).toBe('image')
    expect(detectFileType('photo.jpg').type).toBe('image')
  })

  it('detects text with language hint', () => {
    const ts = detectFileType('index.ts')
    expect(ts.type).toBe('text')
    expect(ts.language).toBe('typescript')
    const py = detectFileType('script.py')
    expect(py.type).toBe('text')
    expect(py.language).toBe('python')
  })

  it('detects binary files', () => {
    expect(detectFileType('app.exe').type).toBe('binary')
    expect(detectFileType('archive.zip').type).toBe('binary')
  })

  it('falls back to text for unknown extensions', () => {
    expect(detectFileType('weirdfile.xyz').type).toBe('text')
  })

  it('detects more language types', () => {
    expect(detectFileType('app.go').language).toBe('go')
    expect(detectFileType('style.css').language).toBe('css')
    expect(detectFileType('config.yaml').language).toBe('yaml')
    expect(detectFileType('schema.sql').language).toBe('sql')
    expect(detectFileType('Dockerfile').type).toBe('text')
  })

  it('handles files with no extension', () => {
    const result = detectFileType('Makefile')
    expect(result.type).toBe('text')
  })
})

describe('working tree helpers', () => {
  it('returns the current branch name and recognizes working-tree branches', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const branch = getCurrentBranch(dir)
      expect(branch).toBeTruthy()
      expect(isWorkingTreeBranch(dir, branch)).toBe(true)
      expect(isWorkingTreeBranch(dir, 'nonexistent')).toBe(false)
    } finally {
      cleanup()
    }
  })

  it('changes the working tree revision when tracked files change on disk', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const before = getWorkingTreeRevision(dir)
      writeFileSync(join(dir, 'main.ts'), 'console.log("updated")')
      const after = getWorkingTreeRevision(dir)
      expect(after).not.toBe(before)
    } finally {
      cleanup()
    }
  })

  it('reports path types, nearest fallback paths, and reads working tree files', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      expect(getPathType(dir, '')).toBe('none')
      expect(getPathType(dir, 'docs')).toBe('dir')
      expect(getPathType(dir, 'README.md')).toBe('file')
      expect(getPathType(dir, 'missing/file.md')).toBe('missing')
      expect(nearestExistingRepoPath(dir, 'docs/missing/file.md')).toBe('docs')
      expect(nearestExistingRepoPath(dir, 'README.md')).toBe('README.md')
      expect(nearestExistingRepoPath(dir, 'missing/file.md')).toBe('')
      expect(readWorkingTreeFile(dir, 'README.md')?.toString('utf-8')).toContain('# Test')
      expect(readWorkingTreeFile(dir, 'docs')).toBeNull()
      expect(readWorkingTreeFile(dir, 'missing.md')).toBeNull()
    } finally {
      cleanup()
    }
  })

  it('normalizes and validates repository-relative paths', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      expect(normalizeRepoRelativePath('./docs/guide.md')).toBe('docs/guide.md')
      expect(normalizeRepoRelativePath('\\docs\\guide.md')).toBe('docs/guide.md')
      expect(isPathInsideRepo(dir, 'docs/guide.md')).toBe(true)
      expect(isPathInsideRepo(dir, '../outside.txt')).toBe(false)
      expect(resolveSafeRepoPath(dir, '../outside.txt')).toBeNull()
    } finally {
      cleanup()
    }
  })

  it('returns tracked files and tracked path types without surfacing untracked files', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, 'scratch.txt'), 'local-only')
      expect(getTrackedWorkingTreeFiles(dir)).toContain('docs/guide.md')
      expect(getTrackedWorkingTreeFiles(dir)).not.toContain('scratch.txt')
      expect(getTrackedPathType(dir, '')).toBe('none')
      expect(getTrackedPathType(dir, 'docs')).toBe('dir')
      expect(getTrackedPathType(dir, 'docs/guide.md')).toBe('file')
      expect(getTrackedPathType(dir, 'scratch.txt')).toBe('missing')
      expect(nearestExistingTrackedRepoPath(dir, 'docs/guide.md')).toBe('docs/guide.md')
      expect(nearestExistingTrackedRepoPath(dir, 'docs/guide.md/missing')).toBe('docs/guide.md')
      expect(nearestExistingTrackedRepoPath(dir, 'docs/missing/file.md')).toBe('docs')
    } finally {
      cleanup()
    }
  })

  it('returns an empty tracked file list for invalid repositories', () => {
    expect(getTrackedWorkingTreeFiles(join(tmpdir(), 'definitely-missing-repo'))).toEqual([])
  })

  it('returns an empty tracked fallback when no tracked path exists', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      expect(nearestExistingTrackedRepoPath(dir, 'missing/file.md')).toBe('')
    } finally {
      cleanup()
    }
  })

  it('computes editable state and revision tokens for working-tree files only', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const branch = getCurrentBranch(dir)
      const editable = getEditableState(dir, 'README.md', branch)
      expect(editable.editable).toBe(true)
      expect(editable.revisionToken).toBeTruthy()
      expect(getEditableState(dir, 'missing.txt', branch)).toEqual({ editable: false, revisionToken: null })
      expect(getEditableState(dir, 'README.md', 'feature-missing')).toEqual({ editable: false, revisionToken: null })
      expect(getFileRevisionToken(dir, 'missing.txt')).toBeNull()
    } finally {
      cleanup()
    }
  })

  it('writes, lists, ignores, and deletes working-tree files safely', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
      writeWorkingTreeTextFile(dir, 'notes/new.md', 'hello')
      expect(readWorkingTreeFile(dir, 'notes/new.md')?.toString('utf-8')).toBe('hello')
      expect(listWorkingTreeDirectoryEntries(dir, 'notes').some((node) => node.path === 'notes/new.md')).toBe(true)
      writeFileSync(join(dir, 'ignored.txt'), 'skip me')
      expect(isIgnoredPath(dir, 'ignored.txt')).toBe(true)
      expect(listWorkingTreeDirectoryEntries(dir, '').some((node) => node.path === 'ignored.txt' && node.localOnly === true)).toBe(true)
      deleteWorkingTreeFile(dir, 'notes/new.md')
      expect(readWorkingTreeFile(dir, 'notes/new.md')).toBeNull()
      expect(() => writeWorkingTreeTextFile(dir, '../escape.txt', 'x')).toThrow(/inside the opened repository/i)
      expect(() => deleteWorkingTreeFile(dir, '../escape.txt')).toThrow(/inside the opened repository/i)
    } finally {
      cleanup()
    }
  })

  it('classifies file sync states from working tree and upstream differences', () => {
    const { dir, cleanup } = makeGitRepo()
    const remote = makeBareRepo('gitlocal-sync-remote-')
    const cloneParent = mkdtempSync(join(tmpdir(), 'gitlocal-sync-clone-'))
    const cloneDir = join(cloneParent, 'clone')

    try {
      const currentBranch = getCurrentBranch(dir)
      git(dir, 'remote', 'add', 'origin', remote.dir)
      git(dir, 'push', '-u', 'origin', currentBranch)

      writeFileSync(join(dir, 'notes.txt'), 'local committed')
      git(dir, 'add', 'notes.txt')
      git(dir, 'commit', '-m', 'local ahead change')

      spawnSync('git', ['clone', remote.dir, cloneDir], { encoding: 'utf-8' })
      spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: cloneDir })
      spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: cloneDir })
      writeFileSync(join(cloneDir, 'docs', 'guide.md'), 'remote committed')
      spawnSync('git', ['add', 'docs/guide.md'], { cwd: cloneDir })
      spawnSync('git', ['commit', '-m', 'remote behind change'], { cwd: cloneDir })
      spawnSync('git', ['push'], { cwd: cloneDir })
      git(dir, 'fetch', 'origin')

      writeFileSync(join(dir, 'README.md'), '# local dirty')

      expect(getRepoSyncState(dir)).toEqual(expect.objectContaining({
        mode: 'diverged',
        aheadCount: 1,
        behindCount: 1,
        hasUpstream: true,
      }))
      expect(getWorkingTreeSyncSummary(dir)).toEqual(expect.objectContaining({
        trackedChangeCount: 1,
        untrackedChangeCount: 0,
      }))
      expect(getPathSyncState(dir, 'README.md')).toBe('local-uncommitted')
      expect(getPathSyncState(dir, 'notes.txt')).toBe('local-committed')
      expect(getPathSyncState(dir, 'docs/guide.md')).toBe('remote-committed')

      expect(applyFileSyncStates(dir, [
        { name: 'README.md', path: 'README.md', type: 'file', localOnly: false },
        { name: 'notes.txt', path: 'notes.txt', type: 'file', localOnly: false },
        { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false },
      ])).toEqual([
        { name: 'README.md', path: 'README.md', type: 'file', localOnly: false, syncState: 'local-uncommitted' },
        { name: 'notes.txt', path: 'notes.txt', type: 'file', localOnly: false, syncState: 'local-committed' },
        { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false, syncState: 'remote-committed' },
      ])
    } finally {
      rmSync(cloneParent, { recursive: true, force: true })
      cleanup()
      remote.cleanup()
    }
  })

  it('reports unavailable repo sync state for invalid repositories and rev-list failures', async () => {
    expect(getRepoSyncState(join(tmpdir(), 'missing-sync-state-repo'))).toEqual({
      mode: 'unavailable',
      aheadCount: 0,
      behindCount: 0,
      hasUpstream: false,
      upstreamRef: '',
      remoteName: '',
    })

    const remote = makeBareRepo('gitlocal-sync-state-missing-upstream-')
    const repo = makeGitRepo()

    try {
      vi.resetModules()
      vi.doMock('node:child_process', async () => {
        const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
        return {
          ...actual,
          spawnSync: vi.fn((command: string, args: string[]) => {
            if (command !== 'git') return actual.spawnSync(command, args)
            if (args[0] === 'rev-parse' && args.includes('--is-inside-work-tree')) {
              return { status: 0, stdout: 'true\n', stderr: '' }
            }
            if (args[0] === 'rev-parse' && args.includes('--symbolic-full-name')) {
              return { status: 0, stdout: 'origin/main\n', stderr: '' }
            }
            if (args[0] === 'rev-list') {
              return { status: 1, stdout: '', stderr: 'bad revision' }
            }
            return actual.spawnSync(command, args)
          }),
        }
      })

      const { getRepoSyncState: getRepoSyncStateWithMock } = await import('../../../src/git/repo.js?sync-state-rev-list-failure')
      expect(getRepoSyncStateWithMock(repo.dir)).toEqual({
        mode: 'unavailable',
        aheadCount: 0,
        behindCount: 0,
        hasUpstream: true,
        upstreamRef: 'origin/main',
        remoteName: 'origin',
      })
    } finally {
      vi.doUnmock('node:child_process')
      vi.resetModules()
      repo.cleanup()
      remote.cleanup()
    }
  })

  it('creates a local commit from working-tree changes', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, 'README.md'), '# updated')
      const result = commitWorkingTreeChanges(dir, 'Save work')
      expect(result).toEqual(expect.objectContaining({
        ok: true,
        status: 'committed',
        shortHash: expect.any(String),
      }))
      expect(git(dir, 'log', '-1', '--pretty=%s')).toBe('Save work')
    } finally {
      cleanup()
    }
  })

  it('blocks commits when no repository is open or the message is blank', () => {
    expect(commitWorkingTreeChanges(join(tmpdir(), 'missing-commit-repo'), 'Save work')).toEqual({
      ok: false,
      status: 'blocked',
      message: 'No git repository is currently open.',
    })

    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, 'README.md'), '# updated')
      expect(commitWorkingTreeChanges(dir, '   ')).toEqual({
        ok: false,
        status: 'blocked',
        message: 'Enter a commit message before committing changes.',
      })
    } finally {
      cleanup()
    }
  })

  it('surfaces commit failures from git', () => {
    const originalHome = process.env.HOME
    const homeDir = mkdtempSync(join(tmpdir(), 'gitlocal-commit-failure-home-'))
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-commit-failure-'))
    spawnSync('git', ['init'], { cwd: dir })
    writeFileSync(join(dir, 'README.md'), '# missing identity')

    try {
      process.env.HOME = homeDir
      const result = commitWorkingTreeChanges(dir, 'Will fail')
      expect(result).toEqual(expect.objectContaining({
        ok: false,
        status: 'failed',
      }))
    } finally {
      process.env.HOME = originalHome
      rmSync(homeDir, { recursive: true, force: true })
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('pushes ahead-only branches and fast-forward pulls behind-only branches', () => {
    const remote = makeBareRepo('gitlocal-sync-roundtrip-')
    const first = makeGitRepo()
    const secondParent = mkdtempSync(join(tmpdir(), 'gitlocal-sync-second-'))
    const second = join(secondParent, 'clone')

    try {
      const branch = getCurrentBranch(first.dir)
      git(first.dir, 'remote', 'add', 'origin', remote.dir)
      git(first.dir, 'push', '-u', 'origin', branch)

      writeFileSync(join(first.dir, 'notes.txt'), 'push me')
      git(first.dir, 'add', 'notes.txt')
      git(first.dir, 'commit', '-m', 'ahead commit')
      expect(syncCurrentBranchWithRemote(first.dir)).toEqual(expect.objectContaining({
        ok: true,
        status: 'pushed',
      }))

      spawnSync('git', ['clone', remote.dir, second], { encoding: 'utf-8' })
      spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: second })
      spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: second })
      writeFileSync(join(second, 'README.md'), '# pulled')
      spawnSync('git', ['add', 'README.md'], { cwd: second })
      spawnSync('git', ['commit', '-m', 'behind commit'], { cwd: second })
      spawnSync('git', ['push'], { cwd: second })

      expect(syncCurrentBranchWithRemote(first.dir)).toEqual(expect.objectContaining({
        ok: true,
        status: 'pulled',
      }))
      expect(readWorkingTreeFile(first.dir, 'README.md')?.toString('utf-8')).toBe('# pulled')
    } finally {
      rmSync(secondParent, { recursive: true, force: true })
      first.cleanup()
      remote.cleanup()
    }
  })

  it('reports up-to-date branches when local and upstream already match', () => {
    const remote = makeBareRepo('gitlocal-sync-clean-')
    const repo = makeGitRepo()

    try {
      const branch = getCurrentBranch(repo.dir)
      git(repo.dir, 'remote', 'add', 'origin', remote.dir)
      git(repo.dir, 'push', '-u', 'origin', branch)

      expect(syncCurrentBranchWithRemote(repo.dir)).toEqual(expect.objectContaining({
        ok: true,
        status: 'up-to-date',
        aheadCount: 0,
        behindCount: 0,
      }))
    } finally {
      repo.cleanup()
      remote.cleanup()
    }
  })

  it('blocks sync when the repository has no named current branch yet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-sync-headless-'))
    spawnSync('git', ['init'], { cwd: dir })
    spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir })

    try {
      expect(syncCurrentBranchWithRemote(dir)).toEqual({
        ok: false,
        status: 'blocked',
        message: 'Sync is only available on a named current branch.',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('blocks sync when no repository is currently open', () => {
    expect(syncCurrentBranchWithRemote(join(tmpdir(), 'missing-sync-repo'))).toEqual({
      ok: false,
      status: 'blocked',
      message: 'No git repository is currently open.',
    })
  })

  it('blocks sync when the current branch does not track an upstream remote', () => {
    const repo = makeGitRepo()

    try {
      expect(syncCurrentBranchWithRemote(repo.dir)).toEqual({
        ok: false,
        status: 'blocked',
        message: 'This branch does not have an upstream remote to sync with.',
      })
    } finally {
      repo.cleanup()
    }
  })

  it('surfaces fetch failures before attempting sync actions', () => {
    const remote = makeBareRepo('gitlocal-sync-fetch-failure-')
    const repo = makeGitRepo()

    try {
      const branch = getCurrentBranch(repo.dir)
      git(repo.dir, 'remote', 'add', 'origin', remote.dir)
      git(repo.dir, 'push', '-u', 'origin', branch)
      remote.cleanup()

      expect(syncCurrentBranchWithRemote(repo.dir)).toEqual(expect.objectContaining({
        ok: false,
        status: 'failed',
      }))
    } finally {
      repo.cleanup()
    }
  })

  it('blocks sync when fetching prunes the upstream branch away', () => {
    const remote = makeBareRepo('gitlocal-sync-missing-upstream-')
    const repo = makeGitRepo()

    try {
      const branch = getCurrentBranch(repo.dir)
      git(repo.dir, 'remote', 'add', 'origin', remote.dir)
      git(repo.dir, 'push', '-u', 'origin', branch)
      git(remote.dir, 'update-ref', '-d', `refs/heads/${branch}`)

      expect(syncCurrentBranchWithRemote(repo.dir)).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
        message: 'This branch is not in a syncable state.',
      }))
    } finally {
      repo.cleanup()
      remote.cleanup()
    }
  })

  it('blocks sync when local and remote history diverged', () => {
    const remote = makeBareRepo('gitlocal-sync-diverged-')
    const first = makeGitRepo()
    const secondParent = mkdtempSync(join(tmpdir(), 'gitlocal-sync-diverged-second-'))
    const second = join(secondParent, 'clone')

    try {
      const branch = getCurrentBranch(first.dir)
      git(first.dir, 'remote', 'add', 'origin', remote.dir)
      git(first.dir, 'push', '-u', 'origin', branch)

      writeFileSync(join(first.dir, 'notes.txt'), 'local diverged')
      git(first.dir, 'add', 'notes.txt')
      git(first.dir, 'commit', '-m', 'local diverged commit')

      spawnSync('git', ['clone', remote.dir, second], { encoding: 'utf-8' })
      spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: second })
      spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: second })
      writeFileSync(join(second, 'README.md'), '# remote diverged')
      spawnSync('git', ['add', 'README.md'], { cwd: second })
      spawnSync('git', ['commit', '-m', 'remote diverged commit'], { cwd: second })
      spawnSync('git', ['push'], { cwd: second })

      expect(syncCurrentBranchWithRemote(first.dir)).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
        message: 'Local and remote history diverged. Resolve it manually before syncing in GitLocal.',
        aheadCount: 1,
        behindCount: 1,
      }))
    } finally {
      rmSync(secondParent, { recursive: true, force: true })
      first.cleanup()
      remote.cleanup()
    }
  })

  it('surfaces push failures after a successful fetch', () => {
    const remote = makeBareRepo('gitlocal-sync-push-failure-')
    const repo = makeGitRepo()

    try {
      const branch = getCurrentBranch(repo.dir)
      git(repo.dir, 'remote', 'add', 'origin', remote.dir)
      git(repo.dir, 'push', '-u', 'origin', branch)

      writeFileSync(join(remote.dir, 'hooks', 'pre-receive'), '#!/bin/sh\necho "push rejected for test" >&2\nexit 1\n')
      chmodSync(join(remote.dir, 'hooks', 'pre-receive'), 0o755)

      writeFileSync(join(repo.dir, 'notes.txt'), 'push should fail')
      git(repo.dir, 'add', 'notes.txt')
      git(repo.dir, 'commit', '-m', 'ahead but rejected')

      expect(syncCurrentBranchWithRemote(repo.dir)).toEqual(expect.objectContaining({
        ok: false,
        status: 'failed',
        message: expect.stringContaining('push rejected for test'),
      }))
    } finally {
      repo.cleanup()
      remote.cleanup()
    }
  })

  it('surfaces ignored directories and their children as local-only entries', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, '.gitignore'), 'cache/\n')
      mkdirSync(join(dir, 'cache'))
      writeFileSync(join(dir, 'cache', 'draft.txt'), 'draft')

      expect(listWorkingTreeDirectoryEntries(dir, '').some((node) => node.path === 'cache' && node.type === 'dir' && node.localOnly === true)).toBe(true)
      expect(listWorkingTreeDirectoryEntries(dir, 'cache').some((node) => node.path === 'cache/draft.txt' && node.localOnly === true)).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('counts only browseable root entries for landing-state decisions', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
      writeFileSync(join(dir, 'ignored.txt'), 'skip me')
      expect(getBrowseableRootEntryCount(dir)).toBe(5)
    } finally {
      cleanup()
    }
  })

  it('converts supported git remote URLs into browser URLs', () => {
    expect(convertGitRemoteToWebUrl('https://github.com/example/project.git')).toBe('https://github.com/example/project')
    expect(convertGitRemoteToWebUrl('ssh://git@github.com/example/project.git')).toBe('https://github.com/example/project')
    expect(convertGitRemoteToWebUrl('git@github.com:example/project.git')).toBe('https://github.com/example/project')
    expect(convertGitRemoteToWebUrl('https://')).toBe('https:')
    expect(convertGitRemoteToWebUrl('git://github.com/example/project')).toBe('')
    expect(convertGitRemoteToWebUrl('file:///tmp/project')).toBe('')
    expect(convertGitRemoteToWebUrl('/tmp/project')).toBe('')
  })

  it('resolves git user identity from local and global configuration', () => {
    const originalHome = process.env.HOME
    const homeDir = mkdtempSync(join(tmpdir(), 'gitlocal-home-'))
    const { dir, cleanup } = makeGitRepo()

    try {
      process.env.HOME = homeDir
      spawnSync('git', ['config', '--global', 'user.name', 'Global User'], { encoding: 'utf-8' })
      spawnSync('git', ['config', '--global', 'user.email', 'global@example.com'], { encoding: 'utf-8' })

      spawnSync('git', ['config', '--local', 'user.name', 'Local User'], { cwd: dir, encoding: 'utf-8' })
      spawnSync('git', ['config', '--local', '--unset', 'user.email'], { cwd: dir, encoding: 'utf-8' })

      expect(getGitUserIdentity(dir)).toEqual({
        name: 'Local User',
        email: 'global@example.com',
        source: 'mixed',
      })

      spawnSync('git', ['config', '--local', 'user.email', 'local@example.com'], { cwd: dir, encoding: 'utf-8' })
      expect(getGitUserIdentity(dir)).toEqual({
        name: 'Local User',
        email: 'local@example.com',
        source: 'local',
      })
    } finally {
      process.env.HOME = originalHome
      rmSync(homeDir, { recursive: true, force: true })
      cleanup()
    }
  })

  it('writes git identity into the repository local config', () => {
    const originalHome = process.env.HOME
    const homeDir = mkdtempSync(join(tmpdir(), 'gitlocal-update-home-'))
    const { dir, cleanup } = makeGitRepo()

    try {
      process.env.HOME = homeDir
      spawnSync('git', ['config', '--global', 'user.name', 'Global User'], { encoding: 'utf-8' })
      spawnSync('git', ['config', '--global', 'user.email', 'global@example.com'], { encoding: 'utf-8' })

      const result = setRepoGitIdentity(dir, 'Repo User', 'repo@example.com')

      expect(result).toEqual({
        ok: true,
        message: 'Repository git identity updated.',
        user: {
          name: 'Repo User',
          email: 'repo@example.com',
          source: 'local',
        },
      })
      expect(getGitUserIdentity(dir)).toEqual(result.user)
      expect(git(dir, 'config', '--local', 'user.name')).toBe('Repo User')
      expect(git(dir, 'config', '--local', 'user.email')).toBe('repo@example.com')
    } finally {
      process.env.HOME = originalHome
      rmSync(homeDir, { recursive: true, force: true })
      cleanup()
    }
  })

  it('rejects incomplete repository git identity updates', () => {
    const { dir, cleanup } = makeGitRepo()

    try {
      expect(() => setRepoGitIdentity(dir, 'Repo User', '   ')).toThrow('Git email is required.')
      expect(() => setRepoGitIdentity(join(tmpdir(), 'definitely-missing-repo'), 'Repo User', 'repo@example.com')).toThrow(
        'No repository is currently open.',
      )
    } finally {
      cleanup()
    }
  })

  it('surfaces git config write failures when updating repository identity', () => {
    const { dir, cleanup } = makeGitRepo()
    const gitDir = join(dir, '.git')

    try {
      chmodSync(gitDir, 0o500)
      expect(() => setRepoGitIdentity(dir, 'Blocked User', 'blocked@example.com')).toThrow()
    } finally {
      chmodSync(gitDir, 0o700)
      cleanup()
    }
  })

  it('returns null when git identity and remotes are unavailable', () => {
    const originalHome = process.env.HOME
    const homeDir = mkdtempSync(join(tmpdir(), 'gitlocal-empty-home-'))
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-identity-'))
    spawnSync('git', ['init'], { cwd: dir })

    try {
      process.env.HOME = homeDir
      expect(getGitUserIdentity(dir)).toBeNull()
      expect(getGitRemoteContext(dir)).toBeNull()
    } finally {
      process.env.HOME = originalHome
      rmSync(homeDir, { recursive: true, force: true })
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('selects upstream, then origin, then the first configured remote for repo context', () => {
    const { dir, cleanup } = makeGitRepo()
    const upstreamRemote = makeBareRepo('gitlocal-upstream-')
    const originRemote = makeBareRepo('gitlocal-origin-')
    const mirrorRemote = makeBareRepo('gitlocal-mirror-')
    const currentBranch = getCurrentBranch(dir)

    try {
      git(dir, 'remote', 'add', 'origin', originRemote.dir)
      git(dir, 'remote', 'add', 'upstream', upstreamRemote.dir)
      git(dir, 'config', `branch.${currentBranch}.remote`, 'upstream')
      git(dir, 'config', `branch.${currentBranch}.merge`, `refs/heads/${currentBranch}`)

      expect(getGitRemoteContext(dir)).toEqual(expect.objectContaining({
        name: 'upstream',
        selectionReason: 'upstream',
      }))

      git(dir, 'config', '--unset', `branch.${currentBranch}.remote`)
      expect(getGitRemoteContext(dir)).toEqual(expect.objectContaining({
        name: 'origin',
        selectionReason: 'origin',
      }))

      git(dir, 'remote', 'remove', 'origin')
      git(dir, 'remote', 'remove', 'upstream')
      git(dir, 'remote', 'add', 'mirror', mirrorRemote.dir)

      expect(getGitRemoteContext(dir)).toEqual(expect.objectContaining({
        name: 'mirror',
        selectionReason: 'first-configured',
      }))

      git(dir, 'config', '--unset', 'remote.mirror.url')
      expect(getGitRemoteContext(dir)).toBeNull()
    } finally {
      cleanup()
      upstreamRemote.cleanup()
      originRemote.cleanup()
      mirrorRemote.cleanup()
    }
  })

  it('returns enriched info and branch metadata including remote-only branches', () => {
    const { dir, cleanup } = makeGitRepo()
    const remote = makeBareRepo()
    const currentBranch = getCurrentBranch(dir)

    try {
      git(dir, 'remote', 'add', 'origin', remote.dir)
      git(dir, 'push', '-u', 'origin', currentBranch)
      git(dir, 'checkout', '-b', 'remote-only')
      writeFileSync(join(dir, 'remote-only.txt'), 'remote')
      git(dir, 'add', '.')
      git(dir, 'commit', '-m', 'remote only branch')
      git(dir, 'push', '-u', 'origin', 'remote-only')
      git(dir, 'checkout', currentBranch)
      git(dir, 'branch', '-D', 'remote-only')
      git(dir, 'fetch', 'origin')

      const info = getInfo(dir)
      expect(info.gitContext?.remote?.name).toBe('origin')

      const branches = getBranches(dir)
      expect(branches.find((branch) => branch.name === currentBranch)).toEqual(
        expect.objectContaining({
          scope: 'local',
          hasLocalCheckout: true,
          isCurrent: true,
        }),
      )
      expect(branches.find((branch) => branch.name === 'remote-only')).toEqual(
        expect.objectContaining({
          scope: 'remote',
          trackingRef: 'origin/remote-only',
          hasLocalCheckout: false,
        }),
      )
    } finally {
      cleanup()
      remote.cleanup()
    }
  })

  it('finds READMEs inside nested folders for the working tree and other branches', () => {
    const { dir, cleanup } = makeGitRepo()
    const branch = getCurrentBranch(dir)

    try {
      writeFileSync(join(dir, 'docs', 'README.md'), '# Docs')
      expect(findReadme(dir, branch, 'docs')).toBe('docs/README.md')

      git(dir, 'add', 'docs/README.md')
      git(dir, 'commit', '-m', 'add nested readme')
      git(dir, 'checkout', '-b', 'feature/readme')
      writeFileSync(join(dir, 'docs', 'README.md'), '# Docs branch')
      git(dir, 'add', 'docs/README.md')
      git(dir, 'commit', '-m', 'update nested readme')

      expect(findReadme(dir, 'feature/readme', 'docs')).toBe('docs/README.md')
      git(dir, 'checkout', branch)
      expect(findReadme(dir, 'feature/readme', 'docs')).toBe('docs/README.md')
      expect(findReadme(dir, 'feature/readme', 'missing')).toBe('')
    } finally {
      cleanup()
    }
  })

  it('reports tracked and untracked working tree changes', () => {
    const { dir, cleanup } = makeGitRepo()

    try {
      writeFileSync(join(dir, 'main.ts'), 'console.log("updated")')
      writeFileSync(join(dir, 'scratch.txt'), 'scratch')

      expect(getWorkingTreeChanges(dir)).toEqual({
        trackedPaths: ['main.ts'],
        untrackedPaths: ['scratch.txt'],
      })
    } finally {
      cleanup()
    }
  })

  it('handles branch switching confirmation, commit, discard, and remote tracking flows', () => {
    const { dir, cleanup } = makeGitRepo()
    const remote = makeBareRepo()
    const mainBranch = getCurrentBranch(dir)

    try {
      git(dir, 'remote', 'add', 'origin', remote.dir)
      git(dir, 'push', '-u', 'origin', mainBranch)

      git(dir, 'checkout', '-b', 'feature')
      writeFileSync(join(dir, 'feature.txt'), 'feature branch')
      git(dir, 'add', '.')
      git(dir, 'commit', '-m', 'feature branch')
      git(dir, 'checkout', mainBranch)

      const cleanSwitch = switchBranch(dir, { target: 'feature', resolution: 'preview' })
      expect(cleanSwitch).toEqual(expect.objectContaining({
        ok: true,
        status: 'switched',
        currentBranch: 'feature',
      }))
      git(dir, 'checkout', mainBranch)

      writeFileSync(join(dir, 'main.ts'), 'console.log("dirty")')
      const preview = switchBranch(dir, { target: 'feature', resolution: 'preview' })
      expect(preview).toEqual(expect.objectContaining({
        ok: false,
        status: 'confirmation-required',
        trackedChangeCount: 1,
      }))

      const discarded = switchBranch(dir, { target: 'feature', resolution: 'discard' })
      expect(discarded).toEqual(expect.objectContaining({
        ok: true,
        status: 'switched',
        currentBranch: 'feature',
      }))
      expect(git(dir, 'status', '--porcelain')).toBe('')
      git(dir, 'checkout', mainBranch)
      writeFileSync(join(dir, 'main.ts'), 'console.log("dirty")')

      expect(switchBranch(dir, { target: '', resolution: 'preview' }).status).toBe('blocked')
      expect(switchBranch(join(tmpdir(), 'missing-repo-for-switch'), { target: 'feature', resolution: 'preview' }).status).toBe('blocked')
      expect(switchBranch(dir, { target: mainBranch, resolution: 'cancel' }).status).toBe('cancelled')
      expect(switchBranch(dir, { target: mainBranch, resolution: 'preview' }).status).toBe('switched')
      expect(switchBranch(dir, { target: 'feature', resolution: 'commit' }).status).toBe('blocked')

      const committed = switchBranch(dir, {
        target: 'feature',
        resolution: 'commit',
        commitMessage: 'save before switch',
      })
      expect(committed).toEqual(expect.objectContaining({
        ok: true,
        status: 'switched',
        currentBranch: 'feature',
      }))

      git(dir, 'checkout', mainBranch)
      writeFileSync(join(dir, 'blocker.txt'), 'block main')
      git(dir, 'checkout', '-b', 'blocked-branch')
      writeFileSync(join(dir, 'blocker.txt'), 'tracked on branch')
      git(dir, 'add', 'blocker.txt')
      git(dir, 'commit', '-m', 'tracked blocker')
      git(dir, 'push', '-u', 'origin', 'blocked-branch')
      git(dir, 'checkout', mainBranch)
      git(dir, 'branch', '-D', 'blocked-branch')
      git(dir, 'fetch', 'origin')
      writeFileSync(join(dir, 'blocker.txt'), 'local blocker')

      const blockedByUntracked = switchBranch(dir, {
        target: 'origin/blocked-branch',
        resolution: 'preview',
      })
      expect(blockedByUntracked).toEqual(expect.objectContaining({
        ok: false,
        status: 'failed',
        currentBranch: mainBranch,
      }))
      expect(existsSync(join(dir, 'blocker.txt'))).toBe(true)

      git(dir, 'checkout', mainBranch)
      git(dir, 'checkout', '-b', 'broken-branch')
      git(dir, 'remote', 'remove', 'origin')
      const failed = switchBranch(dir, { target: 'origin/blocked-branch', resolution: 'preview' })
      expect(failed.status).toBe('failed')
    } finally {
      cleanup()
      remote.cleanup()
    }
  })

  it('blocks branch switches to branches already checked out in another worktree before mutating local state', () => {
    const { dir, cleanup } = makeGitRepo()
    const workspace = mkdtempSync(join(tmpdir(), 'gitlocal-worktree-parent-'))
    const linkedWorktreePath = join(workspace, 'linked')
    const mainBranch = getCurrentBranch(dir)

    try {
      git(dir, 'checkout', '-b', 'feature/worktree-lock')
      git(dir, 'checkout', mainBranch)
      git(dir, 'worktree', 'add', linkedWorktreePath, 'feature/worktree-lock')

      writeFileSync(join(dir, 'README.md'), '# dirty but uncommitted')

      const blockedPreview = switchBranch(dir, {
        target: 'feature/worktree-lock',
        resolution: 'preview',
      })
      expect(blockedPreview).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
        currentBranch: mainBranch,
      }))
      expect(blockedPreview.message).toContain('feature/worktree-lock')
      expect(blockedPreview.message).toContain(linkedWorktreePath)

      const blockedCommit = switchBranch(dir, {
        target: 'feature/worktree-lock',
        resolution: 'commit',
        commitMessage: 'this should not be committed',
      })
      expect(blockedCommit).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
        currentBranch: mainBranch,
      }))
      expect(git(dir, 'status', '--porcelain')).toContain('README.md')
      expect(git(dir, 'log', '-1', '--format=%s')).toBe('initial commit')
    } finally {
      spawnSync('git', ['worktree', 'remove', '--force', linkedWorktreePath], { cwd: dir })
      rmSync(workspace, { recursive: true, force: true })
      cleanup()
    }
  })

  it('allows discard-based switching in repositories without commits', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitlocal-empty-switch-'))

    try {
      git(dir, 'init')
      git(dir, 'config', 'user.email', 'test@test.com')
      git(dir, 'config', 'user.name', 'Test User')
      writeFileSync(join(dir, 'draft.txt'), 'draft')
      git(dir, 'checkout', '-b', 'feature-empty')
      git(dir, 'checkout', '-b', 'main-empty')
      writeFileSync(join(dir, 'draft.txt'), 'still draft')

      const result = switchBranch(dir, {
        target: 'feature-empty',
        resolution: 'discard',
      })

      expect(result).toEqual(expect.objectContaining({
        ok: false,
        status: 'failed',
        currentBranch: '',
      }))
      expect(result.message).toContain("pathspec 'feature-empty'")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('creates child folders, initializes git repositories, and clones into subfolders', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'gitlocal-setup-'))
    const source = makeGitRepo()
    const readOnlyDir = mkdtempSync(join(tmpdir(), 'gitlocal-readonly-'))

    try {
      const created = createChildFolder(workspace, 'child')
      expect(created).toBe(join(workspace, 'child'))
      expect(() => createChildFolder(workspace, 'child')).toThrow(/already exists/i)
      expect(() => createChildFolder(workspace, '../escape')).toThrow(/path separators/i)
      expect(() => createChildFolder(join(workspace, 'missing-parent'), 'child')).toThrow(/not available/i)

      expect(initializeGitRepository(created)).toBe(created)
      expect(validateRepo(created)).toBe(true)
      expect(() => initializeGitRepository(created)).toThrow(/already a git repository/i)
      expect(() => initializeGitRepository(join(workspace, 'missing-git'))).toThrow(/not available/i)

      chmodSync(readOnlyDir, 0o500)
      expect(() => initializeGitRepository(readOnlyDir)).toThrow()

      const cloneTarget = cloneRepositoryInto(workspace, 'clone-target', source.dir)
      expect(validateRepo(cloneTarget)).toBe(true)
      expect(() => cloneRepositoryInto(workspace, 'clone-target', source.dir)).toThrow(/already exists/i)
      expect(() => cloneRepositoryInto(workspace, 'another-clone', '')).toThrow(/repository URL is required/i)
      expect(() => cloneRepositoryInto(join(workspace, 'missing-clone-parent'), 'clone', source.dir)).toThrow(/not available/i)
      expect(() => cloneRepositoryInto(workspace, 'broken-clone', join(workspace, 'missing-source'))).toThrow(/does not exist|git clone failed/i)
    } finally {
      chmodSync(readOnlyDir, 0o700)
      rmSync(readOnlyDir, { recursive: true, force: true })
      rmSync(workspace, { recursive: true, force: true })
      source.cleanup()
    }
  })
})
