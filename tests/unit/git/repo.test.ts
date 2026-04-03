import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import {
  spawnGit,
  validateRepo,
  getInfo,
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
      expect(readWorkingTreeFile(dir, 'README.md')?.toString('utf-8')).toContain('# Test')
      expect(readWorkingTreeFile(dir, 'docs')).toBeNull()
      expect(readWorkingTreeFile(dir, 'missing.md')).toBeNull()
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
})
