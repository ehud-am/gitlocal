import type { ReactNode } from 'react'
import type { Branch, RepoInfo, ViewerPathType } from '../../types'
import { Button } from '../ui/button'

interface Props {
  info?: RepoInfo
  branch: string
  branches?: Branch[]
  selectedPath: string
  selectedPathType: ViewerPathType
  onBranchChange: (branch: string) => void
  onEditGitIdentity?: () => void
  branchDisabled?: boolean
  branchSwitchDialog?: ReactNode
}

function lastSegment(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function buildTitle(info?: RepoInfo, selectedPath?: string, selectedPathType?: ViewerPathType): string {
  if (selectedPath) return lastSegment(selectedPath)
  if (selectedPathType === 'none' && info?.name) return info.name
  return info?.name || 'Repository'
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

export default function RepoContextHeader({
  info,
  branch,
  branches,
  selectedPath,
  selectedPathType,
  onBranchChange,
  onEditGitIdentity,
  branchDisabled = false,
  branchSwitchDialog,
}: Props) {
  const title = buildTitle(info, selectedPath, selectedPathType)
  const displayPath = buildDisplayPath(info, selectedPath)
  const gitUser = info?.gitContext?.user
  const remote = info?.gitContext?.remote
  const remoteWebUrl = remote?.webUrl ?? ''
  const remotePath = remote?.webUrl || remote?.fetchUrl || ''

  return (
    <section className="repo-context-header rounded-md border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-[22px] leading-tight font-semibold text-[var(--foreground)]">
                {title}
              </h1>
              <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {info?.isGitRepo ? 'Git repository' : 'Folder'}
              </span>
              {remote ? (
                <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                  Linked to remote git
                </span>
              ) : null}
            </div>
            <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
              {displayPath ? (
                <p className="truncate">
                  <span className="font-medium text-[var(--foreground)]">Local path:</span>{' '}
                  {displayPath}
                </p>
              ) : null}
              {remotePath ? (
                <p className="truncate">
                  <span className="font-medium text-[var(--foreground)]">Remote path:</span>{' '}
                  {remoteWebUrl ? (
                    <a
                      className="text-[var(--primary)] underline-offset-2 hover:underline"
                      href={remoteWebUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {remotePath}
                    </a>
                  ) : (
                    remotePath
                  )}
                </p>
              ) : null}
            </div>
          </div>

        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
          <label className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
            <span className="block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Branch
            </span>
            <select
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]"
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

          <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  Identity
                </p>
                {gitUser?.source ? (
                  <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    {gitUser.source}
                  </span>
                ) : null}
              </div>
              {onEditGitIdentity ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onEditGitIdentity}
                  aria-label="Edit repository git identity"
                >
                  Edit
                </Button>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-[var(--foreground)]">
                {gitUser?.name && gitUser?.email
                  ? `${gitUser.name} <${gitUser.email}>`
                  : 'Git user is not configured'}
            </p>
          </div>
        </div>
      </div>
      {branchSwitchDialog}
    </section>
  )
}
