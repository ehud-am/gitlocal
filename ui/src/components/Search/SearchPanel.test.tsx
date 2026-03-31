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
        { path: 'README.md', type: 'file', matchType: 'name' },
      ],
    })
  })

  it('runs a name search and renders results', async () => {
    const onQueryChange = vi.fn()
    renderWithClient(
      <SearchPanel
        branch="main"
        mode="name"
        query="readme"
        caseSensitive={false}
        onModeChange={vi.fn()}
        onQueryChange={onQueryChange}
        onCaseSensitiveChange={vi.fn()}
        onSelectResult={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(api.getSearchResults).toHaveBeenCalledWith('readme', 'name', 'main', false)
    })
    expect(await screen.findByText('README.md')).toBeInTheDocument()
  })

  it('reports mode and case-sensitivity changes', () => {
    const onModeChange = vi.fn()
    const onCaseSensitiveChange = vi.fn()
    renderWithClient(
      <SearchPanel
        branch="main"
        mode="name"
        query=""
        caseSensitive={false}
        onModeChange={onModeChange}
        onQueryChange={vi.fn()}
        onCaseSensitiveChange={onCaseSensitiveChange}
        onSelectResult={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Content'))
    fireEvent.click(screen.getByLabelText(/case sensitive/i))
    expect(onModeChange).toHaveBeenCalledWith('content')
    expect(onCaseSensitiveChange).toHaveBeenCalledWith(true)
  })

  it('navigates through a selected result', async () => {
    const onSelectResult = vi.fn()
    renderWithClient(
      <SearchPanel
        branch="main"
        mode="name"
        query="readme"
        caseSensitive={false}
        onModeChange={vi.fn()}
        onQueryChange={vi.fn()}
        onCaseSensitiveChange={vi.fn()}
        onSelectResult={onSelectResult}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /readme\.md/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /readme\.md/i }))
    expect(onSelectResult).toHaveBeenCalled()
  })
})
