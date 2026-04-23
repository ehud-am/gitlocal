import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'jest-axe'
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
      queries: {
        retry: false,
      },
    },
  })

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('SearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getSearchResults).mockResolvedValue({
      query: 'gui',
      branch: 'main',
      mode: 'name',
      caseSensitive: false,
      results: [{ path: 'docs/guide.md', type: 'file', matchType: 'name', localOnly: false }],
    })
  })

  it('shows guidance before the minimum query length and has no obvious a11y violations', async () => {
    const onDismiss = vi.fn()
    const { container } = renderWithClient(
      <SearchPanel
        branch="main"
        query=""
        autoFocus
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByText(/results appear after 3 characters/i)).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('searchbox', { name: /search query/i }), { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByRole('searchbox', { name: /search query/i }), { key: 'Enter' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('updates the trimmed query and renders results', async () => {
    const onQueryChange = vi.fn()
    const onSelectResult = vi.fn()

    renderWithClient(
      <SearchPanel
        branch="main"
        query="gui"
        onQueryChange={onQueryChange}
        onSelectResult={onSelectResult}
        onDismiss={vi.fn()}
      />,
    )

    expect(await screen.findByText('docs/guide.md')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), {
      target: { value: '  docs  ' },
    })
    expect(onQueryChange).toHaveBeenCalledWith('docs')

    fireEvent.click(screen.getByRole('button', { name: /docs\/guide\.md/i }))
    expect(onSelectResult).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'docs/guide.md' }),
    )
  })

  it('shows loading and error states for active searches', async () => {
    let rejectSearch: ((error: Error) => void) | undefined
    vi.mocked(api.getSearchResults).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectSearch = reject
        }),
    )

    renderWithClient(
      <SearchPanel
        branch="main"
        query="guid"
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(await screen.findByText(/searching/i)).toBeInTheDocument()

    rejectSearch?.(new Error('failed'))

    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeInTheDocument()
    })
  })

  it('renders an empty result list when the API returns no matches', async () => {
    vi.mocked(api.getSearchResults).mockResolvedValueOnce({
      query: 'none',
      branch: 'main',
      mode: 'name',
      caseSensitive: false,
      results: [],
    })

    renderWithClient(
      <SearchPanel
        branch="main"
        query="none"
        onQueryChange={vi.fn()}
        onSelectResult={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(await screen.findByText(/no files or folders matched the current search/i)).toBeInTheDocument()
  })
})
