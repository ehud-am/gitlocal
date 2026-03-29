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
