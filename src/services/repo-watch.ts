import {
  getPathSyncState,
  getRepoSyncState,
  getPathType,
  getWorkingTreeChanges,
  getWorkingTreeSyncSummary,
  getWorkingTreeRevision,
  isWorkingTreeBranch,
  nearestExistingRepoPath,
} from '../git/repo.js'
import type { SyncStatus } from '../types.js'

export function getSyncStatus(repoPath: string, branch: string, currentPath: string): SyncStatus {
  const checkedAt = new Date().toISOString()
  if (!repoPath || !isWorkingTreeBranch(repoPath, branch)) {
    return {
      branch,
      repoPath,
      workingTreeRevision: branch || 'HEAD',
      treeStatus: 'unchanged',
      fileStatus: 'unchanged',
      currentPath,
      resolvedPath: currentPath,
      currentPathType: currentPath ? 'file' : 'none',
      resolvedPathType: currentPath ? 'file' : 'none',
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
      checkedAt,
    }
  }

  const currentPathType = getPathType(repoPath, currentPath)
  const resolvedPath = currentPathType === 'missing'
    ? nearestExistingRepoPath(repoPath, currentPath)
    : currentPath
  const resolvedPathType = getPathType(repoPath, resolvedPath)

  const treeStatus = currentPathType === 'missing' ? 'invalid' : 'unchanged'
  const fileStatus =
    currentPathType === 'missing'
      ? 'deleted'
      : 'unchanged'
  const syncSummary = getWorkingTreeSyncSummary(repoPath)
  const pathSyncState = currentPathType === 'file' ? getPathSyncState(repoPath, currentPath) : 'none'

  return {
    branch,
    repoPath,
    workingTreeRevision: getWorkingTreeRevision(repoPath),
    treeStatus,
    fileStatus,
    currentPath,
    resolvedPath,
    currentPathType,
    resolvedPathType,
    pathSyncState,
    trackedChangeCount: syncSummary.trackedChangeCount,
    untrackedChangeCount: syncSummary.untrackedChangeCount,
    repoSync: syncSummary.repoSync,
    statusMessage: '',
    checkedAt,
  }
}
