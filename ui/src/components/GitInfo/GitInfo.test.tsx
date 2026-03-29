import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import GitInfo from './GitInfo'

vi.mock('../../services/api', () => ({
  api: {
    getBranches: vi.fn(),
    getCommits: vi.fn(),
  },
}))

import { api } from '../../services/api'

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function renderWithClient(ui: React.ReactElement, client?: QueryClient) {
  const queryClient = client ?? makeClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('GitInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders branch dropdown with current branch selected', async () => {
    vi.mocked(api.getBranches).mockResolvedValue([
      { name: 'main', isCurrent: true },
      { name: 'dev', isCurrent: false },
    ])
    vi.mocked(api.getCommits).mockResolvedValue([])

    renderWithClient(
      <GitInfo branch="main" onBranchChange={vi.fn()} />
    )

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /branch selector/i })
      expect(select).toBeInTheDocument()
      expect((select as HTMLSelectElement).value).toBe('main')
    })

    expect(screen.getByRole('option', { name: 'main' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'dev' })).toBeInTheDocument()
  })

  it('renders commit list', async () => {
    vi.mocked(api.getBranches).mockResolvedValue([
      { name: 'main', isCurrent: true },
    ])
    vi.mocked(api.getCommits).mockResolvedValue([
      {
        hash: 'abc123def456',
        shortHash: 'abc123d',
        author: 'Alice',
        date: new Date(Date.now() - 3_600_000).toISOString(),
        message: 'Fix bug',
      },
    ])

    renderWithClient(
      <GitInfo branch="main" onBranchChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('abc123d')).toBeInTheDocument()
      expect(screen.getByText('Fix bug')).toBeInTheDocument()
    })
  })

  it('selecting a branch calls onBranchChange', async () => {
    vi.mocked(api.getBranches).mockResolvedValue([
      { name: 'main', isCurrent: true },
      { name: 'dev', isCurrent: false },
    ])
    vi.mocked(api.getCommits).mockResolvedValue([])

    const onBranchChange = vi.fn()

    renderWithClient(
      <GitInfo branch="main" onBranchChange={onBranchChange} />
    )

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'dev' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox', { name: /branch selector/i }), {
      target: { value: 'dev' },
    })

    expect(onBranchChange).toHaveBeenCalledWith('dev')
  })

  it('shows relative dates', async () => {
    vi.mocked(api.getBranches).mockResolvedValue([
      { name: 'main', isCurrent: true },
    ])
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()
    vi.mocked(api.getCommits).mockResolvedValue([
      {
        hash: 'deadbeef1234',
        shortHash: 'deadbee',
        author: 'Bob',
        date: oneHourAgo,
        message: 'Update readme',
      },
    ])

    renderWithClient(
      <GitInfo branch="main" onBranchChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('1h ago')).toBeInTheDocument()
    })
  })
})
