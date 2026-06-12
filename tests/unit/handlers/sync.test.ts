import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { createApp } from '../../../src/server.js'

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-sync-handler-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  writeFileSync(join(dir, 'README.md'), '# Sync')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('syncHandler', () => {
  it('returns activePathNotice and changedFilesSummary for modified active files', async () => {
    const { dir, cleanup } = makeGitRepo()
    try {
      writeFileSync(join(dir, 'README.md'), '# Changed')
      const app = createApp(dir)
      const res = await app.fetch(new Request('http://localhost/api/sync?path=README.md'))
      expect(res.status).toBe(200)
      const body = await res.json() as {
        activePathNotice?: { path: string; changeKind: string; message: string }
        changedFilesSummary?: { total: number; modified: number }
      }

      expect(body.activePathNotice).toMatchObject({
        path: 'README.md',
        changeKind: 'refreshed',
      })
      expect(body.activePathNotice?.message).toContain('changed outside GitLocal')
      expect(body.changedFilesSummary).toMatchObject({ total: 1, modified: 1 })
    } finally {
      cleanup()
    }
  })

  it('returns an unavailable sync response when no repository is loaded', async () => {
    const app = createApp('')
    const res = await app.fetch(new Request('http://localhost/api/sync'))
    const body = await res.json() as {
      fileStatus: string
      changedFilesSummary?: { total: number }
    }

    expect(res.status).toBe(200)
    expect(body.fileStatus).toBe('unavailable')
    expect(body.changedFilesSummary).toMatchObject({ total: 0 })
  })
})
