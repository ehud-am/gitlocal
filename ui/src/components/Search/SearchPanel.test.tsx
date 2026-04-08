import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SearchPanel from './SearchPanel'

vi.mock('../../services/api', () => ({
  api: {
    getSearchResults: vi.fn(),
  },
}))

import { api } from '../../services/api'

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('SearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getSearchResults).mockResolvedValue({
      query: 'readme',
      branch: 'main',
      mode: 'name',
      caseSensitive: false,
      results: [
        { path: 'README.md', type: 'file', matchType: 'name', localOnly: false },
      ],
    })
  })

  it('runs a name search and renders results', async () => {
    const onQueryChange = vi.fn()
    renderWithClient(
      <SearchPanel
        branch="main"
        query="readme"
        onQueryChange={onQueryChange}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(api.getSearchResults).toHaveBeenCalledWith('readme', 'main')
    })
    expect(await screen.findByText('README.md')).toBeInTheDocument()
  })

  it('does not search before the 3-character threshold', () => {
    renderWithClient(
      <SearchPanel
        branch="main"
        query=""
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(api.getSearchResults).not.toHaveBeenCalled()
    expect(screen.getByText(/type 3 or more characters/i)).toBeInTheDocument()
  })

  it('navigates through a selected result', async () => {
    const onSelectResult = vi.fn()
    renderWithClient(
      <SearchPanel
        branch="main"
        query="readme"
        onQueryChange={vi.fn()}
        onSelectResult={onSelectResult}
        onDismiss={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /readme\.md/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /readme\.md/i }))
    expect(onSelectResult).toHaveBeenCalled()
  })

  it('renders folder results and passes them through selection', async () => {
    const onSelectResult = vi.fn()
    vi.mocked(api.getSearchResults).mockResolvedValueOnce({
      query: 'igno',
      branch: 'main',
      mode: 'name',
      caseSensitive: false,
      results: [
        { path: 'ignored-dir', type: 'dir', matchType: 'name', localOnly: true },
      ],
    })

    renderWithClient(
      <SearchPanel
        branch="main"
        query="igno"
        onQueryChange={vi.fn()}
        onSelectResult={onSelectResult}
        onDismiss={vi.fn()}
      />,
    )

    const folderResult = await screen.findByRole('button', { name: /ignored-dir/i })
    fireEvent.click(folderResult)

    expect(onSelectResult).toHaveBeenCalledWith({
      path: 'ignored-dir',
      type: 'dir',
      matchType: 'name',
      localOnly: true,
    })
  })

  it('shows a local-only cue for ignored search results', async () => {
    vi.mocked(api.getSearchResults).mockResolvedValueOnce({
      query: 'env',
      branch: 'main',
      mode: 'name',
      caseSensitive: false,
      results: [
        { path: '.env', type: 'file', matchType: 'name', localOnly: true },
      ],
    })

    renderWithClient(
      <SearchPanel
        branch="main"
        query="env"
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(await screen.findByText(/local only/i)).toBeInTheDocument()
  })

  it('shows a dismiss control and expanded idle messaging', () => {
    const { container } = renderWithClient(
      <SearchPanel
        branch="main"
        query=""
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(container.querySelector('.search-panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close search/i })).toBeInTheDocument()
    expect(screen.getByText(/type 3 or more characters/i)).toBeInTheDocument()
    expect(screen.getByText(/cmd\/ctrl \+ f/i)).toBeInTheDocument()
  })

  it('dismisses search on Escape', () => {
    const onDismiss = vi.fn()
    renderWithClient(
      <SearchPanel
        branch="main"
        query=""
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={onDismiss}
      />,
    )

    fireEvent.keyDown(screen.getByRole('searchbox', { name: /search query/i }), { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalled()
  })

  it('renders the floating-card header copy for the modern overlay', () => {
    renderWithClient(
      <SearchPanel
        branch="main"
        query=""
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText(/type at least 3 characters/i)).toBeInTheDocument()
  })

  it('reports live query updates as the user types', () => {
    const onQueryChange = vi.fn()
    renderWithClient(
      <SearchPanel
        branch="main"
        query=""
        onQueryChange={onQueryChange}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), { target: { value: 'rea' } })
    expect(onQueryChange).toHaveBeenLastCalledWith('rea')
  })
})
