interface Props {
  path: string
  content: string
  busy?: boolean
  error?: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function InlineFileEditor({ path, content, busy = false, error, onChange, onSave, onCancel }: Props) {
  return (
    <div className="manual-editor-card manual-editor-expanded">
      <div className="manual-editor-header">
        <div>
          <h3>Edit file</h3>
          <p>{path}</p>
        </div>
        <div className="manual-editor-actions">
          <button type="button" className="btn-raw" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-raw btn-primary" onClick={onSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
      {error && (
        <p className="manual-editor-error" role="alert">
          {error}
        </p>
      )}
      <textarea
        className="manual-editor-textarea"
        aria-label="Edit file content"
        value={content}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </div>
  )
}
