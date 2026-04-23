import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './services/api'
import Breadcrumb from './components/Breadcrumb/Breadcrumb'
import ContentPanel from './components/ContentPanel/ContentPanel'
import FileTree from './components/FileTree/FileTree'
import PickerPage from './components/Picker/PickerPage'
import BranchSwitchDialog from './components/RepoContext/BranchSwitchDialog'
import RepoContextHeader from './components/RepoContext/RepoContextHeader'
import SearchPanel from './components/Search/SearchPanel'
import AppFooter from './components/AppFooter'
import {
  CommitChangesDialog,
  GitIdentityDialog,
  RepoBoundaryDialog,
} from './components/AppDialogs'
import { Switch } from './components/ui/switch'
import { applyTheme, getInitialTheme, writeStoredTheme, type ThemeMode } from './services/theme'
import { readViewerState, writeViewerState } from './services/viewerState'
import type {
  Branch,
  BranchSwitchResponse,
  FileSyncState,
  GitUserIdentity,
  RepoInfo,
  RepoSyncState,
  SearchPresentation,
  SearchResult,
  ViewerPathType,
} from './types'
import {
  describeBranchTarget,
  getErrorMessage,
  updateBranchCacheAfterSwitch,
} from './lib/app-helpers'
import { getRepoSyncActionLabel } from './lib/sync'

type LandingAction = { label: string; action: 'create-file' }
type BranchScope = 'local' | 'remote'

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

interface BranchSwitchDialogState {
  target: string
  targetLabel: string
  targetScope: BranchScope
  response: BranchSwitchResponse
}

function ErrorScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-12">
      <div className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>
      </div>
    </div>
  )
}

