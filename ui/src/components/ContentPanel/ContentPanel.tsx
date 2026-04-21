import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { FileSyncState, ManualFileOperationResult, TreeNode, ViewerPathType } from '../../types'
import DeleteFileDialog from './DeleteFileDialog'
import InlineFileEditor from './InlineFileEditor'
import NewFileDraft from './NewFileDraft'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { describeFileSyncState } from '../../lib/sync'

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))
const CodeViewer = lazy(() => import('./CodeViewer'))
type PanelMode = 'view' | 'edit' | 'create' | 'confirm-delete'
type EmptyStateAction = 'create-file'

interface FileMutationEvent {
  result: ManualFileOperationResult
  nextPath: string
  nextPathType: ViewerPathType
}

interface Props {
  canMutateFiles: boolean
  refreshToken: number
  selectedPath: string
  selectedPathType: ViewerPathType
  selectedPathLocalOnly?: boolean
  selectedPathSyncState?: FileSyncState | 'none'
  branch: string
  isGitRepo?: boolean
  onNavigate: (path: string) => void
  onOpenPath: (path: string, type: 'file' | 'dir', localOnly: boolean) => void
  onDirtyChange?: (value: boolean) => void
  onMutationComplete?: (event: FileMutationEvent) => void
  placeholder?: string
  emptyStateTitle?: string
  emptyStateDetail?: string
  emptyStateActions?: Array<{ label: string; action: EmptyStateAction }>
  onBrowseParent?: () => void
  raw?: boolean
  onRawChange?: (value: boolean) => void
  onStatusMessage?: (message: string) => void
}

interface DirectoryRow {
  name: string
  path: string
  type: 'file' | 'dir'
  localOnly: boolean
  syncState?: FileSyncState
  isParent: boolean
  exitsRepo: boolean
  displayPath: string
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
    </svg>
  )
}

function parentPathOf(path: string): string {
  const boundary = path.lastIndexOf('/')
  return boundary >= 0 ? path.slice(0, boundary) : ''
}

function buildSuggestedFilename(entries: TreeNode[]): string {
  const fileNames = new Set(
    entries
      .filter((entry) => entry.type === 'file')
      .map((entry) => entry.name.toLowerCase()),
  )

  if (!fileNames.has('readme.md')) return 'README.md'
  if (!fileNames.has('myfile.md')) return 'myfile.md'

  let index = 1
  while (fileNames.has(`myfile ${index}.md`)) {
    index += 1
  }

  return `myfile ${index}.md`
}

function buildSuggestedDraftPath(folderPath: string, entries: TreeNode[]): string {
  const filename = buildSuggestedFilename(entries)
  return folderPath ? `${folderPath}/${filename}` : filename
}

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const maybePayload = error as { error?: string; message?: string }
    return maybePayload.error ?? maybePayload.message ?? fallback
  }
  return fallback
}

function formatActivePathLabel(path: string, localOnly: boolean): string {
  if (!path) return 'root'
  return localOnly ? `root/${path}` : path
}

