import { readdirSync, statSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import type { TreeNode } from '../types.js'

function runLsTree(repoPath: string, args: string[]): string {
  const result = spawnSync('git', ['ls-tree', ...args], { cwd: repoPath, encoding: 'utf-8' })
  if (result.status !== 0) return ''
  /* v8 ignore next */
  return result.stdout?.trim() ?? ''
}

export function listDir(repoPath: string, branch: string, subpath: string = ''): TreeNode[] {
  // Use treeish:path syntax to list directory contents
  const treeish = subpath ? `${branch}:${subpath}` : branch

  // Get all entries (files + dirs) with their types
  const output = runLsTree(repoPath, ['--format=%(objecttype) %(path)', treeish])
  if (!output) return []

  const nodes: TreeNode[] = []
  for (const line of output.split('\n').filter(Boolean)) {
    const spaceIdx = line.indexOf(' ')
    const objType = line.slice(0, spaceIdx)
    const name = line.slice(spaceIdx + 1)
    /* v8 ignore next */
    if (!name) continue
    const type: 'file' | 'dir' = objType === 'tree' ? 'dir' : 'file'
    const fullPath = subpath ? `${subpath}/${name}` : name
    nodes.push({ name, path: fullPath, type })
  }

  // Sort: dirs first (lexicographic), then files (lexicographic)
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    /* v8 ignore next */
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })
}

export function listWorkingTreeDir(repoPath: string, subpath: string = ''): TreeNode[] {
  const dirPath = subpath ? resolve(repoPath, subpath) : repoPath
  try {
    return readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.name !== '.git')
      .map((entry): TreeNode => ({
        name: entry.name,
        path: subpath ? `${subpath}/${entry.name}` : entry.name,
        type: entry.isDirectory() ? 'dir' : 'file',
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
}

function collectWorkingTreeEntries(repoPath: string, subpath = ''): TreeNode[] {
  const nodes = listWorkingTreeDir(repoPath, subpath)
  const all = [...nodes]
  for (const node of nodes) {
    if (node.type === 'dir') {
      all.push(...collectWorkingTreeEntries(repoPath, node.path))
    }
  }
  return all
}

function readSnippet(filePath: string, query: string, caseSensitive: boolean): { line: number; snippet: string } | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split(/\r?\n/)
    const needle = caseSensitive ? query : query.toLowerCase()
    for (let index = 0; index < lines.length; index += 1) {
      const hay = caseSensitive ? lines[index] : lines[index].toLowerCase()
      if (needle && hay.includes(needle)) {
        return { line: index + 1, snippet: lines[index].trim() }
      }
    }
  } catch {
    return null
  }
  return null
}

export function searchWorkingTreeByName(repoPath: string, query: string, caseSensitive: boolean): TreeNode[] {
  const entries = collectWorkingTreeEntries(repoPath)
  const needle = caseSensitive ? query : query.toLowerCase()
  return entries.filter((entry) => {
    const hay = caseSensitive ? entry.path : entry.path.toLowerCase()
    return needle ? hay.includes(needle) : false
  })
}

export function searchWorkingTreeByContent(repoPath: string, query: string, caseSensitive: boolean): Array<TreeNode & { snippet: string; line: number }> {
  const entries = collectWorkingTreeEntries(repoPath).filter((entry) => entry.type === 'file')
  const matches: Array<TreeNode & { snippet: string; line: number }> = []

  for (const entry of entries) {
    const fullPath = resolve(repoPath, entry.path)
    try {
      if (statSync(fullPath).size > 512_000) continue
      const snippet = readSnippet(fullPath, query, caseSensitive)
      if (snippet) {
        matches.push({ ...entry, ...snippet })
      }
    } catch {
      continue
    }
  }

  return matches
}
