import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FileTree from './FileTree'

vi.mock('../../services/api', () => ({
  api: {
    getTree: vi.fn(),
  },
}))

import { api } from '../../services/api'

const mockedApi = vi.mocked(api)

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function renderWithClient(ui: React.ReactElement) {
  const client = makeQueryClient()
  return render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>
  )
}

const defaultProps = {
  branch: 'main',
  selectedFile: '',
  onFileSelect: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FileTree', () => {
  it('renders loading skeleton while fetching', () => {
    mockedApi.getTree.mockReturnValue(new Promise(() => {}))

    renderWithClient(<FileTree {...defaultProps} />)

    expect(screen.getByLabelText('loading')).toBeInTheDocument()
  })

  it('renders top-level nodes', async () => {
    mockedApi.getTree.mockResolvedValue([
      { name: 'src', path: 'src', type: 'dir' },
      { name: 'README.md', path: 'README.md', type: 'file' },
    ])

    renderWithClient(<FileTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument()
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })
  })

  it('clicking a file calls onFileSelect', async () => {
    const onFileSelect = vi.fn()
    mockedApi.getTree.mockResolvedValue([
      { name: 'src', path: 'src', type: 'dir' },
      { name: 'README.md', path: 'README.md', type: 'file' },
    ])

    renderWithClient(<FileTree {...defaultProps} onFileSelect={onFileSelect} />)

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('README.md'))
    expect(onFileSelect).toHaveBeenCalledWith('README.md')
  })

  it('clicking a folder fetches children', async () => {
    mockedApi.getTree
      .mockResolvedValueOnce([
        { name: 'src', path: 'src', type: 'dir' },
        { name: 'README.md', path: 'README.md', type: 'file' },
      ])
      .mockResolvedValueOnce([
        { name: 'main.go', path: 'src/main.go', type: 'file' },
      ])

    renderWithClient(<FileTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('src'))

    await waitFor(() => {
      expect(screen.getByText('main.go')).toBeInTheDocument()
    })
  })

  it('clicking expanded folder collapses it', async () => {
    mockedApi.getTree
      .mockResolvedValueOnce([
        { name: 'src', path: 'src', type: 'dir' },
        { name: 'README.md', path: 'README.md', type: 'file' },
      ])
      .mockResolvedValueOnce([
        { name: 'main.go', path: 'src/main.go', type: 'file' },
      ])

    renderWithClient(<FileTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument()
    })

    // Expand folder
    fireEvent.click(screen.getByText('src'))

    await waitFor(() => {
      expect(screen.getByText('main.go')).toBeInTheDocument()
    })

    // Collapse folder
    fireEvent.click(screen.getByText('src'))

    await waitFor(() => {
      expect(screen.queryByText('main.go')).not.toBeInTheDocument()
    })
  })
})
