interface Props {
  path: string
  busy?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteFileDialog({ path, busy = false, error, onConfirm, onCancel }: Props) {
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
          <button type="button" className="btn-raw btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete file'}
          </button>
        </div>
      </div>
      <p className="manual-delete-copy">This permanently removes the file from your working tree.</p>
      {error && (
        <p className="manual-editor-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
