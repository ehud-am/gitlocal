import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { listDir, listWorkingTreeDir, searchWorkingTreeByContent, searchWorkingTreeByName } from '../../../src/git/tree.js'

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

  it('finds name matches in the working tree', () => {
    const matches = searchWorkingTreeByName(dir, 'readme', false)
    expect(matches.some((match) => match.path === 'README.md')).toBe(true)
  })

  it('finds content matches in the working tree', () => {
    writeFileSync(join(dir, 'notes.txt'), 'Working tree search target')
    const matches = searchWorkingTreeByContent(dir, 'search target', false)
    expect(matches.some((match) => match.path === 'notes.txt')).toBe(true)
  })

  it('returns no matches for an empty name query', () => {
    expect(searchWorkingTreeByName(dir, '', false)).toEqual([])
  })
})
