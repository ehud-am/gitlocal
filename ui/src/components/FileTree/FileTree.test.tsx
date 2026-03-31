import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'jest-axe'
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
  selectedPath: '',
  selectedPathType: 'none' as const,
  onSelect: vi.fn(),
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

    expect(screen.getByRole('tree', { name: /repository files/i })).toBeInTheDocument()
  })

  it('has no obvious accessibility violations for the loaded tree', async () => {
    mockedApi.getTree.mockResolvedValue([
      { name: 'src', path: 'src', type: 'dir' },
      { name: 'README.md', path: 'README.md', type: 'file' },
    ])

    const { container } = renderWithClient(<FileTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('tree', { name: /repository files/i })).toBeInTheDocument()
    })

    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('clicking a file calls onSelect with the file type', async () => {
    const onSelect = vi.fn()
    mockedApi.getTree.mockResolvedValue([
      { name: 'src', path: 'src', type: 'dir' },
      { name: 'README.md', path: 'README.md', type: 'file' },
    ])

    renderWithClient(<FileTree {...defaultProps} onSelect={onSelect} />)

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('README.md'))
    expect(onSelect).toHaveBeenCalledWith('README.md', 'file')
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

    expect(defaultProps.onSelect).toHaveBeenCalledWith('src', 'dir')
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

  it('reopens an already loaded folder without refetching children', async () => {
    mockedApi.getTree
      .mockResolvedValueOnce([
        { name: 'src', path: 'src', type: 'dir' },
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

    fireEvent.click(screen.getByText('src'))
    await waitFor(() => {
      expect(screen.queryByText('main.go')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('src'))

    await waitFor(() => {
      expect(screen.getByText('main.go')).toBeInTheDocument()
    })

    expect(mockedApi.getTree).toHaveBeenCalledTimes(2)
  })

  it('shows an inline error when the root tree fails to load', async () => {
    mockedApi.getTree.mockRejectedValue(new Error('boom'))

    renderWithClient(<FileTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load file tree/i)).toBeInTheDocument()
    })
  })

  it('shows a loading row while fetching folder children', async () => {
    let resolveChildren: ((value: { name: string; path: string; type: 'file' }[]) => void) | undefined

    mockedApi.getTree
      .mockResolvedValueOnce([
        { name: 'src', path: 'src', type: 'dir' },
      ])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveChildren = resolve
          })
      )

    renderWithClient(<FileTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('src'))

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    resolveChildren?.([{ name: 'main.go', path: 'src/main.go', type: 'file' }])

    await waitFor(() => {
      expect(screen.getByText('main.go')).toBeInTheDocument()
    })
  })

  it('collapses a folder and marks it as errored when child loading fails', async () => {
    mockedApi.getTree
      .mockResolvedValueOnce([
        { name: 'src', path: 'src', type: 'dir' },
      ])
      .mockRejectedValueOnce(new Error('child load failed'))

    renderWithClient(<FileTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('src'))

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const treeItem = screen.getByRole('treeitem', { name: /src/i })
    expect(treeItem).toHaveAttribute('aria-expanded', 'false')
  })
})
