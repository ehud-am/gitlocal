import { useEffect, useRef, useState } from 'react'
import type { NativeAppCommandEvent } from '../../types'
import {
  createEditorHistory,
  pushEditorChange,
  redoEditorChange,
  undoEditorChange,
  type EditorHistoryState,
} from './editor-history'

interface Props {
  path: string
  content: string
  busy?: boolean
  error?: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onReloadFromDisk?: () => void
}

export default function InlineFileEditor({ path, content, busy = false, error, onChange, onSave, onCancel, onReloadFromDisk }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [history, setHistory] = useState<EditorHistoryState>(() => createEditorHistory(content))
  const isConflict = Boolean(error && /changed on disk|revision token|reload/i.test(error))

  useEffect(() => {
    setHistory(createEditorHistory(content))
  }, [path])

  function applyHistory(nextHistory: EditorHistoryState): void {
    setHistory(nextHistory)
    onChange(nextHistory.present)
  }

  function handleContentChange(nextContent: string): void {
    const nextHistory = pushEditorChange(history, nextContent)
    setHistory(nextHistory)
    onChange(nextContent)
  }

  function handleUndo(): void {
    applyHistory(undoEditorChange(history))
  }

  function handleRedo(): void {
    applyHistory(redoEditorChange(history))
  }

  function editorHasFocus(): boolean {
    return document.activeElement === textareaRef.current
  }

  useEffect(() => {
    const handleNativeCommand = (event: Event) => {
      const command = (event as NativeAppCommandEvent).detail?.command
      if (!editorHasFocus()) return
      if (command === 'undo') {
        event.preventDefault()
        handleUndo()
      }
      if (command === 'redo') {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('gitlocal:native-command', handleNativeCommand)
    return () => window.removeEventListener('gitlocal:native-command', handleNativeCommand)
  })

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
        <div className={`manual-editor-error ${isConflict ? 'manual-editor-conflict' : ''}`} role="alert">
          <p>{error}</p>
          {isConflict ? (
            <div className="manual-editor-recovery-actions">
              <button type="button" className="btn-raw" onClick={() => textareaRef.current?.focus()} disabled={busy}>
                Keep editing
              </button>
              {onReloadFromDisk ? (
                <button type="button" className="btn-raw btn-primary" onClick={onReloadFromDisk} disabled={busy}>
                  Reload from disk
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="manual-editor-textarea"
        aria-label="Edit file content"
        value={history.present}
        onChange={(event) => handleContentChange(event.target.value)}
        onKeyDown={(event) => {
          const isUndo = (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z'
          const isRedo = ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'z')
            || (event.ctrlKey && event.key.toLowerCase() === 'y')

          if (isUndo) {
            event.preventDefault()
            handleUndo()
          } else if (isRedo) {
            event.preventDefault()
            handleRedo()
          }
        }}
        spellCheck={false}
      />
    </div>
  )
}
