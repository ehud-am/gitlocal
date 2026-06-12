import type { Context } from 'hono'
import { spawnGit, isWorkingTreeBranch } from '../git/repo.js'
import { searchWorkingTreeScoped } from '../git/tree.js'
import type { SearchContentKind, SearchMode, SearchResponse, SearchResult, SearchScope, SearchTrackedMode } from '../types.js'

type Variables = { repoPath: string }

export function normalizeMode(value: string | undefined): SearchMode {
  if (value === 'name' || value === 'content' || value === 'both') return value
  return 'both'
}

function parseCaseSensitive(value: string | undefined): boolean {
  return value === 'true'
}

function parseContentKinds(value: string | undefined): SearchContentKind {
  return value === 'markdown' ? 'markdown' : 'all'
}

function parseTrackedMode(value: string | undefined): SearchTrackedMode {
  if (value === 'tracked-only' || value === 'include-generated-local' || value === 'generated-local-only') return value
  return 'include-generated-local'
}

function parseLimit(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return 50
  return Math.min(200, Math.max(1, parsed))
}

function parseCursor(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function buildSearchScope(c: Context<{ Variables: Variables }>, mode: SearchMode, caseSensitive: boolean): SearchScope {
  return {
    rootPath: (c.req.query('rootPath') ?? '').trim().replace(/^\/+|\/+$/g, ''),
    targets: mode,
    contentKinds: parseContentKinds(c.req.query('contentKinds')),
    trackedMode: parseTrackedMode(c.req.query('trackedMode')),
    caseSensitive,
    limit: parseLimit(c.req.query('limit')),
    cursor: c.req.query('cursor'),
  }
}

function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdx|mdown)$/i.test(path)
}

function filterLegacyResultsByScope(results: SearchResult[], scope: SearchScope): SearchResult[] {
  return results.filter((result) => {
    if (scope.rootPath && result.path !== scope.rootPath && !result.path.startsWith(`${scope.rootPath}/`)) return false
    if (scope.contentKinds === 'markdown' && result.matchType === 'content' && !isMarkdownPath(result.path)) return false
    return true
  })
}

function paginateResults(results: SearchResult[], scope: SearchScope): Pick<SearchResponse, 'resultCount' | 'totalEstimate' | 'partial' | 'nextCursor' | 'results'> {
  const offset = parseCursor(scope.cursor)
  const page = results.slice(offset, offset + scope.limit)
  const nextOffset = offset + page.length
  const partial = nextOffset < results.length
  return {
    resultCount: page.length,
    totalEstimate: results.length,
    partial,
    nextCursor: partial ? String(nextOffset) : undefined,
    results: page,
  }
}

export function dedupeSearchResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const deduped: SearchResult[] = []

  for (const result of results) {
    const key = `${result.matchType}:${result.path}:${result.line ?? 0}:${result.localOnly ? 'local' : 'tracked'}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(result)
  }

  return deduped
}

export function sortSearchResults(results: SearchResult[]): SearchResult[] {
  return [...results].sort((left, right) => {
    if (left.matchType !== right.matchType) return left.matchType === 'name' ? -1 : 1
    if (left.type !== right.type) return left.type === 'dir' ? -1 : 1
    if (left.path !== right.path) return left.path.localeCompare(right.path)
    return (left.line ?? 0) - (right.line ?? 0)
  })
}

function searchGitTreeByName(repoPath: string, branch: string, query: string, caseSensitive: boolean): SearchResult[] {
  const output = spawnGit(repoPath, 'ls-tree', '-r', '--name-only', branch)
  const names = output.split('\n').filter(Boolean)
  const dirs = new Set<string>()
  for (const name of names) {
    const parts = name.split('/')
    for (let index = 1; index < parts.length; index += 1) {
      dirs.add(parts.slice(0, index).join('/'))
    }
  }

  const needle = caseSensitive ? query : query.toLowerCase()
  const results: SearchResult[] = []
  for (const dir of Array.from(dirs)) {
    const hay = caseSensitive ? dir : dir.toLowerCase()
    if (needle && hay.includes(needle)) {
      results.push({ path: dir, type: 'dir', matchType: 'name', localOnly: false })
    }
  }
  for (const name of names) {
    const hay = caseSensitive ? name : name.toLowerCase()
    if (needle && hay.includes(needle)) {
      results.push({ path: name, type: 'file', matchType: 'name', localOnly: false })
    }
  }
  return results
}

function searchGitTreeByContent(repoPath: string, branch: string, query: string, caseSensitive: boolean): SearchResult[] {
  const args = ['grep', '-n']
  if (!caseSensitive) args.push('-i')
  args.push(query, branch)

  let output = ''
  try {
    output = spawnGit(repoPath, ...args)
  } catch {
    return []
  }

  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [, path, lineNoText, ...snippetParts] = line.split(':')
      const snippet = snippetParts.join(':').trim()
      const lineNo = Number(lineNoText)
      return { path, type: 'file', matchType: 'content' as const, line: lineNo, snippet, localOnly: false }
    })
}

export async function searchHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({ error: 'No repository loaded' }, 400)
  }

  const query = (c.req.query('query') ?? '').trim()
  const branch = c.req.query('branch') ?? 'HEAD'
  const mode = normalizeMode(c.req.query('mode'))
  const caseSensitive = parseCaseSensitive(c.req.query('caseSensitive'))
  const scope = buildSearchScope(c, mode, caseSensitive)

  if (query.length < 3) {
    const empty: SearchResponse = {
      query,
      branch,
      mode,
      caseSensitive,
      scope,
      resultCount: 0,
      totalEstimate: 0,
      partial: false,
      results: [],
    }
    return c.json(empty)
  }

  const searchWorkingTree = isWorkingTreeBranch(repoPath, branch)
  const scopedResults = searchWorkingTree
    ? searchWorkingTreeScoped(repoPath, query, scope)
    : filterLegacyResultsByScope(
      [
        ...(mode === 'content' ? [] : searchGitTreeByName(repoPath, branch, query, caseSensitive)),
        ...(mode === 'name' ? [] : searchGitTreeByContent(repoPath, branch, query, caseSensitive)),
      ],
      scope,
    )

  const page = paginateResults(sortSearchResults(dedupeSearchResults(scopedResults)), scope)

  const response: SearchResponse = {
    query,
    branch,
    mode,
    caseSensitive,
    scope,
    ...page,
  }
  return c.json(response)
}
