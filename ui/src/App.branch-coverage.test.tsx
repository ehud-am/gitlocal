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
  default: ({ onNavigate }: { onNavigate: (path: string) => void }) => (
    <div>
      <button type="button" onClick={() => onNavigate('')}>breadcrumb-root</button>
      <button type="button" onClick={() => onNavigate('docs')}>breadcrumb-docs</button>
    </div>
  ),
}))

vi.mock('./components/FileTree/FileTree', () => ({
  default: ({ onSelect }: { onSelect: (path: string, type: 'file' | 'dir', localOnly: boolean) => void }) => (
    <div>
      <button type="button" onClick={() => onSelect('', 'file', true)}>tree-empty-file</button>
      <button type="button" onClick={() => onSelect('', 'dir', true)}>tree-empty-dir</button>
      <button type="button" onClick={() => onSelect('notes.txt', 'file', false)}>tree-file</button>
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
      <button type="button" onClick={() => props.onOpenPath('', 'file', true)}>open-empty-file</button>
      <button type="button" onClick={() => props.onOpenPath('', 'dir', true)}>open-empty-dir</button>
      <button type="button" onClick={() => props.onOpenPath('notes.txt', 'file', false)}>open-file</button>
      <button type="button" onClick={() => props.onOpenPath('docs', 'dir', true)}>open-dir</button>
    </div>
  ),
}))

vi.mock('./components/RepoContext/RepoContextHeader', () => ({
  default: (props: {
    branch: string
    onBranchChange: (branch: string) => void
    onEditGitIdentity?: () => void
    onCommitChanges?: () => void
    onSyncWithRemote?: () => void
    onOpenSearch?: () => void
    branchSwitchDialog?: React.ReactNode
  }) => (
    <div>
      <div data-testid="header-branch">{props.branch}</div>
      <button type="button" onClick={() => props.onBranchChange(props.branch)}>switch-same-branch</button>
      <button type="button" onClick={() => props.onBranchChange('release')}>switch-branch</button>
      <button type="button" onClick={() => props.onEditGitIdentity?.()}>open-identity</button>
      <button type="button" onClick={() => props.onCommitChanges?.()}>open-commit</button>
      <button type="button" onClick={() => props.onSyncWithRemote?.()}>sync-remote</button>
      <button type="button" onClick={() => props.onOpenSearch?.()}>open-search</button>
      {props.branchSwitchDialog}
    </div>
  ),
}))

vi.mock('./components/RepoContext/BranchSwitchDialog', () => ({
  default: (props: {
    open: boolean
    commitMessage: string
    errorMessage: string
    onCommitMessageChange: (message: string) => void
    onCancel: () => void
    onCommit: () => void
    onDiscard: () => void
  }) => (
    <div data-testid={props.open ? 'branch-switch-dialog' : 'branch-switch-dialog-closed'}>
      {props.open ? (
        <>
          <input
            aria-label="Branch switch commit message"
            value={props.commitMessage}
            onChange={(event) => props.onCommitMessageChange(event.target.value)}
          />
          <div>{props.errorMessage}</div>
          <button type="button" onClick={props.onCancel}>cancel-branch-switch</button>
        </>
      ) : null}
      <button type="button" onClick={props.onCommit}>commit-branch-switch</button>
      <button type="button" onClick={props.onDiscard}>discard-branch-switch</button>
    </div>
  ),
}))

