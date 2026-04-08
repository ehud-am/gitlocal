import type { Context } from 'hono'
import { spawnGit, isWorkingTreeBranch } from '../git/repo.js'
import { searchWorkingTreeByContent, searchWorkingTreeByName } from '../git/tree.js'
import type { SearchMode, SearchResponse, SearchResult } from '../types.js'

type Variables = { repoPath: string }

function normalizeMode(value: string | undefined): SearchMode {
  return value === 'content' ? 'content' : 'name'
}

function parseCaseSensitive(value: string | undefined): boolean {
  return value === 'true'
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

function searchWorkingTreeByTrackedName(repoPath: string, query: string, caseSensitive: boolean): SearchResult[] {
  return searchWorkingTreeByName(repoPath, query, caseSensitive).map((entry) => ({
    path: entry.path,
    type: entry.type,
    matchType: 'name' as const,
    localOnly: entry.localOnly,
  }))
}

function searchWorkingTreeByTrackedContent(repoPath: string, query: string, caseSensitive: boolean): SearchResult[] {
  return searchWorkingTreeByContent(repoPath, query, caseSensitive).map((entry) => ({
    path: entry.path,
    type: entry.type,
    matchType: 'content' as const,
    line: entry.line,
    snippet: entry.snippet,
    localOnly: entry.localOnly,
  }))
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

  if (!query) {
    const empty: SearchResponse = { query, branch, mode, caseSensitive, results: [] }
    return c.json(empty)
  }

  const results =
    mode === 'name'
      ? isWorkingTreeBranch(repoPath, branch)
        ? searchWorkingTreeByTrackedName(repoPath, query, caseSensitive)
        : searchGitTreeByName(repoPath, branch, query, caseSensitive)
      : isWorkingTreeBranch(repoPath, branch)
        ? searchWorkingTreeByTrackedContent(repoPath, query, caseSensitive)
        : searchGitTreeByContent(repoPath, branch, query, caseSensitive)

  const response: SearchResponse = { query, branch, mode, caseSensitive, results }
  return c.json(response)
}
