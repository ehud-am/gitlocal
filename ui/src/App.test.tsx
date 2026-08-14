import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./services/api', () => ({
  api: {
    getInfo: vi.fn(),
    getStartupOpenTarget: vi.fn(),
    getStartupFolder: vi.fn(),
    getDefaultReaderPreference: vi.fn(),
    updateDefaultReaderPreference: vi.fn(),
    getGitContext: vi.fn(),
    getReadme: vi.fn(),
    getRepoLocation: vi.fn(),
    getSyncStatus: vi.fn(),
    showParentFolder: vi.fn(),
    getTree: vi.fn(),
    getBranches: vi.fn(),
    getCommits: vi.fn(),
    commitChanges: vi.fn(),
    getFile: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
    createFolder: vi.fn(),
    getFolderDeletePreview: vi.fn(),
    deleteFolder: vi.fn(),
    getSearchResults: vi.fn(),
    getChangedFiles: vi.fn(),
    getRepoSummary: vi.fn(),
    getNavigationHints: vi.fn(),
    getFolderBrowse: vi.fn(),
    openRepository: vi.fn(),
    switchBranch: vi.fn(),
    syncWithRemote: vi.fn(),
    updateGitIdentity: vi.fn(),
    getGitIdentitySshKeys: vi.fn(),
    validateGitIdentitySshKey: vi.fn(),
    createChildFolder: vi.fn(),
    initFolderRepository: vi.fn(),
    cloneRepositoryIntoFolder: vi.fn(),
  },
}))

import { api } from './services/api'

const APP_VERSION = JSON.parse(
  readFileSync(resolve(process.cwd(), '../package.json'), 'utf-8'),
) as { version: string }

function buildInfo(currentBranch: string) {
  return {
    name: 'repo',
    path: '/tmp/repo',
    currentBranch,
    isGitRepo: true,
    pickerMode: false,
    version: APP_VERSION.version,
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
  }
}

function buildBranches(currentBranch: string) {
  const branches = [
    {
      name: 'main',
      displayName: 'main',
      scope: 'local' as const,
      hasLocalCheckout: true,
      isCurrent: currentBranch === 'main',
    },
    {
      name: 'release',
      displayName: currentBranch === 'release' ? 'release' : 'release (origin)',
      scope: currentBranch === 'release' ? 'local' as const : 'remote' as const,
      trackingRef: currentBranch === 'release' ? 'origin/release' : 'origin/release',
      remoteName: 'origin',
      hasLocalCheckout: currentBranch === 'release',
      isCurrent: currentBranch === 'release',
    },
  ]

  return branches
}

