import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { getSyncStatus } from '../../../src/services/repo-watch.js'

function makeGitRepo(): { dir: string; branch: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-sync-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  mkdirSync(join(dir, 'docs'))
  writeFileSync(join(dir, 'README.md'), '# Sync')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  spawnSync('git', ['checkout', '-b', 'feature-sync'], { cwd: dir })
  writeFileSync(join(dir, 'feature.md'), 'feature')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'feature'], { cwd: dir })
  spawnSync('git', ['checkout', '-'], { cwd: dir })
  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf-8' }).stdout.trim()
  return { dir, branch, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('repo-watch', () => {
  it('returns an unchanged status when no repo is loaded', () => {
    const status = getSyncStatus('', 'main', '')
    expect(status.treeStatus).toBe('unchanged')
    expect(status.fileStatus).toBe('unchanged')
  })

  it('returns a stable status for non-working-tree branch views', () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      const status = getSyncStatus(dir, 'feature-sync', 'feature.md')
      expect(status.treeStatus).toBe('unchanged')
      expect(status.resolvedPath).toBe('feature.md')
    } finally {
      cleanup()
    }
  })

  it('keeps existing tracked files marked as unchanged', () => {
    const { dir, branch, cleanup } = makeGitRepo()
    try {
      const status = getSyncStatus(dir, branch, 'README.md')
      expect(status.fileStatus).toBe('unchanged')
      expect(status.treeStatus).toBe('unchanged')
      expect(status.currentPathType).toBe('file')
      expect(status.resolvedPathType).toBe('file')
      expect(status.workingTreeRevision).toBeTruthy()
    } finally {
      cleanup()
    }
  })

  it('keeps an unchanged file status when no current path is selected in the working tree', () => {
    const { dir, branch, cleanup } = makeGitRepo()
    try {
      const status = getSyncStatus(dir, branch, '')
      expect(status.currentPathType).toBe('none')
      expect(status.resolvedPathType).toBe('none')
      expect(status.fileStatus).toBe('unchanged')
    } finally {
      cleanup()
    }
  })

  it('recovers to the nearest valid path when the current location is missing', () => {
    const { dir, branch, cleanup } = makeGitRepo()
    try {
      const status = getSyncStatus(dir, branch, 'docs/missing/file.md')
      expect(status.fileStatus).toBe('deleted')
      expect(status.treeStatus).toBe('invalid')
      expect(status.resolvedPath).toBe('docs')
      expect(status.resolvedPathType).toBe('dir')
    } finally {
      cleanup()
    }
  })
})
