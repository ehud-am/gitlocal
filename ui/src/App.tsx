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

type SelectedPathType = 'file' | 'dir' | 'none'

export default function App() {
  const initialViewerState = readViewerState()
  const [selectedPath, setSelectedPath] = useState(initialViewerState.path)
  const [selectedPathType, setSelectedPathType] = useState<SelectedPathType>(initialViewerState.pathType)
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
    queryKey: ['sync', selectedPath, currentBranch],
    queryFn: () => api.getSyncStatus(selectedPath, currentBranch),
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
    if (!info || info.pickerMode || selectedPath) return
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
      path: selectedPath,
      pathType: selectedPathType,
      raw: showRaw,
      sidebarCollapsed,
      searchMode,
      searchQuery,
      caseSensitive,
    })
  }, [currentBranch, selectedPath, selectedPathType, showRaw, sidebarCollapsed, searchMode, searchQuery, caseSensitive])

  useEffect(() => {
    if (!syncStatus) return

    if (lastRevisionRef.current && lastRevisionRef.current !== syncStatus.workingTreeRevision) {
      queryClient.invalidateQueries({ queryKey: ['tree'] }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['file'] }).catch(() => {})
    }
    lastRevisionRef.current = syncStatus.workingTreeRevision

    if (syncStatus.currentPath && syncStatus.currentPathType === 'missing') {
      setStatusMessage(syncStatus.statusMessage)
      setSelectedPath(syncStatus.resolvedPath)
      setSelectedPathType(syncStatus.resolvedPathType === 'missing' ? 'none' : syncStatus.resolvedPathType)
      setShowRaw(false)
      return
    }

    if (syncStatus.statusMessage) {
      setStatusMessage(syncStatus.statusMessage)
    }

    if (selectedPath === syncStatus.currentPath && syncStatus.currentPathType !== 'missing') {
      setSelectedPathType(syncStatus.currentPathType === 'none' ? 'none' : syncStatus.currentPathType)
    }
  }, [syncStatus, queryClient])

  function handleSelectFile(path: string) {
    setSelectedPath(path)
    setSelectedPathType(path ? 'file' : 'none')
    setStatusMessage('')
    setShowRaw(false)
  }

  function handleSelectFolder(path: string) {
    setSelectedPath(path)
    setSelectedPathType(path ? 'dir' : 'none')
    setStatusMessage('')
    setShowRaw(false)
  }

  function handleSelectSearchResult(result: SearchResult) {
    if (result.type === 'file') {
      handleSelectFile(result.path)
      return
    }

    handleSelectFolder(result.path)
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
    readmeMissing && !selectedPath ? 'No README found in this repository.' : undefined

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
              selectedPath={selectedPath}
              selectedPathType={selectedPathType}
              onSelect={(
                path,
                type,
              ) => {
                if (type === 'dir') {
                  handleSelectFolder(path)
                  return
                }
                handleSelectFile(path)
              }}
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
            path={selectedPath}
            onNavigate={(path) => {
              if (path === '') {
                handleSelectFile('')
              } else {
                handleSelectFolder(path)
              }
            }}
          />
          <ContentPanel
            selectedPath={selectedPath}
            selectedPathType={selectedPathType}
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
