import type { FileSyncState, RepoSyncState } from '../types'

interface SyncPresentation {
  label: string
  className: string
}

export function describeFileSyncState(state?: FileSyncState): SyncPresentation | null {
  switch (state) {
    case 'local-uncommitted':
      return {
        label: 'Changed locally',
        className: 'sync-badge sync-badge-local',
      }
    case 'local-committed':
      return {
        label: 'Local commit',
        className: 'sync-badge sync-badge-ahead',
      }
    case 'remote-committed':
      return {
        label: 'Remote update',
        className: 'sync-badge sync-badge-behind',
      }
    case 'diverged':
      return {
        label: 'Diverged',
        className: 'sync-badge sync-badge-diverged',
      }
    default:
      return null
  }
}

export function describeRepoSyncState(repoSync?: RepoSyncState): SyncPresentation | null {
  if (!repoSync) return null

  switch (repoSync.mode) {
    case 'ahead':
      return {
        label: `${repoSync.aheadCount} ahead`,
        className: 'sync-badge sync-badge-ahead',
      }
    case 'behind':
      return {
        label: `${repoSync.behindCount} behind`,
        className: 'sync-badge sync-badge-behind',
      }
    case 'diverged':
      return {
        label: `${repoSync.aheadCount} ahead / ${repoSync.behindCount} behind`,
        className: 'sync-badge sync-badge-diverged',
      }
    case 'up-to-date':
      return {
        label: 'Up to date',
        className: 'sync-badge sync-badge-clean',
      }
    case 'local-only':
      return {
        label: 'No upstream',
        className: 'sync-badge sync-badge-clean',
      }
    default:
      return null
  }
}

export function getRepoSyncActionLabel(repoSync?: RepoSyncState): string {
  switch (repoSync?.mode) {
    case 'ahead':
      return 'Push to remote'
    case 'behind':
      return 'Pull from remote'
    case 'diverged':
      return 'Sync with remote'
    case 'up-to-date':
      return 'Check remote sync'
    default:
      return 'Sync with remote'
  }
}
