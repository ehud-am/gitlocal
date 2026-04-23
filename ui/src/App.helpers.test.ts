import { describe, expect, it } from 'vitest'
import {
  branchMatchesTarget,
  describeBranchTarget,
  getErrorMessage,
  sortBranchOptions,
  updateBranchCacheAfterSwitch,
} from './lib/app-helpers'

describe('App helpers', () => {
  it('matches branches by name, tracking ref, and display label', () => {
    const branch = {
      name: 'release',
      displayName: 'release (origin)',
      scope: 'remote' as const,
      trackingRef: 'origin/release',
      remoteName: 'origin',
      hasLocalCheckout: false,
      isCurrent: false,
    }

    expect(branchMatchesTarget(branch, 'release')).toBe(true)
    expect(branchMatchesTarget(branch, 'origin/release')).toBe(true)
    expect(branchMatchesTarget(branch, 'release (origin)')).toBe(true)
    expect(branchMatchesTarget(branch, 'main')).toBe(false)
  })

  it('describes branch targets with sensible fallbacks', () => {
    const branches = [
      {
        name: 'release',
        displayName: 'release (origin)',
        scope: 'remote' as const,
        trackingRef: 'origin/release',
        remoteName: 'origin',
        hasLocalCheckout: false,
        isCurrent: false,
      },
    ]

    expect(describeBranchTarget(branches, 'origin/release')).toEqual({
      label: 'release (origin)',
      scope: 'remote',
    })
    expect(describeBranchTarget(undefined, 'main')).toEqual({
      label: 'main',
      scope: 'local',
    })
    expect(describeBranchTarget([{ name: 'feature', isCurrent: false }], 'feature')).toEqual({
      label: 'feature',
      scope: 'local',
    })
  })

  it('sorts current branches first, then local branches, then alphabetically', () => {
    const sorted = sortBranchOptions([
      { name: 'zeta', displayName: 'zeta', scope: 'remote', hasLocalCheckout: false, isCurrent: false },
      { name: 'beta', displayName: 'beta', scope: 'local', hasLocalCheckout: true, isCurrent: false },
      { name: 'alpha', displayName: 'alpha', scope: 'local', hasLocalCheckout: true, isCurrent: true },
      { name: 'gamma', hasLocalCheckout: false, isCurrent: false },
    ])

    expect(sorted.map((branch) => branch.name)).toEqual(['alpha', 'beta', 'gamma', 'zeta'])
  })

  it('updates cached branches after switching or creating a tracking branch', () => {
    const previous = [
      { name: 'main', displayName: 'main', scope: 'local' as const, hasLocalCheckout: true, isCurrent: true },
      { name: 'release', displayName: 'release (origin)', scope: 'remote' as const, trackingRef: 'origin/release', remoteName: 'origin', hasLocalCheckout: false, isCurrent: false },
    ]

    expect(updateBranchCacheAfterSwitch(undefined, 'main', 'main', { ok: true, status: 'switched', message: 'done', currentBranch: 'main' })).toBeUndefined()

    const switched = updateBranchCacheAfterSwitch(previous, 'main', 'main', {
      ok: true,
      status: 'switched',
      message: 'done',
      currentBranch: 'main',
    })
    expect(switched?.find((branch) => branch.name === 'main')?.isCurrent).toBe(true)

    const created = updateBranchCacheAfterSwitch(previous, 'origin/release', 'release', {
      ok: true,
      status: 'switched',
      message: 'done',
      currentBranch: 'release',
      createdTrackingBranch: 'release',
    })

    expect(created?.some((branch) => branch.name === 'release' && branch.scope === 'local')).toBe(true)
    expect(created?.find((branch) => branch.name === 'release' && branch.scope === 'local')?.trackingRef).toBe('origin/release')

    const fallbackTracking = updateBranchCacheAfterSwitch([
      { name: 'main', displayName: 'main', scope: 'local' as const, hasLocalCheckout: true, isCurrent: true },
    ], 'origin/missing', 'missing', {
      ok: true,
      status: 'switched',
      message: 'done',
      currentBranch: 'missing',
      createdTrackingBranch: 'missing',
    })

    expect(fallbackTracking?.find((branch) => branch.name === 'missing')?.trackingRef).toBeUndefined()
  })

  it('extracts useful error messages from different payloads', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
    expect(getErrorMessage({ error: 'bad request' }, 'fallback')).toBe('bad request')
    expect(getErrorMessage({ message: 'oops' }, 'fallback')).toBe('oops')
    expect(getErrorMessage({ detail: 'no message' }, 'fallback')).toBe('fallback')
    expect(getErrorMessage('unknown', 'fallback')).toBe('fallback')
  })
})
