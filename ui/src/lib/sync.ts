import type { MetaTagIcon, MetaTagTone } from '../components/ui/meta-tag'
import type { FileSyncState, RepoSyncState } from '../types'

interface SyncPresentation {
  label: string
  tone: MetaTagTone
  icon: MetaTagIcon
}

export function describeFileSyncState(state?: FileSyncState): SyncPresentation | null {
  switch (state) {
    case 'local-uncommitted':
      return {
        label: 'Changed locally',
        tone: 'info',
        icon: 'local-change',
      }
    case 'local-committed':
      return {
        label: 'Local commit',
        tone: 'success',
        icon: 'local-commit',
      }
    case 'remote-committed':
      return {
        label: 'Remote update',
        tone: 'warning',
        icon: 'remote-update',
      }
    case 'diverged':
      return {
        label: 'Diverged',
        tone: 'danger',
        icon: 'diverged',
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
        tone: 'success',
        icon: 'local-commit',
      }
    case 'behind':
      return {
        label: `${repoSync.behindCount} behind`,
        tone: 'warning',
        icon: 'remote-update',
      }
    case 'diverged':
      return {
        label: `${repoSync.aheadCount} ahead / ${repoSync.behindCount} behind`,
        tone: 'danger',
        icon: 'diverged',
      }
    case 'up-to-date':
      return {
        label: 'Up to date',
        tone: 'neutral',
        icon: 'remote',
      }
    case 'local-only':
      return {
        label: 'No upstream',
        tone: 'neutral',
        icon: 'git',
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
