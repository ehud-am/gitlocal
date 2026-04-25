import { useState, type ReactNode } from 'react'
import type { Branch, RepoInfo, RepoSyncState, ViewerPathType } from '../../types'
import { describeRepoSyncState } from '../../lib/sync'
import { Button } from '../ui/button'
import { MetaTag } from '../ui/meta-tag'
import SearchTrigger from '../Search/SearchTrigger'

interface Props {
  info?: RepoInfo
  branch: string
  branches?: Branch[]
  selectedPath: string
  selectedPathType: ViewerPathType
  repoSync?: RepoSyncState
  trackedChangeCount?: number
  untrackedChangeCount?: number
  onBranchChange: (branch: string) => void
  onEditGitIdentity?: () => void
  onCommitChanges?: () => void
  onSyncWithRemote?: () => void
  onOpenSearch?: () => void
  branchDisabled?: boolean
  commitDisabled?: boolean
  syncDisabled?: boolean
  syncActionLabel?: string
  branchSwitchDialog?: ReactNode
}

function buildDisplayPath(info?: RepoInfo, selectedPath?: string): string {
  if (!info?.path) return ''
  return selectedPath ? `${info.path}/${selectedPath}` : info.path
}

function branchLabel(branch: Branch): string {
  if (branch.displayName) return branch.displayName
  if (branch.scope === 'remote' && branch.remoteName) return `${branch.name} (${branch.remoteName})`
  return branch.name
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      className={expanded ? 'rotate-180' : undefined}
    >
      <path
        d="M3.5 6 8 10.5 12.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M11.8 1.8a1.6 1.6 0 0 1 2.3 2.3l-7.4 7.4-2.9.6.6-2.9 7.4-7.4Zm1.6 1.6a.6.6 0 0 0-.9-.9l-.8.8.9.9.8-.8ZM5 9.7l1.3 1.3 5.6-5.6-1.3-1.3L5 9.7Zm-.4 1 1 .9-1.3.3.3-1.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function RepoContextHeader({
  info,
  branch,
  branches,
  selectedPath,
  selectedPathType,
  repoSync,
  trackedChangeCount = 0,
  untrackedChangeCount = 0,
  onBranchChange,
  onEditGitIdentity,
  onCommitChanges,
  onSyncWithRemote,
  onOpenSearch,
  branchDisabled = false,
  commitDisabled = false,
  syncDisabled = false,
  syncActionLabel = 'Sync with remote',
  branchSwitchDialog,
}: Props) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const displayPath = buildDisplayPath(info, selectedPath)
  const gitUser = info?.gitContext?.user
  const remote = info?.gitContext?.remote
  const remoteWebUrl = remote?.webUrl ?? ''
  const remotePath = remote?.webUrl || remote?.fetchUrl || ''
  const repoSyncBadge = describeRepoSyncState(repoSync)
  const changeSummary = trackedChangeCount + untrackedChangeCount
  const repoName = info?.name || 'Repository'
  const hasActivePath = selectedPathType !== 'none' && Boolean(selectedPath)

  return (
    <section className="repo-context-header overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Repository
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[20px] leading-tight font-semibold text-[var(--foreground)]">
                {repoName}
              </h1>
              {info?.isGitRepo ? <MetaTag label="Git" icon="git" tone="neutral" compact /> : null}
              {remote ? <MetaTag label="Remote" icon="remote" tone="neutral" compact /> : null}
              {repoSyncBadge ? <MetaTag label={repoSyncBadge.label} icon={repoSyncBadge.icon} tone={repoSyncBadge.tone} compact /> : null}
              {changeSummary > 0 ? (
                <MetaTag
                  label={`${changeSummary} local ${changeSummary === 1 ? 'change' : 'changes'}`}
                  icon="local-change"
                  tone="info"
                  compact
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Branch
              </span>
              <select
                className="min-w-[150px] border-0 bg-transparent text-sm text-[var(--foreground)] outline-none"
                value={branch}
                onChange={(event) => onBranchChange(event.target.value)}
                aria-label="branch selector"
                disabled={branchDisabled || (branches ?? []).length === 0}
              >
                {(branches ?? []).map((option) => (
                  <option
                    key={option.trackingRef ?? `${option.scope ?? 'local'}:${option.name}`}
                    value={(option.scope ?? 'local') === 'remote' ? (option.trackingRef ?? option.name) : option.name}
                  >
                    {branchLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            {onOpenSearch ? <SearchTrigger onOpen={onOpenSearch} /> : null}
          </div>
        </div>

        {detailsExpanded ? (
          <div className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Repository details</p>
              <p className="break-all text-sm text-[var(--foreground)]">{info?.path || 'Not available'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Current branch</p>
              <p className="text-sm text-[var(--foreground)]">{branch || 'Not available'}</p>
            </div>
            {hasActivePath ? (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Active path</p>
                <p className="break-all text-sm text-[var(--foreground)]">{displayPath}</p>
              </div>
            ) : null}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Git identity</p>
                {gitUser?.source ? <MetaTag label={gitUser.source} icon="user" tone="neutral" compact /> : null}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <p className="break-all text-sm text-[var(--foreground)]">
                  {gitUser?.name && gitUser?.email
                    ? `${gitUser.name} <${gitUser.email}>`
                    : 'Git user is not configured'}
                </p>
                {onEditGitIdentity ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={onEditGitIdentity}
                    aria-label="Edit repository git identity"
                    title="Edit repository git identity"
                  >
                    <EditIcon />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Upstream sync</p>
              <p className="text-sm text-[var(--foreground)]">
                {repoSync?.hasUpstream
                  ? `Tracking ${repoSync.upstreamRef || 'the upstream branch'}${repoSync.remoteName ? ` via ${repoSync.remoteName}` : ''}.`
                  : 'This branch does not currently track an upstream remote.'}
              </p>
            </div>
            {remotePath ? (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Remote path</p>
                {remoteWebUrl ? (
                  <a
                    className="break-all text-sm text-[var(--primary)] underline-offset-2 hover:underline"
                    href={remoteWebUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {remotePath}
                  </a>
                ) : (
                  <p className="break-all text-sm text-[var(--foreground)]">{remotePath}</p>
                )}
              </div>
            ) : null}
            {(onCommitChanges || onSyncWithRemote) ? (
              <div className="space-y-3 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Repository actions</p>
                <div className="flex flex-wrap items-center gap-2">
                  {onCommitChanges ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onCommitChanges}
                      disabled={commitDisabled}
                    >
                      Commit
                    </Button>
                  ) : null}
                  {onSyncWithRemote ? (
                    <Button
                      type="button"
                      onClick={onSyncWithRemote}
                      disabled={syncDisabled}
                    >
                      {syncActionLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        aria-expanded={detailsExpanded}
        aria-label={detailsExpanded ? 'Collapse repository details' : 'Expand repository details'}
        onClick={() => setDetailsExpanded((value) => !value)}
      >
        <ChevronIcon expanded={detailsExpanded} />
      </button>

      {branchSwitchDialog}
    </section>
  )
}
