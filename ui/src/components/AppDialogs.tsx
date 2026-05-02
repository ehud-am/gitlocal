import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'

interface RepoBoundaryDialogProps {
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

interface GitIdentityDialogProps {
  open: boolean
  pending: boolean
  error: string
  name: string
  email: string
  onOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}

interface CommitChangesDialogProps {
  open: boolean
  pending: boolean
  error: string
  message: string
  onOpenChange: (open: boolean) => void
  onMessageChange: (value: string) => void
  onCancel: () => void
  onCommit: () => void
}

interface FolderDeleteDialogProps {
  open: boolean
  pending: boolean
  error: string
  path: string
  name: string
  fileCount: number
  folderCount: number
  message: string
  confirmationName: string
  onOpenChange: (open: boolean) => void
  onConfirmationNameChange: (value: string) => void
  onCancel: () => void
  onDelete: () => void
}

export function RepoBoundaryDialog({
  open,
  pending,
  onOpenChange,
  onConfirm,
}: RepoBoundaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave this repository?</DialogTitle>
          <DialogDescription>
            The <code>..</code> entry will move GitLocal up to the parent folder, outside the current repository. You will enter the folder browser so you can choose what to open next.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Stay here
          </Button>
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {pending ? 'Opening parent...' : 'Open parent folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function GitIdentityDialog({
  open,
  pending,
  error,
  name,
  email,
  onOpenChange,
  onNameChange,
  onEmailChange,
  onCancel,
  onSave,
}: GitIdentityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Repository Git Identity</DialogTitle>
          <DialogDescription>
            This updates <code>user.name</code> and <code>user.email</code> in this repository’s local git config only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">Name</span>
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Jane Developer"
              aria-label="Git user name"
              disabled={pending}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="jane@example.com"
              aria-label="Git user email"
              disabled={pending}
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={pending}>
            {pending ? 'Saving...' : 'Save identity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CommitChangesDialog({
  open,
  pending,
  error,
  message,
  onOpenChange,
  onMessageChange,
  onCancel,
  onCommit,
}: CommitChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commit local changes</DialogTitle>
          <DialogDescription>
            GitLocal will stage all current repository changes and create a local commit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">Commit message</span>
            <Input
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              placeholder="Describe the current work"
              aria-label="Commit message"
              disabled={pending}
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={onCommit} disabled={pending}>
            {pending ? 'Committing...' : 'Commit changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FolderDeleteDialog({
  open,
  pending,
  error,
  path,
  name,
  fileCount,
  folderCount,
  message,
  confirmationName,
  onOpenChange,
  onConfirmationNameChange,
  onCancel,
  onDelete,
}: FolderDeleteDialogProps) {
  const canDelete = confirmationName === name && Boolean(name)
  const fileText = fileCount === 1 ? '1 file' : `${fileCount} files`
  const folderText = folderCount === 1 ? '1 nested folder' : `${folderCount} nested folders`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete folder?</DialogTitle>
          <DialogDescription>
            {message || `This will permanently delete ${name || 'this folder'} and all of its contents.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]">
            <p><strong>Folder:</strong> {name || 'Unknown folder'}</p>
            <p><strong>Location:</strong> {path || 'repository root'}</p>
            <p><strong>Contents:</strong> {fileText}, {folderText}</p>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Type <code>{name}</code> to confirm
            </span>
            <Input
              value={confirmationName}
              onChange={(event) => onConfirmationNameChange(event.target.value)}
              aria-label="Folder deletion confirmation name"
              disabled={pending}
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onDelete} disabled={pending || !canDelete}>
            {pending ? 'Deleting...' : 'Delete folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
