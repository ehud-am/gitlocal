import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './services/api'
import ContentPanel from './components/ContentPanel/ContentPanel'
import FileTree from './components/FileTree/FileTree'
import PickerPage from './components/Picker/PickerPage'
import BranchSwitchDialog from './components/RepoContext/BranchSwitchDialog'
import RepoContextHeader from './components/RepoContext/RepoContextHeader'
import SearchPanel from './components/Search/SearchPanel'
import { TerminalPanel, type TerminalPanelHandle } from './components/TerminalPanel/TerminalPanel'
import AppFooter from './components/AppFooter'
import {
  FolderDeleteDialog,
  GitIdentityDialog,
  RepoBoundaryDialog,
} from './components/AppDialogs'
import { Button } from './components/ui/button'
import { Switch } from './components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { applyTheme, getInitialTheme, writeStoredTheme, type ThemeMode } from './services/theme'
import {
  readDefaultReaderPromptPreference,
  readRecentItems,
  readViewerState,
  rememberRecentChangedItems,
  rememberRecentItem,
  resetViewerState,
  writeDefaultReaderPromptPreference,
  writeViewerState,
} from './services/viewerState'
import type {
  Branch,
  BranchSwitchResponse,
  ChangedFileItem,
  ChangedFilesResponse,
  DefaultReaderPreference,
  FileSyncState,
  FolderOperationResult,
  GeneratedLocalVisibility,
  GitUserIdentity,
  LocalActionResponse,
  NavigationHintsResponse,
  NativeAppCommandEvent,
  NativeAppOutboundCommand,
  RepoInfo,
  RepoLocationResponse,
  RepoSummaryResponse,
  RepoSyncState,
  SearchContentKind,
  SearchMode,
  SearchPresentation,
  SearchResult,
  SearchTrackedMode,
  SshKeyCandidate,
  StartupOpenTarget,
  ViewerPathType,
} from './types'
import {
  describeBranchTarget,
  getErrorMessage,
  shouldRefreshActiveFileAfterSyncChange,
  updateBranchCacheAfterSwitch,
} from './lib/app-helpers'

