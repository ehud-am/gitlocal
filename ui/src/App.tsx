import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './services/api'
import FileTree from './components/FileTree/FileTree'
import Breadcrumb from './components/Breadcrumb/Breadcrumb'
import ContentPanel from './components/ContentPanel/ContentPanel'
import GitInfo from './components/GitInfo/GitInfo'
import PickerPage from './components/Picker/PickerPage'
import SearchPanel from './components/Search/SearchPanel'
import SearchTrigger from './components/Search/SearchTrigger'
import AppFooter from './components/AppFooter'
import type { SearchPresentation, SearchResult } from './types'
import { readViewerState, writeViewerState } from './services/viewerState'

type SelectedPathType = 'file' | 'dir' | 'none'

function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return collapsed ? (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M10 3.5L5.5 8L10 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function App() {
  const initialViewerState = readViewerState()
  const [viewerRepoPath, setViewerRepoPath] = useState(initialViewerState.repoPath)
  const [selectedPath, setSelectedPath] = useState(initialViewerState.path)
  const [selectedPathType, setSelectedPathType] = useState<SelectedPathType>(initialViewerState.pathType)
  const [currentBranch, setCurrentBranch] = useState(initialViewerState.branch)
  const [showRaw, setShowRaw] = useState(initialViewerState.raw)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialViewerState.sidebarCollapsed)
  const [searchPresentation, setSearchPresentation] = useState<SearchPresentation>(initialViewerState.searchPresentation)
  const [searchQuery, setSearchQuery] = useState(initialViewerState.searchQuery)
  const [readmeMissing, setReadmeMissing] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const queryClient = useQueryClient()
  const lastRevisionRef = useRef('')

  const { data: info, isLoading } = useQuery({
    queryKey: ['info'],
    queryFn: api.getInfo,
  })
  const hasRepoMismatch = Boolean(info?.isGitRepo && viewerRepoPath && info.path && viewerRepoPath !== info.path)

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: api.getBranches,
    enabled: !!info?.isGitRepo,
  })

  const { data: syncStatus } = useQuery({
    queryKey: ['sync', selectedPath, currentBranch],
    queryFn: () => api.getSyncStatus(selectedPath, currentBranch),
    enabled: !!info?.isGitRepo && !hasRepoMismatch,
    refetchInterval: 3000,
  })

  // Initialize branch from info
  useEffect(() => {
    if (info?.currentBranch && !currentBranch) {
      setCurrentBranch(info.currentBranch)
    }
  }, [info, currentBranch])

  useEffect(() => {
    if (!info?.isGitRepo || !branches || branches.length === 0 || !currentBranch) return

    const branchExists = branches.some((branch) => branch.name === currentBranch)
    if (branchExists) return

    const fallbackBranch =
      info.currentBranch ||
      branches.find((branch) => branch.isCurrent)?.name ||
      branches[0]?.name ||
      ''

    if (!fallbackBranch || fallbackBranch === currentBranch) return

    setCurrentBranch(fallbackBranch)
    setStatusMessage('GitLocal reset the saved branch because it is not available in this repository.')
  }, [branches, currentBranch, info])

  useEffect(() => {
    if (!info?.isGitRepo || !info.path) return

    if (!viewerRepoPath) {
      setViewerRepoPath(info.path)
      return
    }

    if (viewerRepoPath === info.path) return

    setViewerRepoPath(info.path)
    setSelectedPath('')
    setSelectedPathType('none')
    setShowRaw(false)
    setSearchPresentation('collapsed')
    setSearchQuery('')
    setReadmeMissing(false)
    setStatusMessage('GitLocal reset the saved file context because you opened a different repository.')
    lastRevisionRef.current = ''

    if (info.currentBranch && currentBranch !== info.currentBranch) {
      setCurrentBranch(info.currentBranch)
    }
  }, [currentBranch, info, viewerRepoPath])

  // Auto-select README on first load (viewer mode only)
  useEffect(() => {
    if (!info || info.pickerMode || selectedPath || hasRepoMismatch) return
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
  }, [hasRepoMismatch, info, selectedPath]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    writeViewerState({
      repoPath: viewerRepoPath,
      branch: currentBranch,
      path: selectedPath,
      pathType: selectedPathType,
      raw: showRaw,
      sidebarCollapsed,
      searchPresentation,
      searchQuery,
    })
  }, [currentBranch, searchPresentation, searchQuery, selectedPath, selectedPathType, showRaw, sidebarCollapsed, viewerRepoPath])

  useEffect(() => {
    if (searchQuery.trim().length > 0 && searchPresentation !== 'expanded') {
      setSearchPresentation('expanded')
    }
  }, [searchPresentation, searchQuery])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isShortcut = key === 'f' && (event.metaKey || event.ctrlKey)
      if (!isShortcut) return
      if (info?.pickerMode || info?.isGitRepo === false) return

      event.preventDefault()
      setSearchPresentation('expanded')
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [info?.isGitRepo, info?.pickerMode])

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
    handleSelectFile(result.path)
    setSearchPresentation('collapsed')
    setSearchQuery('')
  }

  if (isLoading) {
    return (
      <>
        <div className="error-screen">
          <div className="error-card">
            <h2>Loading repository…</h2>
            <p>GitLocal is checking the current launch context.</p>
          </div>
        </div>
        <AppFooter version="0.4.2" />
      </>
    )
  }

  // Picker mode: show the folder selector page
  if (info?.pickerMode) {
    return (
      <>
        <PickerPage />
        <AppFooter version={info.version} />
      </>
    )
  }

  if (info && !info.isGitRepo) {
    return (
      <>
        <div className="error-screen">
          <div className="error-card">
            <h2>Not a Git repository</h2>
            <p>
              This folder is not a git repository. Please point GitLocal at a folder
              containing a <code>.git</code> directory.
            </p>
          </div>
        </div>
        <AppFooter version={info.version} />
      </>
    )
  }

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

  function handleDismissSearch() {
    setSearchPresentation('collapsed')
    setSearchQuery('')
  }

  const appVersion = info?.version ?? '0.4.2'
  const visibleSelectedPath = hasRepoMismatch ? '' : selectedPath
  const visibleSelectedPathType: SelectedPathType = hasRepoMismatch ? 'none' : selectedPathType
  const visibleShowRaw = hasRepoMismatch ? false : showRaw
  const noReadmePlaceholder =
    readmeMissing && !visibleSelectedPath ? 'No README found in this repository.' : undefined

  return (
    <>
      <header className="app-header">
        <span className="logo">GitLocal</span>
        {info && <span className="repo-name">{info.name}</span>}
        <div className="app-header-actions">
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
        {sidebarCollapsed ? (
          <aside className="sidebar-rail" aria-label="collapsed navigation">
            <div className="sidebar-rail-toolbar">
              <button
                type="button"
                className="panel-icon-button sidebar-toggle-button"
                aria-label="Expand navigation"
                title="Expand navigation"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelToggleIcon collapsed />
              </button>
            </div>
          </aside>
        ) : (
          <aside className="sidebar">
            <div className="sidebar-toolbar">
              <button
                type="button"
                className="panel-icon-button sidebar-toggle-button"
                aria-label="Collapse navigation"
                title="Collapse navigation"
                onClick={() => setSidebarCollapsed(true)}
              >
                <PanelToggleIcon collapsed={false} />
              </button>
            </div>
            <FileTree
              branch={currentBranch}
              selectedPath={visibleSelectedPath}
              selectedPathType={visibleSelectedPathType}
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
          <div className="viewer-stage">
            <div className="search-layer" data-testid="search-layer">
              {searchPresentation === 'expanded' ? (
                <SearchPanel
                  branch={currentBranch}
                  query={searchQuery}
                  autoFocus
                  onQueryChange={(query) => {
                    setSearchPresentation('expanded')
                    setSearchQuery(query)
                  }}
                  onSelectResult={handleSelectSearchResult}
                  onDismiss={handleDismissSearch}
                />
              ) : (
                <SearchTrigger onOpen={() => setSearchPresentation('expanded')} />
              )}
            </div>
            <Breadcrumb
              path={visibleSelectedPath}
              onNavigate={(path) => {
                if (path === '') {
                  handleSelectFile('')
                } else {
                  handleSelectFolder(path)
                }
              }}
            />
            <ContentPanel
              selectedPath={visibleSelectedPath}
              selectedPathType={visibleSelectedPathType}
              branch={currentBranch}
              onNavigate={handleSelectFile}
              placeholder={noReadmePlaceholder}
              raw={visibleShowRaw}
              onRawChange={setShowRaw}
            />
          </div>
        </div>
      </div>
      <AppFooter version={appVersion} />
    </>
  )
}
