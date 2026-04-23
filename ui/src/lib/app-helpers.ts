import type { Branch, BranchSwitchResponse } from '../types'

type BranchScope = 'local' | 'remote'

export function branchMatchesTarget(branch: Branch, target: string): boolean {
  return branch.name === target || branch.trackingRef === target || branch.displayName === target
}

export function describeBranchTarget(branches: Branch[] | undefined, target: string): { label: string; scope: BranchScope } {
  const branch = branches?.find((option) => branchMatchesTarget(option, target))
  return {
    label: branch?.displayName ?? branch?.name ?? target,
    scope: branch?.scope ?? 'local',
  }
}

export function sortBranchOptions(options: Branch[]): Branch[] {
  return [...options].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
    if ((a.scope ?? 'local') !== (b.scope ?? 'local')) return (a.scope ?? 'local') === 'local' ? -1 : 1
    return (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name)
  })
}

export function updateBranchCacheAfterSwitch(
  previous: Branch[] | undefined,
  target: string,
  nextBranch: string,
  result: BranchSwitchResponse,
): Branch[] | undefined {
  if (!previous) return previous

  const targetOption = previous.find((option) => branchMatchesTarget(option, target))
  let nextOptions = previous.map((option) => ({
    ...option,
    isCurrent: option.name === nextBranch,
    hasLocalCheckout: option.name === nextBranch ? true : option.hasLocalCheckout,
  }))

  if (result.createdTrackingBranch) {
    nextOptions = nextOptions.filter((option) =>
      !(
        option.name === nextBranch
        || (option.scope === 'remote' && (option.trackingRef === target || option.name === nextBranch))
      ),
    )

    nextOptions.push({
      name: nextBranch,
      displayName: nextBranch,
      scope: 'local',
      remoteName: targetOption?.remoteName,
      trackingRef: targetOption?.trackingRef ?? (targetOption?.scope === 'remote' ? target : undefined),
      hasLocalCheckout: true,
      isCurrent: true,
    })
  }

  return sortBranchOptions(nextOptions)
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const maybePayload = error as { error?: string; message?: string }
    return maybePayload.error ?? maybePayload.message ?? fallback
  }
  return fallback
}
