import { useState, type ReactNode } from 'react'
import type { BackgroundChangeNotice, Branch, ChangedFilesResponse, ChangedFileItem, RepoInfo, RepoLocationResponse, RepoSummaryResponse, RepoSyncState, ViewerPathType } from '../../types'
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
  repoSummary?: RepoSummaryResponse
  trackedChangeCount?: number
  untrackedChangeCount?: number
  activePathNotice?: BackgroundChangeNotice
  changedFiles?: ChangedFilesResponse | null
  onBranchChange: (branch: string) => void
  onEditGitIdentity?: () => void
  onOpenSearch?: () => void
  onOpenChangedFiles?: () => void
  onCloseChangedFiles?: () => void
  onOpenChangedFile?: (item: ChangedFileItem) => void
  branchDisabled?: boolean
  branchSwitchDialog?: ReactNode
  onNavigateHome?: () => void
  repoLocation?: RepoLocationResponse
  onNavigateReadme?: () => void
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

function HomeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 2 2 7v7h4V9.5h4V14h4V7L8 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReadmeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M3 2.5h6.5L13 6v7.5H3V2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M5.5 8h5M5.5 10.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
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
  repoSummary,
  trackedChangeCount = 0,
  untrackedChangeCount = 0,
  activePathNotice,
  changedFiles,
  onBranchChange,
  onEditGitIdentity,
  onOpenSearch,
  onOpenChangedFiles,
  onCloseChangedFiles,
  onOpenChangedFile,
  branchDisabled = false,
  branchSwitchDialog,
  onNavigateHome,
  repoLocation,
  onNavigateReadme,
}: Props) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const displayPath = buildDisplayPath(info, selectedPath)
  const gitUser = info?.gitContext?.user
  const remote = info?.gitContext?.remote
  const remoteWebUrl = remote?.webUrl ?? ''
  const remotePath = remote?.webUrl || remote?.fetchUrl || ''
  const repoSyncBadge = describeRepoSyncState(repoSync)
  const summaryLocalChangeCount = repoSummary?.statusSummary.localChangeCount
  const changeSummary = summaryLocalChangeCount ?? (trackedChangeCount + untrackedChangeCount)
  const showSyncBadge = Boolean(repoSyncBadge) && !(repoSync?.mode === 'up-to-date' && changeSummary > 0)
  const isGitRepo = Boolean(info?.isGitRepo)
  const repoName = info?.name || (isGitRepo ? 'Repository' : 'Folder')
  const hasActivePath = selectedPathType !== 'none' && Boolean(selectedPath)
  const homeEnabled = Boolean(repoLocation?.repositoryRootPath) && !repoLocation?.isRepositoryRoot
  const readmeEnabled = Boolean(repoLocation?.homeReadmePath)
  const hasTags = isGitRepo || Boolean(remote) || (showSyncBadge && Boolean(repoSyncBadge)) || changeSummary > 0
  const hasRootReadme = isGitRepo && (Boolean(onNavigateHome) || Boolean(onNavigateReadme))

  return (
    <section className="repo-context-header overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-1.5 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {isGitRepo ? 'Repository' : 'Folder'}
            </p>
            <h1 className="truncate text-[20px] leading-tight font-semibold text-[var(--foreground)]">
              {repoName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isGitRepo ? (
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
            ) : null}
            {onOpenSearch ? <SearchTrigger onOpen={onOpenSearch} /> : null}
          </div>
        </div>

        {hasTags || hasRootReadme ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {isGitRepo ? <MetaTag label="Git" icon="git" tone="neutral" compact /> : null}
              {remote ? <MetaTag label="Remote" icon="remote" tone="neutral" compact /> : null}
              {showSyncBadge && repoSyncBadge ? <MetaTag label={repoSyncBadge.label} icon={repoSyncBadge.icon} tone={repoSyncBadge.tone} compact /> : null}
              {changeSummary > 0 ? (
                <MetaTag
                  label={`${changeSummary} local ${changeSummary === 1 ? 'change' : 'changes'}`}
                  icon="local-change"
                  tone="info"
                  compact
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {isGitRepo && onNavigateHome ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 xl:hidden"
                    onClick={onNavigateHome}
                    disabled={!homeEnabled}
                    aria-label="Root"
                    title="Root"
                  >
                    <HomeIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="hidden h-7 gap-1 px-2 text-[11px] xl:inline-flex"
                    onClick={onNavigateHome}
                    disabled={!homeEnabled}
                    aria-label="Root"
                    title="Root"
                  >
                    <HomeIcon />
                    Root
                  </Button>
                </>
              ) : null}
              {isGitRepo && onNavigateReadme ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 xl:hidden"
                    onClick={onNavigateReadme}
                    disabled={!readmeEnabled}
                    aria-label="Readme"
                    title="Readme"
                  >
                    <ReadmeIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="hidden h-7 gap-1 px-2 text-[11px] xl:inline-flex"
                    onClick={onNavigateReadme}
                    disabled={!readmeEnabled}
                    aria-label="Readme"
                    title="Readme"
                  >
                    <ReadmeIcon />
                    Readme
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {activePathNotice ? (
          <div className="background-change-notice" role="status">
            <p>{activePathNotice.message}</p>
            {onOpenChangedFiles ? (
              <Button type="button" variant="secondary" size="sm" onClick={onOpenChangedFiles}>
                {activePathNotice.actionLabel ?? 'View changed files'}
              </Button>
            ) : null}
          </div>
        ) : null}

        {changedFiles && changedFiles.items.length > 0 ? (
          <section className="changed-files-panel" aria-label="changed files">
            <div className="changed-files-panel-header">
              <p className="changed-files-title">Changed files</p>
              <div className="changed-files-panel-actions">
                <span>{changedFiles.summary.total} {changedFiles.summary.total === 1 ? 'path' : 'paths'}</span>
                {onCloseChangedFiles ? (
                  <Button type="button" variant="ghost" size="icon" aria-label="Close changed files" onClick={onCloseChangedFiles}>
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                      <path d="M4 4L12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M12 4L4 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </Button>
                ) : null}
              </div>
            </div>
            <ul>
              {changedFiles.items.map((item) => (
                <li key={`${item.changeState}:${item.path}`}>
                  <button type="button" onClick={() => onOpenChangedFile?.(item)}>
                    <span className="changed-file-path">{item.path}</span>
                    <span className="changed-file-meta">
                      {item.changeState}
                      {item.generatedLocalState !== 'tracked' ? ` · ${item.generatedLocalState}` : ''}
                      {!item.canOpen ? ' · unavailable' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : changedFiles ? (
          <section className="changed-files-panel" aria-label="changed files">
            <div className="changed-files-panel-header">
              <p className="changed-files-title">Changed files</p>
              {onCloseChangedFiles ? (
                <Button type="button" variant="ghost" size="icon" aria-label="Close changed files" onClick={onCloseChangedFiles}>
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="M4 4L12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M12 4L4 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </Button>
              ) : null}
            </div>
            <p>No changed files to review.</p>
          </section>
        ) : null}

        {detailsExpanded ? (
          <div className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                {isGitRepo ? 'Local repository' : 'Local folder'}
              </p>
              <p className="break-all text-sm text-[var(--foreground)]">{info?.path || 'Not available'}</p>
            </div>
            {isGitRepo ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Remote repository</p>
                {remotePath ? (
                  remoteWebUrl ? (
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
                  )
                ) : (
                  <p className="text-sm text-[var(--foreground)]">No remote configured</p>
                )}
              </div>
            ) : null}
            {hasActivePath ? (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Active path</p>
                <p className="break-all text-sm text-[var(--foreground)]">{displayPath}</p>
              </div>
            ) : null}
            {isGitRepo ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Git identity</p>
                  {gitUser?.source ? <MetaTag label="local" icon="user" tone="neutral" compact /> : null}
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
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        aria-expanded={detailsExpanded}
        aria-label={detailsExpanded ? `Collapse ${isGitRepo ? 'repository' : 'folder'} details` : `Expand ${isGitRepo ? 'repository' : 'folder'} details`}
        onClick={() => setDetailsExpanded((value) => !value)}
      >
        <ChevronIcon expanded={detailsExpanded} />
      </button>

      {branchSwitchDialog}
    </section>
  )
}
