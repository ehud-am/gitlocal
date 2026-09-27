import type { Context } from 'hono'
import { emptyChangedFilesSummary, getSyncStatusAsync } from '../services/repo-watch.js'

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
      changedFilesSummary: emptyChangedFilesSummary(),
    })
  }

  const currentPath = c.req.query('path') ?? ''
  return c.json(await getSyncStatusAsync(repoPath, c.req.query('branch'), currentPath))
}