vi.mock('./components/Search/SearchPanel', () => ({
  default: (props: {
    query: string
    onDismiss: () => void
    onSearch: (value: { query: string; mode: 'name' | 'content' | 'both'; caseSensitive: boolean }) => void
    onSelectResult: (result: { path: string; type: 'file' | 'dir'; localOnly: boolean; matchType: 'name' }) => void
  }) => (
    <div data-testid="search-panel">
      <span>{props.query}</span>
      <button type="button" onClick={() => props.onSearch({ query: 'query-from-panel', mode: 'both', caseSensitive: false })}>change-search-query</button>
      <button type="button" onClick={() => props.onSelectResult({ path: '', type: 'dir', localOnly: true, matchType: 'name' })}>select-empty-dir</button>
      <button type="button" onClick={() => props.onSelectResult({ path: 'notes.txt', type: 'file', localOnly: false, matchType: 'name' })}>select-file-result</button>
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

vi.mock('./components/AppDialogs', () => ({
  RepoBoundaryDialog: (props: {
    open: boolean
    pending: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
  }) => (
    props.open ? (
      <div data-testid="repo-boundary-dialog">
        <span>{props.pending ? 'pending' : 'idle'}</span>
        <button type="button" onClick={() => props.onOpenChange(false)}>close-boundary</button>
        <button type="button" onClick={props.onConfirm}>confirm-boundary</button>
      </div>
    ) : null
  ),
  GitIdentityDialog: (props: {
    open: boolean
    pending: boolean
    error: string
    name: string
    email: string
    onOpenChange: (open: boolean) => void
    onNameChange: (value: string) => void
    onEmailChange: (value: string) => void
    onSave: () => void
  }) => (
    props.open ? (
      <div data-testid="identity-dialog">
        <span>{props.error}</span>
        <input aria-label="Git user name" value={props.name} onChange={(event) => props.onNameChange(event.target.value)} />
        <input aria-label="Git user email" value={props.email} onChange={(event) => props.onEmailChange(event.target.value)} />
        <button type="button" onClick={() => props.onOpenChange(false)}>close-identity</button>
        <button type="button" onClick={props.onSave}>save-identity</button>
        <span>{props.pending ? 'pending' : 'idle'}</span>
      </div>
    ) : null
  ),
  CommitChangesDialog: (props: {
    open: boolean
    pending: boolean
    error: string
    message: string
    onOpenChange: (open: boolean) => void
    onMessageChange: (value: string) => void
    onCommit: () => void
  }) => (
    props.open ? (
      <div data-testid="commit-dialog">
        <span>{props.error}</span>
        <input aria-label="Commit message" value={props.message} onChange={(event) => props.onMessageChange(event.target.value)} />
        <button type="button" onClick={() => props.onOpenChange(false)}>close-commit</button>
        <button type="button" onClick={props.onCommit}>submit-commit</button>
        <span>{props.pending ? 'pending' : 'idle'}</span>
      </div>
    ) : null
  ),
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
    searchMode: 'both',
    searchCaseSensitive: false,
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

describe('App branch coverage', () => {
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

  it('reconciles missing paths, clears raw mode, and warns before unload when dirty', async () => {
    readViewerState.mockReturnValue(buildViewerState({
      path: 'README.md',
      pathType: 'file',
      raw: true,
    }))
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      currentPath: 'README.md',
      currentPathType: 'missing',
      resolvedPath: '',
      resolvedPathType: 'missing',
      statusMessage: 'README.md moved away.',
    }))

    renderApp()

    await waitFor(() => {
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":""')
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')
      expect(screen.getByTestId('content-props')).toHaveTextContent('"raw":false')
    })
    expect(screen.getByText(/readme\.md moved away/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'mark-dirty' }))
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
    Object.defineProperty(event, 'returnValue', { value: undefined, writable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(event.returnValue).toBe('')
  })

  it('reconciles missing paths into a directory fallback when the replacement still exists', async () => {
    readViewerState.mockReturnValue(buildViewerState({
      path: 'README.md',
      pathType: 'file',
      raw: true,
    }))
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      currentPath: 'README.md',
      currentPathType: 'missing',
      resolvedPath: 'docs',
      resolvedPathType: 'dir',
      statusMessage: 'README moved into docs.',
    }))

    renderApp()

    await waitFor(() => {
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"docs"')
      expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"dir"')
      expect(screen.getByTestId('content-props')).toHaveTextContent('"raw":false')
    })
  })

  it('supports ctrl+f, ignores non-shortcuts, and keeps picker mode out of search flow', async () => {
    const standard = renderApp()

    fireEvent.keyDown(window, { key: 'x', ctrlKey: true })
    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    expect(await screen.findByTestId('search-panel')).toBeInTheDocument()
    standard.unmount()

    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({ pickerMode: true, isGitRepo: false, path: '/tmp' }))
    renderApp()
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
  })

  it('suppresses the search shortcut for non-git launch contexts', async () => {
    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({ isGitRepo: false }))

    renderApp()
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true })

    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
  })

  it('handles empty path navigation and local-only resets for file and folder selection', async () => {
    renderApp()

    await screen.findByTestId('content-props')
    fireEvent.click(screen.getByRole('button', { name: 'tree-empty-file' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathLocalOnly":false')

    fireEvent.click(screen.getByRole('button', { name: 'tree-empty-dir' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')

    fireEvent.click(screen.getByRole('button', { name: 'open-empty-file' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')

    fireEvent.click(screen.getByRole('button', { name: 'open-empty-dir' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')

    fireEvent.click(screen.getByRole('button', { name: 'open-search' }))
    fireEvent.click(await screen.findByRole('button', { name: 'select-empty-dir' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')

    fireEvent.click(screen.getByRole('button', { name: 'open-search' }))
    fireEvent.click(screen.getByRole('button', { name: 'select-file-result' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"notes.txt"')
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"file"')

    fireEvent.click(screen.getByRole('button', { name: 'breadcrumb-root' }))
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"none"')
  })

  it('covers boundary dialog callbacks plus pending guards for identity and commit dialogs', async () => {
    const identityRequest = deferred<Awaited<ReturnType<typeof api.updateGitIdentity>>>()
    const commitRequest = deferred<Awaited<ReturnType<typeof api.commitChanges>>>()
    vi.mocked(api.updateGitIdentity).mockReturnValue(identityRequest.promise)
    vi.mocked(api.commitChanges).mockReturnValue(commitRequest.promise)
    vi.mocked(api.showParentPicker).mockResolvedValueOnce({ ok: false, error: '', message: '' })

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'request-browse-parent' }))
    fireEvent.click(screen.getByRole('button', { name: 'close-boundary' }))
    expect(screen.queryByTestId('repo-boundary-dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'request-browse-parent' }))
    fireEvent.click(screen.getByRole('button', { name: 'confirm-boundary' }))
    expect(await screen.findByText(/could not open the parent folder/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'open-identity' }))
    fireEvent.click(screen.getByRole('button', { name: 'close-identity' }))
    expect(screen.queryByTestId('identity-dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'open-identity' }))
    fireEvent.change(screen.getByRole('textbox', { name: /git user name/i }), { target: { value: 'New User' } })
    fireEvent.change(screen.getByRole('textbox', { name: /git user email/i }), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'save-identity' }))
    fireEvent.click(screen.getByRole('button', { name: 'close-identity' }))
    expect(screen.getByTestId('identity-dialog')).toBeInTheDocument()
    identityRequest.resolve({
      ok: true,
      message: 'Identity saved.',
      user: { name: 'New User', email: 'new@example.com', source: 'local' },
    })
    await waitFor(() => {
      expect(screen.queryByTestId('identity-dialog')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'open-commit' }))
    expect(screen.getByRole('textbox', { name: /commit message/i })).toHaveValue('WIP: repo')
    fireEvent.change(screen.getByRole('textbox', { name: /commit message/i }), { target: { value: 'Ship it' } })
    fireEvent.click(screen.getByRole('button', { name: 'submit-commit' }))
    fireEvent.click(screen.getByRole('button', { name: 'close-commit' }))
    expect(screen.getByTestId('commit-dialog')).toBeInTheDocument()
    commitRequest.resolve({
      ok: true,
      status: 'committed',
      message: 'Committed.',
      commitHash: 'def1234567',
      shortHash: 'def1234',
    })
    await waitFor(() => {
      expect(screen.queryByTestId('commit-dialog')).not.toBeInTheDocument()
    })
  })

  it('uses fallback dialog values when repository metadata is incomplete', async () => {
    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo({
      name: null,
      gitContext: {
        user: null,
        remote: null,
      },
    }))

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'open-identity' }))
    expect(screen.getByRole('textbox', { name: /git user name/i })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: /git user email/i })).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'close-identity' }))

    fireEvent.click(screen.getByRole('button', { name: 'open-commit' }))
    expect(screen.getByRole('textbox', { name: /commit message/i })).toHaveValue('WIP: local changes')
  })

  it('covers branch switch early returns, follow-up confirmations, and retained-path updates', async () => {
    readViewerState.mockReturnValue(buildViewerState({ path: 'README.md', pathType: 'file' }))
    vi.mocked(api.getSyncStatus)
      .mockResolvedValueOnce(buildSyncStatus())
      .mockResolvedValueOnce(buildSyncStatus({
        currentPath: 'README.md',
        currentPathType: 'file',
        resolvedPath: 'README.md',
        resolvedPathType: 'file',
      }))
    vi.mocked(api.switchBranch)
      .mockResolvedValueOnce({
        ok: false,
        status: 'confirmation-required',
        message: 'Need confirmation.',
        trackedChangeCount: 1,
        untrackedChangeCount: 0,
        blockingPaths: ['README.md'],
        suggestedCommitMessage: 'Save before switching',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 'switched',
        message: 'Switched with preserved path.',
        currentBranch: 'release',
      })

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'switch-same-branch' }))
    expect(api.switchBranch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'mark-dirty' }))
    vi.mocked(window.confirm).mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: 'switch-branch' }))
    expect(api.switchBranch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'clear-dirty' }))
    fireEvent.click(screen.getByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByTestId('branch-switch-dialog')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /branch switch commit message/i }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'discard-branch-switch' }))
    await waitFor(() => {
      expect(screen.getByTestId('header-branch')).toHaveTextContent('release')
    })
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPath":"README.md"')
    expect(screen.getByTestId('content-props')).toHaveTextContent('"selectedPathType":"file"')
  })

  it('validates missing identity email and ignores branch-switch cancel requests while pending', async () => {
    const pendingSwitch = deferred<Awaited<ReturnType<typeof api.switchBranch>>>()
    vi.mocked(api.switchBranch)
      .mockResolvedValueOnce({
        ok: false,
        status: 'confirmation-required',
        message: 'Need confirmation.',
        trackedChangeCount: 1,
        untrackedChangeCount: 0,
        blockingPaths: ['README.md'],
        suggestedCommitMessage: 'Keep this message',
      })
      .mockReturnValueOnce(pendingSwitch.promise)

    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'open-identity' }))
    fireEvent.change(screen.getByRole('textbox', { name: /git user name/i }), { target: { value: 'New User' } })
    fireEvent.change(screen.getByRole('textbox', { name: /git user email/i }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'save-identity' }))
    expect(await screen.findByText(/git email is required/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'close-identity' }))

    fireEvent.click(screen.getByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByTestId('branch-switch-dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'commit-branch-switch' }))
    fireEvent.click(screen.getByRole('button', { name: 'cancel-branch-switch' }))
    expect(screen.getByTestId('branch-switch-dialog')).toBeInTheDocument()

    pendingSwitch.resolve({
      ok: false,
      status: 'confirmation-required',
      message: 'Need confirmation again.',
      trackedChangeCount: 1,
      untrackedChangeCount: 0,
      blockingPaths: ['README.md'],
      suggestedCommitMessage: 'Updated suggestion',
    })
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /branch switch commit message/i })).toHaveValue('Keep this message')
    })
  })

  it('covers branch-switch no-op, blocked errors, and thrown failures from dialog actions', async () => {
    renderApp()

    fireEvent.click(await screen.findByRole('button', { name: 'discard-branch-switch' }))
    expect(api.switchBranch).not.toHaveBeenCalled()

    vi.mocked(api.switchBranch)
      .mockResolvedValueOnce({
        ok: false,
        status: 'confirmation-required',
        message: 'Need confirmation.',
        trackedChangeCount: 1,
        untrackedChangeCount: 0,
        blockingPaths: ['README.md'],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 'blocked',
        message: 'Still blocked.',
      })
      .mockRejectedValueOnce(new Error('Discard failed hard'))

    fireEvent.click(screen.getByRole('button', { name: 'switch-branch' }))
    expect(await screen.findByTestId('branch-switch-dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'discard-branch-switch' }))
    expect(await screen.findByText(/still blocked/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'discard-branch-switch' }))
    expect(await screen.findByText(/discard failed hard/i)).toBeInTheDocument()
  })

  it('applies sync status messages without missing-path fallback and keeps search expanded on query updates', async () => {
    readViewerState.mockReturnValue(buildViewerState({
      path: 'README.md',
      pathType: 'file',
    }))
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      currentPath: 'README.md',
      currentPathType: 'file',
      resolvedPath: 'docs',
      resolvedPathType: 'dir',
      statusMessage: 'Status refreshed.',
    }))

    renderApp()

    expect(await screen.findByText(/status refreshed/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'open-search' }))
    fireEvent.click(screen.getByRole('button', { name: 'change-search-query' }))
    expect(screen.getByTestId('search-panel')).toBeInTheDocument()
  })

  it('renders safely when repository info is unavailable and allows toggling dark mode', async () => {
    vi.mocked(api.getInfo).mockResolvedValueOnce(undefined as never)

    renderApp()

    expect(await screen.findByText('GitLocal')).toBeInTheDocument()
    expect(screen.queryByText('repo')).not.toBeInTheDocument()
    expect(screen.getByText('footer:')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: /toggle dark theme/i }))
    expect(screen.getByText('Dark theme')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: /toggle dark theme/i }))
    expect(screen.getByText('Light theme')).toBeInTheDocument()
  })
})
