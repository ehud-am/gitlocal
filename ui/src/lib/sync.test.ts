import { describe, expect, it } from 'vitest'
import { describeFileSyncState, describeRepoSyncState, getRepoSyncActionLabel } from './sync'

describe('sync helpers', () => {
  it('describes every file sync state', () => {
    expect(describeFileSyncState('local-uncommitted')).toEqual({
      label: 'Changed locally',
      tone: 'info',
      icon: 'local-change',
    })
    expect(describeFileSyncState('local-committed')).toEqual({
      label: 'Local commit',
      tone: 'success',
      icon: 'local-commit',
    })
    expect(describeFileSyncState('remote-committed')).toEqual({
      label: 'Remote update',
      tone: 'warning',
      icon: 'remote-update',
    })
    expect(describeFileSyncState('diverged')).toEqual({
      label: 'Diverged',
      tone: 'danger',
      icon: 'diverged',
    })
    expect(describeFileSyncState('clean')).toBeNull()
    expect(describeFileSyncState()).toBeNull()
  })

  it('describes every repository sync mode', () => {
    expect(describeRepoSyncState({
      mode: 'ahead',
      aheadCount: 2,
      behindCount: 0,
      hasUpstream: true,
      upstreamRef: 'origin/main',
      remoteName: 'origin',
    })).toEqual({
      label: '2 ahead',
      tone: 'success',
      icon: 'local-commit',
    })

    expect(describeRepoSyncState({
      mode: 'behind',
      aheadCount: 0,
      behindCount: 3,
      hasUpstream: true,
      upstreamRef: 'origin/main',
      remoteName: 'origin',
    })).toEqual({
      label: '3 behind',
      tone: 'warning',
      icon: 'remote-update',
    })

    expect(describeRepoSyncState({
      mode: 'diverged',
      aheadCount: 2,
      behindCount: 1,
      hasUpstream: true,
      upstreamRef: 'origin/main',
      remoteName: 'origin',
    })).toEqual({
      label: '2 ahead / 1 behind',
      tone: 'danger',
      icon: 'diverged',
    })

    expect(describeRepoSyncState({
      mode: 'up-to-date',
      aheadCount: 0,
      behindCount: 0,
      hasUpstream: true,
      upstreamRef: 'origin/main',
      remoteName: 'origin',
    })).toEqual({
      label: 'Up to date',
      tone: 'neutral',
      icon: 'remote',
    })

    expect(describeRepoSyncState({
      mode: 'local-only',
      aheadCount: 0,
      behindCount: 0,
      hasUpstream: false,
      upstreamRef: '',
      remoteName: '',
    })).toEqual({
      label: 'No upstream',
      tone: 'neutral',
      icon: 'git',
    })

    expect(describeRepoSyncState({
      mode: 'unavailable',
      aheadCount: 0,
      behindCount: 0,
      hasUpstream: false,
      upstreamRef: '',
      remoteName: '',
    })).toBeNull()
    expect(describeRepoSyncState()).toBeNull()
  })

  it('chooses the right sync action labels', () => {
    expect(getRepoSyncActionLabel({ mode: 'ahead', aheadCount: 1, behindCount: 0, hasUpstream: true, upstreamRef: 'origin/main', remoteName: 'origin' })).toBe('Push to remote')
    expect(getRepoSyncActionLabel({ mode: 'behind', aheadCount: 0, behindCount: 1, hasUpstream: true, upstreamRef: 'origin/main', remoteName: 'origin' })).toBe('Pull from remote')
    expect(getRepoSyncActionLabel({ mode: 'diverged', aheadCount: 1, behindCount: 1, hasUpstream: true, upstreamRef: 'origin/main', remoteName: 'origin' })).toBe('Sync with remote')
    expect(getRepoSyncActionLabel({ mode: 'up-to-date', aheadCount: 0, behindCount: 0, hasUpstream: true, upstreamRef: 'origin/main', remoteName: 'origin' })).toBe('Check remote sync')
    expect(getRepoSyncActionLabel({ mode: 'local-only', aheadCount: 0, behindCount: 0, hasUpstream: false, upstreamRef: '', remoteName: '' })).toBe('Sync with remote')
    expect(getRepoSyncActionLabel()).toBe('Sync with remote')
  })
})
