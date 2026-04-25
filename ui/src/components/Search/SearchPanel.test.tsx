import { useState, type ReactElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SearchPanel from './SearchPanel'
import type { SearchMode } from '../../types'

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

function SearchPanelHarness({
  branch = 'main',
  initialQuery = '',
  initialMode = 'both',
  initialCaseSensitive = false,
  onSearch = vi.fn(),
  onSelectResult = vi.fn(),
  onDismiss = vi.fn(),
  autoFocus = false,
}: {
  branch?: string
  initialQuery?: string
  initialMode?: SearchMode
  initialCaseSensitive?: boolean
  onSearch?: (value: { query: string; mode: SearchMode; caseSensitive: boolean }) => void
  onSelectResult?: (value: { path: string; type: 'file' | 'dir'; matchType: 'name' | 'content'; localOnly: boolean }) => void
  onDismiss?: () => void
  autoFocus?: boolean
}): ReactElement {
  function Harness() {
    const [search, setSearch] = useState({
      query: initialQuery,
      mode: initialMode,
      caseSensitive: initialCaseSensitive,
    })

    return (
      <SearchPanel
        branch={branch}
        query={search.query}
        mode={search.mode}
        caseSensitive={search.caseSensitive}
        autoFocus={autoFocus}
        onSearch={(next) => {
          onSearch(next)
          setSearch(next)
        }}
        onSelectResult={onSelectResult}
        onDismiss={onDismiss}
      />
    )
  }

  return <Harness />
}

describe('SearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getSearchResults).mockResolvedValue({
      query: 'gui',
      branch: 'main',
      mode: 'both',
      caseSensitive: false,
      results: [{ path: 'docs/guide.md', type: 'file', matchType: 'name', localOnly: false }],
    })
  })

  it('shows guidance before the minimum query length and has no obvious a11y violations', async () => {
    const onDismiss = vi.fn()
    const { container } = renderWithClient(
      <SearchPanelHarness
        autoFocus
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByText(/enter at least 3 characters, then press search or enter/i)).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('searchbox', { name: /search query/i }), { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(vi.mocked(api.getSearchResults)).not.toHaveBeenCalled()
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('submits the trimmed query only when explicitly requested and renders results', async () => {
    const onSearch = vi.fn()
    const onSelectResult = vi.fn()

    renderWithClient(
      <SearchPanelHarness
        initialQuery=""
        onSearch={onSearch}
        onSelectResult={onSelectResult}
        onDismiss={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), {
      target: { value: '  docs  ' },
    })
    expect(onSearch).not.toHaveBeenCalled()
    expect(vi.mocked(api.getSearchResults)).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(/file names/i))
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))

    expect(onSearch).toHaveBeenCalledWith({
      query: 'docs',
      mode: 'content',
      caseSensitive: false,
    })
    expect(vi.mocked(api.getSearchResults)).toHaveBeenCalledWith('docs', 'main', 'content', false)
    expect(await screen.findByText('docs/guide.md')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /docs\/guide\.md/i }))
    expect(onSelectResult).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'docs/guide.md' }),
    )
  })

  it('submits from the form and supports case-sensitive searches', async () => {
    const onSearch = vi.fn()

    renderWithClient(
      <SearchPanelHarness
        initialQuery=""
        onSearch={onSearch}
      />,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: /search query/i }), {
      target: { value: 'Searchable' },
    })
    fireEvent.click(screen.getByLabelText(/case sensitive/i))
    fireEvent.submit(screen.getByRole('searchbox', { name: /search query/i }).closest('form')!)

    expect(onSearch).toHaveBeenCalledWith({
      query: 'Searchable',
      mode: 'both',
      caseSensitive: true,
    })
    expect(vi.mocked(api.getSearchResults)).toHaveBeenCalledWith('Searchable', 'main', 'both', true)
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
      <SearchPanelHarness initialQuery="guid" />,
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
      mode: 'both',
      caseSensitive: false,
      results: [],
    })

    renderWithClient(
      <SearchPanelHarness initialQuery="none" />,
    )

    expect(await screen.findByText(/no file names or file contents matched the current search/i)).toBeInTheDocument()
  })

  it('updates guidance when search targets change and requires at least one target', async () => {
    const onDismiss = vi.fn()

    renderWithClient(
      <SearchPanelHarness
        initialQuery="guide"
        initialMode="both"
        onDismiss={onDismiss}
      />,
    )

    expect(await screen.findByText('docs/guide.md')).toBeInTheDocument()
    expect(screen.getByText(/showing submitted matches/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close search/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByLabelText(/file names/i))
    expect(screen.getByText(/press search or enter to run the updated query/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/file contents/i))
    expect(screen.getByText(/choose at least one search target\./i)).toBeInTheDocument()
    expect(screen.getByText(/choose at least one search target to search\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled()
    expect(vi.mocked(api.getSearchResults)).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByLabelText(/file names/i))
    expect(screen.getByText(/press search or enter to run the updated query/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^search$/i })).toBeEnabled()
  })
})
