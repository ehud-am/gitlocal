import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { ManualFileOperationResult } from '../../types'
import CopyButton from './CopyButton'
import DeleteFileDialog from './DeleteFileDialog'
import InlineFileEditor from './InlineFileEditor'
import NewFileDraft from './NewFileDraft'

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))
const CodeViewer = lazy(() => import('./CodeViewer'))
type PanelMode = 'view' | 'edit' | 'create' | 'confirm-delete'

interface FileMutationEvent {
  result: ManualFileOperationResult
  nextPath: string
  nextPathType: 'file' | 'dir' | 'none'
}

interface Props {
  canMutateFiles: boolean
  refreshToken: number
  selectedPath: string
  selectedPathType: 'file' | 'dir' | 'none'
  branch: string
  onNavigate: (path: string) => void
  onDirtyChange?: (value: boolean) => void
  onMutationComplete?: (event: FileMutationEvent) => void
  placeholder?: string
  raw?: boolean
  onRawChange?: (value: boolean) => void
  onStatusMessage?: (message: string) => void
}

function parentPathOf(path: string): string {
  const boundary = path.lastIndexOf('/')
  return boundary >= 0 ? path.slice(0, boundary) : ''
}

export default function ContentPanel({
  canMutateFiles,
  refreshToken,
  selectedPath,
  selectedPathType,
  branch,
  onNavigate,
  onDirtyChange,
  onMutationComplete,
  placeholder,
  raw = false,
  onRawChange,
  onStatusMessage,
}: Props) {
  const queryClient = useQueryClient()
  const [showRaw, setShowRaw] = useState(raw)
  const [mode, setMode] = useState<PanelMode>('view')
  const [draftPath, setDraftPath] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['file', selectedPath, branch, showRaw, refreshToken],
    queryFn: () => api.getFile(selectedPath, branch, showRaw),
    enabled: !!selectedPath && selectedPathType === 'file',
  })

  useEffect(() => {
    setShowRaw(raw)
  }, [selectedPath, raw])

  useEffect(() => {
    setMode('view')
    setFormError('')
    setBusy(false)
  }, [branch, selectedPath, selectedPathType])

  useEffect(() => {
    if (mode !== 'edit') return
    setDraftContent(data?.content ?? '')
  }, [data?.content, mode])

  const dirty = useMemo(() => {
    if (mode === 'edit') return draftContent !== (data?.content ?? '')
    if (mode === 'create') return draftPath.trim().length > 0 || draftContent.length > 0
    return false
  }, [data?.content, draftContent, draftPath, mode])

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  function confirmDiscardIfNeeded(): boolean {
    if (!dirty) return true
    return window.confirm('Discard your unsaved file changes?')
  }

  async function refreshFileQueries(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['file'] })
    await queryClient.invalidateQueries({ queryKey: ['sync'] })
  }

  async function handleSaveEdit(): Promise<void> {
    if (!data?.revisionToken) return
    setBusy(true)
    setFormError('')
    try {
      const result = await api.updateFile({
        path: selectedPath,
        content: draftContent,
        revisionToken: data.revisionToken,
      })
      await refreshFileQueries()
      setMode('view')
      onStatusMessage?.(result.message)
      onMutationComplete?.({ result, nextPath: selectedPath, nextPathType: 'file' })
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as { error?: string }).error ?? 'Failed to update the file.'
      setFormError(message)
      onStatusMessage?.(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateFile(): Promise<void> {
    setBusy(true)
    setFormError('')
    try {
      const result = await api.createFile({
        path: draftPath.trim(),
        content: draftContent,
      })
      await refreshFileQueries()
      setMode('view')
      setDraftContent('')
      setDraftPath('')
      onStatusMessage?.(result.message)
      onMutationComplete?.({ result, nextPath: result.path, nextPathType: 'file' })
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as { error?: string }).error ?? 'Failed to create the file.'
      setFormError(message)
      onStatusMessage?.(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteFile(): Promise<void> {
    if (!data?.revisionToken) return
    setBusy(true)
    setFormError('')
    try {
      const result = await api.deleteFile({
        path: selectedPath,
        revisionToken: data.revisionToken,
      })
      await refreshFileQueries()
      const nextPath = parentPathOf(selectedPath)
      setMode('view')
      onStatusMessage?.(result.message)
      onMutationComplete?.({ result, nextPath, nextPathType: nextPath ? 'dir' : 'none' })
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as { error?: string }).error ?? 'Failed to delete the file.'
      setFormError(message)
      onStatusMessage?.(message)
    } finally {
      setBusy(false)
    }
  }

  function beginCreateMode(): void {
    if (!confirmDiscardIfNeeded()) return
    const initialPath = selectedPathType === 'dir' ? `${selectedPath}/` : selectedPathType === 'file' ? `${parentPathOf(selectedPath)}/` : ''
    setDraftPath(initialPath.replace(/^\/+/, ''))
    setDraftContent('')
    setFormError('')
    setMode('create')
  }

  const canToggleRaw = data?.type === 'markdown' || data?.type === 'text'
  const loadingFallback = <div className="content-skeleton" aria-label="loading content" />

  if (mode === 'create') {
    return (
      <div className="content-panel">
        <div className="content-toolbar">
          <button type="button" className="btn-raw" onClick={() => {
            if (!confirmDiscardIfNeeded()) return
            setMode('view')
            setDraftContent('')
            setDraftPath('')
          }}>
            Back to viewer
          </button>
        </div>
        <NewFileDraft
          path={draftPath}
          content={draftContent}
          busy={busy}
          error={formError}
          onPathChange={setDraftPath}
          onContentChange={setDraftContent}
          onSave={() => { void handleCreateFile() }}
          onCancel={() => {
            if (!confirmDiscardIfNeeded()) return
            setMode('view')
            setDraftContent('')
            setDraftPath('')
          }}
        />
      </div>
    )
  }

  if (!selectedPath) {
    return (
      <div className="content-panel empty">
        <div className="content-empty-stack">
          <p>{placeholder ?? 'Select a file to view its contents'}</p>
          {canMutateFiles && (
            <button type="button" className="btn-raw btn-primary" onClick={beginCreateMode}>
              New file
            </button>
          )}
        </div>
      </div>
    )
  }

  if (selectedPathType === 'dir') {
    return (
      <div className="content-panel empty">
        <div className="content-empty-stack">
          <p>
            Browse files inside <code>{selectedPath}</code> from the navigation tree or search results.
          </p>
          {canMutateFiles && (
            <button type="button" className="btn-raw btn-primary" onClick={beginCreateMode}>
              New file here
            </button>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="content-panel">
        <div className="content-skeleton" aria-label="loading content" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="content-panel">
        <p style={{ color: '#cf222e' }}>Failed to load file.</p>
      </div>
    )
  }

  return (
    <div className="content-panel">
      <div className="content-toolbar">
        {canMutateFiles && (
          <>
            <button
              type="button"
              className="btn-raw btn-primary"
              onClick={() => {
                if (mode === 'edit') return
                setDraftContent(data.content)
                setFormError('')
                setMode('edit')
              }}
              disabled={!data.editable || mode !== 'view'}
            >
              Edit file
            </button>
            <button
              type="button"
              className="btn-raw"
              onClick={beginCreateMode}
              disabled={mode !== 'view'}
            >
              New file
            </button>
            <button
              type="button"
              className="btn-raw btn-danger"
              onClick={() => {
                if (!confirmDiscardIfNeeded()) return
                setFormError('')
                setMode('confirm-delete')
              }}
              disabled={!data.revisionToken || mode !== 'view'}
            >
              Delete file
            </button>
          </>
        )}
        {canToggleRaw && mode === 'view' && (
          <button
            className="btn-raw"
            onClick={() => {
              if (!confirmDiscardIfNeeded()) return
              const next = !showRaw
              setShowRaw(next)
              onRawChange?.(next)
            }}
            aria-pressed={showRaw}
          >
            {showRaw ? 'View Rendered' : 'View Raw'}
          </button>
        )}
        {showRaw && mode === 'view' && (
          <CopyButton
            getText={() => data.content}
            className="copy-button raw-copy-button"
            label="Copy raw file"
          />
        )}
      </div>

      {mode === 'edit' ? (
        <InlineFileEditor
          path={selectedPath}
          content={draftContent}
          busy={busy}
          error={formError}
          onChange={setDraftContent}
          onSave={() => { void handleSaveEdit() }}
          onCancel={() => {
            if (!confirmDiscardIfNeeded()) return
            setDraftContent(data.content)
            setMode('view')
          }}
        />
      ) : mode === 'confirm-delete' ? (
        <DeleteFileDialog
          path={selectedPath}
          busy={busy}
          error={formError}
          onConfirm={() => { void handleDeleteFile() }}
          onCancel={() => {
            setFormError('')
            setMode('view')
          }}
        />
      ) : data.type === 'binary' ? (
        <p className="binary-placeholder">Binary file — preview not available.</p>
      ) : data.type === 'image' ? (
        <img
          className="content-image"
          src={`data:image/*;base64,${data.content}`}
          alt={selectedPath}
        />
      ) : data.type === 'markdown' && !showRaw ? (
        <Suspense fallback={loadingFallback}>
          <MarkdownRenderer content={data.content} onNavigate={onNavigate} />
        </Suspense>
      ) : (
        <Suspense fallback={loadingFallback}>
          <CodeViewer content={data.content} language={showRaw ? '' : data.language} />
        </Suspense>
      )}
    </div>
  )
}
