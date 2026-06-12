import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { testClient } from 'hono/testing'
import { createApp } from '../../../src/server.js'
import { dedupeSearchResults, normalizeMode, sortSearchResults } from '../../../src/handlers/search.js'

function makeGitRepo(): { dir: string; branch: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-search-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  mkdirSync(join(dir, 'docs'))
  writeFileSync(join(dir, 'README.md'), '# Hello Search')
  writeFileSync(join(dir, 'docs', 'guide.md'), 'Searchable line\nAnother Line')
  writeFileSync(join(dir, 'docs', 'plain.txt'), 'scope-token in plain text')
  writeFileSync(join(dir, 'docs', 'scoped.md'), 'scope-token in markdown')
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'src', 'scoped.ts'), 'scope-token in source')
  writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
  spawnSync('git', ['add', '.'], { cwd: dir })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir })
  spawnSync('git', ['checkout', '-b', 'feature-search'], { cwd: dir })
  writeFileSync(join(dir, 'docs', 'feature.md'), 'Feature branch content\nFeature branch content again')
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

  it('sorts repeated content matches in the same file by line number', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'Feature branch content', branch: 'feature-search', mode: 'content' },
    })
    const body = await res.json()
    const featureMatches = body.results
      .filter((result: { path: string; matchType: string }) => result.path === 'docs/feature.md' && result.matchType === 'content')
      .map((result: { line: number }) => result.line)

    expect(featureMatches).toEqual([1, 2])
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

  it('applies root and Markdown content scope to non-current branch searches', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: {
        query: 'scope-token',
        branch: 'feature-search',
        mode: 'content',
        rootPath: 'docs',
        contentKinds: 'markdown',
      },
    })
    const body = await res.json()

    expect(body.results).toContainEqual(expect.objectContaining({ path: 'docs/scoped.md' }))
    expect(body.results).not.toContainEqual(expect.objectContaining({ path: 'docs/plain.txt' }))
    expect(body.results).not.toContainEqual(expect.objectContaining({ path: 'src/scoped.ts' }))
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

  it('falls back to both mode when an unsupported mode is provided', async () => {
    const client = testClient(createApp(dir))
    const res = await client.api.search.$get({
      query: { query: 'feature', branch: 'feature-search', mode: 'invalid-mode' as never },
    })
    const body = await res.json()

    expect(body.mode).toBe('both')
    expect(body.results.some((result: { matchType: string }) => result.matchType === 'name')).toBe(true)
    expect(body.results.some((result: { matchType: string }) => result.matchType === 'content')).toBe(true)
  })

  it('supports current-folder, markdown-focused, tracked-only, limit, and cursor search scope', async () => {
    const client = testClient(createApp(dir))
    const firstPage = await client.api.search.$get({
      query: {
        query: 'scope-token',
        branch,
        mode: 'content',
        rootPath: 'docs',
        contentKinds: 'markdown',
        trackedMode: 'tracked-only',
        limit: '1',
      },
    })
    const firstBody = await firstPage.json()

    expect(firstBody.scope).toMatchObject({
      rootPath: 'docs',
      targets: 'content',
      contentKinds: 'markdown',
      trackedMode: 'tracked-only',
      limit: 1,
    })
    expect(firstBody.resultCount).toBe(1)
    expect(firstBody.totalEstimate).toBe(1)
    expect(firstBody.partial).toBe(false)
    expect(firstBody.results).toEqual([
      expect.objectContaining({
        path: 'docs/scoped.md',
        matchType: 'content',
        generatedLocalState: 'tracked',
        scopeLabel: 'Markdown content',
      }),
    ])

    const paged = await client.api.search.$get({
      query: {
        query: 'scope-token',
        branch,
        mode: 'content',
        trackedMode: 'tracked-only',
        limit: '1',
      },
    })
    const pageBody = await paged.json()

    expect(pageBody.totalEstimate).toBeGreaterThan(1)
    expect(pageBody.partial).toBe(true)
    expect(pageBody.nextCursor).toBe('1')

    const nextPage = await client.api.search.$get({
      query: {
        query: 'scope-token',
        branch,
        mode: 'content',
        trackedMode: 'tracked-only',
        limit: '1',
        cursor: pageBody.nextCursor,
      },
    })
    const nextBody = await nextPage.json()

    expect(nextBody.results[0].path).not.toBe(pageBody.results[0].path)
  })

  it('requires explicit generated/local scope for ignored current-branch matches', async () => {
    writeFileSync(join(dir, 'ignored.txt'), 'ignored search body')
    const client = testClient(createApp(dir))

    const trackedOnly = await client.api.search.$get({
      query: { query: 'search body', branch, mode: 'content', trackedMode: 'tracked-only' },
    })
    const includeGeneratedLocal = await client.api.search.$get({
      query: { query: 'search body', branch, mode: 'content', trackedMode: 'include-generated-local' },
    })
    const generatedLocalOnly = await client.api.search.$get({
      query: { query: 'search body', branch, mode: 'content', trackedMode: 'generated-local-only' },
    })

    expect((await trackedOnly.json()).results).toEqual([])
    expect((await includeGeneratedLocal.json()).results).toContainEqual(expect.objectContaining({
      path: 'ignored.txt',
      generatedLocalState: 'ignored',
    }))
    expect((await generatedLocalOnly.json()).results).toContainEqual(expect.objectContaining({
      path: 'ignored.txt',
      generatedLocalState: 'ignored',
    }))
  })

  it('returns bounded partial metadata for large result sets', async () => {
    const largeDir = mkdtempSync(join(tmpdir(), 'gitlocal-large-search-test-'))
    try {
      spawnSync('git', ['init'], { cwd: largeDir })
      spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: largeDir })
      spawnSync('git', ['config', 'user.name', 'Test'], { cwd: largeDir })
      mkdirSync(join(largeDir, 'docs'))
      for (let index = 0; index < 80; index += 1) {
        writeFileSync(join(largeDir, 'docs', `page-${index}.md`), `GitLocal large result ${index}\n`)
      }
      spawnSync('git', ['add', '.'], { cwd: largeDir })
      spawnSync('git', ['commit', '-m', 'large search fixture'], { cwd: largeDir })
      const largeBranch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: largeDir, encoding: 'utf-8' }).stdout.trim()
      const client = testClient(createApp(largeDir))

      const res = await client.api.search.$get({
        query: {
          query: 'GitLocal',
          branch: largeBranch,
          mode: 'content',
          trackedMode: 'tracked-only',
          limit: '25',
        },
      })
      const body = await res.json()

      expect(body.resultCount).toBe(25)
      expect(body.results).toHaveLength(25)
      expect(body.totalEstimate).toBeGreaterThan(25)
      expect(body.partial).toBe(true)
      expect(body.nextCursor).toBe('25')
    } finally {
      rmSync(largeDir, { recursive: true, force: true })
    }
  })
})

