import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import {
  filterTreeByGeneratedLocalVisibility,
  listDir,
  listWorkingTreeDir,
  searchWorkingTreeByContent,
  searchWorkingTreeByName,
  searchWorkingTreeScoped,
} from '../../../src/git/tree.js'

function makeGitRepo(): { dir: string; branch: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-tree-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir })

  mkdirSync(join(dir, 'src'))
  mkdirSync(join(dir, 'docs'))
  writeFileSync(join(dir, 'README.md'), '# test')
  writeFileSync(join(dir, 'main.ts'), '')
  writeFileSync(join(dir, 'src', 'index.ts'), '')
  writeFileSync(join(dir, 'src', 'utils.ts'), '')
  mkdirSync(join(dir, 'src', 'lib'))
  writeFileSync(join(dir, 'src', 'lib', 'helpers.ts'), '')
  writeFileSync(join(dir, 'src', 'lib', 'more.ts'), '')

  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })

  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: dir, encoding: 'utf-8',
  }).stdout.trim()

  return { dir, branch, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('listDir', () => {
  let dir: string
  let branch: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    branch = repo.branch
    cleanup = repo.cleanup
  })

  afterAll(() => cleanup())

  it('returns directories before files at root', () => {
    const nodes = listDir(dir, branch, '')
    const types = nodes.map((n) => n.type)
    const firstFile = types.indexOf('file')
    const lastDir = types.lastIndexOf('dir')
    // All dirs must come before all files
    expect(lastDir).toBeLessThan(firstFile)
  })

  it('returns directories and files alphabetically within their groups', () => {
    const nodes = listDir(dir, branch, '')
    const dirs = nodes.filter((n) => n.type === 'dir').map((n) => n.name)
    const files = nodes.filter((n) => n.type === 'file').map((n) => n.name)
    expect(dirs).toEqual([...dirs].sort())
    expect(files).toEqual([...files].sort())
  })

  it('returns only immediate children (non-recursive)', () => {
    const nodes = listDir(dir, branch, '')
    const names = nodes.map((n) => n.name)
    // src/index.ts should NOT appear at root level
    expect(names).not.toContain('index.ts')
    expect(names).toContain('src')
  })

  it('returns children of a subdirectory', () => {
    const nodes = listDir(dir, branch, 'src')
    const names = nodes.map((n) => n.name)
    expect(names).toContain('index.ts')
    expect(names).toContain('utils.ts')
    expect(names).toContain('lib')
  })

  it('returns correct path for subdirectory entries', () => {
    const nodes = listDir(dir, branch, 'src')
    const indexNode = nodes.find((n) => n.name === 'index.ts')
    expect(indexNode?.path).toBe('src/index.ts')
  })

  it('returns empty array for invalid branch', () => {
    const nodes = listDir(dir, 'nonexistent-branch-xyz', '')
    expect(nodes).toEqual([])
  })

  it('returns empty array for invalid subpath', () => {
    const nodes = listDir(dir, branch, 'nonexistent-subdir')
    expect(nodes).toEqual([])
  })
})