function buildSyncStatus(overrides: Partial<Awaited<ReturnType<typeof api.getSyncStatus>>> = {}) {
  return {
    branch: 'main',
    repoPath: '/tmp/repo',
    workingTreeRevision: 'abc',
    treeStatus: 'unchanged' as const,
    fileStatus: 'unchanged' as const,
    currentPath: '',
    resolvedPath: '',
    currentPathType: 'none' as const,
    resolvedPathType: 'none' as const,
    pathSyncState: 'none' as const,
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
    ...overrides,
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

async function clickRefreshViaViewOptions() {
  await userEvent.setup().click(await screen.findByRole('button', { name: /view options/i }))
  fireEvent.click(await screen.findByRole('menuitem', { name: /^refresh$/i }))
}

async function selectTrackedVisibility(name: RegExp) {
  await userEvent.setup().click(await screen.findByRole('button', { name: /view options/i }))
  fireEvent.click(await screen.findByRole('menuitemradio', { name }))
}

describe('App', () => {
  const getItem = vi.fn()
  const setItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem,
        setItem,
      },
      writable: true,
    })
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      writable: true,
    })
    Object.defineProperty(window, 'webkit', {
      value: undefined,
      configurable: true,
    })

    getItem.mockReturnValue(null)

    vi.mocked(api.getInfo).mockResolvedValue(buildInfo('main'))
    vi.mocked(api.getStartupOpenTarget).mockResolvedValue({ target: null })
    vi.mocked(api.getStartupFolder).mockResolvedValue({
      path: '/tmp/repo',
      source: 'last-used',
      exists: true,
      readable: true,
      platformDefaultPath: '/tmp/Documents',
      lastUsedPath: '/tmp/repo',
      fallbackReason: '',
    })
    vi.mocked(api.getDefaultReaderPreference).mockResolvedValue({
      ok: true,
      preference: { status: 'not-asked', askedAt: '', answeredAt: '', message: '' },
      message: 'Default Markdown reader preference loaded.',
    })
    vi.mocked(api.updateDefaultReaderPreference).mockResolvedValue({
      ok: true,
      preference: { status: 'declined', askedAt: 'now', answeredAt: 'now', message: 'Not now.' },
      message: 'Default Markdown reader preference updated.',
    })
    vi.mocked(api.getGitContext).mockResolvedValue(buildInfo('main').gitContext)
    vi.mocked(api.getReadme).mockImplementation(async (path?: string) => ({
      path: path === 'docs' ? 'docs/README.md' : 'README.md',
    }))
    vi.mocked(api.getRepoLocation).mockResolvedValue({
      repositoryRootPath: '/tmp/repo',
      isRepositoryRoot: true,
      homeReadmePath: 'README.md',
      atFilesystemRoot: false,
    })
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus())
    vi.mocked(api.getTree).mockImplementation(async (path?: string) => {
      if (path === 'docs') {
        return [{ name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false }]
      }

      return [
        { name: 'docs', path: 'docs', type: 'dir', localOnly: false },
        { name: 'README.md', path: 'README.md', type: 'file', localOnly: false },
      ]
    })
    vi.mocked(api.getBranches).mockResolvedValue(buildBranches('main'))
    vi.mocked(api.getCommits).mockResolvedValue([])
    vi.mocked(api.getFile).mockImplementation(async (path?: string) => {
      if (path === 'docs/guide.md') {
        return {
          path,
          type: 'text',
          content: 'guide content',
          language: 'markdown',
          encoding: 'utf-8',
          editable: true,
          revisionToken: 'guide-rev',
        }
      }

      return {
        path: path ?? 'README.md',
        type: 'markdown',
        content: path === 'docs/README.md' ? '# Docs Readme' : '# Root Readme',
        language: 'markdown',
        encoding: 'utf-8',
        editable: true,
        revisionToken: 'readme-rev',
      }
    })
    vi.mocked(api.getSearchResults).mockResolvedValue({
      query: '',
      branch: 'main',
      mode: 'both',
      caseSensitive: false,
      results: [],
    })
    vi.mocked(api.getChangedFiles).mockResolvedValue({
      branch: 'main',
      checkedAt: '2026-06-11T12:00:00.000Z',
      summary: { total: 0, modified: 0, added: 0, deleted: 0, renamed: 0, untracked: 0, remoteRelevant: 0, tracked: 0 },
      items: [],
    })
    vi.mocked(api.getRepoSummary).mockResolvedValue({
      repoName: 'repo',
      branch: 'main',
      statusSummary: {
        text: 'main has no local changes.',
        tone: 'neutral',
        remoteLabel: 'origin',
        syncState: 'up-to-date',
        localChangeCount: 0,
        untrackedChangeCount: 0,
      },
      keyDocuments: [{ path: 'README.md', label: 'README', category: 'README', reason: 'Repository overview', available: true }],
      recentItems: [],
      visibility: { generatedLocalMode: 'hide', hiddenCount: 0 },
    })
    vi.mocked(api.getNavigationHints).mockResolvedValue({
      keyDocuments: [{ path: 'README.md', label: 'README', category: 'README', reason: 'Repository overview', available: true }],
      recentItems: [],
      changedItems: [],
    })
    vi.mocked(api.createFolder).mockResolvedValue({
      ok: true,
      operation: 'create-folder',
      path: 'docs/new-folder',
      parentPath: 'docs',
      name: 'new-folder',
      status: 'created',
      message: 'Folder created successfully.',
    })
    vi.mocked(api.getFolderDeletePreview).mockResolvedValue({
      ok: true,
      operation: 'preview-delete-folder',
      path: 'docs',
      parentPath: '',
      name: 'docs',
      fileCount: 2,
      folderCount: 1,
      impactToken: 'impact-docs',
      status: 'previewed',
      message: 'This will permanently delete docs and all of its contents, including 2 files and 1 nested folder.',
    })
    vi.mocked(api.deleteFolder).mockResolvedValue({
      ok: true,
      operation: 'delete-folder',
      path: 'docs',
      parentPath: '',
      name: 'docs',
      fileCount: 2,
      folderCount: 1,
      status: 'deleted',
      message: 'Folder deleted successfully.',
    })
    vi.mocked(api.switchBranch).mockResolvedValue({
      ok: false,
      status: 'blocked',
      message: 'Branch switching is not configured for this test.',
    })
    vi.mocked(api.commitChanges).mockResolvedValue({
      ok: true,
      status: 'committed',
      message: 'Committed changes as abc1234.',
      commitHash: 'abc1234567890',
      shortHash: 'abc1234',
    })
    vi.mocked(api.syncWithRemote).mockResolvedValue({
      ok: true,
      status: 'up-to-date',
      message: 'This branch is already up to date with its upstream.',
      aheadCount: 0,
      behindCount: 0,
    })
    vi.mocked(api.showParentFolder).mockResolvedValue({ ok: true, error: '' })
    vi.mocked(api.getFolderBrowse).mockResolvedValue({
      currentPath: '/tmp',
      parentPath: '/',
      homePath: '/tmp',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
      isGitRepo: false,
      canOpen: true,
      canCreateChild: true,
      canInitGit: true,
      canCloneIntoChild: true,
    })
    vi.mocked(api.openRepository).mockResolvedValue({ ok: true, error: '' })
    vi.mocked(api.updateGitIdentity).mockResolvedValue({
      ok: true,
      message: 'Repository git identity updated.',
      user: {
        name: 'Updated User',
        email: 'updated@example.com',
        source: 'local',
      },
    })
    vi.mocked(api.getGitIdentitySshKeys).mockResolvedValue({
      directory: { path: '/home/user/.ssh', exists: true, readable: true },
      keys: [],
      message: 'Found 0 SSH private keys.',
    })
    vi.mocked(api.validateGitIdentitySshKey).mockResolvedValue({
      valid: true,
      path: '/home/user/.ssh/id_ed25519',
      message: 'SSH private key is valid.',
    })
  })

  it('renders the repo context header with git metadata plus the root folder README preview', async () => {
    renderWithClient()

    expect(await screen.findByRole('heading', { name: 'repo' })).toBeInTheDocument()
    expect(screen.getByText('Remote')).toBeInTheDocument()
    expect(screen.queryByText('/tmp/repo')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /browse parent folder/i })).not.toBeInTheDocument()
    expect(await screen.findByText(/root readme/i, {}, { timeout: 5000 })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand repository details/i }))

    expect(await screen.findByText('Local repository')).toBeInTheDocument()
    expect(screen.getByText('/tmp/repo')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/ehud-am/gitlocal')).toBeInTheDocument()
    expect(screen.getByText(/local user <local@example.com>/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://github.com/ehud-am/gitlocal' })).toBeInTheDocument()
  })

  it('keeps the content area shrinkable so the folder/file view can scroll independently of the terminal panel', async () => {
    renderWithClient()

    expect(await screen.findByRole('heading', { name: 'repo' })).toBeInTheDocument()

    const contentArea = document.querySelector('main.content-area')
    expect(contentArea).toHaveClass('min-h-0')
  })

  it('asks for default Markdown reader setup only after the native app announces support', async () => {
    renderWithClient()

    expect(await screen.findByRole('heading', { name: 'repo' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /default markdown reader setup/i })).not.toBeInTheDocument()

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'default-reader-available' },
    }))

    expect(await screen.findByRole('region', { name: /default markdown reader setup/i })).toBeInTheDocument()
  })

  it('persists declining the default Markdown reader prompt', async () => {
    renderWithClient()
    await screen.findByRole('heading', { name: 'repo' })

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'default-reader-available' },
    }))
    fireEvent.click(await screen.findByRole('button', { name: /not now/i }))

    await waitFor(() => {
      expect(api.updateDefaultReaderPreference).toHaveBeenCalledWith(expect.objectContaining({ status: 'declined' }))
    })
    expect(setItem).toHaveBeenCalledWith(
      'gitlocal:default-markdown-reader-prompt',
      expect.stringContaining('"status":"declined"'),
    )
    expect(screen.queryByRole('region', { name: /default markdown reader setup/i })).not.toBeInTheDocument()
  })

  it('dispatches the native default-reader setup command and records success', async () => {
    const postMessage = vi.fn()
    Object.defineProperty(window, 'webkit', {
      value: { messageHandlers: { gitlocalNative: { postMessage } } },
      configurable: true,
    })

    renderWithClient()
    await screen.findByRole('heading', { name: 'repo' })

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'default-reader-available' },
    }))
    fireEvent.click(await screen.findByRole('button', { name: /set as default/i }))

    expect(postMessage).toHaveBeenCalledWith({ command: 'set-default-markdown-reader' })

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'default-reader-setup-succeeded', message: 'GitLocal is now the default Markdown reader.' },
    }))

    await waitFor(() => {
      expect(api.updateDefaultReaderPreference).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }))
    })
    expect(await screen.findByText('GitLocal is now the default Markdown reader.')).toBeInTheDocument()
  })

  it('applies startup-open target before saved viewer state and renders Markdown preview', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=README.md&pathType=file&raw=true')
    vi.mocked(api.getStartupOpenTarget).mockResolvedValueOnce({
      target: {
        source: 'explicit-launch',
        inputPath: '/tmp/repo/docs/guide.md',
        rootPath: '/tmp/repo',
        selectedPath: 'docs/guide.md',
        selectedPathType: 'file',
        status: 'accepted',
        message: 'Opened docs/guide.md.',
        receivedAt: '2026-07-05T12:00:00.000Z',
        gitState: 'inside-repository',
        openMode: 'file',
        repositoryRootPath: '/tmp/repo',
      },
    })

    renderWithClient()

    expect(await screen.findByText('guide content')).toBeInTheDocument()
    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', false)
    })
    expect(await screen.findByText('Opened docs/guide.md.')).toBeInTheDocument()
  })

  it('opens a second Markdown file from a native open-file event while running', async () => {
    vi.mocked(api.openRepository).mockResolvedValueOnce({
      ok: true,
      error: '',
      path: '/tmp/repo/docs/guide.md',
      rootPath: '/tmp/repo',
      selectedPath: 'docs/guide.md',
      selectedPathType: 'file',
      openMode: 'file',
      gitState: 'inside-repository',
      message: 'Opened docs/guide.md.',
    })

    renderWithClient()
    expect(await screen.findByRole('heading', { name: 'repo' })).toBeInTheDocument()

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'open-file', path: '/tmp/repo/docs/guide.md' },
    }))

    await waitFor(() => {
      expect(api.openRepository).toHaveBeenCalledWith('/tmp/repo/docs/guide.md')
      expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', false)
    })
    expect(await screen.findByText('guide content')).toBeInTheDocument()
  })

  it('clears stale saved startup selection after a failed startup-open target', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=README.md&pathType=file')
    vi.mocked(api.getStartupOpenTarget).mockResolvedValueOnce({
      target: {
        source: 'explicit-launch',
        inputPath: '/tmp/repo/missing.md',
        rootPath: '',
        selectedPath: '',
        selectedPathType: 'none',
        status: 'failed',
        message: 'Path does not exist: /tmp/repo/missing.md',
        receivedAt: '2026-07-05T12:00:00.000Z',
      },
    })

    renderWithClient()

    expect(await screen.findByText('Path does not exist: /tmp/repo/missing.md')).toBeInTheDocument()
    await waitFor(() => {
      expect(api.getFile).not.toHaveBeenCalledWith('README.md', 'main', false)
    })
  })

  it('opens an info modal before leaving the repository from the Parent Folder toolbar button', async () => {
    vi.mocked(api.showParentFolder).mockResolvedValueOnce({
      ok: false,
      error: 'Parent folder unavailable.',
    })
    vi.mocked(api.getReadme).mockResolvedValue({ path: '' })

    renderWithClient()

    const parentFolderButtons = await screen.findAllByRole('button', { name: 'Parent Folder' })
    fireEvent.click(parentFolderButtons[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: /leave this repository/i })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /open parent folder/i }))

    await waitFor(() => {
      expect(api.showParentFolder).toHaveBeenCalledTimes(1)
    })
  })

  it('disables the Parent Folder button when the current location is the filesystem root', async () => {
    vi.mocked(api.getRepoLocation).mockResolvedValue({
      repositoryRootPath: '/tmp/repo',
      isRepositoryRoot: true,
      homeReadmePath: 'README.md',
      atFilesystemRoot: true,
    })

    renderWithClient()

    const parentFolderButtons = await screen.findAllByRole('button', { name: 'Parent Folder' })
    await waitFor(() => {
      parentFolderButtons.forEach((button) => expect(button).toBeDisabled())
    })
  })

  it('navigates to the containing folder when the Parent Folder button is clicked from a selected file', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    renderWithClient()

    expect(await screen.findByText('guide content')).toBeInTheDocument()

    const parentFolderButtons = await screen.findAllByRole('button', { name: 'Parent Folder' })
    fireEvent.click(parentFolderButtons[0])

    await waitFor(() => {
      expect(api.getTree).toHaveBeenCalledWith('docs', 'main')
    })
    expect(api.showParentFolder).not.toHaveBeenCalled()
  })

  it('navigates to the repository root when the Root button is clicked from a nested sub-repository location', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')
    vi.mocked(api.getRepoLocation).mockResolvedValue({
      repositoryRootPath: '/tmp/repo/docs',
      isRepositoryRoot: false,
      homeReadmePath: 'README.md',
      atFilesystemRoot: false,
    })

    renderWithClient()

    expect(await screen.findByText('guide content')).toBeInTheDocument()

    const rootButtons = await screen.findAllByRole('button', { name: 'Root' })
    expect(rootButtons.some((button) => !button.hasAttribute('disabled'))).toBe(true)
    fireEvent.click(rootButtons.find((button) => !button.hasAttribute('disabled'))!)

    await waitFor(() => {
      expect(api.getTree).toHaveBeenCalledWith('docs', 'main')
    })
  })

  it('treats a repository root outside the viewer path as having no relative location', async () => {
    vi.mocked(api.getRepoLocation).mockResolvedValue({
      repositoryRootPath: '/tmp/other-repo',
      isRepositoryRoot: false,
      homeReadmePath: 'README.md',
      atFilesystemRoot: false,
    })

    renderWithClient()

    await waitFor(() => {
      const rootButtons = screen.getAllByRole('button', { name: 'Root' })
      expect(rootButtons.some((button) => !button.hasAttribute('disabled'))).toBe(true)
    })
    const rootButtons = screen.getAllByRole('button', { name: 'Root' })
    fireEvent.click(rootButtons.find((button) => !button.hasAttribute('disabled'))!)

    await waitFor(() => {
      expect(api.getTree).toHaveBeenCalledWith('', 'main')
    })
  })

  it('opens the home README when the Readme button is clicked', async () => {
    vi.mocked(api.getRepoLocation).mockResolvedValue({
      repositoryRootPath: '/tmp/repo',
      isRepositoryRoot: true,
      homeReadmePath: 'README.md',
      atFilesystemRoot: false,
    })
    vi.mocked(api.getFile).mockImplementation(async (path?: string) => ({
      path: path ?? 'README.md',
      type: 'text',
      content: 'home readme content',
      language: 'markdown',
      encoding: 'utf-8',
      editable: true,
      revisionToken: 'rev-readme',
    }))

    renderWithClient()

    await waitFor(() => {
      const readmeButtons = screen.getAllByRole('button', { name: 'Readme' })
      expect(readmeButtons.some((button) => !button.hasAttribute('disabled'))).toBe(true)
    })
    const readmeButtons = screen.getAllByRole('button', { name: 'Readme' })
    fireEvent.click(readmeButtons.find((button) => !button.hasAttribute('disabled'))!)

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('README.md', 'main', false)
    })
    expect(await screen.findByText('home readme content')).toBeInTheDocument()
  })

  it('opens the nested sub-repository README, prefixed with its relative folder, when the Readme button is clicked', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')
    vi.mocked(api.getRepoLocation).mockResolvedValue({
      repositoryRootPath: '/tmp/repo/docs',
      isRepositoryRoot: false,
      homeReadmePath: 'README.md',
      atFilesystemRoot: false,
    })

    renderWithClient()

    expect(await screen.findByText('guide content')).toBeInTheDocument()

    await waitFor(() => {
      const readmeButtons = screen.getAllByRole('button', { name: 'Readme' })
      expect(readmeButtons.some((button) => !button.hasAttribute('disabled'))).toBe(true)
    })
    const readmeButtons = screen.getAllByRole('button', { name: 'Readme' })
    fireEvent.click(readmeButtons.find((button) => !button.hasAttribute('disabled'))!)

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('docs/README.md', 'main', false)
    })
  })

  it('hydrates a saved file selection and search state from the URL', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file&searchPresentation=expanded&searchQuery=guide')

    renderWithClient()

    expect(await screen.findByRole('searchbox', { name: /search query/i })).toHaveValue('guide')
    expect(await screen.findByText('guide content')).toBeInTheDocument()
    expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', false)
  })

  it('keeps the persistent tree visible while navigating to a neighboring file', async () => {
    renderWithClient()

    expect(await screen.findByText(/root readme/i)).toBeInTheDocument()
    const tree = await screen.findByRole('tree', { name: /repository files/i })
    fireEvent.click(within(tree).getByText('docs'))
    fireEvent.click(await within(tree).findByText('guide.md'))

    expect(await screen.findByText('guide content')).toBeInTheDocument()
    expect(screen.getByRole('tree', { name: /repository files/i })).toBeInTheDocument()
    expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', false)
  })

  it('shows active file refresh notices and opens changed files from repository context', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=README.md&pathType=file')
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      currentPath: 'README.md',
      currentPathType: 'file',
      resolvedPath: 'README.md',
      resolvedPathType: 'file',
      fileStatus: 'changed',
      pathSyncState: 'local-uncommitted',
      trackedChangeCount: 1,
      activePathNotice: {
        path: 'README.md',
        changeKind: 'refreshed',
        detectedAt: '2026-06-11T12:00:00.000Z',
        lastRefreshedAt: '2026-06-11T12:00:00.000Z',
        message: 'README.md changed outside GitLocal and was refreshed.',
        actionLabel: 'View changed files',
      },
      changedFilesSummary: { total: 1, modified: 1, added: 0, deleted: 0, renamed: 0, untracked: 0, remoteRelevant: 0, tracked: 1 },
    }))
    vi.mocked(api.getChangedFiles).mockResolvedValue({
      branch: 'main',
      checkedAt: '2026-06-11T12:00:00.000Z',
      summary: { total: 1, modified: 1, added: 0, deleted: 0, renamed: 0, untracked: 0, remoteRelevant: 0, tracked: 1 },
      items: [{
        path: 'README.md',
        name: 'README.md',
        type: 'file',
        changeState: 'modified',
        generatedLocalState: 'tracked',
        sourcePath: '',
        canOpen: true,
        reviewHint: 'Modified locally',
      }],
    })

    renderWithClient()

    await waitFor(() => {
      expect(screen.getAllByRole('status').some((status) => /changed outside GitLocal/i.test(status.textContent ?? ''))).toBe(true)
    })
    fireEvent.click(await screen.findByRole('button', { name: /view changed files/i }))
    const changedFilesRegion = await screen.findByRole('region', { name: /changed files/i })
    expect(changedFilesRegion).toHaveTextContent('README.md')
    fireEvent.click(within(changedFilesRegion).getByRole('button', { name: /close changed files/i }))
    expect(screen.queryByRole('region', { name: /changed files/i })).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /view changed files/i }))
    const reopenedChangedFilesRegion = await screen.findByRole('region', { name: /changed files/i })
    fireEvent.click(within(reopenedChangedFilesRegion).getByRole('button', { name: /README\.md/i }))

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('README.md', 'main', false)
    })
  })

  it('reconciles deleted active files and opens the parent folder from changed files', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/missing.md&pathType=file')
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      currentPath: 'docs/missing.md',
      currentPathType: 'missing',
      resolvedPath: 'docs',
      resolvedPathType: 'dir',
      fileStatus: 'deleted',
      treeStatus: 'invalid',
      trackedChangeCount: 1,
      activePathNotice: {
        path: 'docs/missing.md',
        changeKind: 'deleted',
        detectedAt: '2026-06-11T12:00:00.000Z',
        lastRefreshedAt: '2026-06-11T12:00:00.000Z',
        message: 'docs/missing.md was deleted outside GitLocal. GitLocal moved to the nearest available folder.',
        actionLabel: 'View changed files',
      },
      changedFilesSummary: { total: 1, modified: 0, added: 0, deleted: 1, renamed: 0, untracked: 0, remoteRelevant: 0, tracked: 1 },
    }))
    vi.mocked(api.getChangedFiles).mockResolvedValueOnce({
      branch: 'main',
      checkedAt: '2026-06-11T12:00:00.000Z',
      summary: { total: 1, modified: 0, added: 0, deleted: 1, renamed: 0, untracked: 0, remoteRelevant: 0, tracked: 1 },
      items: [{
        path: 'docs/missing.md',
        name: 'missing.md',
        type: 'missing',
        changeState: 'deleted',
        generatedLocalState: 'tracked',
        sourcePath: '',
        canOpen: false,
        reviewHint: 'Deleted locally',
      }],
    })

    renderWithClient()

    await waitFor(() => {
      expect(screen.getAllByRole('status').some((status) => /deleted outside GitLocal/i.test(status.textContent ?? ''))).toBe(true)
    })
    fireEvent.click(await screen.findByRole('button', { name: /view changed files/i }))
    const changedFilesRegion = await screen.findByRole('region', { name: /changed files/i })
    fireEvent.click(within(changedFilesRegion).getByRole('button', { name: /docs\/missing\.md/i }))

    expect(await screen.findByText(/opened its parent folder/i)).toBeInTheDocument()
    expect(api.getTree).toHaveBeenCalledWith('docs', 'main')
  })

  it('refreshes the current page without changing the selected file context', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    renderWithClient()

    expect(await screen.findByText('guide content')).toBeInTheDocument()
    await clickRefreshViaViewOptions()

    expect(await screen.findByText(/current view refreshed/i)).toBeInTheDocument()
    expect(await screen.findByText('guide content')).toBeInTheDocument()
    expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', false)
  })

  it('refreshes repository summary and navigation hints after an external file change', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=README.md&pathType=file')
    vi.mocked(api.getRepoSummary)
      .mockResolvedValueOnce({
        repoName: 'repo',
        branch: 'main',
        statusSummary: {
          text: 'main has no local changes.',
          tone: 'neutral',
          remoteLabel: 'origin',
          syncState: 'up-to-date',
          localChangeCount: 0,
          untrackedChangeCount: 0,
        },
        keyDocuments: [{ path: 'README.md', label: 'README', category: 'README', reason: 'Repository overview', available: true }],
        recentItems: [],
        visibility: { generatedLocalMode: 'hide', hiddenCount: 0 },
      })
      .mockResolvedValue({
        repoName: 'repo',
        branch: 'main',
        statusSummary: {
          text: 'main has 1 local change to review.',
          tone: 'info',
          remoteLabel: 'origin',
          syncState: 'up-to-date',
          localChangeCount: 1,
          untrackedChangeCount: 0,
        },
        keyDocuments: [{ path: 'README.md', label: 'README', category: 'README', reason: 'Repository overview', available: true }],
        recentItems: [],
        visibility: { generatedLocalMode: 'hide', hiddenCount: 0 },
      })
    vi.mocked(api.getNavigationHints)
      .mockResolvedValueOnce({
        keyDocuments: [{ path: 'README.md', label: 'README', category: 'README', reason: 'Repository overview', available: true }],
        recentItems: [],
        changedItems: [],
      })
      .mockResolvedValue({
        keyDocuments: [{ path: 'README.md', label: 'README', category: 'README', reason: 'Repository overview', available: true }],
        recentItems: [],
        changedItems: [{
          path: 'README.md',
          name: 'README.md',
          type: 'file',
          changeState: 'modified',
          generatedLocalState: 'tracked',
          sourcePath: '',
          canOpen: true,
          reviewHint: 'Modified locally',
        }],
      })
    vi.mocked(api.getSyncStatus)
      .mockResolvedValueOnce(buildSyncStatus({
        currentPath: 'README.md',
        currentPathType: 'file',
        resolvedPath: 'README.md',
        resolvedPathType: 'file',
        workingTreeRevision: 'before-change',
      }))
      .mockResolvedValue(buildSyncStatus({
        currentPath: 'README.md',
        currentPathType: 'file',
        resolvedPath: 'README.md',
        resolvedPathType: 'file',
        workingTreeRevision: 'after-change',
        fileStatus: 'changed',
        pathSyncState: 'local-uncommitted',
        trackedChangeCount: 1,
        activePathNotice: {
          path: 'README.md',
          changeKind: 'refreshed',
          detectedAt: '2026-06-11T12:00:00.000Z',
          lastRefreshedAt: '2026-06-11T12:00:00.000Z',
          message: 'README.md changed outside GitLocal and was refreshed.',
          actionLabel: 'View changed files',
        },
        changedFilesSummary: { total: 1, modified: 1, added: 0, deleted: 0, renamed: 0, untracked: 0, remoteRelevant: 0, tracked: 1 },
      }))

    renderWithClient()

    expect(await screen.findByText(/up to date/i)).toBeInTheDocument()
    await clickRefreshViaViewOptions()

    expect(await screen.findByText(/1 local change/i)).toBeInTheDocument()
    expect(screen.queryByText(/up to date/i)).not.toBeInTheDocument()
    await waitFor(() => {
      expect(api.getRepoSummary).toHaveBeenCalledWith('main')
      expect(vi.mocked(api.getRepoSummary).mock.calls.length).toBeGreaterThanOrEqual(2)
      expect(api.getNavigationHints).toHaveBeenCalledWith('main', true, false)
      expect(vi.mocked(api.getNavigationHints).mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('routes the toggle-terminal native command to the terminal panel toggle, same as clicking the toolbar button', async () => {
    renderWithClient()
    await screen.findByRole('heading', { name: 'repo' })

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'toggle-terminal' },
    }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('toggles dotfile visibility for both FileTree and ContentPanel from the View options toolbar control, and persists it', async () => {
    vi.mocked(api.getTree).mockImplementation(async (path?: string) => {
      if (path === 'docs') {
        return [{ name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false }]
      }

      return [
        { name: 'docs', path: 'docs', type: 'dir', localOnly: false },
        { name: 'README.md', path: 'README.md', type: 'file', localOnly: false },
        { name: '.env', path: '.env', type: 'file', localOnly: false },
      ]
    })

    renderWithClient()
    await screen.findByRole('heading', { name: 'repo' })

    const tree = await screen.findByRole('tree', { name: /repository files/i })
    expect(await within(tree).findByText('.env')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open file \.env/i })).toBeInTheDocument()

    await userEvent.setup().click(await screen.findByRole('button', { name: /view options/i }))
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /hide dotfiles/i }))

    await waitFor(() => {
      expect(within(tree).queryByText('.env')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /open file \.env/i })).not.toBeInTheDocument()
    })
    expect(window.location.search).toContain('hideDotfiles=true')
  })

  it('flips the shared dotfile-visibility state from the toggle-dotfiles native command and syncs the state back to native', async () => {
    const postMessage = vi.fn()
    Object.defineProperty(window, 'webkit', {
      value: { messageHandlers: { gitlocalNative: { postMessage } } },
      configurable: true,
    })

    vi.mocked(api.getTree).mockImplementation(async (path?: string) => {
      if (path === 'docs') {
        return [{ name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false }]
      }

      return [
        { name: 'docs', path: 'docs', type: 'dir', localOnly: false },
        { name: 'README.md', path: 'README.md', type: 'file', localOnly: false },
        { name: '.env', path: '.env', type: 'file', localOnly: false },
      ]
    })

    renderWithClient()
    await screen.findByRole('heading', { name: 'repo' })

    const tree = await screen.findByRole('tree', { name: /repository files/i })
    await within(tree).findByText('.env')

    postMessage.mockClear()
    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'toggle-dotfiles' },
    }))

    await waitFor(() => {
      expect(within(tree).queryByText('.env')).not.toBeInTheDocument()
    })
    expect(postMessage).toHaveBeenCalledWith({ command: 'dotfiles-state', value: 'true' })
  })

  it('does not render an inline Tracked/All/Local dropdown in the sidebar toolbar', async () => {
    renderWithClient()

    await screen.findByRole('heading', { name: 'repo' })
    expect(screen.queryByLabelText(/generated and local files visibility/i)).not.toBeInTheDocument()
  })

  it('updates generatedLocalVisibility from the View options Tracked/All/Local selector', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'README.md', path: 'README.md', type: 'file', localOnly: false, generatedLocalState: 'tracked' },
      { name: 'dist', path: 'dist', type: 'dir', localOnly: true, generatedLocalState: 'generated' },
    ])

    renderWithClient()
    const tree = await screen.findByRole('tree', { name: /repository files/i })
    expect(within(tree).getByText('README.md')).toBeInTheDocument()

    await selectTrackedVisibility(/^local$/i)

    await waitFor(() => {
      expect(within(tree).getByText('dist')).toBeInTheDocument()
    })
    expect(within(tree).queryByText('README.md')).not.toBeInTheDocument()
  })

  it.each([
    ['show', 'hide', ['README.md']],
    ['hide', 'show', ['README.md', 'dist']],
    ['hide', 'only', ['dist']],
  ] as const)('applies %s -> %s from the set-tracked-visibility native command and syncs the state back to native', async (initial, target, visibleAfter) => {
    window.history.replaceState(null, '', `/?generatedLocalVisibility=${initial}`)
    const postMessage = vi.fn()
    Object.defineProperty(window, 'webkit', {
      value: { messageHandlers: { gitlocalNative: { postMessage } } },
      configurable: true,
    })

    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'README.md', path: 'README.md', type: 'file', localOnly: false, generatedLocalState: 'tracked' },
      { name: 'dist', path: 'dist', type: 'dir', localOnly: true, generatedLocalState: 'generated' },
    ])

    renderWithClient()
    const tree = await screen.findByRole('tree', { name: /repository files/i })
    await within(tree).findByText('README.md')

    postMessage.mockClear()
    window.dispatchEvent(new CustomEvent('gitlocal:native-command', {
      detail: { command: 'set-tracked-visibility', message: target },
    }))

    await waitFor(() => {
      for (const name of ['README.md', 'dist'] as const) {
        if ((visibleAfter as readonly string[]).includes(name)) {
          expect(within(tree).getByText(name)).toBeInTheDocument()
        } else {
          expect(within(tree).queryByText(name)).not.toBeInTheDocument()
        }
      }
    })
    expect(postMessage).toHaveBeenCalledWith({ command: 'tracked-visibility-state', value: target })
  })

  it('does not render a Refresh button in the top toolbar', async () => {
    renderWithClient()

    await screen.findByRole('button', { name: /toggle terminal/i })
    expect(screen.queryByRole('button', { name: /refresh current page/i })).not.toBeInTheDocument()
  })

  it('shows an icon on the Refresh action in the View options menu', async () => {
    renderWithClient()

    await userEvent.setup().click(await screen.findByRole('button', { name: /view options/i }))
    const refresh = await screen.findByRole('menuitem', { name: /^refresh$/i })
    expect(refresh.querySelector('svg')).toBeInTheDocument()
  })

  it('renders Parent Folder as a plain/low-emphasis control and Terminal as a highlighted control', async () => {
    renderWithClient()

    const terminal = await screen.findByRole('button', { name: /toggle terminal/i })
    const [parentFolder] = await screen.findAllByRole('button', { name: 'Parent Folder' })

    expect(parentFolder.className).toContain('text-[var(--muted-foreground)] hover:bg-[var(--muted)]')
    expect(terminal.className).toContain('text-[var(--success)]')
  })

  it('orders toolbar buttons from most page-specific to most global: Parent Folder, Terminal', async () => {
    renderWithClient()

    const toolbarButtons = await screen.findAllByRole('button', {
      name: /^parent folder$|toggle terminal/i,
    })
    expect(toolbarButtons[0]).toHaveAccessibleName('Parent Folder')
    expect(toolbarButtons[1]).toHaveAccessibleName(/toggle terminal/i)
  })

  it('calls refreshCurrentView from the Ctrl+Alt+R shortcut', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')
    renderWithClient()

    await screen.findByText('guide content')
    vi.mocked(api.getFile).mockClear()

    fireEvent.keyDown(window, { key: 'r', ctrlKey: true, altKey: true })

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', false)
    })
  })

  it('toggles the theme and persists the preference', async () => {
    renderWithClient()

    const toggle = await screen.findByRole('switch', { name: /toggle dark theme/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(setItem).toHaveBeenCalledWith('gitlocal-theme', 'dark')
    })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('shows an icon on the Light/Dark Theme control', async () => {
    renderWithClient()

    const toggle = await screen.findByRole('switch', { name: /toggle dark theme/i })
    expect(toggle.closest('label')?.querySelector('svg')).toBeInTheDocument()
  })

  it('updates the repository-local git identity from the header dialog', async () => {
    let gitUser = {
      name: 'Local User',
      email: 'local@example.com',
      source: 'local' as const,
    }

    vi.mocked(api.getInfo).mockImplementation(async () => ({
      ...buildInfo('main'),
      gitContext: {
        user: gitUser,
        remote: buildInfo('main').gitContext.remote,
      },
    }))
    vi.mocked(api.getGitIdentitySshKeys).mockResolvedValueOnce({
      directory: { path: '/home/user/.ssh', exists: true, readable: true },
      keys: [{ name: 'id_ed25519', path: '/home/user/.ssh/id_ed25519' }],
      message: 'Found 1 SSH private key.',
    })
    vi.mocked(api.updateGitIdentity).mockImplementation(async (payload) => {
      gitUser = {
        name: payload.name,
        email: payload.email,
        source: 'local',
      }
      return {
        ok: true,
        message: 'Repository git identity updated.',
        user: gitUser,
      }
    })

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /expand repository details/i }))
    fireEvent.click(await screen.findByRole('button', { name: /edit repository git identity/i }))

    expect(await screen.findByRole('heading', { name: /edit repository git identity/i })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/choose ssh key/i), {
      target: { value: '/home/user/.ssh/id_ed25519' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /git user name/i }), {
      target: { value: 'Updated User' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /git user email/i }), {
      target: { value: 'updated@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save identity/i }))

    await waitFor(() => {
      expect(api.updateGitIdentity).toHaveBeenCalledWith({
        name: 'Updated User',
        email: 'updated@example.com',
        sshKeyPath: '/home/user/.ssh/id_ed25519',
      })
    })
    expect(api.validateGitIdentitySshKey).toHaveBeenCalledWith('/home/user/.ssh/id_ed25519')
    expect(await screen.findByText(/repository git identity updated\./i)).toBeInTheDocument()
    expect(await screen.findByText(/updated user <updated@example.com>/i)).toBeInTheDocument()
  })

  it('does not expose commit actions from the repo header', async () => {
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      trackedChangeCount: 1,
      pathSyncState: 'clean',
    }))

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /expand repository details/i }))
    expect(screen.queryByRole('button', { name: /^commit$/i })).not.toBeInTheDocument()
    expect(api.commitChanges).not.toHaveBeenCalled()
  })

  it('does not expose commit actions in the expanded repository context', async () => {
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      trackedChangeCount: 1,
      pathSyncState: 'clean',
    }))

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /expand repository details/i }))
    expect(screen.queryByRole('button', { name: /^commit$/i })).not.toBeInTheDocument()
  })

  it('does not expose remote sync actions from the repo header', async () => {
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      repoSync: {
        mode: 'ahead',
        aheadCount: 1,
        behindCount: 0,
        hasUpstream: true,
        upstreamRef: 'origin/main',
        remoteName: 'origin',
      },
    }))
    vi.mocked(api.syncWithRemote).mockResolvedValue({
      ok: true,
      status: 'pushed',
      message: 'Pushed main to origin/main.',
      aheadCount: 0,
      behindCount: 0,
    })

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /expand repository details/i }))
    expect(screen.queryByRole('button', { name: /push to remote|sync with remote/i })).not.toBeInTheDocument()
    expect(api.syncWithRemote).not.toHaveBeenCalled()
  })

  it('opens search from the compact trigger only', async () => {
    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open repository search/i }))
    expect(await screen.findByRole('searchbox', { name: /search query/i })).toBeInTheDocument()
  })

  it('shows an icon on the Find in File control', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    renderWithClient()

    const find = await screen.findByRole('button', { name: /find in file/i })
    expect(find.querySelector('svg')).toBeInTheDocument()
  })

  it('runs repository search only after explicit submit and uses the default combined mode', async () => {
    vi.mocked(api.getSearchResults).mockResolvedValueOnce({
      query: 'docs',
      branch: 'main',
      mode: 'both',
      caseSensitive: false,
      resultCount: 1,
      totalEstimate: 1,
      partial: false,
      results: [{ path: 'docs', type: 'dir', matchType: 'name', localOnly: false }],
    })

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open repository search/i }))
    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), {
      target: { value: 'docs' },
    })

    expect(api.getSearchResults).not.toHaveBeenCalledWith('docs', 'main', 'both', false, expect.anything())

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      expect(api.getSearchResults).toHaveBeenCalledWith('docs', 'main', 'both', false, expect.objectContaining({
        rootPath: '',
        contentKinds: 'all',
        trackedMode: 'tracked-only',
        limit: 50,
      }))
    })
    const searchLayer = await screen.findByTestId('search-layer')
    expect(await within(searchLayer).findByRole('button', { name: /docs/i })).toBeInTheDocument()
  })

  it('preserves the active file context while scoped search opens, selects, and closes', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')
    vi.mocked(api.getSearchResults).mockResolvedValueOnce({
      query: 'guide',
      branch: 'main',
      mode: 'both',
      caseSensitive: false,
      resultCount: 1,
      totalEstimate: 1,
      partial: false,
      results: [{
        path: 'docs/README.md',
        type: 'file',
        matchType: 'content',
        snippet: 'guide',
        line: 1,
        localOnly: false,
        scopeLabel: 'Markdown content',
      }],
    })

    renderWithClient()

    expect(await screen.findByText('guide content')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /open repository search/i }))
    expect(screen.getByText('guide content')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), {
      target: { value: 'guide' },
    })
    fireEvent.change(screen.getByLabelText(/folder scope/i), { target: { value: 'current' } })
    fireEvent.change(screen.getByLabelText(/content scope/i), { target: { value: 'markdown' } })
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      expect(api.getSearchResults).toHaveBeenCalledWith('guide', 'main', 'both', false, expect.objectContaining({
        rootPath: 'docs',
        contentKinds: 'markdown',
      }))
    })
    fireEvent.click(await screen.findByRole('button', { name: /docs\/README\.md/i }))

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('docs/README.md', 'main', false)
    })
    expect(screen.queryByTestId('search-layer')).not.toBeInTheDocument()
  })

  it('keeps dirty edits when search result, refresh, and branch navigation are canceled', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(api.getSearchResults).mockResolvedValueOnce({
      query: 'readme',
      branch: 'main',
      mode: 'both',
      caseSensitive: false,
      resultCount: 1,
      totalEstimate: 1,
      partial: false,
      results: [{ path: 'README.md', type: 'file', matchType: 'name', localOnly: false }],
    })

    renderWithClient()

    await screen.findByText('guide content')
    await userEvent.setup().click(await screen.findByRole('button', { name: /file actions/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /edit file/i }))
    fireEvent.change(screen.getByLabelText(/edit file content/i), { target: { value: 'dirty guide' } })

    fireEvent.click(await screen.findByRole('button', { name: /open repository search/i }))
    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), { target: { value: 'readme' } })
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /README\.md/i }))

    expect(confirmSpy).toHaveBeenCalledWith('Discard your unsaved file changes?')
    expect(screen.getByTestId('search-layer')).toBeInTheDocument()
    expect(screen.getByLabelText(/edit file content/i)).toHaveValue('dirty guide')
    expect(api.getFile).not.toHaveBeenCalledWith('README.md', 'main', false)

    await clickRefreshViaViewOptions()
    expect(screen.queryByText(/refreshing current view/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/edit file content/i)).toHaveValue('dirty guide')

    fireEvent.change(screen.getByRole('combobox', { name: /branch selector/i }), { target: { value: 'origin/release' } })
    expect(api.switchBranch).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: /branch selector/i })).toHaveValue('main')
  })

  it('collapses and restores the repository tree rail', async () => {
    const { container } = renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /collapse navigation/i }))
    const collapsedRail = await screen.findByLabelText(/collapsed navigation/i)
    expect(collapsedRail).toBeInTheDocument()
    expect(within(collapsedRail).getAllByRole('button')).toHaveLength(1)
    expect(within(collapsedRail).getByRole('button', { name: /expand navigation/i })).toBeInTheDocument()
    expect(within(collapsedRail).queryByRole('button', { name: /open repository search/i })).not.toBeInTheDocument()
    expect(within(collapsedRail).queryByRole('button', { name: /open changed files/i })).not.toBeInTheDocument()
    expect(within(collapsedRail).queryByRole('button', { name: /show recent files/i })).not.toBeInTheDocument()
    expect(within(collapsedRail).queryByRole('button', { name: /show key documents/i })).not.toBeInTheDocument()
    expect(within(collapsedRail).queryByRole('button', { name: /open current folder/i })).not.toBeInTheDocument()
    const expandNavigation = within(collapsedRail).getByRole('button', { name: /expand navigation/i })
    for (let tabCount = 0; tabCount < 10 && document.activeElement !== expandNavigation; tabCount += 1) {
      await userEvent.tab()
    }
    expect(expandNavigation).toHaveFocus()
    expect((await axe(container)).violations).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: /expand navigation/i }))
    expect(await screen.findByRole('tree', { name: /repository files/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /open repository search/i }))
    expect(await screen.findByRole('searchbox', { name: /search query/i })).toBeInTheDocument()
  })

  it('shows root dashboard shortcuts and navigates from key documents', async () => {
    window.history.replaceState(null, '', '/?branch=main')
    vi.mocked(api.getReadme).mockResolvedValue({ path: '' })
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'docs', path: 'docs', type: 'dir', localOnly: false },
    ])
    renderWithClient()

    expect(await screen.findByRole('region', { name: /repository dashboard/i })).toBeInTheDocument()
    const keyDocuments = screen.getByRole('region', { name: /key documents/i })
    expect(keyDocuments).toBeInTheDocument()
    fireEvent.click(within(keyDocuments).getByRole('button', { name: /README.*Repository overview/i }))

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('README.md', 'main', false)
    })
  })

  it('loads repository summary into the header and propagates generated/local visibility state', async () => {
    vi.mocked(api.getRepoSummary).mockResolvedValue({
      repoName: 'repo',
      branch: 'main',
      statusSummary: {
        text: 'main is up to date with origin/main. It has 2 local changes to review.',
        tone: 'info',
        remoteLabel: 'origin',
        syncState: 'up-to-date',
        localChangeCount: 2,
        untrackedChangeCount: 1,
      },
      keyDocuments: [],
      recentItems: [],
      visibility: { generatedLocalMode: 'hide', hiddenCount: 4 },
    })

    renderWithClient()

    expect(await screen.findByText(/2 local changes/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /repository status summary/i })).not.toBeInTheDocument()
    await selectTrackedVisibility(/^all$/i)

    await waitFor(() => {
      expect(api.getNavigationHints).toHaveBeenCalledWith('main', true, true)
    })
  })

  it('updates generated and local visibility in navigation and search state', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'README.md', path: 'README.md', type: 'file', localOnly: false, generatedLocalState: 'tracked' },
      { name: 'dist', path: 'dist', type: 'dir', localOnly: true, generatedLocalState: 'generated' },
    ])

    renderWithClient()

    const tree = await screen.findByRole('tree', { name: /repository files/i })
    expect(within(tree).getByText('README.md')).toBeInTheDocument()
    await selectTrackedVisibility(/^local$/i)

    await waitFor(() => {
      expect(within(tree).getByText('dist')).toBeInTheDocument()
    })
    expect(within(tree).queryByText('README.md')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(api.getNavigationHints).toHaveBeenCalledWith('main', true, true)
    })
  })

  it('falls back to the current repository branch when the saved branch is unavailable', async () => {
    window.history.replaceState(null, '', '/?branch=missing-branch')

    renderWithClient()

    expect(await screen.findByRole('combobox', { name: /branch selector/i })).toHaveValue('main')
  })

  it('switches to a remote-tracking branch and reconciles a missing selected path after checkout', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    let currentBranch = 'main'

    vi.mocked(api.getInfo).mockImplementation(async () => buildInfo(currentBranch))
    vi.mocked(api.getBranches).mockImplementation(async () => buildBranches(currentBranch))
    vi.mocked(api.switchBranch).mockImplementation(async (payload) => {
      expect(payload).toEqual({
        target: 'origin/release',
        resolution: 'preview',
      })
      currentBranch = 'release'
      return {
        ok: true,
        status: 'switched',
        message: 'Switched to release.',
        currentBranch: 'release',
        createdTrackingBranch: 'release',
      }
    })
    vi.mocked(api.getSyncStatus).mockImplementation(async (path, branch) => {
      if (path === 'docs/guide.md' && branch === 'release') {
        return {
          ...buildSyncStatus({
            branch: 'release',
            workingTreeRevision: 'release-rev',
            treeStatus: 'invalid',
            fileStatus: 'deleted',
            currentPath: 'docs/guide.md',
            resolvedPath: 'docs',
            currentPathType: 'missing',
            resolvedPathType: 'dir',
            repoSync: {
              mode: 'up-to-date',
              aheadCount: 0,
              behindCount: 0,
              hasUpstream: true,
              upstreamRef: 'origin/release',
              remoteName: 'origin',
            },
          }),
        }
      }

      return buildSyncStatus({
        branch: branch ?? currentBranch,
        workingTreeRevision: `${branch ?? currentBranch}-rev`,
        currentPath: path ?? '',
        resolvedPath: path ?? '',
        currentPathType: path ? 'file' : 'none',
        resolvedPathType: path ? 'file' : 'none',
        pathSyncState: path ? 'clean' : 'none',
        repoSync: {
          mode: 'up-to-date',
          aheadCount: 0,
          behindCount: 0,
          hasUpstream: true,
          upstreamRef: `origin/${branch ?? currentBranch}`,
          remoteName: 'origin',
        },
      })
    })

    renderWithClient()

    fireEvent.change(await screen.findByRole('combobox', { name: /branch selector/i }), {
      target: { value: 'origin/release' },
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /branch selector/i })).toHaveValue('release')
    })
    expect(await screen.findByRole('heading', { name: 'docs' })).toBeInTheDocument()
    expect(await screen.findByText(/moved you to docs/i)).toBeInTheDocument()
    expect(api.getSyncStatus).toHaveBeenCalledWith('docs/guide.md', 'release')
  })

  it('opens the branch switch dialog and commits before switching', async () => {
    let currentBranch = 'main'

    vi.mocked(api.getInfo).mockImplementation(async () => buildInfo(currentBranch))
    vi.mocked(api.getBranches).mockImplementation(async () => [
      {
        name: 'main',
        displayName: 'main',
        scope: 'local',
        hasLocalCheckout: true,
        isCurrent: currentBranch === 'main',
      },
      {
        name: 'feature',
        displayName: 'feature',
        scope: 'local',
        hasLocalCheckout: true,
        isCurrent: currentBranch === 'feature',
      },
    ])
    vi.mocked(api.switchBranch).mockImplementation(async (payload) => {
      if (payload.resolution === 'preview') {
        return {
          ok: false,
          status: 'confirmation-required',
          message: 'This branch switch needs confirmation because your working tree has uncommitted changes.',
          currentBranch: 'main',
          trackedChangeCount: 1,
          untrackedChangeCount: 0,
          blockingPaths: ['README.md'],
          suggestedCommitMessage: 'WIP before switching to feature',
        }
      }

      expect(payload).toEqual({
        target: 'feature',
        resolution: 'commit',
        commitMessage: 'save before switch',
      })
      currentBranch = 'feature'
      return {
        ok: true,
        status: 'switched',
        message: 'Switched to feature.',
        currentBranch: 'feature',
      }
    })

    renderWithClient()

    fireEvent.change(await screen.findByRole('combobox', { name: /branch selector/i }), {
      target: { value: 'feature' },
    })

    expect(await screen.findByRole('heading', { name: /switch branches/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('WIP before switching to feature')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/commit message/i), {
      target: { value: 'save before switch' },
    })
    fireEvent.click(screen.getByRole('button', { name: /commit and switch/i }))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /branch selector/i })).toHaveValue('feature')
    })
    expect(await screen.findByText(/switched to feature/i)).toBeInTheDocument()
  })

  it('creates a folder from the current folder view', async () => {
    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open folder docs/i }))

    await userEvent.setup().click(await screen.findByRole('button', { name: /folder actions/i }))
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /new folder here/i }))
    fireEvent.change(screen.getByLabelText(/folder name/i), {
      target: { value: 'new-folder' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create folder$/i }))

    await waitFor(() => {
      expect(api.createFolder).toHaveBeenCalledWith({ parentPath: 'docs', name: 'new-folder' })
    })
    expect(await screen.findByText(/folder created successfully/i)).toBeInTheDocument()
  }, 15000)

  it('requires exact typed confirmation before deleting a folder', async () => {
    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open folder docs/i }))
    await userEvent.setup().click(await screen.findByRole('button', { name: /folder actions/i }))
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /^delete folder$/i }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getAllByText(/2 files/i).length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText(/1 nested folder/i).length).toBeGreaterThan(0)
    const deleteButton = within(dialog).getByRole('button', { name: /^delete folder$/i })
    expect(deleteButton).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText(/folder deletion confirmation name/i), {
      target: { value: 'wrong' },
    })
    expect(deleteButton).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText(/folder deletion confirmation name/i), {
      target: { value: 'docs' },
    })
    expect(deleteButton).not.toBeDisabled()
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(api.deleteFolder).toHaveBeenCalledWith({
        path: 'docs',
        confirmationName: 'docs',
        previewFileCount: 2,
        previewFolderCount: 1,
        previewImpactToken: 'impact-docs',
      })
    })
    expect(await screen.findByText(/folder deleted successfully/i)).toBeInTheDocument()
  }, 15000)

  it('cancels typed file delete confirmation without deleting the file', async () => {
    renderWithClient()

    const tree = await screen.findByRole('tree', { name: /repository files/i })
    fireEvent.click(await within(tree).findByText('README.md'))
    await userEvent.setup().click(await screen.findByRole('button', { name: /file actions/i }))
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /^delete file$/i }))

    const dialog = await screen.findByRole('alertdialog')
    fireEvent.change(within(dialog).getByLabelText(/file deletion confirmation name/i), {
      target: { value: 'README.md' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(api.deleteFile).not.toHaveBeenCalled()
    expect(await screen.findByText(/root readme/i)).toBeInTheDocument()
  }, 15000)

  it('opens the picker page and footer in picker mode', async () => {
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: '',
      path: '/tmp',
      currentBranch: '',
      isGitRepo: false,
      pickerMode: true,
      version: APP_VERSION.version,
      hasCommits: false,
      rootEntryCount: 0,
      gitContext: null,
    })

    renderWithClient()

    expect(await screen.findByText(/choose what gitlocal should open/i)).toBeInTheDocument()
    expect(screen.getByText(`v${APP_VERSION.version}`)).toBeInTheDocument()
  })

  it('shows a failure screen with a retry action instead of the app shell when the bootstrap info fetch fails', async () => {
    vi.mocked(api.getInfo).mockReset()
    vi.mocked(api.getInfo).mockRejectedValueOnce({ error: 'Permission was denied while accessing this path.', code: 'PERMISSION_DENIED' })
    vi.mocked(api.getInfo).mockResolvedValueOnce(buildInfo('main'))

    renderWithClient()

    expect(await screen.findByText(/couldn't load this workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/permission was denied while accessing this path/i)).toBeInTheDocument()
    expect(screen.queryByText(/root readme/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText(/root readme/i)).toBeInTheDocument()
  })

  it('falls back to a generic description when the bootstrap info fetch fails with no usable error message', async () => {
    vi.mocked(api.getInfo).mockReset()
    vi.mocked(api.getInfo).mockRejectedValue('boom')

    renderWithClient()

    expect(await screen.findByText(/couldn't load this workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/something went wrong while checking the current launch context/i)).toBeInTheDocument()
  })

  it('does not surface a startup-folder fallback banner while the app is in picker mode', async () => {
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: '',
      path: '/tmp',
      currentBranch: '',
      isGitRepo: false,
      pickerMode: true,
      version: APP_VERSION.version,
      hasCommits: false,
      rootEntryCount: 0,
      gitContext: null,
    })
    vi.mocked(api.getStartupFolder).mockResolvedValue({
      path: '/tmp/Documents',
      source: 'platform-default',
      exists: true,
      readable: true,
      platformDefaultPath: '/tmp/Documents',
      lastUsedPath: '/tmp/gone',
      fallbackReason: 'Last used folder no longer exists.',
    })

    renderWithClient()

    expect(await screen.findByText(/choose what gitlocal should open/i)).toBeInTheDocument()
    // PickerPage.tsx legitimately shows this via its own startupMessage mechanism (US2) — what
    // this guards against is App.tsx's separate status-banner effect *also* redundantly setting
    // it, since App.tsx's main shell (where that banner lives) never renders in picker mode.
    expect(document.querySelector('.status-banner')).not.toBeInTheDocument()
  })

  it('shows why the startup folder fell back to a default when the remembered folder is unavailable (US2)', async () => {
    vi.mocked(api.getStartupFolder).mockResolvedValueOnce({
      path: '/tmp/Documents',
      source: 'platform-default',
      exists: true,
      readable: true,
      platformDefaultPath: '/tmp/Documents',
      lastUsedPath: '/tmp/gone',
      fallbackReason: 'Last used folder no longer exists.',
    })

    renderWithClient()

    // Regression guard: /api/startup-folder's fallbackReason must reach the main app view
    // (not just the picker), since a successful fallback resolution never enters picker mode.
    expect(await screen.findByText(/last used folder no longer exists/i)).toBeInTheDocument()
  })
})
