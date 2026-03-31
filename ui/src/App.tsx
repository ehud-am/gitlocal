import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './services/api'
import FileTree from './components/FileTree/FileTree'
import Breadcrumb from './components/Breadcrumb/Breadcrumb'
import ContentPanel from './components/ContentPanel/ContentPanel'
import GitInfo from './components/GitInfo/GitInfo'
import PickerPage from './components/Picker/PickerPage'
import SearchPanel from './components/Search/SearchPanel'
import type { SearchMode, SearchResult } from './types'
import { readViewerState, writeViewerState } from './services/viewerState'

export default function App() {
  const initialViewerState = readViewerState()
  const [selectedFile, setSelectedFile] = useState(initialViewerState.path)
  const [currentBranch, setCurrentBranch] = useState(initialViewerState.branch)
  const [showRaw, setShowRaw] = useState(initialViewerState.raw)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialViewerState.sidebarCollapsed)
  const [searchMode, setSearchMode] = useState<SearchMode>(initialViewerState.searchMode)
  const [searchQuery, setSearchQuery] = useState(initialViewerState.searchQuery)
  const [caseSensitive, setCaseSensitive] = useState(initialViewerState.caseSensitive)
  const [readmeMissing, setReadmeMissing] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const queryClient = useQueryClient()
  const lastRevisionRef = useRef('')

  const { data: info, isLoading } = useQuery({
    queryKey: ['info'],
    queryFn: api.getInfo,
  })

  const { data: syncStatus } = useQuery({
    queryKey: ['sync', selectedFile, currentBranch],
    queryFn: () => api.getSyncStatus(selectedFile, currentBranch),
    enabled: !!info?.isGitRepo,
    refetchInterval: 3000,
  })

  // Initialize branch from info
  useEffect(() => {
    if (info?.currentBranch && !currentBranch) {
      setCurrentBranch(info.currentBranch)
    }
  }, [info, currentBranch])

  // Auto-select README on first load (viewer mode only)
  useEffect(() => {
    if (!info || info.pickerMode || selectedFile) return
    api.getReadme()
      .then(({ path }) => {
        if (path) {
          handleSelectFile(path)
        } else {
          setReadmeMissing(true)
        }
      })
      .catch(() => {
        setReadmeMissing(true)
      })
  }, [info]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    writeViewerState({
      branch: currentBranch,
      path: selectedFile,
      raw: showRaw,
      sidebarCollapsed,
      searchMode,
      searchQuery,
      caseSensitive,
    })
  }, [currentBranch, selectedFile, showRaw, sidebarCollapsed, searchMode, searchQuery, caseSensitive])

  useEffect(() => {
    if (!syncStatus) return

    if (lastRevisionRef.current && lastRevisionRef.current !== syncStatus.workingTreeRevision) {
      queryClient.invalidateQueries({ queryKey: ['tree'] }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['file'] }).catch(() => {})
    }
    lastRevisionRef.current = syncStatus.workingTreeRevision

    if (syncStatus.currentPath && syncStatus.currentPathType === 'missing') {
      setStatusMessage(syncStatus.statusMessage)
      setSelectedFile(syncStatus.resolvedPath)
      setShowRaw(false)
      return
    }

    if (syncStatus.statusMessage) {
      setStatusMessage(syncStatus.statusMessage)
    }
  }, [syncStatus, queryClient])

  function handleSelectFile(path: string) {
    setSelectedFile(path)
    setShowRaw(false)
  }

  function handleSelectSearchResult(result: SearchResult) {
    if (result.type === 'file') {
      handleSelectFile(result.path)
      setStatusMessage('')
      return
    }

    setSelectedFile('')
    setStatusMessage(`"${result.path}" is a folder. Use the navigation tree to browse inside it.`)
  }

  if (isLoading) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <h2>Loading repository…</h2>
          <p>GitLocal is checking the current launch context.</p>
        </div>
      </div>
    )
  }

  // Picker mode: show the folder selector page
  if (info?.pickerMode) {
    return <PickerPage />
  }

  if (info && !info.isGitRepo) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <h2>Not a Git repository</h2>
          <p>
            This folder is not a git repository. Please point GitLocal at a folder
            containing a <code>.git</code> directory.
          </p>
        </div>
      </div>
    )
  }

  const noReadmePlaceholder =
    readmeMissing && !selectedFile ? 'No README found in this repository.' : undefined

  async function handleBrowseParentFolder() {
    setPickerLoading(true)
    try {
      const result = await api.showParentPicker()
      if (result.ok) {
        window.location.reload()
      }
    } finally {
      setPickerLoading(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <span className="logo">GitLocal</span>
        {info && <span className="repo-name">{info.name}</span>}
        <div className="app-header-actions">
          <button
            type="button"
            className="app-header-button"
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? 'Show navigation' : 'Hide navigation'}
          </button>
          <button
            type="button"
            className="app-header-button"
            onClick={() => handleBrowseParentFolder().catch(() => {})}
            disabled={pickerLoading}
          >
            {pickerLoading ? 'Opening parent…' : 'Browse parent folder'}
          </button>
        </div>
      </header>
      <div className="app-body">
        {!sidebarCollapsed && (
          <aside className="sidebar">
            <FileTree
              branch={currentBranch}
              selectedFile={selectedFile}
              onFileSelect={handleSelectFile}
            />
            <GitInfo
              branch={currentBranch}
              onBranchChange={setCurrentBranch}
            />
          </aside>
        )}
        <div className="content-area">
          {statusMessage && (
            <div className="status-banner" role="status">
              {statusMessage}
            </div>
          )}
          <SearchPanel
            branch={currentBranch}
            mode={searchMode}
            query={searchQuery}
            caseSensitive={caseSensitive}
            onModeChange={setSearchMode}
            onQueryChange={setSearchQuery}
            onCaseSensitiveChange={setCaseSensitive}
            onSelectResult={handleSelectSearchResult}
          />
          <Breadcrumb
            path={selectedFile}
            onNavigate={(path) => {
              if (path === '') {
                handleSelectFile('')
              } else {
                handleSelectFile(path)
              }
            }}
          />
          <ContentPanel
            filePath={selectedFile}
            branch={currentBranch}
            onNavigate={handleSelectFile}
            placeholder={noReadmePlaceholder}
            raw={showRaw}
            onRawChange={setShowRaw}
          />
        </div>
      </div>
    </>
  )
}
