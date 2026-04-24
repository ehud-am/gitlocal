import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp } from '../../../src/server.js'

function makeGitRepo(): { dir: string; branch: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-search-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  mkdirSync(join(dir, 'docs'))
  writeFileSync(join(dir, 'README.md'), '# Hello Search')
  writeFileSync(join(dir, 'docs', 'guide.md'), 'Searchable line\nAnother Line')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  spawnSync('git', ['checkout', '-b', 'feature-search'], { cwd: dir })
  writeFileSync(join(dir, 'docs', 'feature.md'), 'Feature branch content')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'feature'], { cwd: dir })
  spawnSync('git', ['checkout', '-'], { cwd: dir })
  const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf-8' }).stdout.trim()
  return { dir, branch, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('searchHandler', () => {
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

  it('returns name search matches', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'readme', branch, mode: 'name' },
    })
    const body = await res.json()
    expect(body.results.some((result: { path: string }) => result.path === 'README.md')).toBe(true)
  })

  it('returns content search matches with snippets', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'Searchable', branch, mode: 'content' },
    })
    const body = await res.json()
    expect(body.results[0].path).toBe('docs/guide.md')
    expect(body.results[0].snippet).toContain('Searchable')
  })

  it('returns combined name and content matches when both modes are requested', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'feature', branch: 'feature-search', mode: 'both' },
    })
    const body = await res.json()

    expect(body.mode).toBe('both')
    expect(body.results.some((result: { matchType: string; path: string }) => result.matchType === 'name' && result.path === 'docs/feature.md')).toBe(true)
    expect(body.results.some((result: { matchType: string; path: string }) => result.matchType === 'content' && result.path === 'docs/feature.md')).toBe(true)
  })

  it('excludes untracked files from current-branch searches', async () => {
    writeFileSync(join(dir, 'draft-notes.md'), 'draft content')
    const client = testClient(createApp(dir))
    const nameRes = await client.api.search.$get({
      query: { query: 'draft-notes', branch, mode: 'name' },
    })
    const contentRes = await client.api.search.$get({
      query: { query: 'draft content', branch, mode: 'content' },
    })

    expect((await nameRes.json()).results).toEqual([])
    expect((await contentRes.json()).results).toEqual([])
  })

  it('returns local-only matches for ignored files in current-branch searches', async () => {
    writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
    writeFileSync(join(dir, 'ignored.txt'), 'ignored search body')

    const client = testClient(createApp(dir))
    const nameRes = await client.api.search.$get({
      query: { query: 'ignored', branch, mode: 'name' },
    })
    const contentRes = await client.api.search.$get({
      query: { query: 'search body', branch, mode: 'content' },
    })

    expect((await nameRes.json()).results).toContainEqual(expect.objectContaining({
      path: 'ignored.txt',
      localOnly: true,
    }))
    expect((await contentRes.json()).results).toContainEqual(expect.objectContaining({
      path: 'ignored.txt',
      localOnly: true,
    }))
  })

  it('honors case-sensitive matching', async () => {
    const client = testClient(createApp(dir))
    const sensitive = await client.api.search.$get({
      query: { query: 'searchable', branch, mode: 'content', caseSensitive: 'true' },
    })
    const insensitive = await client.api.search.$get({
      query: { query: 'searchable', branch, mode: 'content' },
    })
    expect((await sensitive.json()).results).toEqual([])
    expect((await insensitive.json()).results.length).toBeGreaterThan(0)
  })

  it('searches non-current git branches through git tree helpers', async () => {
    const client = testClient(createApp(dir))
    const nameRes = await client.api.search.$get({
      query: { query: 'feature', branch: 'feature-search', mode: 'name' },
    })
    const contentRes = await client.api.search.$get({
      query: { query: 'Feature branch', branch: 'feature-search', mode: 'content' },
    })

    expect((await nameRes.json()).results.some((result: { path: string }) => result.path === 'docs/feature.md')).toBe(true)
    expect((await contentRes.json()).results[0].path).toBe('docs/feature.md')
  })

  it('returns matching directories for non-current branch name searches', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'docs', branch: 'feature-search', mode: 'name' },
    })
    expect((await res.json()).results.some((result: { path: string; type: string }) => result.path === 'docs' && result.type === 'dir')).toBe(true)
  })

  it('supports case-sensitive name matching on non-current branches', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'feature', branch: 'feature-search', mode: 'name', caseSensitive: 'true' },
    })
    expect((await res.json()).results[0].path).toBe('docs/feature.md')
  })

  it('returns an empty result set for blank or too-short queries', async () => {
    const client = testClient(createApp(dir))
    const blankRes = await client.api.search.$get({
      query: { query: '   ', branch, mode: 'name' },
    })
    const shortRes = await client.api.search.$get({
      query: { query: 'hi', branch, mode: 'both' },
    })
    expect((await blankRes.json()).results).toEqual([])
    expect((await shortRes.json()).results).toEqual([])
  })

  it('returns 400 when no repository is loaded', async () => {
    const client = testClient(createApp(''))
    const res = await client.api.search.$get({
      query: { query: 'hello', mode: 'name' },
    })
    expect(res.status).toBe(400)
  })

  it('returns an empty result set when git grep finds no branch matches', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'definitely-not-present', branch: 'feature-search', mode: 'content' },
    })
    expect((await res.json()).results).toEqual([])
  })

  it('defaults to both mode when mode is omitted', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'readme' },
    })
    expect((await res.json()).mode).toBe('both')
  })
})
