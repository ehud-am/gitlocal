import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const readViewerState = vi.fn()
const writeViewerState = vi.fn()

vi.mock('./services/viewerState', () => ({
  readViewerState: () => readViewerState(),
  writeViewerState: (...args: unknown[]) => writeViewerState(...args),
  readRecentItems: () => [],
  rememberRecentItem: vi.fn((item) => item),
  rememberRecentChangedItems: vi.fn((items) => items),
}))

vi.mock('./services/theme', () => ({
  applyTheme: vi.fn(),
  writeStoredTheme: vi.fn(),
  getInitialTheme: () => 'light',
}))

vi.mock('./components/Breadcrumb/Breadcrumb', () => ({
  default: ({ path }: { path: string }) => <div data-testid="breadcrumb">{path}</div>,
}))

vi.mock('./components/FileTree/FileTree', () => ({
  default: ({ refreshToken }: { refreshToken: number }) => (
    <div data-testid="tree-refresh-token">{refreshToken}</div>
  ),
}))

vi.mock('./components/ContentPanel/ContentPanel', () => ({
  default: (props: { nativeFindToken?: number; nativeSelectAllToken?: number; refreshToken: number }) => (
    <div>
      <div data-testid="native-find-token">{props.nativeFindToken ?? 0}</div>
      <div data-testid="native-select-all-token">{props.nativeSelectAllToken ?? 0}</div>
      <div data-testid="content-refresh-token">{props.refreshToken}</div>
    </div>
  ),
}))

vi.mock('./components/RepoContext/RepoContextHeader', () => ({
  default: () => <div data-testid="repo-context-header" />,
}))

vi.mock('./components/Search/SearchPanel', () => ({
  default: () => <div data-testid="search-panel" />,
}))

vi.mock('./components/AppFooter', () => ({
  default: ({ version }: { version: string }) => <footer>{version}</footer>,
}))

vi.mock('./components/AppDialogs', () => ({
  FolderDeleteDialog: () => null,
  GitIdentityDialog: () => null,
  RepoBoundaryDialog: () => null,
}))

vi.mock('./components/Picker/PickerPage', () => ({
  default: () => <div data-testid="picker-page" />,
}))

vi.mock('./components/ui/switch', () => ({
  Switch: () => <button type="button">theme</button>,
}))

vi.mock('./services/api', () => ({
  api: {
    getInfo: vi.fn(),
    getGitContext: vi.fn(),
    getSyncStatus: vi.fn(),
    getBranches: vi.fn(),
  },
}))

import { api } from './services/api'

function buildViewerState() {
  return {
    repoPath: '/tmp/repo',
    branch: 'main',
    path: 'README.md',
    pathType: 'file' as const,
    raw: false,
    sidebarCollapsed: false,
    searchPresentation: 'collapsed' as const,
    searchQuery: '',
    searchMode: 'both' as const,
    searchCaseSensitive: false,
  }
}

function buildInfo() {
  return {
    name: 'repo',
    path: '/tmp/repo',
    currentBranch: 'main',
    isGitRepo: true,
    pickerMode: false,
    version: '0.9.4',
    hasCommits: true,
    rootEntryCount: 1,
    gitContext: null,
  }
}

function buildSyncStatus() {
  return {
    branch: 'main',
    repoPath: '/tmp/repo',
    workingTreeRevision: 'rev-1',
    treeStatus: 'unchanged' as const,
    fileStatus: 'unchanged' as const,
    currentPath: 'README.md',
    resolvedPath: 'README.md',
    currentPathType: 'file' as const,
    resolvedPathType: 'file' as const,
    pathSyncState: 'clean' as const,
    trackedChangeCount: 0,
    untrackedChangeCount: 0,
    repoSync: {
      mode: 'up-to-date' as const,
      aheadCount: 0,
      behindCount: 0,
      hasUpstream: true,
      upstreamRef: 'origin/main',
      remoteName: 'origin',
    },
    statusMessage: '',
    checkedAt: new Date().toISOString(),
  }
}

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

describe('native app shortcut bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
    readViewerState.mockReturnValue(buildViewerState())
    vi.mocked(api.getInfo).mockResolvedValue(buildInfo())
    vi.mocked(api.getGitContext).mockResolvedValue(null)
    vi.mocked(api.getBranches).mockResolvedValue([
      { name: 'main', isCurrent: true, scope: 'local', hasLocalCheckout: true },
    ])
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus())
  })

  it('forwards native Find commands to the content panel without opening repository search', async () => {
    renderWithClient()

    expect(await screen.findByTestId('native-find-token')).toHaveTextContent('0')

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'find' } }))

    await waitFor(() => {
      expect(screen.getByTestId('native-find-token')).toHaveTextContent('1')
    })
    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
  })

  it('coalesces native Refresh commands and refreshes tree/content state', async () => {
    renderWithClient()

    expect(await screen.findByTestId('content-refresh-token')).toHaveTextContent('0')

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'refresh' } }))
    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'refresh' } }))

    await waitFor(() => {
      expect(screen.getByTestId('content-refresh-token')).toHaveTextContent('1')
    })
    expect(await screen.findByText(/current view refreshed/i)).toBeInTheDocument()
  })

  it('refreshes the current view from the visible header button', async () => {
    renderWithClient()

    expect(await screen.findByTestId('content-refresh-token')).toHaveTextContent('0')

    fireEvent.click(screen.getByRole('button', { name: /refresh current page/i }))

    await waitFor(() => {
      expect(screen.getByTestId('tree-refresh-token')).toHaveTextContent('1')
      expect(screen.getByTestId('content-refresh-token')).toHaveTextContent('1')
    })
    expect(await screen.findByText(/current view refreshed/i)).toBeInTheDocument()
  })

  it('forwards native Select All commands to the content panel', async () => {
    renderWithClient()

    expect(await screen.findByTestId('native-select-all-token')).toHaveTextContent('0')

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'select-all-panel' } }))

    await waitFor(() => {
      expect(screen.getByTestId('native-select-all-token')).toHaveTextContent('1')
    })
  })
})
