import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import ContentPanel from './ContentPanel'

vi.mock('../../services/api', () => ({
  api: {
    getFile: vi.fn(),
    getTree: vi.fn(),
    getReadme: vi.fn(),
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
  },
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

async function openFileActionsMenu() {
  const trigger = await screen.findByRole('button', { name: /file actions/i })
  await userEvent.setup().click(trigger)
  await waitFor(() => {
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
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
    vi.mocked(api.getTree).mockResolvedValue([])
  })

  it('shows the root directory table with a parent-scope row when no file is selected', async () => {
    const { container } = renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
        onBrowseParent={vi.fn()}
      />,
    )
    expect(await screen.findByRole('table', { name: /current folder contents/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open parent folder outside this repository/i })).toBeInTheDocument()
    expect(screen.getByText(/does not have any visible files yet/i)).toBeInTheDocument()
    await expect(axe(container)).resolves.toMatchObject({ violations: [] })
  })

  it('offers a create action from the empty state when mutation is allowed', async () => {
    vi.mocked(api.createFile).mockResolvedValue({
      ok: true,
      operation: 'create',
      path: 'README.md',
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
        onOpenPath={vi.fn()}
        onMutationComplete={onMutationComplete}
        onStatusMessage={onStatusMessage}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /new file/i }))
    expect(screen.getByLabelText(/new file path/i)).toHaveValue('README.md')
    fireEvent.change(screen.getByLabelText(/new file path/i), { target: { value: 'README.md' } })
    fireEvent.change(screen.getByLabelText(/new file content/i), { target: { value: '# Draft' } })
    fireEvent.click(screen.getByRole('button', { name: /create file/i }))

    await waitFor(() => {
      expect(api.createFile).toHaveBeenCalledWith({ path: 'README.md', content: '# Draft' })
    })
    expect(onStatusMessage).toHaveBeenCalledWith('File created successfully.')
    expect(onMutationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        nextPath: 'README.md',
        nextPathType: 'file',
      }),
    )
  })

  it('shows create errors and supports returning from create mode', async () => {
    vi.mocked(api.createFile).mockRejectedValue({ message: 'That path already exists in the repository.' })

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /new file/i }))
    expect(screen.getByLabelText(/new file path/i)).toHaveAttribute('placeholder', 'README.md')
    fireEvent.change(screen.getByLabelText(/new file path/i), { target: { value: 'README.md' } })
    fireEvent.click(screen.getByRole('button', { name: /create file/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i)

    fireEvent.click(screen.getByRole('button', { name: /back to viewer/i }))
    expect(screen.getByText(/does not have any visible files yet/i)).toBeInTheDocument()
  })

  it('falls back to a generic create error message for non-object failures', async () => {
    vi.mocked(api.createFile).mockRejectedValue('boom')

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /new file/i }))
    fireEvent.change(screen.getByLabelText(/new file path/i), { target: { value: 'README.md' } })
    fireEvent.click(screen.getByRole('button', { name: /create file/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to create the file/i)
  })

  it('suggests myfile names when README.md already exists in the folder', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'README.md', path: 'README.md', type: 'file', localOnly: false },
      { name: 'myfile.md', path: 'myfile.md', type: 'file', localOnly: false },
      { name: 'myfile 1.md', path: 'myfile 1.md', type: 'file', localOnly: false },
    ])

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /new file/i }))
    expect(screen.getByLabelText(/new file path/i)).toHaveValue('myfile 2.md')
  })

  it('suggests myfile.md when README.md exists but myfile.md does not', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'README.md', path: 'README.md', type: 'file', localOnly: false },
    ])

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /new file/i }))
    expect(screen.getByLabelText(/new file path/i)).toHaveValue('myfile.md')
  })

  it('shows a directory list for folders and supports creating a file in that folder', async () => {
    vi.mocked(api.createFile).mockResolvedValue({
      ok: true,
      operation: 'create',
      path: 'docs/guide.md',
      status: 'created',
      message: 'File created successfully.',
    })
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false },
    ])

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: /open file guide\.md/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /new file here/i }))
    expect(screen.getByLabelText(/new file path/i)).toHaveValue('docs/README.md')
  })

  it('shows ignored files and folders in directory listings and opens them normally', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: '.cache', path: 'docs/.cache', type: 'dir', localOnly: true },
      { name: '.env', path: 'docs/.env', type: 'file', localOnly: true },
    ])

    const onOpenPath = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={onOpenPath}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /open folder \.cache/i }))
    fireEvent.click(screen.getByRole('button', { name: /open file \.env/i }))

    expect(onOpenPath).toHaveBeenNthCalledWith(1, 'docs/.cache', 'dir', true)
    expect(onOpenPath).toHaveBeenNthCalledWith(2, 'docs/.env', 'file', true)
  })

  it('shows local-only cues in ignored directory rows and active folder context', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: '.cache', path: 'docs/.cache', type: 'dir', localOnly: true },
      { name: '.env', path: 'docs/.env', type: 'file', localOnly: true },
    ])

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        selectedPathLocalOnly
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/local only/i)).toHaveLength(3)
    })
    expect(screen.getByRole('heading', { name: 'root/docs' })).toBeInTheDocument()
  })

  it('shows sync badges in directory rows and the active file context', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'notes.md', path: 'docs/notes.md', type: 'file', localOnly: false, syncState: 'diverged' },
    ])
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile({ path: 'docs/notes.md' }))

    const client = makeClient()
    const { rerender } = renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
      client,
    )

    expect(await screen.findByText(/diverged/i)).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={client}>
        <ContentPanel
          canMutateFiles={false}
          refreshToken={0}
          selectedPath="docs/notes.md"
          selectedPathType="file"
          selectedPathSyncState="local-committed"
          branch="main"
          onNavigate={vi.fn()}
          onOpenPath={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/local commit/i)).toBeInTheDocument()
  })

  it('shows a local-only cue in the active file context for ignored files', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile({ path: '.env' }))

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath=".env"
        selectedPathType="file"
        selectedPathLocalOnly
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByText(/local only/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'root/.env' })).toBeInTheDocument()
  })

  it('cancels create mode from the draft form', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false },
    ])

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /new file here/i }))
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.getByRole('heading', { name: 'docs' })).toBeInTheDocument()
  })

  it('opens directory entries with the row button and double click', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'src', path: 'src', type: 'dir', localOnly: false },
      { name: 'main.ts', path: 'main.ts', type: 'file', localOnly: false },
    ])

    const onOpenPath = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={onOpenPath}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /open folder src/i }))
    fireEvent.doubleClick(screen.getByRole('button', { name: /open file main\.ts/i }).closest('.content-directory-row') as HTMLElement)

    expect(onOpenPath).toHaveBeenNthCalledWith(1, 'src', 'dir', false)
    expect(onOpenPath).toHaveBeenNthCalledWith(2, 'main.ts', 'file', false)
  })

  it('shows an intentional empty-folder state for selected folders with no entries', async () => {
    vi.mocked(api.getTree).mockResolvedValue([])

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="empty"
        selectedPathType="dir"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByText(/does not have any visible files or folders yet/i)).toBeInTheDocument()
  })

  it('shows ignored-only folder contents instead of the empty-folder state', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: '.cache', path: 'generated/.cache', type: 'dir', localOnly: true },
      { name: '.env', path: 'generated/.env', type: 'file', localOnly: true },
    ])

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="generated"
        selectedPathType="dir"
        selectedPathLocalOnly
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByRole('button', { name: /open folder \.cache/i })).toBeInTheDocument()
    expect(screen.queryByText(/does not have any visible files or folders yet/i)).not.toBeInTheDocument()
  })

  it('renders a folder README when browsing a repository directory', async () => {
    vi.mocked(api.getTree).mockResolvedValue([
      { name: 'guide.md', path: 'docs/guide.md', type: 'file', localOnly: false },
    ])
    vi.mocked(api.getReadme).mockResolvedValue({ path: 'docs/README.md' })
    vi.mocked(api.getFile).mockResolvedValue(
      makeTextFile({ path: 'docs/README.md', type: 'markdown', language: '', content: '# Folder readme' }),
    )

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="docs"
        selectedPathType="dir"
        branch="main"
        isGitRepo
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByRole('heading', { name: 'Folder readme' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'docs/README.md' })).toBeInTheDocument()
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
        onOpenPath={vi.fn()}
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
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByText(/failed to load file/i)).toBeInTheDocument()
  })

  it('shows an unavailable message when an ignored local file disappears', async () => {
    vi.mocked(api.getFile).mockRejectedValue(new Error('boom'))

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath=".env"
        selectedPathType="file"
        selectedPathLocalOnly
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByText(/local-only file is no longer available/i)).toBeInTheDocument()
  })

  it('shows an unavailable message when an ignored local folder disappears', async () => {
    vi.mocked(api.getTree).mockRejectedValue(new Error('boom'))

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="generated"
        selectedPathType="dir"
        selectedPathLocalOnly
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    expect(await screen.findByText(/local-only folder is no longer available/i)).toBeInTheDocument()
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
        onOpenPath={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
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
        onOpenPath={vi.fn()}
        onRawChange={onRawChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('code-viewer')).toBeInTheDocument()
    })

    expect(screen.getByTestId('line-number-gutter')).toBeInTheDocument()
    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /view raw/i }))
    expect(onRawChange).toHaveBeenCalledWith(true)
  })

  it('keeps file actions scoped to the current file', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile())

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    await openFileActionsMenu()

    expect(screen.getByRole('menuitem', { name: /edit file/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^delete file$/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /^new file$/i })).not.toBeInTheDocument()
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
        onOpenPath={vi.fn()}
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
          onOpenPath={vi.fn()}
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
        onOpenPath={vi.fn()}
        onDirtyChange={onDirtyChange}
        onMutationComplete={onMutationComplete}
      />,
    )

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /edit file/i }))
    expect(document.querySelector('.content-panel.content-panel-editing')).toBeTruthy()
    expect(document.querySelector('.manual-editor-card.manual-editor-expanded')).toBeTruthy()
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
        onOpenPath={vi.fn()}
      />,
    )

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /edit file/i }))
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
        onOpenPath={vi.fn()}
      />,
    )

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /edit file/i }))
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
        onOpenPath={vi.fn()}
      />,
    )

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /edit file/i }))
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
        onOpenPath={vi.fn()}
        onMutationComplete={onMutationComplete}
      />,
    )

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /^delete file$/i }))
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

  it('returns to the parent directory after deleting a nested file', async () => {
    vi.mocked(api.getFile).mockResolvedValue(makeTextFile({ path: 'docs/README.md' }))
    vi.mocked(api.deleteFile).mockResolvedValue({
      ok: true,
      operation: 'delete',
      path: 'docs/README.md',
      status: 'deleted',
      message: 'File deleted successfully.',
    })

    const onMutationComplete = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath="docs/README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
        onMutationComplete={onMutationComplete}
      />,
    )

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /^delete file$/i }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^delete file$/i }))

    await waitFor(() => {
      expect(api.deleteFile).toHaveBeenCalledWith({
        path: 'docs/README.md',
        revisionToken: 'rev-1',
      })
    })

    expect(onMutationComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        nextPath: 'docs',
        nextPathType: 'dir',
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
        onOpenPath={vi.fn()}
      />,
    )

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /^delete file$/i }))
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
        onOpenPath={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /new file/i }))
    fireEvent.change(screen.getByLabelText(/new file path/i), { target: { value: 'docs/draft.md' } })
    fireEvent.click(screen.getByRole('button', { name: /back to viewer/i }))

    expect(screen.getByLabelText(/new file path/i)).toBeInTheDocument()
  })

  it('shows custom placeholder when filePath empty and placeholder prop provided', async () => {
    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
        placeholder="No README found in this repository."
      />,
    )
    expect(await screen.findByText('No README found in this repository.')).toBeInTheDocument()
  })

  it('renders a structured landing state with title, detail, and the root parent row', async () => {
    const onBrowseParent = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles
        refreshToken={0}
        selectedPath=""
        selectedPathType="none"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
        placeholder="No README found in this repository."
        emptyStateTitle="This repository is ready for a first file"
        emptyStateDetail="There is no README yet, so GitLocal is showing a guided landing state instead."
        emptyStateActions={[
          { label: 'Create first file', action: 'create-file' },
        ]}
        onBrowseParent={onBrowseParent}
      />,
    )

    expect(await screen.findByRole('heading', { name: /ready for a first file/i })).toBeInTheDocument()
    expect(screen.getAllByText(/guided landing state/i)).not.toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /create first file/i }))
    expect(screen.getByLabelText(/new file path/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /back to viewer/i }))
    fireEvent.click(screen.getByRole('button', { name: /open parent folder outside this repository/i }))
    expect(onBrowseParent).toHaveBeenCalledTimes(1)
  })

  it('relative link in MarkdownRenderer calls onNavigate', async () => {
    vi.mocked(api.getFile).mockResolvedValue(
      makeTextFile({ type: 'markdown', language: '', content: '[Guide](docs/guide.md)' }),
    )

    const onNavigate = vi.fn()

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={onNavigate}
        onOpenPath={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Guide' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }))

    expect(onNavigate).toHaveBeenCalledWith('docs/guide.md')
  })

  it('hides markdown comments in rendered mode while raw mode still shows them', async () => {
    vi.mocked(api.getFile).mockResolvedValue(
      makeTextFile({
        type: 'markdown',
        language: '',
        content: '# Hello\n\n<!-- hidden comment -->\n\n[//]: # (hidden reference)\n\nVisible text',
      }),
    )

    renderWithClient(
      <ContentPanel
        canMutateFiles={false}
        refreshToken={0}
        selectedPath="README.md"
        selectedPathType="file"
        branch="main"
        onNavigate={vi.fn()}
        onOpenPath={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    })
    expect(screen.queryByText(/hidden comment/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/hidden reference/i)).not.toBeInTheDocument()

    await openFileActionsMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /view raw/i }))

    await waitFor(() => {
      expect(screen.getByText(/hidden comment/i)).toBeInTheDocument()
      expect(screen.getByText(/hidden reference/i)).toBeInTheDocument()
    })
  })
})