describe('working tree tree helpers', () => {
  let dir: string
  let branch: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    branch = repo.branch
    cleanup = repo.cleanup
  })

  afterAll(() => cleanup())

  it('lists working-tree directories and files from disk', () => {
    const nodes = listWorkingTreeDir(dir, '')
    expect(nodes.map((node) => node.name)).toContain('README.md')
    expect(nodes.map((node) => node.name)).toContain('src')
  })

  it('returns an empty array for an invalid working-tree subpath', () => {
    expect(listWorkingTreeDir(dir, 'missing/path')).toEqual([])
  })

  it('collapses nested tracked files into immediate directory children', () => {
    const nodes = listWorkingTreeDir(dir, 'src')
    expect(nodes.some((node) => node.path === 'src/lib' && node.type === 'dir')).toBe(true)
  })

  it('finds name matches in the working tree', () => {
    const matches = searchWorkingTreeByName(dir, 'readme', false)
    expect(matches.some((match) => match.path === 'README.md')).toBe(true)
  })

  it('supports case-sensitive working tree name matching', () => {
    expect(searchWorkingTreeByName(dir, 'README', true).some((match) => match.path === 'README.md')).toBe(true)
    expect(searchWorkingTreeByName(dir, 'readme', true)).toEqual([])
  })

  it('finds content matches in the working tree', () => {
    writeFileSync(join(dir, 'README.md'), 'Working tree search target')
    const matches = searchWorkingTreeByContent(dir, 'search target', false)
    expect(matches.some((match) => match.path === 'README.md')).toBe(true)
  })

  it('returns no snippet when file content cannot be read', () => {
    const target = join(dir, 'README.md')
    chmodSync(target, 0)

    try {
      expect(searchWorkingTreeByContent(dir, 'test', false)).toEqual([])
    } finally {
      chmodSync(target, 0o644)
    }
  })

  it('surfaces untracked working-tree files while leaving search behavior unchanged', () => {
    writeFileSync(join(dir, 'scratch.txt'), 'local-only')
    expect(listWorkingTreeDir(dir, '').some((node) => node.path === 'scratch.txt')).toBe(true)
    expect(searchWorkingTreeByName(dir, 'scratch', false)).toEqual([])
  })

  it('surfaces ignored working-tree entries and marks them local-only', () => {
    writeFileSync(join(dir, '.gitignore'), 'ignored.txt\nignored-dir/\n')
    writeFileSync(join(dir, 'ignored.txt'), 'hidden note')
    mkdirSync(join(dir, 'ignored-dir'))
    writeFileSync(join(dir, 'ignored-dir', 'nested.md'), 'nested local only')

    expect(listWorkingTreeDir(dir, '').some((node) => node.path === 'ignored.txt' && node.localOnly === true)).toBe(true)
    expect(listWorkingTreeDir(dir, '').some((node) => node.path === 'ignored-dir' && node.localOnly === true)).toBe(true)
    expect(searchWorkingTreeByName(dir, 'ignored', false)).toContainEqual(expect.objectContaining({ path: 'ignored.txt', localOnly: true }))
    expect(searchWorkingTreeByName(dir, 'ignored', false)).toContainEqual(expect.objectContaining({ path: 'ignored-dir', localOnly: true }))
  })

  it('searches ignored file contents in the current working tree and marks them local-only', () => {
    writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
    writeFileSync(join(dir, 'ignored.txt'), 'hidden search target')

    expect(searchWorkingTreeByContent(dir, 'search target', false)).toContainEqual(
      expect.objectContaining({ path: 'ignored.txt', localOnly: true }),
    )
  })

  it('does not recurse into ignored directories during search', () => {
    writeFileSync(join(dir, '.gitignore'), 'ignored-huge-dir/\n')
    mkdirSync(join(dir, 'ignored-huge-dir'))
    writeFileSync(join(dir, 'ignored-huge-dir', 'nested.md'), 'nested search target')

    expect(searchWorkingTreeByName(dir, 'ignored-huge-dir', false)).toContainEqual(
      expect.objectContaining({ path: 'ignored-huge-dir', localOnly: true }),
    )
    expect(searchWorkingTreeByName(dir, 'nested', false)).toEqual([])
    expect(searchWorkingTreeByContent(dir, 'search target', false)).not.toContainEqual(
      expect.objectContaining({ path: 'ignored-huge-dir/nested.md' }),
    )
  })

  it('returns no matches for an empty name query', () => {
    expect(searchWorkingTreeByName(dir, '', false)).toEqual([])
  })

  it('skips oversized tracked files during content search', () => {
    writeFileSync(join(dir, 'README.md'), 'a'.repeat(600_000))
    expect(searchWorkingTreeByContent(dir, 'aaaa', false)).toEqual([])
  })

  it('filters generated/local nodes while preserving the active path exception', () => {
    const nodes = [
      { name: 'src', path: 'src', type: 'dir' as const, localOnly: false, generatedLocalState: 'tracked' as const },
      { name: 'dist', path: 'dist', type: 'dir' as const, localOnly: true, generatedLocalState: 'generated' as const },
      { name: 'scratch.md', path: 'scratch.md', type: 'file' as const, localOnly: true, generatedLocalState: 'local-only' as const },
    ]

    expect(filterTreeByGeneratedLocalVisibility(nodes, 'hide').map((node) => node.path)).toEqual(['src'])
    expect(filterTreeByGeneratedLocalVisibility(nodes, 'only').map((node) => node.path)).toEqual(['dist', 'scratch.md'])
    expect(filterTreeByGeneratedLocalVisibility(nodes, 'hide', 'dist/bundle.js').map((node) => node.path)).toEqual(['src', 'dist'])
  })

  it('scopes working-tree search to the current folder', () => {
    writeFileSync(join(dir, 'docs', 'notes.md'), 'folder scoped target')
    spawnSync('git', ['add', 'docs/notes.md'], { cwd: dir })
    spawnSync('git', ['commit', '-m', 'add scoped docs'], { cwd: dir })
    writeFileSync(join(dir, 'README.md'), 'folder scoped target')

    const matches = searchWorkingTreeScoped(dir, 'scoped target', {
      rootPath: 'docs',
      targets: 'both',
      contentKinds: 'all',
      trackedMode: 'tracked-only',
      caseSensitive: false,
      limit: 50,
    })

    expect(matches).toContainEqual(expect.objectContaining({ path: 'docs/notes.md', matchType: 'content' }))
    expect(matches).not.toContainEqual(expect.objectContaining({ path: 'README.md' }))
  })

  it('limits scoped content search to Markdown files when requested', () => {
    writeFileSync(join(dir, 'docs', 'markdown-target.md'), 'markdown-only target')
    writeFileSync(join(dir, 'docs', 'plain-target.txt'), 'markdown-only target')
    spawnSync('git', ['add', 'docs/markdown-target.md', 'docs/plain-target.txt'], { cwd: dir })
    spawnSync('git', ['commit', '-m', 'add content candidates'], { cwd: dir })

    const matches = searchWorkingTreeScoped(dir, 'markdown-only target', {
      rootPath: 'docs',
      targets: 'content',
      contentKinds: 'markdown',
      trackedMode: 'tracked-only',
      caseSensitive: false,
      limit: 50,
    })

    expect(matches.map((match) => match.path)).toContain('docs/markdown-target.md')
    expect(matches.map((match) => match.path)).not.toContain('docs/plain-target.txt')
  })

  it('supports generated/local-only scoped search before handler pagination', () => {
    writeFileSync(join(dir, '.gitignore'), 'local-one.md\nlocal-two.md\n')
    writeFileSync(join(dir, 'local-one.md'), 'local result')
    writeFileSync(join(dir, 'local-two.md'), 'local result')

    const matches = searchWorkingTreeScoped(dir, 'local', {
      rootPath: '',
      targets: 'name',
      contentKinds: 'all',
      trackedMode: 'generated-local-only',
      caseSensitive: false,
      limit: 1,
    })

    expect(matches).toHaveLength(2)
    expect(matches).toEqual([
      expect.objectContaining({ path: 'local-one.md', generatedLocalState: 'ignored' }),
      expect.objectContaining({ path: 'local-two.md', generatedLocalState: 'ignored' }),
    ])
  })

  it('includes tracked and generated/local results when scoped search requests both', () => {
    writeFileSync(join(dir, '.gitignore'), 'local-both.md\n')
    writeFileSync(join(dir, 'local-both.md'), 'local result')

    const matches = searchWorkingTreeScoped(dir, 'readme', {
      rootPath: '',
      targets: 'name',
      contentKinds: 'all',
      trackedMode: 'include-generated-local',
      caseSensitive: false,
      limit: 50,
    })

    expect(matches).toContainEqual(expect.objectContaining({ path: 'README.md', generatedLocalState: 'tracked' }))
  })

  it('supports case-sensitive scoped name search', () => {
    expect(searchWorkingTreeScoped(dir, 'README', {
      rootPath: '',
      targets: 'name',
      contentKinds: 'all',
      trackedMode: 'tracked-only',
      caseSensitive: true,
      limit: 50,
    })).toContainEqual(expect.objectContaining({ path: 'README.md', scopeLabel: 'Repository' }))

    expect(searchWorkingTreeScoped(dir, 'readme', {
      rootPath: '',
      targets: 'name',
      contentKinds: 'all',
      trackedMode: 'tracked-only',
      caseSensitive: true,
      limit: 50,
    })).toEqual([])
  })

  it('skips content matching for scoped name-only search', () => {
    writeFileSync(join(dir, 'README.md'), 'name-only target')

    const matches = searchWorkingTreeScoped(dir, 'name-only target', {
      rootPath: '',
      targets: 'name',
      contentKinds: 'all',
      trackedMode: 'tracked-only',
      caseSensitive: false,
      limit: 50,
    })

    expect(matches).toEqual([])
  })

  it('skips name matching for scoped content-only search', () => {
    const matches = searchWorkingTreeScoped(dir, 'README', {
      rootPath: '',
      targets: 'content',
      contentKinds: 'all',
      trackedMode: 'tracked-only',
      caseSensitive: false,
      limit: 50,
    })

    expect(matches).not.toContainEqual(expect.objectContaining({ path: 'README.md', matchType: 'name' }))
  })

  it('skips oversized files during scoped content search', () => {
    writeFileSync(join(dir, 'README.md'), 'a'.repeat(600_000))

    expect(searchWorkingTreeScoped(dir, 'aaaa', {
      rootPath: '',
      targets: 'content',
      contentKinds: 'all',
      trackedMode: 'tracked-only',
      caseSensitive: false,
      limit: 50,
    })).toEqual([])
  })
})