export default function ContentPanel({
  canMutateFiles,
  refreshToken,
  selectedPath,
  selectedPathType,
  selectedPathLocalOnly = false,
  selectedPathSyncState = 'none',
  branch,
  isGitRepo = false,
  onNavigate,
  onOpenPath,
  onDirtyChange,
  onMutationComplete,
  placeholder,
  emptyStateTitle,
  emptyStateDetail,
  emptyStateActions,
  onBrowseParent,
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
  const directoryPath = selectedPathType === 'dir' ? selectedPath : ''
  const showingDirectoryView = selectedPathType === 'dir' || selectedPathType === 'none'
  const {
    data: directoryEntries,
    isLoading: isDirectoryLoading,
    isError: isDirectoryError,
  } = useQuery({
    queryKey: ['tree', directoryPath, branch, refreshToken, 'content-panel'],
    queryFn: () => api.getTree(directoryPath, branch),
    enabled: showingDirectoryView,
  })
  const { data: readmeLookup } = useQuery({
    queryKey: ['readme', directoryPath, branch, refreshToken],
    queryFn: () => api.getReadme(directoryPath, branch),
    enabled: showingDirectoryView && isGitRepo,
  })
  const directoryReadmePath = readmeLookup?.path ?? ''
  const { data: directoryReadme, isLoading: isDirectoryReadmeLoading } = useQuery({
    queryKey: ['directory-readme', directoryReadmePath, branch, refreshToken],
    queryFn: () => api.getFile(directoryReadmePath, branch, false),
    enabled: showingDirectoryView && isGitRepo && Boolean(directoryReadmePath),
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
      const message = getMutationErrorMessage(error, 'Failed to update the file.')
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
      const message = getMutationErrorMessage(error, 'Failed to create the file.')
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
      const message = getMutationErrorMessage(error, 'Failed to delete the file.')
      setFormError(message)
      onStatusMessage?.(message)
    } finally {
      setBusy(false)
    }
  }

  async function beginCreateMode(): Promise<void> {
    if (!confirmDiscardIfNeeded()) return
    const folderPath = selectedPathType === 'dir' ? selectedPath : selectedPathType === 'file' ? parentPathOf(selectedPath) : ''
    let entries = folderPath === directoryPath ? visibleDirectoryEntries : null

    if (!entries) {
      try {
        entries = await api.getTree(folderPath, branch)
      } catch {
        entries = []
      }
    }

    setDraftPath(buildSuggestedDraftPath(folderPath, entries).replace(/^\/+/, ''))
    setDraftContent('')
    setFormError('')
    setMode('create')
  }

  const canToggleRaw = data?.type === 'markdown' || data?.type === 'text'
  const loadingFallback = <div className="content-skeleton" aria-label="loading content" />
  const visibleDirectoryEntries = directoryEntries ?? []

  function renderDirectoryList(path: string, entries: TreeNode[]): JSX.Element {
    const hasIntro = Boolean(emptyStateTitle || emptyStateDetail)
    const isRootView = selectedPathType === 'none'
    const emptyMessage = isRootView
      ? (emptyStateDetail ?? placeholder ?? 'This repository does not have any visible files yet.')
      : `This folder does not have any visible files or folders yet.`
    const parentRow: DirectoryRow | null = path
      ? {
          name: '..',
          path: parentPathOf(path),
          type: 'dir',
          localOnly: false,
          isParent: true,
          exitsRepo: false,
          displayPath: parentPathOf(path) || 'repository root',
        }
      : onBrowseParent
        ? {
            name: '..',
            path: '',
            type: 'dir',
            localOnly: false,
            isParent: true,
            exitsRepo: true,
            displayPath: 'Leave the current repository scope',
          }
        : null
    const rows: DirectoryRow[] = [
      ...(parentRow ? [parentRow] : []),
      ...entries.map((entry) => ({
        ...entry,
        isParent: false,
        exitsRepo: false,
        displayPath: entry.path,
      })),
    ]

    function openDirectoryRow(entry: DirectoryRow): void {
      if (entry.exitsRepo) {
        onBrowseParent?.()
        return
      }

      onOpenPath(entry.path, entry.type, Boolean(entry.localOnly))
    }

    return (
      <div className="content-panel">
        {hasIntro ? (
          <div className="content-directory-intro">
            {emptyStateTitle ? <h2 className="content-directory-title">{emptyStateTitle}</h2> : null}
            {emptyStateDetail ? <p className="content-directory-detail">{emptyStateDetail}</p> : null}
            {emptyStateActions && emptyStateActions.length > 0 ? (
              <div className="content-empty-actions">
                {emptyStateActions.map(({ label }) => (
                  <button key={label} type="button" className="btn-raw btn-primary" onClick={() => { void beginCreateMode() }}>
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="content-directory-panel" aria-label={path ? `Contents of ${path}` : 'Current folder contents'}>
          <div className="content-directory-header">
            <div>
              <p className="content-directory-kicker">{path ? 'Folder' : 'Current folder'}</p>
              <div className="content-active-heading-row">
                <h2 className="content-directory-heading">{formatActivePathLabel(path, selectedPathLocalOnly)}</h2>
                {selectedPathLocalOnly && path ? <span className="local-only-badge">Local only</span> : null}
              </div>
            </div>
            {canMutateFiles ? (
              <button type="button" className="btn-raw" onClick={() => { void beginCreateMode() }}>
                {path ? 'New file here' : 'New file'}
              </button>
            ) : null}
          </div>

          {isDirectoryLoading ? (
            <div className="content-skeleton" aria-label="loading content" />
          ) : (
            <>
              {rows.length > 0 ? (
                <div className="content-directory-table-wrap">
                  <table className="content-directory-table" aria-label={path ? `Contents of ${path}` : 'Current folder contents'}>
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Kind</th>
                        <th scope="col">Path</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((entry) => (
                        <tr
                          key={entry.isParent ? `parent:${entry.displayPath}` : entry.path}
                          className="content-directory-row"
                          onDoubleClick={() => openDirectoryRow(entry)}
                        >
                          <td className="content-directory-cell content-directory-cell-name">
                            <div className="content-directory-entry">
                              <button
                                type="button"
                                className="content-directory-link"
                                onClick={() => openDirectoryRow(entry)}
                                aria-label={
                                  entry.exitsRepo
                                    ? 'Open parent folder outside this repository'
                                    : entry.isParent
                                      ? 'Open parent folder ..'
                                      : `Open ${entry.type === 'dir' ? 'folder' : 'file'} ${entry.name}`
                                }
                              >
                                <span className={`content-directory-badge content-directory-badge-${entry.type}`}>
                                  {entry.isParent ? (entry.exitsRepo ? 'Browse' : 'Parent') : entry.type === 'dir' ? 'Folder' : 'File'}
                                </span>
                                <span className="content-directory-name">{entry.name}</span>
                              </button>
                              {!entry.isParent && entry.localOnly ? <span className="local-only-badge local-only-badge-compact">Local only</span> : null}
                              {!entry.isParent && entry.syncState ? (
                                (() => {
                                  const syncState = describeFileSyncState(entry.syncState)
                                  return syncState ? <span className={syncState.className}>{syncState.label}</span> : null
                                })()
                              ) : null}
                            </div>
                          </td>
                          <td className="content-directory-cell">
                            <span className="content-directory-kind">
                              {entry.isParent ? (entry.exitsRepo ? 'Outside repo' : 'Parent') : entry.type === 'dir' ? 'Directory' : 'File'}
                            </span>
                          </td>
                          <td className="content-directory-cell content-directory-cell-path">
                            <span className="content-directory-path">{entry.displayPath}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {entries.length === 0 ? (
                <div className="content-directory-empty">
                  <p>{emptyMessage}</p>
                </div>
              ) : null}
            </>
          )}
        </section>

        {directoryReadmePath ? (
          <section className="content-readme-panel" aria-label="folder readme">
            <div className="content-directory-header">
              <div>
                <p className="content-directory-kicker">README</p>
                <h2 className="content-directory-heading">{directoryReadmePath}</h2>
              </div>
            </div>
            {isDirectoryReadmeLoading ? (
              <div className="content-skeleton" aria-label="loading content" />
            ) : directoryReadme?.type === 'markdown' ? (
              <Suspense fallback={loadingFallback}>
                <MarkdownRenderer content={directoryReadme.content} onNavigate={onNavigate} />
              </Suspense>
            ) : directoryReadme?.type === 'text' ? (
              <Suspense fallback={loadingFallback}>
                <CodeViewer content={directoryReadme.content} language={directoryReadme.language} />
              </Suspense>
            ) : null}
          </section>
        ) : null}
      </div>
    )
  }

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
    if (isDirectoryLoading) {
      return (
        <div className="content-panel">
          <div className="content-skeleton" aria-label="loading content" />
        </div>
      )
    }

    return renderDirectoryList('', visibleDirectoryEntries)
  }

  if (selectedPathType === 'dir') {
    if (isDirectoryError && selectedPathLocalOnly) {
      return (
        <div className="content-panel">
          <p style={{ color: '#cf222e' }}>This local-only folder is no longer available.</p>
        </div>
      )
    }
    return renderDirectoryList(selectedPath, visibleDirectoryEntries)
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
        <p style={{ color: '#cf222e' }}>
          {selectedPathLocalOnly ? 'This local-only file is no longer available.' : 'Failed to load file.'}
        </p>
      </div>
    )
  }

  return (
    <div className={`content-panel${mode === 'edit' ? ' content-panel-editing' : ''}`}>
      <div className="content-active-context">
        <div>
          <p className="content-directory-kicker">File</p>
          <div className="content-active-heading-row">
            <h2 className="content-directory-heading">{formatActivePathLabel(selectedPath, selectedPathLocalOnly)}</h2>
            {selectedPathLocalOnly ? <span className="local-only-badge">Local only</span> : null}
            {selectedPathSyncState !== 'none'
              ? (() => {
                  const syncState = describeFileSyncState(selectedPathSyncState)
                  return syncState ? <span className={syncState.className}>{syncState.label}</span> : null
                })()
              : null}
          </div>
        </div>
        {mode === 'view' ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="panel-icon-button content-actions-trigger"
                aria-label="File actions"
              >
                <KebabIcon />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canToggleRaw ? (
                <DropdownMenuItem
                  onSelect={() => {
                    if (!confirmDiscardIfNeeded()) return
                    const next = !showRaw
                    setShowRaw(next)
                    onRawChange?.(next)
                  }}
                >
                  {showRaw ? 'View rendered' : 'View raw'}
                </DropdownMenuItem>
              ) : null}
              {canMutateFiles ? (
                <DropdownMenuItem
                  disabled={!data.editable}
                  onSelect={() => {
                    if (!data.editable) return
                    setDraftContent(data.content)
                    setFormError('')
                    setMode('edit')
                  }}
                >
                  Edit file
                </DropdownMenuItem>
              ) : null}
              {canMutateFiles ? (
                <DropdownMenuItem
                  className="dropdown-danger"
                  disabled={!data.revisionToken}
                  onSelect={() => {
                    if (!data.revisionToken) return
                    if (!confirmDiscardIfNeeded()) return
                    setFormError('')
                    setMode('confirm-delete')
                  }}
                >
                  Delete file
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
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
