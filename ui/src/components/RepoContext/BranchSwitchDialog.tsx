import type { BranchSwitchResponse } from '../../types'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'

interface Props {
  open: boolean
  targetLabel: string
  targetScope?: 'local' | 'remote'
  response: BranchSwitchResponse | null
  commitMessage: string
  pending?: boolean
  errorMessage?: string
  onCommitMessageChange: (value: string) => void
  onCancel: () => void
  onCommit: () => void
  onDiscard: () => void
  onDeleteUntracked: () => void
}

function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export default function BranchSwitchDialog({
  open,
  targetLabel,
  targetScope = 'local',
  response,
  commitMessage,
  pending = false,
  errorMessage = '',
  onCommitMessageChange,
  onCancel,
  onCommit,
  onDiscard,
  onDeleteUntracked,
}: Props) {
  const trackedChangeCount = response?.trackedChangeCount ?? 0
  const untrackedChangeCount = response?.untrackedChangeCount ?? 0
  const blockingPaths = response?.blockingPaths ?? []
  const isSecondConfirmation = response?.status === 'second-confirmation-required'
  const commitDisabled = pending || commitMessage.trim().length === 0

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !pending) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSecondConfirmation ? 'Delete untracked files?' : 'Switch branches?'}
          </DialogTitle>
          <DialogDescription>
            {isSecondConfirmation
              ? `These untracked files still block switching to ${targetLabel}. Deleting them will permanently remove local content.`
              : `GitLocal needs a decision before it can switch to ${targetLabel}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Target branch
              </p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{targetLabel}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                Change summary
              </p>
              <p className="mt-1 text-sm text-[var(--foreground)]">
                {pluralize(trackedChangeCount, 'tracked change')}
                {' and '}
                {pluralize(untrackedChangeCount, 'untracked file')}
              </p>
            </div>
          </div>

          {targetScope === 'remote' && !isSecondConfirmation ? (
            <p className="rounded-md border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-sm text-[var(--foreground)]">
              GitLocal will create a local tracking branch for this remote branch.
            </p>
          ) : null}

          {blockingPaths.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {isSecondConfirmation ? 'Files to delete' : 'Paths involved'}
              </p>
              <ul className="max-h-40 space-y-1 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)]">
                {blockingPaths.map((path) => (
                  <li key={path} className="break-all">{path}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {!isSecondConfirmation ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="branch-switch-commit-message">
                Commit message
              </label>
              <Input
                id="branch-switch-commit-message"
                value={commitMessage}
                onChange={(event) => onCommitMessageChange(event.target.value)}
                placeholder="WIP before switching branches"
                disabled={pending}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                GitLocal stages every current change before creating the commit.
              </p>
            </div>
          ) : null}

          {(errorMessage || response?.message) ? (
            <p
              className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)]"
              role={errorMessage ? 'alert' : 'status'}
            >
              {errorMessage || response?.message}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          {isSecondConfirmation ? (
            <Button type="button" variant="danger" onClick={onDeleteUntracked} disabled={pending}>
              {pending ? 'Deleting...' : 'Delete files and switch'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onDiscard} disabled={pending}>
                {pending ? 'Discarding...' : 'Discard changes and switch'}
              </Button>
              <Button type="button" onClick={onCommit} disabled={commitDisabled}>
                {pending ? 'Committing...' : 'Commit and switch'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
