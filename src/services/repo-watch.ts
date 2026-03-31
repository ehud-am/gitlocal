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
      statusMessage: '',
      checkedAt,
    }
  }

  const currentPathType = getPathType(repoPath, currentPath)
  const resolvedPath = currentPathType === 'missing'
    ? nearestExistingRepoPath(repoPath, currentPath)
    : currentPath

  const treeStatus = currentPathType === 'missing' ? 'invalid' : 'changed'
  const fileStatus =
    currentPathType === 'missing'
      ? 'deleted'
      : currentPathType === 'file'
        ? 'changed'
        : currentPathType === 'dir'
          ? 'unchanged'
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
    statusMessage:
      currentPathType === 'missing'
        ? 'The current location is no longer available. GitLocal moved you to the nearest valid path.'
        : '',
    checkedAt,
  }
}
