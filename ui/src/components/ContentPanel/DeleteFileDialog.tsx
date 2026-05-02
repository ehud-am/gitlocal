import { Input } from '../ui/input'

interface Props {
  path: string
  name: string
  location: string
  confirmationName: string
  busy?: boolean
  error?: string
  onConfirmationNameChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteFileDialog({
  path,
  name,
  location,
  confirmationName,
  busy = false,
  error,
  onConfirmationNameChange,
  onConfirm,
  onCancel,
}: Props) {
  const canDelete = confirmationName === name && Boolean(name)

  return (
    <div className="manual-editor-card manual-delete-card" role="alertdialog" aria-label="Delete file confirmation">
      <div className="manual-editor-header">
        <div>
          <h3>Delete file</h3>
          <p>{path}</p>
        </div>
        <div className="manual-editor-actions">
          <button type="button" className="btn-raw" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-raw btn-danger" onClick={onConfirm} disabled={busy || !canDelete}>
            {busy ? 'Deleting…' : 'Delete file'}
          </button>
        </div>
      </div>
      <p className="manual-delete-copy">This permanently removes the file from your working tree.</p>
      <div className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]">
        <p><strong>File:</strong> {name || 'Unknown file'}</p>
        <p><strong>Location:</strong> {location || 'repository root'}</p>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Type <code>{name}</code> to confirm
        </span>
        <Input
          value={confirmationName}
          onChange={(event) => onConfirmationNameChange(event.target.value)}
          aria-label="File deletion confirmation name"
          disabled={busy}
        />
      </label>
      {error && (
        <p className="manual-editor-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
