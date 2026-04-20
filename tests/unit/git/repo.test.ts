import { describe, it, expect, vi, afterEach } from 'vitest'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import {
  cloneRepositoryInto,
  convertGitRemoteToWebUrl,
  createChildFolder,
  spawnGit,
  validateRepo,
  getInfo,
  getGitRemoteContext,
  getGitUserIdentity,
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
  normalizeRepoRelativePath,
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

      const discard = switchBranch(dir, { target: 'origin/blocked-branch', resolution: 'discard' })
      expect(discard).toEqual(expect.objectContaining({
        ok: false,
        status: 'second-confirmation-required',
      }))

      expect(switchBranch(dir, {
        target: 'origin/blocked-branch',
        resolution: 'delete-untracked',
      })).toEqual(expect.objectContaining({
        ok: false,
        status: 'blocked',
      }))

      const deleted = switchBranch(dir, {
        target: 'origin/blocked-branch',
        resolution: 'delete-untracked',
        allowDeleteUntracked: true,
      })
      expect(deleted).toEqual(expect.objectContaining({
        ok: true,
        status: 'switched',
        currentBranch: 'blocked-branch',
        createdTrackingBranch: 'blocked-branch',
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
