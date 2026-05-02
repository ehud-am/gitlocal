import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

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
    createFolder: vi.fn(),
    getFolderDeletePreview: vi.fn(),
    deleteFolder: vi.fn(),
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

    getItem.mockReturnValue(null)

    vi.mocked(api.getInfo).mockResolvedValue(buildInfo('main'))
    vi.mocked(api.getReadme).mockImplementation(async (path?: string) => ({
      path: path === 'docs' ? 'docs/README.md' : 'README.md',
    }))
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
    vi.mocked(api.showParentPicker).mockResolvedValue({ ok: true, error: '' })
    vi.mocked(api.getPickBrowse).mockResolvedValue({
      currentPath: '/tmp',
      parentPath: '/',
      homePath: '/tmp',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
      isGitRepo: false,
      canOpen: false,
      canCreateChild: true,
      canInitGit: true,
      canCloneIntoChild: true,
    })
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })
    vi.mocked(api.updateGitIdentity).mockResolvedValue({
      ok: true,
      message: 'Repository git identity updated.',
      user: {
        name: 'Updated User',
        email: 'updated@example.com',
        source: 'local',
      },
    })
  })

  it('renders the repo context header with git metadata plus the root folder README preview', async () => {
    renderWithClient()

    expect(await screen.findByRole('heading', { name: 'repo' })).toBeInTheDocument()
    expect(screen.getByText('Remote')).toBeInTheDocument()
    expect(screen.queryByText('/tmp/repo')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /browse parent folder/i })).not.toBeInTheDocument()
    expect(await screen.findByText(/root readme/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand repository details/i }))

    expect(await screen.findByText('Repository details')).toBeInTheDocument()
    expect(screen.getByText('/tmp/repo')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/ehud-am/gitlocal')).toBeInTheDocument()
    expect(screen.getByText(/local user <local@example.com>/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://github.com/ehud-am/gitlocal' })).toBeInTheDocument()
  })

  it('opens an info modal before leaving the repository from the root .. row', async () => {
    vi.mocked(api.showParentPicker).mockResolvedValueOnce({
      ok: false,
      error: 'Parent folder unavailable.',
    })

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open parent folder outside this repository/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: /leave this repository/i })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /open parent folder/i }))

    await waitFor(() => {
      expect(api.showParentPicker).toHaveBeenCalledTimes(1)
    })
  })

  it('hydrates a saved file selection and search state from the URL', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file&searchPresentation=expanded&searchQuery=guide')

    renderWithClient()

    expect(await screen.findByRole('searchbox', { name: /search query/i })).toHaveValue('guide')
    expect(await screen.findByText('guide content')).toBeInTheDocument()
    expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', false)
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
      })
    })
    expect(await screen.findByText(/repository git identity updated\./i)).toBeInTheDocument()
    expect(await screen.findByText(/updated user <updated@example.com>/i)).toBeInTheDocument()
  })

  it('commits local changes from the repo header action', async () => {
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      trackedChangeCount: 1,
      pathSyncState: 'clean',
    }))

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /expand repository details/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^commit$/i }))
    expect(await screen.findByRole('heading', { name: /commit local changes/i })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /commit message/i }), {
      target: { value: 'Save current work' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^commit changes$/i }))

    await waitFor(() => {
      expect(api.commitChanges).toHaveBeenCalledWith({ message: 'Save current work' })
    })
    expect(await screen.findByText(/committed changes as abc1234/i)).toBeInTheDocument()
  })

  it('has no obvious accessibility violations for the commit dialog flow', async () => {
    vi.mocked(api.getSyncStatus).mockResolvedValue(buildSyncStatus({
      trackedChangeCount: 1,
      pathSyncState: 'clean',
    }))

    const { container } = renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /expand repository details/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^commit$/i }))
    expect(await screen.findByRole('heading', { name: /commit local changes/i })).toBeInTheDocument()
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('syncs with the remote from the repo header action', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: /push to remote/i }))

    await waitFor(() => {
      expect(api.syncWithRemote).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText(/pushed main to origin\/main/i)).toBeInTheDocument()
  })

  it('opens search from the compact trigger only', async () => {
    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open repository search/i }))
    expect(await screen.findByRole('searchbox', { name: /search query/i })).toBeInTheDocument()
  })

  it('runs repository search only after explicit submit and uses the default combined mode', async () => {
    vi.mocked(api.getSearchResults).mockResolvedValueOnce({
      query: 'docs',
      branch: 'main',
      mode: 'both',
      caseSensitive: false,
      results: [{ path: 'docs', type: 'dir', matchType: 'name', localOnly: false }],
    })

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open repository search/i }))
    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), {
      target: { value: 'docs' },
    })

    expect(api.getSearchResults).not.toHaveBeenCalledWith('docs', 'main', 'both', false)

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      expect(api.getSearchResults).toHaveBeenCalledWith('docs', 'main', 'both', false)
    })
    const searchLayer = await screen.findByTestId('search-layer')
    expect(await within(searchLayer).findByRole('button', { name: /docs/i })).toBeInTheDocument()
  })

  it('collapses and restores the repository tree rail', async () => {
    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /collapse navigation/i }))
    expect(await screen.findByLabelText(/collapsed navigation/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand navigation/i }))
    expect(await screen.findByRole('tree', { name: /repository files/i })).toBeInTheDocument()
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

    const docsButtons = await screen.findAllByRole('button', { name: /open folder docs/i })
    fireEvent.click(docsButtons[0])

    fireEvent.click(await screen.findByRole('button', { name: /new folder here/i }))
    fireEvent.change(screen.getByLabelText(/folder name/i), {
      target: { value: 'new-folder' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create folder$/i }))

    await waitFor(() => {
      expect(api.createFolder).toHaveBeenCalledWith({ parentPath: 'docs', name: 'new-folder' })
    })
    expect(await screen.findByText(/folder created successfully/i)).toBeInTheDocument()
  })

  it('requires exact typed confirmation before deleting a folder', async () => {
    renderWithClient()

    const deleteButtons = await screen.findAllByRole('button', { name: /delete folder docs/i })
    fireEvent.click(deleteButtons[0])

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
  })

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

    expect(await screen.findByText(/choose the folder gitlocal should open/i)).toBeInTheDocument()
    expect(screen.getByText(`v${APP_VERSION.version}`)).toBeInTheDocument()
  })
})
