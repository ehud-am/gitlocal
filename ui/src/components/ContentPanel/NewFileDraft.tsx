interface Props {
  path: string
  content: string
  busy?: boolean
  error?: string
  onPathChange: (value: string) => void
  onContentChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function NewFileDraft({
  path,
  content,
  busy = false,
  error,
  onPathChange,
  onContentChange,
  onSave,
  onCancel,
}: Props) {
  return (
    <div className="manual-editor-card">
      <div className="manual-editor-header">
        <div>
          <h3>Create file</h3>
          <p>Add a small text file without leaving GitLocal.</p>
        </div>
        <div className="manual-editor-actions">
          <button type="button" className="btn-raw" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-raw btn-primary" onClick={onSave} disabled={busy}>
            {busy ? 'Creating…' : 'Create file'}
          </button>
        </div>
      </div>
      {error && (
        <p className="manual-editor-error" role="alert">
          {error}
        </p>
      )}
      <label className="manual-editor-field">
        <span>File path</span>
        <input
          className="manual-editor-input"
          aria-label="New file path"
          value={path}
          onChange={(event) => onPathChange(event.target.value)}
          placeholder="README.md"
          autoFocus
        />
      </label>
      <textarea
        className="manual-editor-textarea"
        aria-label="New file content"
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        spellCheck={false}
      />
    </div>
  )
}
