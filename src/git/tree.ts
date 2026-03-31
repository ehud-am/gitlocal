import { statSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import type { TreeNode } from '../types.js'
import { getTrackedWorkingTreeFiles } from './repo.js'

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

function getTrackedWorkingTreeEntries(repoPath: string): TreeNode[] {
  const files = getTrackedWorkingTreeFiles(repoPath)
  const dirs = new Set<string>()

  for (const filePath of files) {
    const parts = filePath.split('/')
    for (let index = 1; index < parts.length; index += 1) {
      dirs.add(parts.slice(0, index).join('/'))
    }
  }

  const nodes: TreeNode[] = [
    ...Array.from(dirs).map((dirPath) => ({
      name: dirPath.split('/').pop() as string,
      path: dirPath,
      type: 'dir' as const,
    })),
    ...files.map((filePath) => ({
      name: filePath.split('/').pop() as string,
      path: filePath,
      type: 'file' as const,
    })),
  ]

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.path.localeCompare(b.path)
  })
}

export function listWorkingTreeDir(repoPath: string, subpath: string = ''): TreeNode[] {
  const prefix = subpath ? `${subpath}/` : ''
  const depth = subpath ? subpath.split('/').length + 1 : 1
  const children = new Map<string, TreeNode>()

  for (const entry of getTrackedWorkingTreeEntries(repoPath)) {
    if (subpath) {
      if (entry.path !== subpath && !entry.path.startsWith(prefix)) continue
    }
    if (!subpath && entry.path.includes('/')) {
      const firstSegment = entry.path.split('/')[0]
      if (entry.path !== firstSegment) continue
    }

    const segments = entry.path.split('/')
    if (segments.length !== depth) continue

    children.set(entry.path, entry)
  }

  return Array.from(children.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
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
  /* v8 ignore next 3 -- defensive against transient read failures in the working tree */
  } catch {
    return null
  }
  return null
}

export function searchWorkingTreeByName(repoPath: string, query: string, caseSensitive: boolean): TreeNode[] {
  const entries = getTrackedWorkingTreeEntries(repoPath)
  const needle = caseSensitive ? query : query.toLowerCase()
  return entries.filter((entry) => {
    const hay = caseSensitive ? entry.path : entry.path.toLowerCase()
    return needle ? hay.includes(needle) : false
  })
}

export function searchWorkingTreeByContent(repoPath: string, query: string, caseSensitive: boolean): Array<TreeNode & { snippet: string; line: number }> {
  const entries = getTrackedWorkingTreeEntries(repoPath).filter((entry) => entry.type === 'file')
  const matches: Array<TreeNode & { snippet: string; line: number }> = []

  for (const entry of entries) {
    const fullPath = resolve(repoPath, entry.path)
    if (statSync(fullPath).size > 512_000) continue
    const snippet = readSnippet(fullPath, query, caseSensitive)
    if (snippet) {
      matches.push({ ...entry, ...snippet })
    }
  }

  return matches
}
