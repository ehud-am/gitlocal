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
      resolvedPathType: 'none',
      pathSyncState: 'none',
      trackedChangeCount: 0,
      untrackedChangeCount: 0,
      repoSync: {
        mode: 'unavailable',
        aheadCount: 0,
        behindCount: 0,
        hasUpstream: false,
        upstreamRef: '',
        remoteName: '',
      },
      statusMessage: '',
      checkedAt: new Date().toISOString(),
      changedFilesSummary: {
        total: 0,
        modified: 0,
        added: 0,
        deleted: 0,
        renamed: 0,
        untracked: 0,
        remoteRelevant: 0,
        tracked: 0,
      },
    })
  }

  const currentPath = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? getCurrentBranch(repoPath)
  return c.json(getSyncStatus(repoPath, branch, currentPath))
}
