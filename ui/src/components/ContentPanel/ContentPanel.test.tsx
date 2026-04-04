import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import ContentPanel from './ContentPanel'

vi.mock('../../services/api', () => ({
  api: {
    getFile: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
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
    <div data-testid="code-viewer">
      <div data-testid="line-number-gutter">1</div>
      <pre>{content}</pre>
    </div>
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
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function makeTextFile(overrides: Partial<Awaited<ReturnType<typeof api.getFile>>> = {}) {
  return {
    path: 'README.md',
    type: 'text' as const,
    content: 'hello',
    language: 'markdown',
    encoding: 'utf-8' as const,
    editable: true,
    revisionToken: 'rev-1',
    ...overrides,
  }
}

describe('ContentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('shows empty state when no filePath', () => {
    const { container } = renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )
    expect(screen.getByText(/Select a file/i)).toBeInTheDocument()
    return expect(axe(container)).resolves.toMatchObject({ violations: [] })
  })

  it('offers a create action from the empty state when mutation is allowed', async () => {
    vi.mocked(api.createFile).mockResolvedValue({
      ok: true,
      operation: 'create',
      path: 'docs/new.md',
      status: 'created',
      message: 'File created successfully.',
    })

    const onMutationComplete = vi.fn()
    const onStatusMessage = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onMutationComplete={onMutationComplete}
        onStatusMessage={onStatusMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /new file/i }))
    fireEvent.change(screen.getByLabelText(/new file path/i), { target: { value: 'docs/new.md' } })
    fireEvent.change(screen.getByLabelText(/new file content/i), { target: { value: '# Draft' } })
    fireEvent.click(screen.getByRole('button', { name: /create file/i }))

    await waitFor(() => {
      expect(api.createFile).toHaveBeenCalledWith({ path: 'docs/new.md', content: '# Draft' })
    })
    expect(onStatusMessage).toHaveBeenCalledWith('File created successfully.')
    expect(onMutationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        nextPath: 'docs/new.md',
        nextPathType: 'file',
      }),
    )
  })

  it('shows create errors and supports returning from create mode', async () => {
    vi.mocked(api.createFile).mockRejectedValue({ error: 'That path already exists in the repository.' })

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /new file/i }))
    fireEvent.change(screen.getByLabelText(/new file path/i), { target: { value: 'docs/new.md' } })
    fireEvent.click(screen.getByRole('button', { name: /create file/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i)

    fireEvent.click(screen.getByRole('button', { name: /back to viewer/i }))
    expect(screen.getByText(/select a file/i)).toBeInTheDocument()
  })

  it('shows folder placeholder and supports creating a file in that folder', async () => {
    vi.mocked(api.createFile).mockResolvedValue({
      ok: true,
      operation: 'create',
      path: 'docs/guide.md',
      status: 'created',
      message: 'File created successfully.',
    })

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /new file here/i }))
    expect(screen.getByLabelText(/new file path/i)).toHaveValue('docs/')
  })

  it('cancels create mode from the draft form', async () => {
    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /new file here/i }))
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.getByText(/browse files inside/i)).toBeInTheDocument()
  })

  it('shows loading skeleton while fetching', async () => {
    vi.mocked(api.getFile).mockReturnValue(new Promise(() => {}))

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('loading content')).toBeInTheDocument()
  })

  it('shows an error state when file loading fails', async () => {
    vi.mocked(api.getFile).mockRejectedValue(new Error('boom'))

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    expect(await screen.findByText(/failed to load file/i)).toBeInTheDocument()
  })

  it('shows markdown renderer for markdown files', async () => {
    vi.mocked(api.getFile).mockResolvedValue(
      makeTextFile({ type: 'markdown', language: '', content: '# Hello' }),
    )

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
    })
  })

  it('shows code viewer for text files and supports raw mode', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile({ path: 'main.go', language: 'go', content: 'package main' }))
    const onRawChange = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="main.go"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
        onRawChange={onRawChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer')).toBeInTheDocument()
    })

    expect(screen.getByTestId('line-number-gutter')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view raw/i }))
    expect(onRawChange).toHaveBeenCalledWith(true)
  })

  it('shows binary and image presentations without inline editing', async () => {
    vi.mocked(api.getFile)
      .mockResolvedValueOnce({
        path: 'image.bin',
        type: 'binary',
        content: '',
        language: '',
        encoding: 'none',
        editable: false,
        revisionToken: 'rev-bin',
      })
      .mockResolvedValueOnce({
        path: 'photo.png',
        type: 'image',
        encoding: 'base64',
        content: 'abc123',
        language: '',
        editable: false,
        revisionToken: 'rev-image',
      })

    const { rerender } = renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="image.bin"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Binary file/i)).toBeInTheDocument()
    })

    rerender(
      <QueryClientProvider client={makeClient()}>
        <ContentPanel
          canMutateFiles
          refreshToken={0}
          selectedPath="photo.png"
          selectedPathType="file"
          branch="main"
          onNavigate={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      const img = screen.getByRole('img')
      expect(img).toBeInTheDocument()
      expect(img.getAttribute('src')).toContain('abc123')
    })
  })

  it('enters edit mode, tracks dirty state, and saves updates', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile({ content: 'original text' }))
    vi.mocked(api.updateFile).mockResolvedValue({
      ok: true,
      operation: 'update',
      path: 'README.md',
      status: 'updated',
      message: 'File updated successfully.',
    })

    const onDirtyChange = vi.fn()
    const onMutationComplete = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
        onDirtyChange={onDirtyChange}
        onMutationComplete={onMutationComplete}
      />,
    )

    await screen.findByRole('button', { name: /edit file/i })
    fireEvent.click(screen.getByRole('button', { name: /edit file/i }))
    fireEvent.change(screen.getByLabelText(/edit file content/i), { target: { value: 'updated text' } })

    await waitFor(() => {
      expect(onDirtyChange).toHaveBeenCalledWith(true)
    })

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(api.updateFile).toHaveBeenCalledWith({
        path: 'README.md',
        content: 'updated text',
        revisionToken: 'rev-1',
      })
    })
    expect(onMutationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        nextPath: 'README.md',
        nextPathType: 'file',
      }),
    )
  })

  it('shows update conflicts inline when save fails', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile())
    vi.mocked(api.updateFile).mockRejectedValue({ error: 'The file changed on disk before your save completed.' })

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /edit file/i }))
    fireEvent.change(screen.getByLabelText(/edit file content/i), { target: { value: 'updated' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/changed on disk/i)
  })

  it('warns before discarding dirty edits', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile())
    vi.mocked(window.confirm).mockReturnValue(false)

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /edit file/i }))
    fireEvent.change(screen.getByLabelText(/edit file content/i), { target: { value: 'dirty' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByLabelText(/edit file content/i)).toBeInTheDocument()
  })

  it('cancels edit mode after confirmation', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile())

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /edit file/i }))
    fireEvent.change(screen.getByLabelText(/edit file content/i), { target: { value: 'dirty' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByLabelText(/edit file content/i)).not.toBeInTheDocument()
  })

  it('confirms and deletes a file', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile())
    vi.mocked(api.deleteFile).mockResolvedValue({
      ok: true,
      operation: 'delete',
      path: 'README.md',
      status: 'deleted',
      message: 'File deleted successfully.',
    })

    const onMutationComplete = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
        onMutationComplete={onMutationComplete}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /delete file/i }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete file$/i }))

    await waitFor(() => {
      expect(api.deleteFile).toHaveBeenCalledWith({
        path: 'README.md',
        revisionToken: 'rev-1',
      })
    })
    expect(onMutationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        nextPath: '',
        nextPathType: 'none',
      }),
    )
  })

  it('shows delete errors and allows canceling the confirmation state', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile())
    vi.mocked(api.deleteFile).mockRejectedValue({ error: 'The file changed on disk before your delete completed.' })

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /delete file/i }))
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete file$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/delete completed/i)
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('honors discard confirmation when leaving create mode with a dirty draft', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /new file/i }))
    fireEvent.change(screen.getByLabelText(/new file path/i), { target: { value: 'docs/draft.md' } })
    fireEvent.click(screen.getByRole('button', { name: /back to viewer/i }))

    expect(screen.getByLabelText(/new file path/i)).toBeInTheDocument()
  })

  it('shows custom placeholder when filePath empty and placeholder prop provided', () => {
    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        placeholder="No README found in this repository."
      />,
    )
    expect(screen.getByText('No README found in this repository.')).toBeInTheDocument()
  })

  it('relative link in MarkdownRenderer calls onNavigate', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile({ type: 'markdown', language: '', content: '# Hello' }))

    const onNavigate = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={onNavigate}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('link'))

    expect(onNavigate).toHaveBeenCalledWith('docs/guide.md')
  })
})
