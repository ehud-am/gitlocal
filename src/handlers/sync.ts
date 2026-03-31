import type { Context } from 'hono'
import { getCurrentBranch } from '../git/repo.js'
import { getSyncStatus } from '../services/repo-watch.js'

type Variables = { repoPath: string }

export async function syncHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({
      branch: '',
      repoPath: '',
      workingTreeRevision: '',
      treeStatus: 'unchanged',
      fileStatus: 'unavailable',
      currentPath: '',
      resolvedPath: '',
      currentPathType: 'none',
      statusMessage: '',
      checkedAt: new Date().toISOString(),
    })
  }

  const currentPath = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? getCurrentBranch(repoPath)
  return c.json(getSyncStatus(repoPath, branch, currentPath))
}
