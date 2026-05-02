import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { FileSyncState, FolderOperationResult, ManualFileOperationResult, TreeNode, ViewerPathType } from '../../types'
import DeleteFileDialog from './DeleteFileDialog'
import InlineFileEditor from './InlineFileEditor'
import NewFileDraft from './NewFileDraft'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { MetaTag } from '../ui/meta-tag'
import { describeFileSyncState } from '../../lib/sync'

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))
const CodeViewer = lazy(() => import('./CodeViewer'))
type PanelMode = 'view' | 'edit' | 'create' | 'create-folder' | 'confirm-delete'
type EmptyStateAction = 'create-file'

interface FileMutationEvent {
  result: ManualFileOperationResult
  nextPath: string
  nextPathType: ViewerPathType
}

interface FolderMutationEvent {
  result: FolderOperationResult
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
  onCreateFolderComplete?: (event: FolderMutationEvent) => void
  onDeleteFolder?: (path: string) => void
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

interface InFileMatch {
  id: string
  line: number
  column: number
  before: string
  match: string
  after: string
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

function findInFileMatches(content: string, query: string, caseSensitive: boolean): InFileMatch[] {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const normalizedNeedle = caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase()

  return content.split('\n').flatMap((lineText, index) => {
    const haystack = caseSensitive ? lineText : lineText.toLowerCase()
    const matches: InFileMatch[] = []
    let searchFrom = 0

    while (searchFrom <= haystack.length - normalizedNeedle.length) {
      const foundAt = haystack.indexOf(normalizedNeedle, searchFrom)
      if (foundAt < 0) break

      const matchEnd = foundAt + trimmedQuery.length
      const snippetStart = Math.max(0, foundAt - 28)
      const snippetEnd = Math.min(lineText.length, matchEnd + 36)

      matches.push({
        id: `${index + 1}:${foundAt}`,
        line: index + 1,
        column: foundAt + 1,
        before: `${snippetStart > 0 ? '…' : ''}${lineText.slice(snippetStart, foundAt)}`,
        match: lineText.slice(foundAt, matchEnd),
        after: `${lineText.slice(matchEnd, snippetEnd)}${snippetEnd < lineText.length ? '…' : ''}`,
      })

      searchFrom = foundAt + Math.max(trimmedQuery.length, 1)
    }

    return matches
  })
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
  onCreateFolderComplete,
  onDeleteFolder,
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
  const [draftFolderName, setDraftFolderName] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileFindOpen, setFileFindOpen] = useState(false)
  const [fileFindQuery, setFileFindQuery] = useState('')
  const [fileFindCaseSensitive, setFileFindCaseSensitive] = useState(false)
  const [activeFileFindIndex, setActiveFileFindIndex] = useState(0)

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
    setFileFindOpen(false)
    setFileFindQuery('')
    setFileFindCaseSensitive(false)
    setActiveFileFindIndex(0)
  }, [branch, selectedPath, selectedPathType])

  useEffect(() => {
    if (mode !== 'edit') return
    setDraftContent(data?.content ?? '')
  }, [data?.content, mode])

  const dirty = useMemo(() => {
    if (mode === 'edit') return draftContent !== (data?.content ?? '')
    if (mode === 'create') return draftPath.trim().length > 0 || draftContent.length > 0
    if (mode === 'create-folder') return draftFolderName.trim().length > 0
    return false
  }, [data?.content, draftContent, draftFolderName, draftPath, mode])

  const canSearchCurrentFile = Boolean(data && data.type !== 'binary' && data.type !== 'image')
  const trimmedFileFindQuery = fileFindQuery.trim()
  const fileFindMatches = useMemo(
    () => (canSearchCurrentFile ? findInFileMatches(data?.content ?? '', trimmedFileFindQuery, fileFindCaseSensitive) : []),
    [canSearchCurrentFile, data?.content, fileFindCaseSensitive, trimmedFileFindQuery],
  )
  const activeFileFindMatch = fileFindMatches[activeFileFindIndex] ?? null
  const visibleFileFindMatches = fileFindMatches.slice(0, 12)

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  useEffect(() => {
    setActiveFileFindIndex(0)
  }, [fileFindCaseSensitive, trimmedFileFindQuery])

  useEffect(() => {
    if (activeFileFindIndex < fileFindMatches.length) return
    setActiveFileFindIndex(0)
  }, [activeFileFindIndex, fileFindMatches.length])

  function confirmDiscardIfNeeded(): boolean {
    if (!dirty) return true
    return window.confirm('Discard your unsaved file changes?')
  }

  function cycleFileFindMatch(direction: 1 | -1): void {
    if (fileFindMatches.length === 0) return
    setActiveFileFindIndex((currentIndex) => (currentIndex + direction + fileFindMatches.length) % fileFindMatches.length)
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

  async function handleCreateFolder(): Promise<void> {
    setBusy(true)
    setFormError('')
    try {
      const parentPath = selectedPathType === 'dir' ? selectedPath : ''
      const result = await api.createFolder({
        parentPath,
        name: draftFolderName.trim(),
      })
      await queryClient.invalidateQueries({ queryKey: ['tree'] })
      await queryClient.invalidateQueries({ queryKey: ['sync'] })
      setMode('view')
      setDraftFolderName('')
      onStatusMessage?.(result.message)
      onCreateFolderComplete?.({ result, nextPath: result.path, nextPathType: 'dir' })
    } catch (error) {
      const message = getMutationErrorMessage(error, 'Failed to create the folder.')
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

  function beginCreateMode(): void {
    if (!confirmDiscardIfNeeded()) return
    const folderPath = selectedPathType === 'dir' ? selectedPath : ''
    const entries = visibleDirectoryEntries

    setDraftPath(buildSuggestedDraftPath(folderPath, entries).replace(/^\/+/, ''))
    setDraftContent('')
    setFormError('')
    setMode('create')
  }

  function beginCreateFolderMode(): void {
    if (!confirmDiscardIfNeeded()) return
    setDraftFolderName('')
    setFormError('')
    setMode('create-folder')
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
                {selectedPathLocalOnly && path ? <MetaTag label="Local only" icon="local-only" tone="neutral" compact /> : null}
              </div>
            </div>
            {canMutateFiles ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-raw" onClick={() => { void beginCreateMode() }}>
                  {path ? 'New file here' : 'New file'}
                </button>
                <button type="button" className="btn-raw" onClick={() => { void beginCreateFolderMode() }}>
                  {path ? 'New folder here' : 'New folder'}
                </button>
              </div>
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
                      {rows.map((entry) => {
                        const syncBadge = !entry.isParent ? describeFileSyncState(entry.syncState) : null
                        return (
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
                              {!entry.isParent && entry.localOnly ? <MetaTag label="Local only" icon="local-only" tone="neutral" compact /> : null}
                              {syncBadge ? <MetaTag label={syncBadge.label} icon={syncBadge.icon} tone={syncBadge.tone} compact /> : null}
                            </div>
                          </td>
                          <td className="content-directory-cell">
                            <span className="content-directory-kind">
                              {entry.isParent ? (entry.exitsRepo ? 'Outside repo' : 'Parent') : entry.type === 'dir' ? 'Directory' : 'File'}
                            </span>
                          </td>
                          <td className="content-directory-cell content-directory-cell-path">
                            <div className="flex items-center justify-between gap-2">
                              <span className="content-directory-path">{entry.displayPath}</span>
                              {canMutateFiles && !entry.isParent && entry.type === 'dir' ? (
                                <button
                                  type="button"
                                  className="btn-raw"
                                  aria-label={`Delete folder ${entry.name}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onDeleteFolder?.(entry.path)
                                  }}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </td>
                          </tr>
                        )
                      })}
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

  if (mode === 'create-folder') {
    const parentPath = selectedPathType === 'dir' ? selectedPath : ''
    return (
      <div className="content-panel">
        <div className="content-toolbar">
          <button type="button" className="btn-raw" onClick={() => {
            if (!confirmDiscardIfNeeded()) return
            setMode('view')
            setDraftFolderName('')
            setFormError('')
          }}>
            Back to viewer
          </button>
        </div>
        <section className="content-directory-panel" aria-label="create folder">
          <div className="content-directory-header">
            <div>
              <p className="content-directory-kicker">New folder</p>
              <h2 className="content-directory-heading">{parentPath || 'repository root'}</h2>
            </div>
          </div>
          <div className="grid max-w-lg gap-4 p-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">Folder name</span>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                value={draftFolderName}
                onChange={(event) => setDraftFolderName(event.target.value)}
                aria-label="Folder name"
                disabled={busy}
                autoFocus
              />
            </label>
            {formError ? <p role="alert" className="text-sm text-[var(--danger)]">{formError}</p> : null}
            <div className="flex gap-2">
              <button type="button" className="btn-raw btn-primary" disabled={busy} onClick={() => { void handleCreateFolder() }}>
                {busy ? 'Creating folder...' : 'Create folder'}
              </button>
              <button type="button" className="btn-raw" disabled={busy} onClick={() => {
                setMode('view')
                setDraftFolderName('')
                setFormError('')
              }}>
                Cancel
              </button>
            </div>
          </div>
        </section>
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

  const selectedPathSyncBadge =
    selectedPathSyncState !== 'none'
      ? describeFileSyncState(selectedPathSyncState)
      : null
  const fileFindSummary =
    trimmedFileFindQuery.length === 0
      ? 'Enter text to search within this file.'
      : fileFindMatches.length === 0
        ? `No matches for "${trimmedFileFindQuery}" in this file.`
        : `${fileFindMatches.length} ${fileFindMatches.length === 1 ? 'match' : 'matches'} in this file.`

  return (
    <div className={`content-panel${mode === 'edit' ? ' content-panel-editing' : ''}`}>
      <div className="content-active-context">
        <div>
          <p className="content-directory-kicker">File</p>
          <div className="content-active-heading-row">
            <h2 className="content-directory-heading">{formatActivePathLabel(selectedPath, selectedPathLocalOnly)}</h2>
            {selectedPathLocalOnly ? <MetaTag label="Local only" icon="local-only" tone="neutral" compact /> : null}
            {selectedPathSyncBadge ? <MetaTag label={selectedPathSyncBadge.label} icon={selectedPathSyncBadge.icon} tone={selectedPathSyncBadge.tone} compact /> : null}
          </div>
        </div>
        {mode === 'view' ? (
          <div className="flex flex-wrap items-center gap-2">
            {canSearchCurrentFile ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFileFindOpen((currentValue) => !currentValue)
                  setFileFindQuery('')
                  setFileFindCaseSensitive(false)
                  setActiveFileFindIndex(0)
                }}
                aria-pressed={fileFindOpen}
              >
                Find in file
              </Button>
            ) : null}
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
          </div>
        ) : null}
      </div>

      {mode === 'view' && fileFindOpen ? (
        <section
          className="mb-4 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] p-3"
          aria-label="find in current file"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="content-file-find">
                Find in this file
              </label>
              <input
                id="content-file-find"
                type="search"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-offset-2 ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                placeholder="Search the current file"
                value={fileFindQuery}
                onChange={(event) => setFileFindQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    cycleFileFindMatch(1)
                  }
                  if (event.key === 'Escape') {
                    setFileFindOpen(false)
                    setFileFindQuery('')
                    setFileFindCaseSensitive(false)
                    setActiveFileFindIndex(0)
                  }
                }}
                aria-label="find in file query"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={fileFindCaseSensitive}
                  onChange={(event) => setFileFindCaseSensitive(event.target.checked)}
                />
                <span>Case sensitive</span>
              </label>
              <Button type="button" variant="secondary" size="sm" disabled={fileFindMatches.length === 0} onClick={() => cycleFileFindMatch(-1)}>
                Previous
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={fileFindMatches.length === 0} onClick={() => cycleFileFindMatch(1)}>
                Next
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close find in file"
                onClick={() => {
                  setFileFindOpen(false)
                  setFileFindQuery('')
                  setFileFindCaseSensitive(false)
                  setActiveFileFindIndex(0)
                }}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M4 4L12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 4L4 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </Button>
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{fileFindSummary}</p>
          {activeFileFindMatch ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Match {activeFileFindIndex + 1} of {fileFindMatches.length}: line {activeFileFindMatch.line}, column {activeFileFindMatch.column}
            </p>
          ) : null}
          {trimmedFileFindQuery.length > 0 && fileFindMatches.length > 0 ? (
            <div className="mt-3 max-h-56 overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)]">
              <ul className="divide-y divide-[var(--border)]" aria-label="find in file matches">
                {visibleFileFindMatches.map((match, index) => {
                  const isActive = index === activeFileFindIndex
                  return (
                    <li key={match.id}>
                      <button
                        type="button"
                        className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm ${
                          isActive ? 'bg-[var(--muted)] text-[var(--foreground)]' : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                        }`}
                        onClick={() => setActiveFileFindIndex(index)}
                        aria-pressed={isActive}
                      >
                        <span className="min-w-0 flex-1 break-words">
                          {match.before}
                          <mark className="rounded bg-[var(--warning-soft)] px-0.5 text-[var(--foreground)]">
                            {match.match}
                          </mark>
                          {match.after}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                          Ln {match.line}, Col {match.column}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {fileFindMatches.length > visibleFileFindMatches.length ? (
                <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
                  Showing the first {visibleFileFindMatches.length} matches of {fileFindMatches.length}.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

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
