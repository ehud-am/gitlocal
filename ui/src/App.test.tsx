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
    getSearchResults: vi.fn(),
  },
}))

import { api } from './services/api'

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
    window.history.replaceState(null, '', '/?branch=main&path=docs/guide.md&sidebarCollapsed=true&searchMode=content&searchQuery=hello&caseSensitive=true&raw=true')
    vi.mocked(api.getInfo).mockResolvedValue({
      name: 'repo',
      path: '/tmp/repo',
      currentBranch: 'main',
      isGitRepo: true,
      pickerMode: false,
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
      encoding: 'utf8',
    })
    vi.mocked(api.getSearchResults).mockResolvedValue({
      query: 'hello',
      branch: 'main',
      mode: 'content',
      caseSensitive: true,
      results: [],
    })
  })

  it('hydrates branch, file, sidebar state, and search state from the URL', async () => {
    renderWithClient()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show navigation/i })).toBeInTheDocument()
    })

    expect(api.getFile).toHaveBeenCalledWith('docs/guide.md', 'main', true)
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument()
  })

  it('shows a recovery status when sync reports a missing path', async () => {
    vi.mocked(api.getSyncStatus).mockResolvedValueOnce({
      branch: 'main',
      repoPath: '/tmp/repo',
      workingTreeRevision: 'def',
      treeStatus: 'invalid',
      fileStatus: 'deleted',
      currentPath: 'docs/guide.md',
      resolvedPath: '',
      currentPathType: 'missing',
      statusMessage: 'The current location is no longer available. GitLocal moved you to the nearest valid path.',
      checkedAt: new Date().toISOString(),
    })

    renderWithClient()

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/no longer available/i)
    })
  })

  it('can restore the sidebar from the header control', async () => {
    renderWithClient()

    const toggle = await screen.findByRole('button', { name: /show navigation/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByRole('tree', { name: /repository files/i })).toBeInTheDocument()
    })
  })
})
