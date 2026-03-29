import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import ContentPanel from './ContentPanel'

vi.mock('../../services/api', () => ({
  api: {
    getFile: vi.fn(),
  },
}))

vi.mock('./MarkdownRenderer', () => ({
  default: ({ onNavigate }: { content: string; onNavigate: (p: string) => void }) => (
    <div data-testid="markdown-renderer">
      <button onClick={() => onNavigate('docs/guide.md')}>link</button>
    </div>
  ),
}))

vi.mock('./CodeViewer', () => ({
  default: ({ content }: { content: string; language: string }) => (
    <pre data-testid="code-viewer">{content}</pre>
  ),
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

describe('ContentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no filePath', () => {
    const { container } = renderWithClient(
      <ContentPanel filePath="" branch="main" onNavigate={vi.fn()} />
    )
    expect(screen.getByText(/Select a file/i)).toBeInTheDocument()
    return expect(axe(container)).resolves.toMatchObject({ violations: [] })
  })

  it('shows loading skeleton while fetching', async () => {
    // Never resolves
    vi.mocked(api.getFile).mockReturnValue(new Promise(() => {}))

    renderWithClient(
      <ContentPanel filePath="README.md" branch="main" onNavigate={vi.fn()} />
    )

    expect(screen.getByLabelText('loading content')).toBeInTheDocument()
  })

  it('shows markdown renderer for markdown files', async () => {
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'README.md',
      type: 'markdown',
      content: '# Hello',
      language: '',
      encoding: 'utf8',
    })

    renderWithClient(
      <ContentPanel filePath="README.md" branch="main" onNavigate={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
    })
  })

  it('shows code viewer for text files', async () => {
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'main.go',
      type: 'text',
      language: 'go',
      content: 'package main',
      encoding: 'utf8',
    })

    renderWithClient(
      <ContentPanel filePath="main.go" branch="main" onNavigate={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer')).toBeInTheDocument()
    })
  })

  it('shows binary placeholder for binary files', async () => {
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'image.bin',
      type: 'binary',
      content: '',
      language: '',
      encoding: 'base64',
    })

    renderWithClient(
      <ContentPanel filePath="image.bin" branch="main" onNavigate={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText(/Binary file/i)).toBeInTheDocument()
    })
  })

  it('shows image for image files', async () => {
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'photo.png',
      type: 'image',
      encoding: 'base64',
      content: 'abc123',
      language: '',
    })

    renderWithClient(
      <ContentPanel filePath="photo.png" branch="main" onNavigate={vi.fn()} />
    )

    await waitFor(() => {
      const img = screen.getByRole('img')
      expect(img).toBeInTheDocument()
      expect(img.getAttribute('src')).toContain('abc123')
    })
  })

  it('View Raw button toggles rendering', async () => {
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'README.md',
      type: 'markdown',
      content: '# Hello',
      language: '',
      encoding: 'utf8',
    })

    renderWithClient(
      <ContentPanel filePath="README.md" branch="main" onNavigate={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
    })

    const rawButton = screen.getByText('View Raw')
    fireEvent.click(rawButton)

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('markdown-renderer')).not.toBeInTheDocument()
  })

  it('shows custom placeholder when filePath empty and placeholder prop provided', () => {
    renderWithClient(
      <ContentPanel filePath="" branch="main" onNavigate={vi.fn()} placeholder="No README found in this repository." />
    )
    expect(screen.getByText('No README found in this repository.')).toBeInTheDocument()
  })

  it('relative link in MarkdownRenderer calls onNavigate', async () => {
    vi.mocked(api.getFile).mockResolvedValue({
      path: 'README.md',
      type: 'markdown',
      content: '# Hello',
      language: '',
      encoding: 'utf8',
    })

    const onNavigate = vi.fn()

    renderWithClient(
      <ContentPanel filePath="README.md" branch="main" onNavigate={onNavigate} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('link'))

    expect(onNavigate).toHaveBeenCalledWith('docs/guide.md')
  })
})