export default function App() {
  const initialViewerState = readViewerState()
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [viewerRepoPath, setViewerRepoPath] = useState(initialViewerState.repoPath)
  const [selectedPath, setSelectedPath] = useState(initialViewerState.path)
  const [selectedPathType, setSelectedPathType] = useState<ViewerPathType>(initialViewerState.pathType)
  const [selectedPathLocalOnly, setSelectedPathLocalOnly] = useState(false)
  const [currentBranch, setCurrentBranch] = useState(initialViewerState.branch)
  const [showRaw, setShowRaw] = useState(initialViewerState.raw)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialViewerState.sidebarCollapsed)
  const [searchPresentation, setSearchPresentation] = useState<SearchPresentation>(initialViewerState.searchPresentation)
  const [searchQuery, setSearchQuery] = useState(initialViewerState.searchQuery)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showRepoBoundaryDialog, setShowRepoBoundaryDialog] = useState(false)
  const [branchSwitchState, setBranchSwitchState] = useState<BranchSwitchDialogState | null>(null)
  const [branchSwitchCommitMessage, setBranchSwitchCommitMessage] = useState('')
  const [branchSwitchPending, setBranchSwitchPending] = useState(false)
  const [branchSwitchError, setBranchSwitchError] = useState('')
  const [gitIdentityDialogOpen, setGitIdentityDialogOpen] = useState(false)
  const [gitIdentityName, setGitIdentityName] = useState('')
  const [gitIdentityEmail, setGitIdentityEmail] = useState('')
  const [gitIdentityPending, setGitIdentityPending] = useState(false)
  const [gitIdentityError, setGitIdentityError] = useState('')
  const [commitDialogOpen, setCommitDialogOpen] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [commitPending, setCommitPending] = useState(false)
  const [commitError, setCommitError] = useState('')
  const [syncPending, setSyncPending] = useState(false)
  const [treeRefreshToken, setTreeRefreshToken] = useState(0)
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

  useEffect(() => {
    applyTheme(theme)
    writeStoredTheme(theme)
  }, [theme])

  useEffect(() => {
    if (info?.currentBranch && !currentBranch) {
      setCurrentBranch(info.currentBranch)
    }
  }, [currentBranch, info])

  useEffect(() => {
    if (!info?.isGitRepo || !branches) return

    if (branches.length === 0) {
      if (currentBranch) {
        setCurrentBranch('')
        setStatusMessage('GitLocal cleared the saved branch because this repository has no commits yet.')
      }
      return
    }

    if (!currentBranch) return

    const branchExists = branches.some((branch) =>
      branch.name === currentBranch || branch.trackingRef === currentBranch,
    )
    if (branchExists) return

    const fallbackBranch =
      info.currentBranch
      || branches.find((branch) => branch.isCurrent)?.name
      || branches[0]?.trackingRef
      || branches[0]?.name
      || ''

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
    setSelectedPathLocalOnly(false)
    setShowRaw(false)
    setSearchPresentation('collapsed')
    setSearchQuery('')
    setStatusMessage('GitLocal reset the saved file context because you opened a different repository.')
    lastRevisionRef.current = ''

    if (currentBranch !== info.currentBranch) {
      setCurrentBranch(info.currentBranch || '')
    }
  }, [currentBranch, info, viewerRepoPath])

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
    if (!info?.currentBranch || currentBranch === info.currentBranch) return
    setSelectedPathLocalOnly(false)
  }, [currentBranch, info?.currentBranch])

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
      setSelectedPathLocalOnly(false)
      setShowRaw(false)
      return
    }

    if (syncStatus.statusMessage) {
      setStatusMessage(syncStatus.statusMessage)
    }

    if (selectedPath === syncStatus.currentPath && syncStatus.currentPathType !== 'missing') {
      setSelectedPathType(syncStatus.currentPathType === 'none' ? 'none' : syncStatus.currentPathType)
    }
  }, [queryClient, selectedPath, syncStatus])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  function confirmDiscardChanges(): boolean {
    if (!hasUnsavedChanges) return true
    return window.confirm('Discard your unsaved file changes?')
  }

  function handleSelectFile(path: string, localOnly = false) {
    if (!confirmDiscardChanges()) return
    setSelectedPath(path)
    setSelectedPathType(path ? 'file' : 'none')
    setSelectedPathLocalOnly(path ? localOnly : false)
    setStatusMessage('')
    setShowRaw(false)
  }

  function handleSelectFolder(path: string, localOnly = false) {
    if (!confirmDiscardChanges()) return
    setSelectedPath(path)
    setSelectedPathType(path ? 'dir' : 'none')
    setSelectedPathLocalOnly(path ? localOnly : false)
    setStatusMessage('')
    setShowRaw(false)
  }

  function handleSelectSearchResult(result: SearchResult) {
    if (result.type === 'dir') {
      handleSelectFolder(result.path, result.localOnly)
    } else {
      handleSelectFile(result.path, result.localOnly)
    }
    setSearchPresentation('collapsed')
    setSearchQuery('')
  }

  async function handleBrowseParentFolder() {
    setPickerLoading(true)
    try {
      const result = await api.showParentPicker()
      if (result.ok) {
        window.location.reload()
        return
      }
      setStatusMessage(result.message || result.error || 'GitLocal could not open the parent folder.')
    } finally {
      setPickerLoading(false)
    }
  }

  function handleBrowseParentRequest(): void {
    if (!confirmDiscardChanges()) return
    setShowRepoBoundaryDialog(true)
  }

  function handleDismissSearch() {
    setSearchPresentation('collapsed')
    setSearchQuery('')
  }

  function openGitIdentityDialog(): void {
    const gitUser = info?.gitContext?.user
    setGitIdentityName(gitUser?.name ?? '')
    setGitIdentityEmail(gitUser?.email ?? '')
    setGitIdentityError('')
    setGitIdentityDialogOpen(true)
  }

  function closeGitIdentityDialog(): void {
    if (gitIdentityPending) return
    setGitIdentityDialogOpen(false)
    setGitIdentityError('')
  }

  function openCommitDialog(): void {
    setCommitMessage(`WIP: ${info?.name ?? 'local changes'}`)
    setCommitError('')
    setCommitDialogOpen(true)
  }

  function closeCommitDialog(): void {
    if (commitPending) return
    setCommitDialogOpen(false)
    setCommitError('')
  }

  async function saveGitIdentity(): Promise<void> {
    const name = gitIdentityName.trim()
    const email = gitIdentityEmail.trim()

    if (!name) {
      setGitIdentityError('Git name is required.')
      return
    }

    if (!email) {
      setGitIdentityError('Git email is required.')
      return
    }

    setGitIdentityPending(true)
    setGitIdentityError('')

    try {
      const result = await api.updateGitIdentity({ name, email })
      queryClient.setQueryData<RepoInfo>(['info'], (previous) =>
        previous
          ? {
              ...previous,
              gitContext: {
                user: result.user as GitUserIdentity,
                remote: previous.gitContext?.remote ?? null,
              },
            }
          : previous,
      )
      await queryClient.invalidateQueries({ queryKey: ['info'] })
      setGitIdentityDialogOpen(false)
      setStatusMessage(result.message)
    } catch (error) {
      setGitIdentityError(getErrorMessage(error, 'Could not update the repository identity.'))
    } finally {
      setGitIdentityPending(false)
    }
  }

  const canMutateFiles = Boolean(
    info?.isGitRepo
    && !hasRepoMismatch
    && (!info.currentBranch || currentBranch === info.currentBranch),
  )
  const repoSync: RepoSyncState | undefined = syncStatus?.repoSync
  const selectedPathSyncState: FileSyncState | 'none' = syncStatus?.pathSyncState ?? 'none'
  const trackedChangeCount = syncStatus?.trackedChangeCount ?? 0
  const untrackedChangeCount = syncStatus?.untrackedChangeCount ?? 0
  const hasLocalChanges = trackedChangeCount + untrackedChangeCount > 0
  const canCommitChanges = canMutateFiles && hasLocalChanges && !hasUnsavedChanges && !branchSwitchPending && !syncPending
  const canSyncWithRemote = canMutateFiles
    && !hasUnsavedChanges
    && !branchSwitchPending
    && !commitPending
    && !syncPending
    && repoSync?.mode !== 'unavailable'
    && repoSync?.mode !== 'local-only'

  async function handleMutationComplete(event: {
    nextPath: string
    nextPathType: ViewerPathType
    result: { message: string }
  }) {
    setHasUnsavedChanges(false)
    setSelectedPath(event.nextPath)
    setSelectedPathType(event.nextPathType)
    setSelectedPathLocalOnly(false)
    setShowRaw(false)
    setStatusMessage(event.result.message)
    setTreeRefreshToken((value) => value + 1)
    await queryClient.invalidateQueries({ queryKey: ['tree'] })
    await queryClient.invalidateQueries({ queryKey: ['sync'] })
  }

  async function refreshRepoAfterGitAction(message: string): Promise<void> {
    setStatusMessage(message)
    setTreeRefreshToken((value) => value + 1)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['info'] }),
      queryClient.invalidateQueries({ queryKey: ['branches'] }),
      queryClient.invalidateQueries({ queryKey: ['tree'] }),
      queryClient.invalidateQueries({ queryKey: ['file'] }),
      queryClient.invalidateQueries({ queryKey: ['commits'] }),
      queryClient.invalidateQueries({ queryKey: ['readme'] }),
      queryClient.invalidateQueries({ queryKey: ['directory-readme'] }),
      queryClient.invalidateQueries({ queryKey: ['sync'] }),
    ])
  }

  async function submitCommitChanges(): Promise<void> {
    const nextMessage = commitMessage.trim()
    if (!nextMessage) {
      setCommitError('Enter a commit message before committing changes.')
      return
    }

    setCommitPending(true)
    setCommitError('')
    try {
      const result = await api.commitChanges({ message: nextMessage })
      setCommitDialogOpen(false)
      setHasUnsavedChanges(false)
      await refreshRepoAfterGitAction(result.message)
    } catch (error) {
      setCommitError(getErrorMessage(error, 'Could not create the local commit.'))
    } finally {
      setCommitPending(false)
    }
  }

  async function handleSyncWithRemote(): Promise<void> {
    setSyncPending(true)
    try {
      const result = await api.syncWithRemote()
      setHasUnsavedChanges(false)
      await refreshRepoAfterGitAction(result.message)
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Remote sync failed.'))
    } finally {
      setSyncPending(false)
    }
  }

  function resetBranchSwitchDialog(): void {
    setBranchSwitchState(null)
    setBranchSwitchCommitMessage('')
    setBranchSwitchPending(false)
    setBranchSwitchError('')
  }

  function cancelBranchSwitch(): void {
    if (branchSwitchPending) return
    resetBranchSwitchDialog()
    setStatusMessage('Branch switch canceled.')
  }

  async function finalizeBranchSwitch(target: string, result: BranchSwitchResponse): Promise<void> {
    const nextBranch = result.currentBranch || target
    let nextStatusMessage = result.createdTrackingBranch
      ? `${result.message} GitLocal created local tracking branch ${result.createdTrackingBranch}.`
      : result.message

    queryClient.setQueryData<RepoInfo>(['info'], (previous) =>
      previous
        ? {
            ...previous,
            currentBranch: nextBranch,
          }
        : previous,
    )
    queryClient.setQueryData<Branch[]>(['branches'], (previous) =>
      updateBranchCacheAfterSwitch(previous, target, nextBranch, result),
    )

    if (selectedPath) {
      try {
        const nextSyncStatus = await api.getSyncStatus(selectedPath, nextBranch)
        if (nextSyncStatus.currentPathType === 'missing') {
          const fallbackPath = nextSyncStatus.resolvedPath
          const fallbackPathType = nextSyncStatus.resolvedPathType === 'missing'
            ? 'none'
            : nextSyncStatus.resolvedPathType

          setSelectedPath(fallbackPath)
          setSelectedPathType(fallbackPathType)
          setSelectedPathLocalOnly(false)
          setShowRaw(false)

          const nextLocation = fallbackPath || 'the repository root'
          nextStatusMessage = `${nextStatusMessage} ${selectedPath} is not available on ${nextBranch}, so GitLocal moved you to ${nextLocation}.`
        } else if (nextSyncStatus.currentPathType !== 'none') {
          setSelectedPathType(nextSyncStatus.currentPathType)
        }
      } catch {
        // The regular sync query will still reconcile if this one-off refresh misses.
      }
    }

    resetBranchSwitchDialog()
    setHasUnsavedChanges(false)
    setCurrentBranch(nextBranch)
    setSelectedPathLocalOnly(false)
    setStatusMessage(nextStatusMessage)
    setTreeRefreshToken((value) => value + 1)

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['info'] }),
      queryClient.invalidateQueries({ queryKey: ['branches'] }),
      queryClient.invalidateQueries({ queryKey: ['tree'] }),
      queryClient.invalidateQueries({ queryKey: ['file'] }),
      queryClient.invalidateQueries({ queryKey: ['readme'] }),
      queryClient.invalidateQueries({ queryKey: ['directory-readme'] }),
      queryClient.invalidateQueries({ queryKey: ['sync'] }),
    ])
  }

  async function submitBranchSwitch(resolution: 'commit' | 'discard' | 'delete-untracked'): Promise<void> {
    if (!branchSwitchState) return

    setBranchSwitchPending(true)
    setBranchSwitchError('')

    try {
      const result = await api.switchBranch({
        target: branchSwitchState.target,
        resolution,
        commitMessage: resolution === 'commit' ? branchSwitchCommitMessage : undefined,
        allowDeleteUntracked: resolution === 'delete-untracked',
      })

      if (result.ok && result.status === 'switched') {
        await finalizeBranchSwitch(branchSwitchState.target, result)
        return
      }

      if (result.status === 'second-confirmation-required' || result.status === 'confirmation-required') {
        setBranchSwitchState({
          ...branchSwitchState,
          response: result,
        })
        if (!branchSwitchCommitMessage.trim() && result.suggestedCommitMessage) {
          setBranchSwitchCommitMessage(result.suggestedCommitMessage)
        }
        setBranchSwitchError('')
        return
      }

      setBranchSwitchError(result.message)
    } catch (error) {
      setBranchSwitchError(getErrorMessage(error, 'Branch switch failed.'))
    } finally {
      setBranchSwitchPending(false)
    }
  }

  async function handleBranchChange(nextBranch: string): Promise<void> {
    if (nextBranch === currentBranch) return
    if (!confirmDiscardChanges()) return

    setBranchSwitchPending(true)
    setBranchSwitchError('')
    setStatusMessage('')

    const targetDetails = describeBranchTarget(branches, nextBranch)

    try {
      const result = await api.switchBranch({
        target: nextBranch,
        resolution: 'preview',
      })

      if (result.ok && result.status === 'switched') {
        await finalizeBranchSwitch(nextBranch, result)
        return
      }

      if (result.status === 'confirmation-required' || result.status === 'second-confirmation-required') {
        setBranchSwitchState({
          target: nextBranch,
          targetLabel: targetDetails.label,
          targetScope: targetDetails.scope,
          response: result,
        })
        setBranchSwitchCommitMessage(result.suggestedCommitMessage ?? `WIP before switching to ${targetDetails.label}`)
        setBranchSwitchError('')
        return
      }

      setStatusMessage(result.message)
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Branch switch failed.'))
    } finally {
      setBranchSwitchPending(false)
    }
  }

  if (isLoading) {
    return <ErrorScreen title="Loading repository..." description="GitLocal is checking the current launch context." />
  }

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
        <ErrorScreen
          title="Not a Git repository"
          description="This folder is not a git repository. Please point GitLocal at a folder containing a .git directory."
        />
        <AppFooter version={info.version} />
      </>
    )
  }

  const visibleSelectedPath = hasRepoMismatch ? '' : selectedPath
  const visibleSelectedPathType: ViewerPathType = hasRepoMismatch ? 'none' : selectedPathType
  const visibleSelectedPathLocalOnly = hasRepoMismatch ? false : selectedPathLocalOnly
  const visibleShowRaw = hasRepoMismatch ? false : showRaw
  const isWorkingTreeBranchSelected = !info?.currentBranch || currentBranch === info.currentBranch
  const darkMode = theme === 'dark'

  let emptyStateTitle: string | undefined
  let emptyStateDetail: string | undefined
  let emptyStateActions: LandingAction[] | undefined

  if (!visibleSelectedPath && !hasRepoMismatch) {
    if (isWorkingTreeBranchSelected && info?.rootEntryCount === 0) {
      emptyStateTitle = 'This repository is ready for a first file'
      emptyStateDetail = 'This repository looks newly initialized or empty, so GitLocal is showing a guided landing state instead of an empty document view.'
      emptyStateActions = canMutateFiles
        ? [{ label: 'Create first file', action: 'create-file' }]
        : undefined
    } else if (!isWorkingTreeBranchSelected) {
      emptyStateTitle = 'Browsing a non-current branch'
      emptyStateDetail = 'This branch opens in read-only mode so you can compare tree contents without changing your working tree.'
    }
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <header className="app-header sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-[var(--border)] bg-[var(--header-bg)] px-4 backdrop-blur">
          <span className="logo text-sm font-semibold text-[var(--foreground)]">GitLocal</span>
          {info ? <span className="repo-name truncate text-sm text-[var(--muted-foreground)]">{info.name}</span> : null}
          <label className="ml-auto inline-flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] shadow-sm">
            <span>{darkMode ? 'Dark theme' : 'Light theme'}</span>
            <Switch
              checked={darkMode}
              aria-label="Toggle dark theme"
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </label>
        </header>

        <div className="app-body flex min-h-0 flex-1 pb-8">
          {sidebarCollapsed ? (
            <aside className="sidebar-rail flex w-14 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]" aria-label="collapsed navigation">
              <div className="sidebar-rail-toolbar flex justify-center p-3">
                <button
                  type="button"
                  className="panel-icon-button inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  aria-label="Expand navigation"
                  title="Expand navigation"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <PanelToggleIcon collapsed />
                </button>
              </div>
            </aside>
          ) : (
            <aside className="sidebar flex w-[300px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]">
              <div className="sidebar-toolbar flex justify-end p-3 pb-2">
                <button
                  type="button"
                  className="panel-icon-button inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  aria-label="Collapse navigation"
                  title="Collapse navigation"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <PanelToggleIcon collapsed={false} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden px-2 pb-3">
                <FileTree
                  branch={currentBranch}
                  refreshToken={treeRefreshToken}
                  selectedPath={visibleSelectedPath}
                  selectedPathType={visibleSelectedPathType}
                  onSelect={(path, type, localOnly) => {
                    if (type === 'dir') {
                      handleSelectFolder(path, localOnly)
                      return
                    }

                    handleSelectFile(path, localOnly)
                  }}
                />
              </div>
            </aside>
          )}

          <main className="content-area flex min-w-0 flex-1 flex-col">
            {statusMessage ? (
              <div className="status-banner border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_45%,var(--background))] px-4 py-2 text-sm text-[var(--foreground)]" role="status">
                {statusMessage}
              </div>
            ) : null}

            <div className="viewer-stage flex min-h-0 flex-1 flex-col gap-3 p-4">
              <RepoContextHeader
                info={info}
                branch={currentBranch}
                branches={branches}
                selectedPath={visibleSelectedPath}
                selectedPathType={visibleSelectedPathType}
                repoSync={repoSync}
                trackedChangeCount={trackedChangeCount}
                untrackedChangeCount={untrackedChangeCount}
                onBranchChange={(nextBranch) => {
                  void handleBranchChange(nextBranch)
                }}
                onEditGitIdentity={info?.isGitRepo ? openGitIdentityDialog : undefined}
                onCommitChanges={isWorkingTreeBranchSelected ? openCommitDialog : undefined}
                onSyncWithRemote={isWorkingTreeBranchSelected ? () => { void handleSyncWithRemote() } : undefined}
                onOpenSearch={() => setSearchPresentation('expanded')}
                branchDisabled={branchSwitchPending}
                commitDisabled={!canCommitChanges}
                syncDisabled={!canSyncWithRemote}
                syncActionLabel={getRepoSyncActionLabel(repoSync)}
                branchSwitchDialog={
                  <BranchSwitchDialog
                    open={Boolean(branchSwitchState)}
                    targetLabel={branchSwitchState?.targetLabel ?? ''}
                    targetScope={branchSwitchState?.targetScope}
                    response={branchSwitchState?.response ?? null}
                    commitMessage={branchSwitchCommitMessage}
                    pending={branchSwitchPending}
                    errorMessage={branchSwitchError}
                    onCommitMessageChange={setBranchSwitchCommitMessage}
                    onCancel={cancelBranchSwitch}
                    onCommit={() => { void submitBranchSwitch('commit') }}
                    onDiscard={() => { void submitBranchSwitch('discard') }}
                    onDeleteUntracked={() => { void submitBranchSwitch('delete-untracked') }}
                  />
                }
              />

              {searchPresentation === 'expanded' ? (
                <div className="search-layer" data-testid="search-layer">
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
                </div>
              ) : null}

              <Breadcrumb
                path={visibleSelectedPath}
                onNavigate={(path) => handleSelectFolder(path)}
              />

              <div className="min-h-0 flex-1 overflow-hidden">
                <ContentPanel
                  canMutateFiles={canMutateFiles}
                  refreshToken={treeRefreshToken}
                  selectedPath={visibleSelectedPath}
                  selectedPathType={visibleSelectedPathType}
                  selectedPathLocalOnly={visibleSelectedPathLocalOnly}
                  selectedPathSyncState={selectedPathSyncState}
                  branch={currentBranch}
                  isGitRepo={info?.isGitRepo}
                  onNavigate={handleSelectFile}
                  onOpenPath={(path, type, localOnly) => {
                    if (type === 'dir') {
                      handleSelectFolder(path, localOnly)
                      return
                    }
                    handleSelectFile(path, localOnly)
                  }}
                  onDirtyChange={setHasUnsavedChanges}
                  onMutationComplete={(event) => { void handleMutationComplete(event) }}
                  emptyStateTitle={emptyStateTitle}
                  emptyStateDetail={emptyStateDetail}
                  emptyStateActions={emptyStateActions}
                  onBrowseParent={handleBrowseParentRequest}
                  raw={visibleShowRaw}
                  onRawChange={setShowRaw}
                  onStatusMessage={setStatusMessage}
                />
              </div>
            </div>
          </main>
        </div>

        <AppFooter version={info?.version ?? ''} />
      </div>

      <RepoBoundaryDialog
        open={showRepoBoundaryDialog}
        pending={pickerLoading}
        onOpenChange={(open) => {
          if (!pickerLoading) setShowRepoBoundaryDialog(open)
        }}
        onConfirm={() => {
          setShowRepoBoundaryDialog(false)
          void handleBrowseParentFolder()
        }}
      />

      <GitIdentityDialog
        open={gitIdentityDialogOpen}
        pending={gitIdentityPending}
        error={gitIdentityError}
        name={gitIdentityName}
        email={gitIdentityEmail}
        onOpenChange={(open) => {
          if (!gitIdentityPending) setGitIdentityDialogOpen(open)
        }}
        onNameChange={setGitIdentityName}
        onEmailChange={setGitIdentityEmail}
        onCancel={closeGitIdentityDialog}
        onSave={() => { void saveGitIdentity() }}
      />

      <CommitChangesDialog
        open={commitDialogOpen}
        pending={commitPending}
        error={commitError}
        message={commitMessage}
        onOpenChange={(open) => {
          if (!commitPending) setCommitDialogOpen(open)
        }}
        onMessageChange={setCommitMessage}
        onCancel={closeCommitDialog}
        onCommit={() => { void submitCommitChanges() }}
      />
    </>
  )
}
