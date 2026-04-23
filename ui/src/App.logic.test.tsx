import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { SyncStatus } from './types'

const readViewerState = vi.fn()
const writeViewerState = vi.fn()
const applyTheme = vi.fn()
const writeStoredTheme = vi.fn()
const getInitialTheme = vi.fn(() => 'light')

vi.mock('./services/viewerState', () => ({
  readViewerState: () => readViewerState(),
  writeViewerState: (...args: unknown[]) => writeViewerState(...args),
}))

vi.mock('./services/theme', () => ({
  applyTheme: (...args: unknown[]) => applyTheme(...args),
  writeStoredTheme: (...args: unknown[]) => writeStoredTheme(...args),
  getInitialTheme: () => getInitialTheme(),
}))

vi.mock('./components/Breadcrumb/Breadcrumb', () => ({
  default: ({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) => (
    <button type="button" onClick={() => onNavigate('docs')} data-testid="breadcrumb">
      breadcrumb:{path}
    </button>
  ),
}))

vi.mock('./components/FileTree/FileTree', () => ({
  default: ({ onSelect }: { onSelect: (path: string, type: 'file' | 'dir', localOnly: boolean) => void }) => (
    <div>
      <button type="button" onClick={() => onSelect('README.md', 'file', false)}>tree-file</button>
      <button type="button" onClick={() => onSelect('docs', 'dir', true)}>tree-dir</button>
    </div>
  ),
}))

vi.mock('./components/ContentPanel/ContentPanel', () => ({
  default: (props: {
    canMutateFiles: boolean
    selectedPath: string
    selectedPathType: string
    selectedPathLocalOnly?: boolean
    selectedPathSyncState?: string
    raw?: boolean
    emptyStateTitle?: string
    onBrowseParent?: () => void
    onDirtyChange?: (value: boolean) => void
    onMutationComplete?: (event: { nextPath: string; nextPathType: 'file' | 'dir' | 'none'; result: { message: string } }) => void
    onStatusMessage?: (message: string) => void
    onOpenPath: (path: string, type: 'file' | 'dir', localOnly: boolean) => void
  }) => (
    <div>
      <div data-testid="content-props">
        {JSON.stringify({
          canMutateFiles: props.canMutateFiles,
          selectedPath: props.selectedPath,
          selectedPathType: props.selectedPathType,
          selectedPathLocalOnly: props.selectedPathLocalOnly,
          selectedPathSyncState: props.selectedPathSyncState,
          raw: props.raw,
          emptyStateTitle: props.emptyStateTitle ?? '',
        })}
      </div>
      <button type="button" onClick={() => props.onBrowseParent?.()}>request-browse-parent</button>
      <button type="button" onClick={() => props.onDirtyChange?.(true)}>mark-dirty</button>
      <button type="button" onClick={() => props.onDirtyChange?.(false)}>clear-dirty</button>
      <button
        type="button"
        onClick={() => props.onMutationComplete?.({
          nextPath: 'docs',
          nextPathType: 'dir',
          result: { message: 'mutation complete' },
        })}
      >
        mutate-file
      </button>
      <button type="button" onClick={() => props.onStatusMessage?.('child status')}>child-status</button>
      <button type="button" onClick={() => props.onOpenPath('notes.txt', 'file', true)}>open-path</button>
    </div>
  ),
}))

vi.mock('./components/RepoContext/RepoContextHeader', () => ({
  default: (props: {
    branch: string
    branchDisabled?: boolean
    commitDisabled?: boolean
    syncDisabled?: boolean
    syncActionLabel?: string
    onBranchChange: (branch: string) => void
    onEditGitIdentity?: () => void
    onCommitChanges?: () => void
    onSyncWithRemote?: () => void
    onOpenSearch?: () => void
    branchSwitchDialog?: React.ReactNode
  }) => (
    <div>
      <div data-testid="header-props">
        {JSON.stringify({
          branch: props.branch,
          branchDisabled: props.branchDisabled,
          commitDisabled: props.commitDisabled,
          syncDisabled: props.syncDisabled,
          syncActionLabel: props.syncActionLabel,
        })}
      </div>
      <button type="button" onClick={() => props.onBranchChange('release')}>switch-branch</button>
      <button type="button" onClick={() => props.onEditGitIdentity?.()}>open-identity</button>
      <button type="button" onClick={() => props.onCommitChanges?.()}>open-commit</button>
      <button type="button" onClick={() => props.onSyncWithRemote?.()}>sync-remote</button>
      <button type="button" onClick={() => props.onOpenSearch?.()}>open-search</button>
      {props.branchSwitchDialog}
    </div>
  ),
}))

vi.mock('./components/Search/SearchPanel', () => ({
  default: (props: {
    query: string
    onQueryChange: (query: string) => void
    onDismiss: () => void
    onSelectResult: (result: { path: string; type: 'file' | 'dir'; matchType: 'name'; localOnly: boolean }) => void
  }) => (
    <div data-testid="search-panel">
      <span>query:{props.query}</span>
      <button type="button" onClick={() => props.onQueryChange('docs')}>change-search</button>
      <button
        type="button"
        onClick={() => props.onSelectResult({ path: 'docs', type: 'dir', matchType: 'name', localOnly: true })}
      >
        select-search
      </button>
      <button type="button" onClick={props.onDismiss}>dismiss-search</button>
    </div>
  ),
}))

vi.mock('./components/Picker/PickerPage', () => ({
  default: () => <div>picker page</div>,
}))

vi.mock('./components/AppFooter', () => ({
  default: ({ version }: { version: string }) => <div>footer:{version}</div>,
}))

vi.mock('./services/api', () => ({
  api: {
    getInfo: vi.fn(),
    getReadme: vi.fn(),
    getSyncStatus: vi.fn(),
    showParentPicker: vi.fn(),
    getTree: vi.fn(),
    getBranches: vi.fn(),
    getCommits: vi.fn(),
    commitChanges: vi.fn(),
    getFile: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
    getSearchResults: vi.fn(),
    getPickBrowse: vi.fn(),
    submitPick: vi.fn(),
    switchBranch: vi.fn(),
    syncWithRemote: vi.fn(),
    updateGitIdentity: vi.fn(),
    createPickFolder: vi.fn(),
    initPickGit: vi.fn(),
    clonePickRepo: vi.fn(),
  },
}))

import { api } from './services/api'

function buildInfo(overrides: Record<string, unknown> = {}) {
  return {
    name: 'repo',
    path: '/tmp/repo',
    currentBranch: 'main',
    isGitRepo: true,
    pickerMode: false,
    version: '0.5.2',
    hasCommits: true,
    rootEntryCount: 2,
    gitContext: {
      user: {
        name: 'Local User',
        email: 'local@example.com',
        source: 'local' as const,
      },
      remote: {
        name: 'origin',
        fetchUrl: 'git@github.com:ehud-am/gitlocal.git',
        webUrl: 'https://github.com/ehud-am/gitlocal',
        selectionReason: 'origin',
      },
    },
    ...overrides,
  }
}

function buildSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    branch: 'main',
    repoPath: '/tmp/repo',
    workingTreeRevision: 'rev-1',
    treeStatus: 'unchanged',
    fileStatus: 'unchanged',
    currentPath: '',
    resolvedPath: '',
    currentPathType: 'none',
    resolvedPathType: 'none',
    pathSyncState: 'none',
    trackedChangeCount: 0,
    untrackedChangeCount: 0,
    repoSync: {
      mode: 'up-to-date',
      aheadCount: 0,
      behindCount: 0,
      hasUpstream: true,
      upstreamRef: 'origin/main',
      remoteName: 'origin',
    },
    statusMessage: '',
    checkedAt: new Date().toISOString(),
    ...overrides,
  }
}