type LandingAction = { label: string; action: 'create-file' }
type BranchScope = 'local' | 'remote'

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg className={spinning ? 'toolbar-icon is-spinning' : 'toolbar-icon'} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M13 7a5 5 0 1 0-1.45 3.54" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 3.5V7h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ThemeIcon({ darkMode }: { darkMode: boolean }) {
  return darkMode ? (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M9.5 2.25A5.75 5.75 0 1 0 13.75 10A4.75 4.75 0 0 1 9.5 2.25z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 6l2.5 2.5L4 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ParentFolderIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M8 3.5 3.5 8h3v4.5h3V8h3L8 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ViewOptionsIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="4" r="1.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="8" r="1.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="12" r="1.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

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

function ErrorScreen({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-12">
      <div className="w-full max-w-lg rounded-md border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>
        {action ? (
          <Button type="button" variant="secondary" className="mt-4" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// The native macOS app's menu bar already exposes Refresh, Hide Dotfiles, and the tracked-file
// visibility submenu, so the browser-only "View options" toolbar control stays hidden there.
function isRunningInNativeApp(): boolean {
  return Boolean(
    (window as typeof window & { webkit?: { messageHandlers?: { gitlocalNative?: unknown } } }).webkit
      ?.messageHandlers?.gitlocalNative,
  )
}

function postNativeAppCommand(command: NativeAppOutboundCommand, value?: string): boolean {
  const messageHandlers = (window as typeof window & {
    webkit?: { messageHandlers?: { gitlocalNative?: { postMessage: (message: { command: NativeAppOutboundCommand; value?: string }) => void } } }
  }).webkit?.messageHandlers
  const handler = messageHandlers?.gitlocalNative
  if (!handler) return false
  handler.postMessage(value === undefined ? { command } : { command, value })
  return true
}

export default function App() {
  const initialViewerState = readViewerState()
  const savedInitialViewerStateRef = useRef(initialViewerState)
  const savedInitialViewerStateAppliedRef = useRef(false)
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [viewerRepoPath, setViewerRepoPath] = useState(initialViewerState.repoPath)
  const [selectedPath, setSelectedPath] = useState('')
  const [selectedPathType, setSelectedPathType] = useState<ViewerPathType>('none')
  const [selectedPathLocalOnly, setSelectedPathLocalOnly] = useState(false)
  const [currentBranch, setCurrentBranch] = useState(initialViewerState.branch)
  const [showRaw, setShowRaw] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialViewerState.sidebarCollapsed)
  const [hideDotfiles, setHideDotfiles] = useState(initialViewerState.hideDotfiles)
  const [generatedLocalVisibility, setGeneratedLocalVisibility] = useState<GeneratedLocalVisibility>(initialViewerState.generatedLocalVisibility)
  const [searchPresentation, setSearchPresentation] = useState<SearchPresentation>(initialViewerState.searchPresentation)
  const [searchQuery, setSearchQuery] = useState(initialViewerState.searchQuery)
  const [searchMode, setSearchMode] = useState<SearchMode>(initialViewerState.searchMode)
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(initialViewerState.searchCaseSensitive)
  const [searchRootPath, setSearchRootPath] = useState(initialViewerState.searchRootPath)
  const [searchContentKind, setSearchContentKind] = useState<SearchContentKind>(initialViewerState.searchContentKind)
  const [searchTrackedMode, setSearchTrackedMode] = useState<SearchTrackedMode>(initialViewerState.searchTrackedMode)
  const [searchLimit, setSearchLimit] = useState(initialViewerState.searchLimit)
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
  const [gitIdentitySshKeyPath, setGitIdentitySshKeyPath] = useState('')
  const [gitIdentitySshKeys, setGitIdentitySshKeys] = useState<SshKeyCandidate[]>([])
  const [gitIdentitySshKeysMessage, setGitIdentitySshKeysMessage] = useState('')
  const [gitIdentitySshKeysPending, setGitIdentitySshKeysPending] = useState(false)
  const [gitIdentityPending, setGitIdentityPending] = useState(false)
  const [gitIdentityError, setGitIdentityError] = useState('')
  const [folderDeletePreview, setFolderDeletePreview] = useState<FolderOperationResult | null>(null)
  const [folderDeleteConfirmationName, setFolderDeleteConfirmationName] = useState('')
  const [folderDeletePending, setFolderDeletePending] = useState(false)
  const [folderDeleteError, setFolderDeleteError] = useState('')
  const [changedFiles, setChangedFiles] = useState<ChangedFilesResponse | null>(null)
  const [recentItems, setRecentItems] = useState(() => readRecentItems())
  const [treeRefreshToken, setTreeRefreshToken] = useState(0)
  const [nativeFindToken, setNativeFindToken] = useState(0)
  const [nativeSelectAllToken, setNativeSelectAllToken] = useState(0)
  const [nativeDefaultReaderAvailable, setNativeDefaultReaderAvailable] = useState(false)
  const [defaultReaderPreference, setDefaultReaderPreference] = useState<DefaultReaderPreference>(() => readDefaultReaderPromptPreference())
  const [defaultReaderSetupPending, setDefaultReaderSetupPending] = useState(false)
  const [refreshingCurrentView, setRefreshingCurrentView] = useState(false)
  const queryClient = useQueryClient()
  const lastRevisionRef = useRef('')
  const nativeRefreshPendingRef = useRef(false)
  const startupOpenTargetAppliedRef = useRef('')
  const startupFolderFallbackAppliedRef = useRef(false)
  const terminalPanelRef = useRef<TerminalPanelHandle>(null)

  const { data: baseInfo, isLoading, isError: isInfoError, error: infoError } = useQuery({
    queryKey: ['info'],
    queryFn: api.getInfo,
  })

  const { data: startupOpenTargetResponse, isFetched: startupOpenTargetFetched } = useQuery({
    queryKey: ['startup-open-target'],
    queryFn: api.getStartupOpenTarget,
  })

  const { data: startupFolderResponse } = useQuery({
    queryKey: ['startup-folder'],
    queryFn: api.getStartupFolder,
  })

  const { data: gitContext } = useQuery({
    queryKey: ['git-context'],
    queryFn: api.getGitContext,
    enabled: !!baseInfo?.isGitRepo,
  })

  const info = useMemo<RepoInfo | undefined>(() => {
    if (!baseInfo) return undefined
    if (!baseInfo.isGitRepo) return baseInfo
    return {
      ...baseInfo,
      gitContext: gitContext ?? baseInfo.gitContext ?? null,
    }
  }, [baseInfo, gitContext])

  const hasRepoMismatch = Boolean(info && !info.pickerMode && viewerRepoPath && info.path && viewerRepoPath !== info.path)

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

  const { data: repoSummary } = useQuery<RepoSummaryResponse>({
    queryKey: ['repo-summary', currentBranch],
    queryFn: () => api.getRepoSummary(currentBranch),
    enabled: !!info?.isGitRepo && !hasRepoMismatch,
  })

  const { data: navigationHints } = useQuery<NavigationHintsResponse>({
    queryKey: ['navigation-hints', currentBranch, generatedLocalVisibility],
    queryFn: () => api.getNavigationHints(currentBranch, true, generatedLocalVisibility !== 'hide'),
    enabled: !!info?.isGitRepo && !hasRepoMismatch,
  })

  const { data: repoLocation } = useQuery<RepoLocationResponse>({
    queryKey: ['repo-location', selectedPath, currentBranch],
    queryFn: () => api.getRepoLocation(selectedPath, currentBranch),
    enabled: !!info && !hasRepoMismatch,
  })

  useEffect(() => {
    applyTheme(theme)
    writeStoredTheme(theme)
  }, [theme])

  useEffect(() => {
    if (info?.isGitRepo && info.currentBranch && !currentBranch) {
      setCurrentBranch(info.currentBranch)
    } else if (info && !info.isGitRepo && currentBranch) {
      setCurrentBranch('')
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
    if (!info || info.pickerMode || !info.path) return

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
    setSearchMode('both')
    setSearchCaseSensitive(false)
    setStatusMessage('GitLocal reset the saved file context because you opened a different folder.')
    lastRevisionRef.current = ''

    if (info.isGitRepo && currentBranch !== info.currentBranch) {
      setCurrentBranch(info.currentBranch || '')
    } else if (!info.isGitRepo && currentBranch) {
      setCurrentBranch('')
    }
  }, [currentBranch, info, viewerRepoPath])

  useEffect(() => {
    if (!startupOpenTargetFetched) return
    writeViewerState({
      repoPath: viewerRepoPath,
      branch: currentBranch,
      path: selectedPath,
      pathType: selectedPathType,
      raw: showRaw,
      sidebarCollapsed,
      hideDotfiles,
      generatedLocalVisibility,
      searchPresentation,
      searchQuery,
      searchMode,
      searchCaseSensitive,
      searchRootPath,
      searchContentKind,
      searchTrackedMode,
      searchLimit,
    })
  }, [currentBranch, generatedLocalVisibility, hideDotfiles, searchCaseSensitive, searchContentKind, searchLimit, searchMode, searchPresentation, searchQuery, searchRootPath, searchTrackedMode, selectedPath, selectedPathType, showRaw, sidebarCollapsed, startupOpenTargetFetched, viewerRepoPath])

  // Keeps the native app's "Hide Dotfiles" menu checkmark in sync however hideDotfiles changed —
  // via this toolbar control or via the menu item itself dispatching 'toggle-dotfiles'.
  useEffect(() => {
    postNativeAppCommand('dotfiles-state', String(hideDotfiles))
  }, [hideDotfiles])

  // Keeps the native app's "Tracked/All/Local" submenu checkmark in sync however
  // generatedLocalVisibility changed — via this toolbar control or via the submenu itself
  // dispatching 'set-tracked-visibility'.
  useEffect(() => {
    postNativeAppCommand('tracked-visibility-state', generatedLocalVisibility)
  }, [generatedLocalVisibility])

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
    if (!syncStatus) return

    if (lastRevisionRef.current && lastRevisionRef.current !== syncStatus.workingTreeRevision) {
      queryClient.invalidateQueries({ queryKey: ['tree'] }).catch(() => {})
      if (shouldRefreshActiveFileAfterSyncChange(syncStatus)) {
        queryClient.invalidateQueries({ queryKey: ['file'] }).catch(() => {})
      }
      queryClient.invalidateQueries({ queryKey: ['repo-summary'] }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['navigation-hints'] }).catch(() => {})
    }
    lastRevisionRef.current = syncStatus.workingTreeRevision

    if (syncStatus.currentPath && syncStatus.currentPathType === 'missing') {
      setStatusMessage(syncStatus.activePathNotice?.message ?? syncStatus.statusMessage)
      setSelectedPath(syncStatus.resolvedPath)
      setSelectedPathType(syncStatus.resolvedPathType === 'missing' ? 'none' : syncStatus.resolvedPathType)
      setSelectedPathLocalOnly(false)
      setShowRaw(false)
      return
    }

    if (syncStatus.activePathNotice?.message || syncStatus.statusMessage) {
      setStatusMessage(syncStatus.activePathNotice?.message ?? syncStatus.statusMessage)
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

  const refreshCurrentView = useCallback(async (): Promise<void> => {
    if (hasUnsavedChanges && !window.confirm('Discard your unsaved file changes?')) return
    if (nativeRefreshPendingRef.current) return
    nativeRefreshPendingRef.current = true
    setRefreshingCurrentView(true)
    setStatusMessage('Refreshing current view...')
    setTreeRefreshToken((value) => value + 1)

    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['info'] }),
        queryClient.invalidateQueries({ queryKey: ['git-context'] }),
        queryClient.invalidateQueries({ queryKey: ['branches'] }),
        queryClient.invalidateQueries({ queryKey: ['tree'] }),
        queryClient.invalidateQueries({ queryKey: ['file'] }),
        queryClient.invalidateQueries({ queryKey: ['readme'] }),
        queryClient.invalidateQueries({ queryKey: ['directory-readme'] }),
        queryClient.invalidateQueries({ queryKey: ['sync'] }),
        queryClient.invalidateQueries({ queryKey: ['repo-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['navigation-hints'] }),
      ])
      setStatusMessage('Current view refreshed.')
    } finally {
      nativeRefreshPendingRef.current = false
      setRefreshingCurrentView(false)
    }
  }, [hasUnsavedChanges, queryClient])

  const persistDefaultReaderPreference = useCallback((status: DefaultReaderPreference['status'], message = '') => {
    const preference = writeDefaultReaderPromptPreference(status, message)
    setDefaultReaderPreference(preference)
    api.updateDefaultReaderPreference({
      status,
      askedAt: preference.askedAt,
      answeredAt: preference.answeredAt,
      message,
    }).catch(() => {})
    return preference
  }, [])

  const invalidateWorkspaceQueries = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['info'] }),
      queryClient.invalidateQueries({ queryKey: ['git-context'] }),
      queryClient.invalidateQueries({ queryKey: ['branches'] }),
      queryClient.invalidateQueries({ queryKey: ['tree'] }),
      queryClient.invalidateQueries({ queryKey: ['file'] }),
      queryClient.invalidateQueries({ queryKey: ['readme'] }),
      queryClient.invalidateQueries({ queryKey: ['directory-readme'] }),
      queryClient.invalidateQueries({ queryKey: ['sync'] }),
      queryClient.invalidateQueries({ queryKey: ['repo-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['navigation-hints'] }),
    ])
  }, [queryClient])

  const applyAcceptedOpenTarget = useCallback((target: Pick<StartupOpenTarget, 'rootPath' | 'selectedPath' | 'selectedPathType' | 'message'>): void => {
    setViewerRepoPath(target.rootPath)
    setSelectedPath(target.selectedPath)
    setSelectedPathType(target.selectedPathType)
    setSelectedPathLocalOnly(false)
    setShowRaw(false)
    setSidebarCollapsed(false)
    setStatusMessage(target.message || `Opened ${target.selectedPath}.`)
    setTreeRefreshToken((value) => value + 1)
    lastRevisionRef.current = ''
    if (target.selectedPath) {
      setRecentItems(rememberRecentItem({
        path: target.selectedPath,
        type: target.selectedPathType === 'dir' ? 'folder' : 'file',
        label: target.selectedPath.split('/').pop() || target.selectedPath,
        available: true,
      }))
    }
  }, [])

  const applyOpenFailure = useCallback((message: string, clearSelection: boolean): void => {
    if (clearSelection) {
      setSelectedPath('')
      setSelectedPathType('none')
      setSelectedPathLocalOnly(false)
      setShowRaw(false)
    }
    setStatusMessage(message)
  }, [])

  const applyLocalOpenResponse = useCallback(async (response: LocalActionResponse): Promise<void> => {
    if (!response.ok || !response.rootPath) {
      applyOpenFailure(response.message || response.error || 'GitLocal could not open that file.', false)
      return
    }

    applyAcceptedOpenTarget({
      rootPath: response.rootPath,
      selectedPath: response.selectedPath ?? '',
      selectedPathType: response.selectedPathType ?? 'none',
      message: response.message || (response.selectedPath ? `Opened ${response.selectedPath}.` : `Opened ${response.rootPath}.`),
    })
    await invalidateWorkspaceQueries()
  }, [applyAcceptedOpenTarget, applyOpenFailure, invalidateWorkspaceQueries])

  const openNativeFile = useCallback(async (path: string): Promise<void> => {
    if (!path.trim()) {
      applyOpenFailure('GitLocal could not open the requested file because macOS did not provide a path.', false)
      return
    }
    if (!confirmDiscardChanges()) return

    try {
      const response = await api.openRepository(path)
      await applyLocalOpenResponse(response)
    } catch (error) {
      applyOpenFailure(getErrorMessage(error, 'GitLocal could not open the requested file.'), false)
    }
  }, [applyLocalOpenResponse, applyOpenFailure])

  useEffect(() => {
    const handleNativeCommand = (event: Event) => {
      const detail = (event as NativeAppCommandEvent).detail
      const command = detail?.command
      if (command === 'find') {
        event.preventDefault()
        setNativeFindToken((value) => value + 1)
        return
      }

      if (command === 'refresh') {
        event.preventDefault()
        void refreshCurrentView()
        return
      }

      if (command === 'select-all-panel') {
        event.preventDefault()
        setNativeSelectAllToken((value) => value + 1)
        return
      }

      if (command === 'toggle-terminal') {
        event.preventDefault()
        terminalPanelRef.current?.toggleTerminal()
        return
      }

      if (command === 'toggle-dotfiles') {
        event.preventDefault()
        setHideDotfiles((value) => !value)
        return
      }

      if (command === 'set-tracked-visibility') {
        event.preventDefault()
        const target = detail?.message
        if (target === 'hide' || target === 'show' || target === 'only') {
          setGeneratedLocalVisibility(target)
        }
        return
      }

      if (command === 'default-reader-available') {
        event.preventDefault()
        setNativeDefaultReaderAvailable(true)
        return
      }

      if (command === 'default-reader-setup-succeeded') {
        event.preventDefault()
        setDefaultReaderSetupPending(false)
        persistDefaultReaderPreference('accepted', detail?.message ?? 'GitLocal is now the default Markdown reader.')
        setStatusMessage(detail?.message ?? 'GitLocal is now the default Markdown reader.')
        return
      }

      if (command === 'default-reader-setup-failed') {
        event.preventDefault()
        setDefaultReaderSetupPending(false)
        persistDefaultReaderPreference('failed', detail?.message ?? 'GitLocal could not update the default Markdown reader.')
        setStatusMessage(detail?.message ?? 'GitLocal could not update the default Markdown reader.')
        return
      }

      if (command === 'open-file') {
        event.preventDefault()
        void openNativeFile(detail?.path ?? '')
      }
    }

    window.addEventListener('gitlocal:native-command', handleNativeCommand)
    return () => window.removeEventListener('gitlocal:native-command', handleNativeCommand)
  }, [openNativeFile, persistDefaultReaderPreference, refreshCurrentView])

  // Cmd/Ctrl+R is unusable as a browser shortcut (every browser reserves it for page reload),
  // so the browser distribution's refresh shortcut is Ctrl+Alt+R instead. The native macOS app
  // keeps its own Cmd+R menu item, wired through the 'refresh' native-command branch above.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'r' || !event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) return
      event.preventDefault()
      void refreshCurrentView()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [refreshCurrentView])

  useEffect(() => {
    if (!nativeDefaultReaderAvailable) return
    api.getDefaultReaderPreference()
      .then((response) => {
        if (response.preference.status !== 'not-asked') {
          setDefaultReaderPreference(response.preference)
        }
      })
      .catch(() => {})
  }, [nativeDefaultReaderAvailable])

  useEffect(() => {
    const target = startupOpenTargetResponse?.target
    if (!startupOpenTargetFetched) return
    if (!target) {
      if (savedInitialViewerStateAppliedRef.current) return
      savedInitialViewerStateAppliedRef.current = true
      const saved = savedInitialViewerStateRef.current
      if (info && !info.pickerMode && saved.repoPath && info.path && saved.repoPath !== info.path) {
        setSelectedPath('')
        setSelectedPathType('none')
        setShowRaw(false)
        return
      }
      setSelectedPath(saved.path)
      setSelectedPathType(saved.pathType)
      setShowRaw(saved.raw)
      return
    }
    const targetKey = `${target.receivedAt}:${target.inputPath}:${target.status}`
    if (startupOpenTargetAppliedRef.current === targetKey) return
    startupOpenTargetAppliedRef.current = targetKey

    if (target.status === 'accepted' && target.rootPath) {
      applyAcceptedOpenTarget(target)
      void invalidateWorkspaceQueries()
      return
    }

    applyOpenFailure(target.message || 'GitLocal could not open the requested startup file.', true)
  }, [applyAcceptedOpenTarget, applyOpenFailure, info, invalidateWorkspaceQueries, startupOpenTargetFetched, startupOpenTargetResponse])

  useEffect(() => {
    if (startupFolderFallbackAppliedRef.current) return
    if (!info || info.pickerMode) return
    const fallbackReason = startupFolderResponse?.fallbackReason
    if (!fallbackReason) return
    startupFolderFallbackAppliedRef.current = true
    setStatusMessage(fallbackReason)
  }, [info, startupFolderResponse])

  const showDefaultReaderPrompt =
    nativeDefaultReaderAvailable
    && !defaultReaderSetupPending
    && (defaultReaderPreference.status === 'not-asked' || defaultReaderPreference.status === 'failed')

  function declineDefaultReaderSetup(): void {
    persistDefaultReaderPreference('declined', 'GitLocal will not become the default Markdown reader unless you choose it later.')
    setStatusMessage('GitLocal will not become the default Markdown reader unless you choose it later.')
  }

  function requestDefaultReaderSetup(): void {
    setDefaultReaderSetupPending(true)
    const posted = postNativeAppCommand('set-default-markdown-reader')
    if (!posted) {
      setDefaultReaderSetupPending(false)
      persistDefaultReaderPreference('failed', 'Default Markdown reader setup is only available in the macOS app.')
      setStatusMessage('Default Markdown reader setup is only available in the macOS app.')
    }
  }

  function confirmDiscardChanges(): boolean {
    if (!hasUnsavedChanges) return true
    return window.confirm('Discard your unsaved file changes?')
  }

  function handleSelectFile(path: string, localOnly = false): boolean {
    if (!confirmDiscardChanges()) return false
    setSelectedPath(path)
    setSelectedPathType(path ? 'file' : 'none')
    setSelectedPathLocalOnly(path ? localOnly : false)
    setStatusMessage('')
    setShowRaw(false)
    if (path) {
      setRecentItems(rememberRecentItem({
        path,
        type: 'file',
        label: path.split('/').pop() || path,
        available: true,
      }))
    }
    return true
  }

  function handleSelectFolder(path: string, localOnly = false): boolean {
    if (!confirmDiscardChanges()) return false
    setSelectedPath(path)
    setSelectedPathType(path ? 'dir' : 'none')
    setSelectedPathLocalOnly(path ? localOnly : false)
    setStatusMessage('')
    setShowRaw(false)
    if (path) {
      setRecentItems(rememberRecentItem({
        path,
        type: 'folder',
        label: path.split('/').pop() || path,
        available: true,
      }))
    }
    return true
  }

  function parentPathOf(path: string): string {
    const boundary = path.lastIndexOf('/')
    return boundary >= 0 ? path.slice(0, boundary) : ''
  }

  async function openChangedFiles(): Promise<void> {
    try {
      const response = await api.getChangedFiles(currentBranch, true)
      setChangedFiles(response)
      setRecentItems(rememberRecentChangedItems(response.items.slice(0, 8).map((item) => ({
        path: item.path,
        type: item.type === 'folder' ? 'folder' : 'file',
        label: item.name,
        available: item.canOpen,
        lastChangedAt: response.checkedAt,
      }))))
    } catch {
      setStatusMessage('GitLocal could not load changed files.')
    }
  }

  function openSearch(): void {
    setSearchPresentation('expanded')
  }

  function handleOpenChangedFile(item: ChangedFileItem): void {
    const localOnly = item.generatedLocalState !== 'tracked'
    if (!item.canOpen) {
      const parentPath = parentPathOf(item.path)
      handleSelectFolder(parentPath, false)
      setStatusMessage(`${item.path} is no longer available. GitLocal opened its parent folder.`)
      return
    }

    if (item.type === 'folder') {
      handleSelectFolder(item.path, localOnly)
      return
    }

    handleSelectFile(item.path, localOnly)
  }

  function handleSelectSearchResult(result: SearchResult) {
    const didNavigate = result.type === 'dir'
      ? handleSelectFolder(result.path, result.localOnly)
      : handleSelectFile(result.path, result.localOnly)
    if (!didNavigate) return
    setSearchPresentation('collapsed')
    setSearchQuery('')
  }

  async function handleBrowseParentFolder() {
    setPickerLoading(true)
    try {
      const result = await api.showParentFolder()
      if (result.ok) {
        resetViewerState()
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

  function handleNavigateParent(): void {
    if (visibleSelectedPathType !== 'none' && visibleSelectedPath) {
      handleSelectFolder(parentPathOf(visibleSelectedPath))
      return
    }
    handleBrowseParentRequest()
  }

  function relativeToViewerRoot(absolutePath: string): string {
    if (!viewerRepoPath || !absolutePath) return ''
    if (absolutePath === viewerRepoPath) return ''
    const prefix = viewerRepoPath.endsWith('/') ? viewerRepoPath : `${viewerRepoPath}/`
    return absolutePath.startsWith(prefix) ? absolutePath.slice(prefix.length) : ''
  }

  function handleNavigateHome(): void {
    if (!repoLocation?.repositoryRootPath) return
    handleSelectFolder(relativeToViewerRoot(repoLocation.repositoryRootPath))
  }

  function handleNavigateReadme(): void {
    if (!repoLocation?.repositoryRootPath || !repoLocation.homeReadmePath) return
    const rootRelative = relativeToViewerRoot(repoLocation.repositoryRootPath)
    const readmePath = rootRelative ? `${rootRelative}/${repoLocation.homeReadmePath}` : repoLocation.homeReadmePath
    handleSelectFile(readmePath)
  }

  function handleDismissSearch() {
    setSearchPresentation('collapsed')
    setSearchQuery('')
  }

  async function loadGitIdentitySupport(): Promise<void> {
    setGitIdentitySshKeysPending(true)
    setGitIdentitySshKeysMessage('')
    try {
      const keys = await api.getGitIdentitySshKeys()
      setGitIdentitySshKeys(keys.keys)
      setGitIdentitySshKeysMessage(keys.message)
    } catch (error) {
      setGitIdentitySshKeys([])
      setGitIdentitySshKeysMessage(getErrorMessage(error, 'Could not load SSH key options.'))
    } finally {
      setGitIdentitySshKeysPending(false)
    }
  }

  function openGitIdentityDialog(): void {
    const gitUser = info?.gitContext?.user
    setGitIdentityName(gitUser?.name ?? '')
    setGitIdentityEmail(gitUser?.email ?? '')
    setGitIdentitySshKeyPath(gitUser?.sshKeyPath ?? '')
    setGitIdentityError('')
    setGitIdentityDialogOpen(true)
    void loadGitIdentitySupport()
  }

  function closeGitIdentityDialog(): void {
    if (gitIdentityPending) return
    setGitIdentityDialogOpen(false)
    setGitIdentityError('')
  }

  async function saveGitIdentity(): Promise<void> {
    const name = gitIdentityName.trim()
    const email = gitIdentityEmail.trim()
    const sshKeyPath = gitIdentitySshKeyPath.trim()

    if ((name && !email) || (!name && email)) {
      setGitIdentityError('Git name and email must both be set or both be cleared.')
      return
    }

    setGitIdentityPending(true)
    setGitIdentityError('')

    try {
      if (sshKeyPath) {
        await api.validateGitIdentitySshKey(sshKeyPath)
      }
      const result = await api.updateGitIdentity({ name, email, sshKeyPath })
      queryClient.setQueryData<RepoInfo>(['info'], (previous) =>
        previous
          ? {
              ...previous,
              gitContext: {
                user: result.user as GitUserIdentity | null,
                remote: previous.gitContext?.remote ?? null,
              },
            }
          : previous,
      )
      queryClient.setQueryData(['git-context'], {
        user: result.user as GitUserIdentity | null,
        remote: info?.gitContext?.remote ?? null,
      })
      setGitIdentityDialogOpen(false)
      setStatusMessage(result.message)
    } catch (error) {
      setGitIdentityError(getErrorMessage(error, 'Could not update the repository-local Git identity.'))
    } finally {
      setGitIdentityPending(false)
    }
  }

  const canMutateFiles = Boolean(
    info
    && !hasRepoMismatch
    && (!info.isGitRepo || !info.currentBranch || currentBranch === info.currentBranch),
  )
  const repoSync: RepoSyncState | undefined = syncStatus?.repoSync
  const selectedPathSyncState: FileSyncState | 'none' = syncStatus?.pathSyncState ?? 'none'
  const trackedChangeCount = syncStatus?.trackedChangeCount ?? 0
  const untrackedChangeCount = syncStatus?.untrackedChangeCount ?? 0

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

  async function openFolderDeleteDialog(path: string): Promise<void> {
    if (!confirmDiscardChanges()) return
    setFolderDeletePending(true)
    setFolderDeleteError('')
    setFolderDeleteConfirmationName('')
    try {
      const preview = await api.getFolderDeletePreview(path)
      setFolderDeletePreview(preview)
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Could not inspect the folder before deletion.'))
    } finally {
      setFolderDeletePending(false)
    }
  }

  function closeFolderDeleteDialog(): void {
    if (folderDeletePending) return
    setFolderDeletePreview(null)
    setFolderDeleteConfirmationName('')
    setFolderDeleteError('')
  }

  async function submitFolderDelete(): Promise<void> {
    if (!folderDeletePreview) return
    setFolderDeletePending(true)
    setFolderDeleteError('')
    try {
      const result = await api.deleteFolder({
        path: folderDeletePreview.path,
        confirmationName: folderDeleteConfirmationName,
        previewFileCount: folderDeletePreview.fileCount ?? 0,
        previewFolderCount: folderDeletePreview.folderCount ?? 0,
        previewImpactToken: folderDeletePreview.impactToken ?? '',
      })
      setFolderDeletePreview(null)
      setFolderDeleteConfirmationName('')
      setHasUnsavedChanges(false)
      setSelectedPath(result.parentPath)
      setSelectedPathType(result.parentPath ? 'dir' : 'none')
      setSelectedPathLocalOnly(false)
      setShowRaw(false)
      setStatusMessage(result.message)
      setTreeRefreshToken((value) => value + 1)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tree'] }),
        queryClient.invalidateQueries({ queryKey: ['file'] }),
        queryClient.invalidateQueries({ queryKey: ['readme'] }),
        queryClient.invalidateQueries({ queryKey: ['directory-readme'] }),
        queryClient.invalidateQueries({ queryKey: ['sync'] }),
      ])
    } catch (error) {
      setFolderDeleteError(getErrorMessage(error, 'Could not delete the folder.'))
    } finally {
      setFolderDeletePending(false)
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

  async function submitBranchSwitch(resolution: 'commit' | 'discard'): Promise<void> {
    if (!branchSwitchState) return

    setBranchSwitchPending(true)
    setBranchSwitchError('')

    try {
      const result = await api.switchBranch({
        target: branchSwitchState.target,
        resolution,
        commitMessage: resolution === 'commit' ? branchSwitchCommitMessage : undefined,
      })

      if (result.ok && result.status === 'switched') {
        await finalizeBranchSwitch(branchSwitchState.target, result)
        return
      }

      if (result.status === 'confirmation-required') {
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

      if (result.status === 'confirmation-required') {
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

  if (isInfoError) {
    return (
      <ErrorScreen
        title="GitLocal couldn't load this workspace"
        description={getErrorMessage(infoError, 'Something went wrong while checking the current launch context.')}
        action={{
          label: 'Try again',
          onClick: () => {
            queryClient.invalidateQueries({ queryKey: ['info'] }).catch(() => {})
          },
        }}
      />
    )
  }

  const darkMode = theme === 'dark'

  if (info?.pickerMode) {
    return (
      <>
        <PickerPage darkMode={darkMode} onToggleTheme={(checked) => setTheme(checked ? 'dark' : 'light')} />
        <AppFooter version={info.version} />
      </>
    )
  }

  const startupOpenTargetPending = !startupOpenTargetFetched
  const startupOpenTargetBlocksSavedSelection = Boolean(startupOpenTargetResponse?.target && startupOpenTargetResponse.target.status !== 'accepted')
  const visibleSelectedPath = hasRepoMismatch || startupOpenTargetPending || startupOpenTargetBlocksSavedSelection ? '' : selectedPath
  const visibleSelectedPathType: ViewerPathType = hasRepoMismatch || startupOpenTargetPending || startupOpenTargetBlocksSavedSelection ? 'none' : selectedPathType
  const visibleSelectedPathLocalOnly = hasRepoMismatch || startupOpenTargetPending || startupOpenTargetBlocksSavedSelection ? false : selectedPathLocalOnly
  const visibleShowRaw = hasRepoMismatch ? false : showRaw
  const isWorkingTreeBranchSelected = !info?.currentBranch || currentBranch === info.currentBranch

  let emptyStateTitle: string | undefined
  let emptyStateDetail: string | undefined
  let emptyStateActions: LandingAction[] | undefined

  if (!visibleSelectedPath && !hasRepoMismatch) {
    if (isWorkingTreeBranchSelected && info?.rootEntryCount === 0) {
      emptyStateTitle = info?.isGitRepo
        ? 'This repository is ready for a first file'
        : 'This folder is ready for a first file'
      emptyStateDetail = info?.isGitRepo
        ? 'This repository looks newly initialized or empty, so GitLocal is showing a guided landing state instead of an empty document view.'
        : 'This folder does not have any visible files or folders yet, so GitLocal is showing a guided landing state instead of an empty document view.'
      emptyStateActions = canMutateFiles
        ? [{ label: 'Create first file', action: 'create-file' }]
        : undefined
    } else if (!isWorkingTreeBranchSelected) {
      emptyStateTitle = 'Browsing a non-current branch'
      emptyStateDetail = 'This branch opens in read-only mode so you can compare tree contents without changing your working tree.'
    }
  }

  // Clicking Parent Folder usually just browses to the containing folder within this repository
  // (handleNavigateParent -> handleSelectFolder), but from the repository root it instead leaves
  // the repository into the folder browser (handleBrowseParentRequest, gated by a confirmation
  // dialog). The tooltip previews which one is about to happen so the reload/leave-repo case
  // isn't a surprise; aria-label stays constant so the button's accessible name doesn't change.
  const parentFolderLeavesRepository = !(visibleSelectedPathType !== 'none' && visibleSelectedPath)

  return (
    <>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <header className="app-header sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--header-bg)] px-4 backdrop-blur">
          <span className="brand-lockup">
            <img className="brand-mark" src="/gitlocal-logo.svg" alt="" aria-hidden="true" />
            <span className="logo text-sm font-semibold text-[var(--foreground)]">GitLocal</span>
          </span>
          {info ? <span className="repo-name truncate text-sm text-[var(--muted-foreground)]">{info.name}</span> : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={Boolean(repoLocation?.atFilesystemRoot)}
              onClick={handleNavigateParent}
              aria-label="Parent Folder"
              title={parentFolderLeavesRepository ? 'Leave this repository and browse its parent folder' : 'Go to parent folder'}
            >
              <ParentFolderIcon />
              Parent Folder
            </Button>
            <Button
              type="button"
              variant="highlight"
              size="sm"
              onClick={() => terminalPanelRef.current?.toggleTerminal()}
              aria-label="Toggle terminal"
              title="Toggle terminal (Ctrl+`)"
            >
              <TerminalIcon />
              Terminal
            </Button>
            {!isRunningInNativeApp() ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" aria-label="View options">
                    <ViewOptionsIcon />
                    View options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="gap-2"
                    disabled={refreshingCurrentView}
                    onSelect={() => { void refreshCurrentView() }}
                  >
                    <RefreshIcon spinning={refreshingCurrentView} />
                    {refreshingCurrentView ? 'Refreshing...' : 'Refresh'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={hideDotfiles}
                    onCheckedChange={(checked) => setHideDotfiles(checked === true)}
                  >
                    Hide Dotfiles
                  </DropdownMenuCheckboxItem>
                  {info?.isGitRepo ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={generatedLocalVisibility}
                        onValueChange={(value) => setGeneratedLocalVisibility(value as GeneratedLocalVisibility)}
                      >
                        <DropdownMenuRadioItem value="hide">Tracked</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="show">All</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="only">Local</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <label className="inline-flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] shadow-sm">
              <ThemeIcon darkMode={darkMode} />
              <span>{darkMode ? 'Dark theme' : 'Light theme'}</span>
              <Switch
                checked={darkMode}
                aria-label="Toggle dark theme"
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </label>
          </div>
        </header>

        <div className="app-body flex min-h-0 flex-1 pb-8">
          {sidebarCollapsed ? (
            <aside className="sidebar-rail flex w-14 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]" aria-label="collapsed navigation">
              <div className="sidebar-rail-toolbar flex flex-col items-center gap-2 p-3">
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
            <aside className="sidebar relative flex w-[300px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]">
              <button
                type="button"
                className="panel-icon-button sidebar-float-toggle absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] shadow-sm backdrop-blur transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Collapse navigation"
                title="Collapse navigation"
                onClick={() => setSidebarCollapsed(true)}
              >
                <PanelToggleIcon collapsed={false} />
              </button>
              <div className="min-h-0 flex-1 overflow-hidden px-2 pb-3 pt-3">
                <FileTree
                  branch={currentBranch}
                  refreshToken={treeRefreshToken}
                  selectedPath={visibleSelectedPath}
                  selectedPathType={visibleSelectedPathType}
                  isGitRepo={info?.isGitRepo}
                  generatedLocalVisibility={generatedLocalVisibility}
                  hideDotfiles={hideDotfiles}
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

          <main className="content-area flex min-h-0 min-w-0 flex-1 flex-col">
            {showDefaultReaderPrompt ? (
              <div className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)]" role="region" aria-label="Default Markdown reader setup">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Open Markdown files with GitLocal?</p>
                    <p className="text-[var(--muted-foreground)]">Double-clicked .md files can open their folder in GitLocal and show the file in preview.</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="secondary" onClick={declineDefaultReaderSetup}>
                      Not now
                    </Button>
                    <Button type="button" onClick={requestDefaultReaderSetup}>
                      Set as default
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
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
                repoSummary={repoSummary}
                trackedChangeCount={trackedChangeCount}
                untrackedChangeCount={untrackedChangeCount}
                activePathNotice={syncStatus?.activePathNotice}
                changedFiles={changedFiles}
                onBranchChange={(nextBranch) => {
                  void handleBranchChange(nextBranch)
                }}
                onEditGitIdentity={info?.isGitRepo ? openGitIdentityDialog : undefined}
                onOpenSearch={info?.isGitRepo ? openSearch : undefined}
                onOpenChangedFiles={info?.isGitRepo ? () => { void openChangedFiles() } : undefined}
                onCloseChangedFiles={() => setChangedFiles(null)}
                onOpenChangedFile={handleOpenChangedFile}
                branchDisabled={branchSwitchPending}
                onNavigateHome={info?.isGitRepo ? handleNavigateHome : undefined}
                repoLocation={repoLocation}
                onNavigateReadme={info?.isGitRepo ? handleNavigateReadme : undefined}
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
                  />
                }
              />

              {searchPresentation === 'expanded' ? (
                <div className="search-layer" data-testid="search-layer">
                  <SearchPanel
                    branch={currentBranch}
                    query={searchQuery}
                    mode={searchMode}
                    caseSensitive={searchCaseSensitive}
                    rootPath={searchRootPath}
                    currentFolderPath={visibleSelectedPathType === 'dir' ? visibleSelectedPath : parentPathOf(visibleSelectedPath)}
                    contentKinds={searchContentKind}
                    trackedMode={searchTrackedMode}
                    limit={searchLimit}
                    autoFocus
                    onSearch={({ query, mode, caseSensitive, rootPath, contentKinds, trackedMode, limit }) => {
                      setSearchPresentation('expanded')
                      setSearchQuery(query)
                      setSearchMode(mode)
                      setSearchCaseSensitive(caseSensitive)
                      setSearchRootPath(rootPath)
                      setSearchContentKind(contentKinds)
                      setSearchTrackedMode(trackedMode)
                      setSearchLimit(limit)
                    }}
                    onSelectResult={handleSelectSearchResult}
                    onDismiss={handleDismissSearch}
                  />
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-hidden">
                {startupOpenTargetBlocksSavedSelection ? (
                  <div className="content-panel" role="alert">
                    <div className="content-empty">
                      <h2 className="content-empty-title">Could not open the requested file</h2>
                      <p className="content-empty-detail">{startupOpenTargetResponse?.target?.message ?? statusMessage}</p>
                    </div>
                  </div>
                ) : (
                  <ContentPanel
                    canMutateFiles={canMutateFiles}
                    refreshToken={treeRefreshToken}
                    selectedPath={visibleSelectedPath}
                    selectedPathType={visibleSelectedPathType}
                    selectedPathLocalOnly={visibleSelectedPathLocalOnly}
                    selectedPathSyncState={selectedPathSyncState}
                    nativeFindToken={nativeFindToken}
                    nativeSelectAllToken={nativeSelectAllToken}
                    branch={currentBranch}
                    isGitRepo={info?.isGitRepo}
                    repoSummary={repoSummary}
                    navigationHints={navigationHints}
                    recentItems={recentItems}
                    generatedLocalVisibility={generatedLocalVisibility}
                    hideDotfiles={hideDotfiles}
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
                    onCreateFolderComplete={(event) => { void handleMutationComplete(event) }}
                    onDeleteFolder={(path) => { void openFolderDeleteDialog(path) }}
                    emptyStateTitle={emptyStateTitle}
                    emptyStateDetail={emptyStateDetail}
                    emptyStateActions={emptyStateActions}
                    raw={visibleShowRaw}
                    onRawChange={setShowRaw}
                    onStatusMessage={setStatusMessage}
                  />
                )}
              </div>
            </div>
          </main>
        </div>

        <TerminalPanel ref={terminalPanelRef} contextPath={visibleSelectedPath} contextType={visibleSelectedPathType} />

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
        sshKeyPath={gitIdentitySshKeyPath}
        sshKeys={gitIdentitySshKeys}
        sshKeysMessage={gitIdentitySshKeysMessage}
        sshKeysPending={gitIdentitySshKeysPending}
        onOpenChange={(open) => {
          if (!gitIdentityPending) setGitIdentityDialogOpen(open)
        }}
        onNameChange={setGitIdentityName}
        onEmailChange={setGitIdentityEmail}
        onSshKeyPathChange={setGitIdentitySshKeyPath}
        onCancel={closeGitIdentityDialog}
        onSave={() => { void saveGitIdentity() }}
      />

      <FolderDeleteDialog
        open={Boolean(folderDeletePreview)}
        pending={folderDeletePending}
        error={folderDeleteError}
        path={folderDeletePreview?.path ?? ''}
        name={folderDeletePreview?.name ?? ''}
        fileCount={folderDeletePreview?.fileCount ?? 0}
        folderCount={folderDeletePreview?.folderCount ?? 0}
        message={folderDeletePreview?.message ?? ''}
        confirmationName={folderDeleteConfirmationName}
        onOpenChange={(open) => {
          if (!open) closeFolderDeleteDialog()
        }}
        onConfirmationNameChange={setFolderDeleteConfirmationName}
        onCancel={closeFolderDeleteDialog}
        onDelete={() => { void submitFolderDelete() }}
      />
    </>
  )
}