describe('search helper utilities', () => {
  it('normalizes supported modes and falls back to both', () => {
    expect(normalizeMode('name')).toBe('name')
    expect(normalizeMode('content')).toBe('content')
    expect(normalizeMode('both')).toBe('both')
    expect(normalizeMode('unexpected')).toBe('both')
    expect(normalizeMode(undefined)).toBe('both')
  })

  it('deduplicates equivalent search results while keeping unique ones', () => {
    expect(dedupeSearchResults([
      { path: 'docs/guide.md', type: 'file', matchType: 'name', localOnly: false },
      { path: 'docs/guide.md', type: 'file', matchType: 'name', localOnly: false },
      { path: 'docs/guide.md', type: 'file', matchType: 'name', localOnly: true },
      { path: 'docs/guide.md', type: 'file', matchType: 'content', line: 3, snippet: 'guide', localOnly: false },
    ])).toEqual([
      { path: 'docs/guide.md', type: 'file', matchType: 'name', localOnly: false },
      { path: 'docs/guide.md', type: 'file', matchType: 'name', localOnly: true },
      { path: 'docs/guide.md', type: 'file', matchType: 'content', line: 3, snippet: 'guide', localOnly: false },
    ])
  })

  it('sorts search results by match type, node type, path, and line number', () => {
    expect(sortSearchResults([
      { path: 'src/zeta.ts', type: 'file', matchType: 'content', line: 9, localOnly: false },
      { path: 'src/alpha.ts', type: 'file', matchType: 'content', line: 12, localOnly: false },
      { path: 'src/alpha.ts', type: 'file', matchType: 'content', line: 4, localOnly: false },
      { path: 'src', type: 'dir', matchType: 'name', localOnly: false },
      { path: 'README.md', type: 'file', matchType: 'name', localOnly: false },
    ])).toEqual([
      { path: 'src', type: 'dir', matchType: 'name', localOnly: false },
      { path: 'README.md', type: 'file', matchType: 'name', localOnly: false },
      { path: 'src/alpha.ts', type: 'file', matchType: 'content', line: 4, localOnly: false },
      { path: 'src/alpha.ts', type: 'file', matchType: 'content', line: 12, localOnly: false },
      { path: 'src/zeta.ts', type: 'file', matchType: 'content', line: 9, localOnly: false },
    ])
  })
})
