import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
    getFile: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
    getSearchResults: vi.fn(),
    getPickBrowse: vi.fn(),
    submitPick: vi.fn(),
  },
}))

import { api } from './services/api'

const APP_VERSION = JSON.parse(
  readFileSync(resolve(process.cwd(), '../package.json'), 'utf-8'),
) as { version: string }

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
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/?repoPath=%2Ftmp%2Frepo&branch=main&path=docs/guide.md&pathType=file&sidebarCollapsed=true&searchPresentation=expanded&searchQuery=hello&raw=true')
    vi.mocked(api.getInfo).mockResolvedValue({
      name: 'repo',
      path: '/tmp/repo',
      currentBranch: 'main',
      isGitRepo: true,
      pickerMode: false,
      version: APP_VERSION.version,
      hasCommits: true,
      rootEntryCount: 1,
    })
    vi.mocked(api.getReadme).mockResolvedValue({ path: 'README.md' })
    vi.mocked(api.getSyncStatus).mockResolvedValue({
      branch: 'main',
      repoPath: '/tmp/repo',
      workingTreeRevision: 'abc',
      treeStatus: 'unchanged',
      fileStatus: 'unchanged',
      currentPath: 'docs/guide.md',
      resolvedPath: 'docs/guide.md',
      currentPathType: 'file',
      resolvedPathType: 'file',
      statusMessage: '',
      checkedAt: new Date().toISOString(),
    })
    vi.mocked(api.getTree).mockResolvedValue([])
    vi.mocked(api.getBranches).mockResolvedValue([{ name: 'main', isCurrent: true }])
    vi.mocked(api.getCommits).mockResolvedValue([])
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'docs/guide.md',
      type: 'text',
      content: 'hello',
      language: 'markdown',
      encoding: 'utf-8',
      editable: true,
      revisionToken: 'rev-docs',
    })
    vi.mocked(api.getSearchResults).mockResolvedValue({
      query: 'hello',
      branch: 'main',
      mode: 'name',
      caseSensitive: false,
      results: [],
    })
    vi.mocked(api.getPickBrowse).mockResolvedValue({
      currentPath: '/tmp',
      parentPath: '/',
      homePath: '/tmp',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
    })
  })

  it('hydrates branch, file, sidebar state, and search state from the URL', async () => {
    renderWithClient()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /expand navigation/i })).toBeInTheDocument()
    })

    expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', true)
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument()
  })

  it('shows a compact search trigger when search is idle', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    renderWithClient()

    expect(await screen.findByRole('button', { name: /open repository search/i })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox', { name: /search query/i })).not.toBeInTheDocument()
  })

  it('opens search from the compact trigger', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /open repository search/i }))

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search query/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId('search-layer')).toBeInTheDocument()
  })

  it('opens search on Command+F or Control+F', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    renderWithClient()

    await screen.findByRole('button', { name: /open repository search/i })
    fireEvent.keyDown(window, { key: 'f', metaKey: true })

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search query/i })).toBeInTheDocument()
    })
  })

  it('collapses search and clears the query when dismissed', async () => {
    renderWithClient()

    fireEvent.click(await screen.findByRole('button', { name: /close search/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open repository search/i })).toBeInTheDocument()
    })

    expect(screen.queryByDisplayValue('hello')).not.toBeInTheDocument()
  })

  it('silently recovers when sync reports a missing path', async () => {
    vi.mocked(api.getSyncStatus).mockResolvedValueOnce({
      branch: 'main',
      repoPath: '/tmp/repo',
      workingTreeRevision: 'def',
      treeStatus: 'invalid',
      fileStatus: 'deleted',
      currentPath: 'docs/guide.md',
      resolvedPath: '',
      currentPathType: 'missing',
      resolvedPathType: 'none',
      statusMessage: 'The current location is no longer available. GitLocal moved you to the nearest valid path.',
      checkedAt: new Date().toISOString(),
    })

    renderWithClient()

    await waitFor(() => {
      expect(api.getFile).not.toHaveBeenCalledWith('docs/guide.md', 'main', true)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders a collapsed navigation rail with an in-panel restore icon', async () => {
    renderWithClient()

    expect(await screen.findByLabelText(/collapsed navigation/i)).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /expand navigation/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByRole('tree', { name: /repository files/i })).toBeInTheDocument()
    })
  })

  it('collapses the sidebar from the in-panel icon control', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file')

    renderWithClient()

    const toggle = await screen.findByRole('button', { name: /collapse navigation/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByLabelText(/collapsed navigation/i)).toBeInTheDocument()
    })
  })

  it('does not render live results before the 3-character threshold', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&pathType=file&searchPresentation=expanded&searchQuery=re')

    renderWithClient()

    expect(await screen.findByText(/type 3 or more characters/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /readme/i })).not.toBeInTheDocument()
  })

  it('navigates file quick-finder results and keeps the viewer synchronized', async () => {
    vi.mocked(api.getSearchResults).mockResolvedValue({
      query: 'read',
      branch: 'main',
      mode: 'name',
      caseSensitive: false,
      results: [{ path: 'README.md', type: 'file', matchType: 'name' }],
    })

    renderWithClient()

    const searchInput = await screen.findByRole('searchbox', { name: /search query/i })
    fireEvent.change(searchInput, { target: { value: 'read' } })

    const fileResult = await screen.findByRole('button', { name: /readme\.md/i })
    fireEvent.click(fileResult)

    await waitFor(() => {
      expect(api.getFile).toHaveBeenLastCalledWith('README.md', 'main', false)
    })
  })

  it('hydrates a saved folder selection without trying to load it as a file', async () => {
    window.history.replaceState(null, '', '/?branch=main&path=docs&pathType=dir')
    vi.mocked(api.getTree).mockImplementation(async (path?: string) => (
      path === 'docs'
        ? [{ name: 'guide.md', path: 'docs/guide.md', type: 'file' }]
        : []
    ))

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'docs' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /open file guide\.md/i })).toBeInTheDocument()
    })

    expect(api.getFile).not.toHaveBeenCalledWith('docs', 'main', expect.anything())
  })

  it('renders a fixed footer with the current year, product link, and running version', async () => {
    renderWithClient()

    const currentYear = new Date().getFullYear().toString()
    expect(await screen.findByText(currentYear)).toBeInTheDocument()
    expect(screen.getByText(`v${APP_VERSION.version}`)).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'GitLocal' })
    expect(link).toHaveAttribute('href', 'https://github.com/ehud-am/gitlocal')
  })

  it('renders the same footer in picker mode', async () => {
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: '',
      path: '/tmp',
      currentBranch: '',
      isGitRepo: false,
      pickerMode: true,
      version: APP_VERSION.version,
      hasCommits: false,
      rootEntryCount: 0,
    })

    renderWithClient()

    expect(await screen.findByText(/choose the folder gitlocal should open/i)).toBeInTheDocument()
    expect(screen.getByText(`v${APP_VERSION.version}`)).toBeInTheDocument()
  })

  it('falls back to the current repo branch when the saved URL branch is not available', async () => {
    window.history.replaceState(null, '', '/?branch=004-copy-control-polish&path=README.md&pathType=file')
    vi.mocked(api.getBranches).mockResolvedValue([{ name: 'main', isCurrent: true }])
    vi.mocked(api.getSyncStatus).mockResolvedValue({
      branch: 'main',
      repoPath: '/tmp/repo',
      workingTreeRevision: 'abc',
      treeStatus: 'unchanged',
      fileStatus: 'unchanged',
      currentPath: 'README.md',
      resolvedPath: 'README.md',
      currentPathType: 'file',
      resolvedPathType: 'file',
      statusMessage: '',
      checkedAt: new Date().toISOString(),
    })
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'README.md',
      type: 'markdown',
      content: '# hello',
      language: '',
      encoding: 'utf-8',
      editable: true,
      revisionToken: 'rev-readme',
    })

    renderWithClient()

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('README.md', 'main', false)
    })

    expect(screen.getByRole('status')).toHaveTextContent(/reset the saved branch/i)
  })

  it('clears the saved file context when a different repository is opened', async () => {
    window.history.replaceState(null, '', '/?repoPath=%2Ftmp%2Fold-repo&branch=main&path=docs%2Fguide.md&pathType=file&raw=true')
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: 'repo',
      path: '/tmp/new-repo',
      currentBranch: 'main',
      isGitRepo: true,
      pickerMode: false,
      version: APP_VERSION.version,
      hasCommits: true,
      rootEntryCount: 1,
    })
    vi.mocked(api.getFile).mockResolvedValueOnce({
      path: 'README.md',
      type: 'text',
      content: '# hello',
      language: 'markdown',
      encoding: 'utf-8',
      editable: true,
      revisionToken: 'rev-readme',
    })

    renderWithClient()

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('README.md', 'main', false)
    })

    expect(api.getFile).not.toHaveBeenCalledWith('docs/guide.md', 'main', true)
    expect(window.location.search).toContain('repoPath=%2Ftmp%2Fnew-repo')
    expect(window.location.search).toContain('path=README.md')
    expect(window.location.search).not.toContain('docs%2Fguide.md')
  })

  it('falls back to the current folder list after switching repositories resets the saved file context', async () => {
    window.history.replaceState(null, '', '/?repoPath=%2Ftmp%2Fold-repo&branch=main&path=docs%2Fguide.md&pathType=file')
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: 'repo',
      path: '/tmp/new-repo',
      currentBranch: 'main',
      isGitRepo: true,
      pickerMode: false,
      version: APP_VERSION.version,
      hasCommits: true,
      rootEntryCount: 2,
    })
    vi.mocked(api.getReadme).mockResolvedValueOnce({ path: '' })
    vi.mocked(api.getTree).mockImplementation(async (path?: string) => (
      path
        ? []
        : [
            { name: 'README.md', path: 'README.md', type: 'file' },
            { name: 'docs', path: 'docs', type: 'dir' },
          ]
    ))

    renderWithClient()

    expect(await screen.findByRole('status')).toHaveTextContent(/reset the saved file context/i)
    expect(screen.queryByRole('heading', { name: /pick up where you left off/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open file readme\.md/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open folder docs/i })).toBeInTheDocument()
  })

  it('shows an empty-repository landing state when there is no README and no root content', async () => {
    window.history.replaceState(null, '', '/')
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: 'repo',
      path: '/tmp/repo',
      currentBranch: '',
      isGitRepo: true,
      pickerMode: false,
      version: APP_VERSION.version,
      hasCommits: false,
      rootEntryCount: 0,
    })
    vi.mocked(api.getReadme).mockResolvedValueOnce({ path: '' })
    vi.mocked(api.getBranches).mockResolvedValueOnce([])

    renderWithClient()

    expect(await screen.findByRole('button', { name: /create first file/i })).toBeInTheDocument()
    expect(screen.getByText(/newly initialized or empty/i)).toBeInTheDocument()
  })

  it('opens a working-tree README by default before the first commit exists', async () => {
    window.history.replaceState(null, '', '/')
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: 'repo',
      path: '/tmp/repo',
      currentBranch: '',
      isGitRepo: true,
      pickerMode: false,
      version: APP_VERSION.version,
      hasCommits: false,
      rootEntryCount: 1,
    })
    vi.mocked(api.getReadme).mockResolvedValueOnce({ path: 'README.md' })
    vi.mocked(api.getFile).mockResolvedValueOnce({
      path: 'README.md',
      type: 'markdown',
      content: '# hello',
      language: '',
      encoding: 'utf-8',
      editable: true,
      revisionToken: 'rev-readme',
    })

    renderWithClient()

    await waitFor(() => {
      expect(api.getFile).toHaveBeenCalledWith('README.md', '', false)
    })
  })

  it('clears a stale saved branch when the opened repository has no commits yet', async () => {
    window.history.replaceState(null, '', '/?branch=main')
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: 'repo',
      path: '/tmp/repo',
      currentBranch: '',
      isGitRepo: true,
      pickerMode: false,
      version: APP_VERSION.version,
      hasCommits: false,
      rootEntryCount: 0,
    })
    vi.mocked(api.getReadme).mockResolvedValueOnce({ path: '' })
    vi.mocked(api.getBranches).mockResolvedValueOnce([])

    renderWithClient()

    expect(await screen.findByRole('status')).toHaveTextContent(/has no commits yet/i)
  })

  it('shows a missing-readme landing state when the repository has content but no README', async () => {
    window.history.replaceState(null, '', '/?branch=main')
    vi.mocked(api.getInfo).mockResolvedValueOnce({
      name: 'repo',
      path: '/tmp/repo',
      currentBranch: 'main',
      isGitRepo: true,
      pickerMode: false,
      version: APP_VERSION.version,
      hasCommits: true,
      rootEntryCount: 3,
    })
    vi.mocked(api.getReadme).mockResolvedValueOnce({ path: '' })
    vi.mocked(api.getTree).mockImplementation(async (path?: string) => (
      path
        ? []
        : [
            { name: 'src', path: 'src', type: 'dir' },
            { name: 'main.ts', path: 'main.ts', type: 'file' },
          ]
    ))

    renderWithClient()

    expect(await screen.findByRole('heading', { name: /no readme yet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open folder src/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open file main\.ts/i })).toBeInTheDocument()
  })
})