function buildViewerState(overrides: Record<string, unknown> = {}) {
  return {
    repoPath: '',
    branch: 'main',
    path: '',
    pathType: 'none',
    raw: false,
    sidebarCollapsed: false,
    searchPresentation: 'collapsed',
    searchQuery: '',
    ...overrides,
  }
}

function renderApp() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchInterval: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      writable: true,
    })

    readViewerState.mockReturnValue(buildViewerState())
    vi.mocked(api.getInfo).mockResolvedValue(buildInfo())
    vi.mocked(api.getBranches).mockResolvedValue([
      { name: 'main', displayName: 'main', scope: 'local', hasLocalCheckout: true, isCurrent: true },
      { name: 'release', displayName: 'release', scope: 'local', hasLocalCheckout: true, isCurrent: false },
    ])
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus())
    vi.mocked(api.showParentPicker).mockResolvedValue({ ok: false, error: '', message: 'Parent unavailable.' })
    vi.mocked(api.switchBranch).mockResolvedValue({
      ok: false,
      status: 'blocked',
      message: 'Switch blocked.',
    })
    vi.mocked(api.commitChanges).mockResolvedValue({
      ok: true,
      status: 'committed',
      message: 'Committed.',
      commitHash: 'abc1234567',
      shortHash: 'abc1234',
    })
    vi.mocked(api.syncWithRemote).mockResolvedValue({
      ok: true,
      status: 'up-to-date',
      message: 'Already up to date.',
      aheadCount: 0,
      behindCount: 0,
    })
    vi.mocked(api.updateGitIdentity).mockResolvedValue({
      ok: true,
      message: 'Identity saved.',
      user: {
        name: 'Local User',
        email: 'local@example.com',
        source: 'local',
      },
    })
  })

  it('clears visible file context when the loaded repository differs from stored viewer state', async () => {
    readViewerState.mockReturnValue(buildViewerState({
      repoPath: '/tmp/other',
      path: 'README.md',
      pathType: 'file',
      raw: true,
    }))

    renderApp()

    expect(await screen.findByText(/opened a different repository/i)).toBeInTheDocument()
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":""')
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')
    expect(screen.getByTestId('content-props')).toHaveTextContent('"raw":false')
  })

  it('shows the empty repository and read-only branch landing states', async () => {
    readViewerState.mockReturnValue(buildViewerState())
    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({
      currentBranch: 'main',
      rootEntryCount: 0,
    }))

    renderApp()

    await screen.findByTestId('content-props')
    expect(screen.getByTestId('content-props')).toHaveTextContent('This repository is ready for a first file')

    readViewerState.mockReturnValue(buildViewerState({ branch: 'release' }))
    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({ currentBranch: 'main', rootEntryCount: 2 }))
    vi.mocked(api.getBranches).mockResolvedValueOnce([
      { name: 'main', displayName: 'main', scope: 'local', hasLocalCheckout: true, isCurrent: true },
      { name: 'release', displayName: 'release', scope: 'local', hasLocalCheckout: true, isCurrent: false },
    ])

    renderApp()

    await waitFor(() => {
      const contentPanels = screen.getAllByTestId('content-props')
      expect(contentPanels[contentPanels.length - 1]).toHaveTextContent('Browsing a non-current branch')
    })
  })

  it('clears an unavailable branch and handles repositories with no commits', async () => {
    readViewerState.mockReturnValue(buildViewerState({ branch: 'missing' }))
    vi.mocked(api.getBranches).mockResolvedValueOnce([
      { name: 'main', displayName: 'main', scope: 'local', hasLocalCheckout: true, isCurrent: true },
    ])

    renderApp()
    expect(await screen.findByText(/saved branch because it is not available/i)).toBeInTheDocument()

    readViewerState.mockReturnValue(buildViewerState({ branch: 'feature' }))
    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({ currentBranch: '', hasCommits: false }))
    vi.mocked(api.getBranches).mockResolvedValueOnce([])

    renderApp()
    expect(await screen.findByText(/repository has no commits yet/i)).toBeInTheDocument()
  })

  it('initializes the current branch from repo info, supports picker and non-repo screens, and toggles the sidebar', async () => {
    readViewerState.mockReturnValue(buildViewerState({ branch: '', sidebarCollapsed: true }))

    const initialRender = renderApp()

    await waitFor(() => {
      expect(screen.getByTestId('header-props')).toHaveTextContent('"branch":"main"')
    })
    expect(screen.getByLabelText(/collapsed navigation/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /expand navigation/i }))
    expect(await screen.findByRole('button', { name: /collapse navigation/i })).toBeInTheDocument()
    initialRender.unmount()

    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({ pickerMode: true, isGitRepo: false, path: '/tmp' }))
    const pickerRender = renderApp()
    expect(await screen.findByText('picker page')).toBeInTheDocument()
    pickerRender.unmount()

    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({ isGitRepo: false }))
    renderApp()
    expect(await screen.findByRole('heading', { name: /not a git repository/i })).toBeInTheDocument()
  })

  it('expands search from saved state, keyboard shortcut, selection, and dismissal', async () => {
    readViewerState.mockReturnValue(buildViewerState({ searchQuery: 'guide' }))

    renderApp()

    expect(await screen.findByTestId('search-panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'dismiss-search' }))
    await waitFor(() => {
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: 'f', metaKey: true })
    expect(await screen.findByTestId('search-panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'select-search' }))

    await waitFor(() => {
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"docs"')
    })
    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
  })

  it('honors unsaved-change confirmations for navigation and repository boundary actions', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'mark-dirty' }))
    fireEvent.click(screen.getByRole('button', { name: 'tree-file' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":""')

    fireEvent.click(screen.getByRole('button', { name: 'request-browse-parent' }))
    expect(screen.queryByRole('heading', { name: /leave this repository/i })).not.toBeInTheDocument()
  })

  it('validates git identity, commit message, and remote sync failures', async () => {
    vi.mocked(api.syncWithRemote).mockRejectedValueOnce({ message: 'Remote sync failed hard.' })

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'open-identity' }))
    fireEvent.change(screen.getByRole('textbox', { name: /git user name/i }), { target: { value: '' } })
    fireEvent.change(screen.getByRole('textbox', { name: /git user email/i }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save identity/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/git name is required/i)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    fireEvent.click(screen.getByRole('button', { name: 'open-commit' }))
    fireEvent.change(screen.getByRole('textbox', { name: /commit message/i }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /commit changes/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a commit message/i)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    fireEvent.click(screen.getByRole('button', { name: 'sync-remote' }))
    expect(await screen.findByText(/remote sync failed hard/i)).toBeInTheDocument()
  })

  it('handles successful parent browsing, file mutations, tree selection, and child status updates', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload },
      writable: true,
    })
    vi.mocked(api.showParentPicker).mockResolvedValueOnce({ ok: true, error: '', message: '' })

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'request-browse-parent' }))
    fireEvent.click(screen.getByRole('button', { name: /open parent folder/i }))
    await waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: 'tree-dir' }))
    await waitFor(() => {
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"docs"')
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathLocalOnly":true')
    })

    fireEvent.click(screen.getByRole('button', { name: 'open-path' }))
    await waitFor(() => {
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"notes.txt"')
    })

    fireEvent.click(screen.getByRole('button', { name: 'mutate-file' }))
    await waitFor(() => {
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"docs"')
      expect(screen.getByText(/mutation complete/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'child-status' }))
    expect(await screen.findByText(/child status/i)).toBeInTheDocument()
  })

  it('shows the repository-boundary dialog and surfaces parent-picker errors', async () => {
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'request-browse-parent' }))
    expect(await screen.findByRole('heading', { name: /leave this repository/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /open parent folder/i }))

    expect(await screen.findByText(/parent unavailable/i)).toBeInTheDocument()
  })

  it('handles blocked branch switches and second confirmation delete flows', async () => {
    vi.mocked(api.switchBranch)
      .mockResolvedValueOnce({
        ok: false,
        status: 'blocked',
        message: 'Switch blocked.',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 'second-confirmation-required',
        message: 'Delete blockers first.',
        trackedChangeCount: 0,
        untrackedChangeCount: 1,
        blockingPaths: ['scratch.txt'],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 'switched',
        message: 'Switched to release.',
        currentBranch: 'release',
      })

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByText(/switch blocked/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByRole('heading', { name: /delete untracked files/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /delete files and switch/i }))

    await waitFor(() => {
      expect(screen.getByTestId('header-props')).toHaveTextContent('"branch":"release"')
    })
    expect(await screen.findByText(/switched to release/i)).toBeInTheDocument()
  })

  it('handles direct successful switches and sync-status refreshes after a branch change', async () => {
    vi.mocked(api.getSyncStatus)
      .mockResolvedValueOnce(buildSyncStatus({ currentPath: '', currentPathType: 'none' }))
      .mockResolvedValueOnce(buildSyncStatus({
        currentPath: 'README.md',
        currentPathType: 'missing',
        resolvedPath: 'docs',
        resolvedPathType: 'dir',
        statusMessage: 'Moved to docs.',
      }))
    vi.mocked(api.switchBranch)
      .mockResolvedValueOnce({
        ok: true,
        status: 'switched',
        message: 'Switched cleanly.',
        currentBranch: 'release',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 'confirmation-required',
        message: 'Need confirmation.',
        trackedChangeCount: 1,
        untrackedChangeCount: 0,
        blockingPaths: ['README.md'],
        suggestedCommitMessage: 'WIP before switching to release',
      })
      .mockRejectedValueOnce(new Error('branch blew up'))

    readViewerState.mockReturnValue(buildViewerState({ path: 'README.md', pathType: 'file' }))
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByText(/switched cleanly/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"docs"')
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"dir"')
    })
    expect(screen.getByText(/moved you to docs/i)).toBeInTheDocument()
  })

  it('shows the branch-switch confirmation dialog and allows canceling it', async () => {
    vi.mocked(api.switchBranch).mockResolvedValueOnce({
      ok: false,
      status: 'confirmation-required',
      message: 'Need confirmation.',
      trackedChangeCount: 1,
      untrackedChangeCount: 0,
      blockingPaths: ['README.md'],
      suggestedCommitMessage: 'WIP before switching to release',
    })

    readViewerState.mockReturnValue(buildViewerState({ path: 'README.md', pathType: 'file' }))
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByRole('heading', { name: /switch branches/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /commit message/i })).toHaveValue('WIP before switching to release')
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(await screen.findByText(/branch switch canceled/i)).toBeInTheDocument()
  })

  it('surfaces unexpected branch-switch errors', async () => {
    vi.mocked(api.switchBranch).mockRejectedValueOnce(new Error('branch blew up'))

    readViewerState.mockReturnValue(buildViewerState({ path: 'README.md', pathType: 'file' }))
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByText(/branch blew up/i)).toBeInTheDocument()
  })
})
