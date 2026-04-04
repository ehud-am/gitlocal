import {
  getPathType,
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
    statusMessage:
      currentPathType === 'missing'
        ? 'The current location is no longer available. GitLocal moved you to the nearest valid path.'
        : '',
    checkedAt,
  }
}
