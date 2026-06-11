import {
  getPathSyncState,
  getRepoSyncState,
  buildChangedFileItems,
  getPathType,
  getWorkingTreeChanges,
  getWorkingTreeSyncSummary,
  getWorkingTreeRevision,
  isWorkingTreeBranch,
  nearestExistingRepoPath,
  summarizeChangedFiles,
} from '../git/repo.js'
import type { BackgroundChangeNotice, ChangedFilesSummary, SyncStatus } from '../types.js'

function emptyChangedFilesSummary(): ChangedFilesSummary {
  return {
    total: 0,
    modified: 0,
    added: 0,
    deleted: 0,
    renamed: 0,
    untracked: 0,
    remoteRelevant: 0,
    tracked: 0,
  }
}

function buildActivePathNotice(
  currentPath: string,
  fileStatus: SyncStatus['fileStatus'],
  pathSyncState: SyncStatus['pathSyncState'],
  checkedAt: string,
): BackgroundChangeNotice | undefined {
  if (!currentPath) return undefined
  if (fileStatus === 'deleted') {
    return {
      path: currentPath,
      changeKind: 'deleted',
      detectedAt: checkedAt,
      lastRefreshedAt: checkedAt,
      message: `${currentPath} was deleted outside GitLocal. GitLocal moved to the nearest available folder.`,
      actionLabel: 'View changed files',
    }
  }

  if (fileStatus === 'changed' || pathSyncState === 'local-uncommitted') {
    return {
      path: currentPath,
      changeKind: 'refreshed',
      detectedAt: checkedAt,
      lastRefreshedAt: checkedAt,
      message: `${currentPath} changed outside GitLocal and was refreshed.`,
      actionLabel: 'View changed files',
    }
  }

  return undefined
}

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
      changedFilesSummary: emptyChangedFilesSummary(),
    }
  }

  const currentPathType = getPathType(repoPath, currentPath)
  const resolvedPath = currentPathType === 'missing'
    ? nearestExistingRepoPath(repoPath, currentPath)
    : currentPath
  const resolvedPathType = getPathType(repoPath, resolvedPath)

  const treeStatus = currentPathType === 'missing' ? 'invalid' : 'unchanged'
  const pathSyncState = currentPathType === 'file' ? getPathSyncState(repoPath, currentPath) : 'none'
  const fileStatus =
    currentPathType === 'missing'
      ? 'deleted'
      : pathSyncState === 'local-uncommitted'
        ? 'changed'
        : 'unchanged'
  const syncSummary = getWorkingTreeSyncSummary(repoPath)
  const changedFilesSummary = summarizeChangedFiles(buildChangedFileItems(repoPath, true))
  const activePathNotice = buildActivePathNotice(currentPath, fileStatus, pathSyncState, checkedAt)
  const statusMessage = activePathNotice?.message ?? ''

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
    statusMessage,
    checkedAt,
    activePathNotice,
    changedFilesSummary,
  }
}
