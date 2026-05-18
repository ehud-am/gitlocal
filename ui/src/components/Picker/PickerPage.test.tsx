import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import PickerPage from './PickerPage'

vi.mock('../../services/api', () => ({
  api: {
    getFolderBrowse: vi.fn(),
    openRepository: vi.fn(),
    createChildFolder: vi.fn(),
    initFolderRepository: vi.fn(),
    cloneRepositoryIntoFolder: vi.fn(),
  },
}))

vi.mock('../../services/viewerState', () => ({
  writeViewerState: vi.fn(),
}))

import { api } from '../../services/api'
import { writeViewerState } from '../../services/viewerState'

async function openFolderActionsMenu() {
  const trigger = await screen.findByRole('button', { name: /folder actions/i })
  await userEvent.setup().click(trigger)
  await waitFor(() => {
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    value: { pathname: '/', search: '', hash: '', reload: vi.fn() },
    writable: true,
  })
  window.history.replaceState(null, '', '/')

  vi.mocked(api.getFolderBrowse).mockResolvedValue({
    currentPath: '/Users/example',
    parentPath: '/Users',
    homePath: '/Users/example',
    roots: [{ name: '/', path: '/' }],
    entries: [
      { name: 'projects', path: '/Users/example/projects', type: 'dir', isGitRepo: false },
      { name: 'gitlocal', path: '/Users/example/gitlocal', type: 'dir', isGitRepo: true },
    ],
    error: '',
    isGitRepo: false,
    canOpen: true,
    canCreateChild: true,
    canInitGit: true,
    canCloneIntoChild: true,
  })
})

describe('PickerPage', () => {
  it('renders explanatory heading and folder browser', async () => {
    const { container } = render(<PickerPage />)

    expect(await screen.findByText(/Choose what GitLocal should open/i)).toBeInTheDocument()
    expect(screen.getByText(/select a folder/i)).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: /folder contents/i })).toBeInTheDocument()
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('loads folders on mount', async () => {
    render(<PickerPage />)

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalled()
    })

    expect(screen.getAllByText('projects').length).toBeGreaterThan(0)
    expect(screen.getAllByText('gitlocal').length).toBeGreaterThan(0)
  })

  it('selects a folder when clicked', async () => {
    render(<PickerPage />)

    fireEvent.click(await screen.findByRole('button', { name: /^projects folder$/i }))

    expect(screen.getByRole('textbox', { name: /folder path/i })).toHaveValue('/Users/example/projects')
  })

  it('double-clicking a normal folder browses into it', async () => {
    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^projects folder$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users/example/projects')
    })
  })

  it('double-clicking a repository folder browses into it', async () => {
    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^gitlocal git repository$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users/example/gitlocal')
    })
    expect(vi.mocked(api.openRepository)).not.toHaveBeenCalled()
  })

  it('opens files through the same Open path handling', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example',
      parentPath: '/Users',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [
        { name: 'README.md', path: '/Users/example/README.md', type: 'file', isGitRepo: false },
      ],
      error: '',
      isGitRepo: false,
      canOpen: true,
      canCreateChild: true,
      canInitGit: true,
      canCloneIntoChild: true,
    })
    vi.mocked(api.openRepository).mockResolvedValue({
      ok: true,
      error: '',
      path: '/Users/example/README.md',
      rootPath: '/Users/example',
      selectedPath: 'README.md',
      selectedPathType: 'file',
    })

    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^README\.md file$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/README.md')
    })
    expect(window.location.reload).toHaveBeenCalled()
    expect(vi.mocked(writeViewerState)).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/Users/example',
      path: 'README.md',
      pathType: 'file',
    }))
  })

  it('uses the sidebar tree to select and browse folders', async () => {
    render(<PickerPage />)

    const tree = await screen.findByRole('tree', { name: /folder contents navigation/i })
    const projectsItem = within(tree).getByText('projects').closest('[role="treeitem"]')
    expect(projectsItem).not.toBeNull()
    fireEvent.click(projectsItem as HTMLElement)

    expect(screen.getByRole('textbox', { name: /folder path/i })).toHaveValue('/Users/example/projects')

    fireEvent.doubleClick(projectsItem as HTMLElement)
    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users/example/projects')
    })

    const parentItem = within(tree).getByText('..').closest('[role="treeitem"]')
    expect(parentItem).not.toBeNull()
    fireEvent.doubleClick(parentItem as HTMLElement)

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users')
    })
  })

  it('does not show local badges for plain folder entries in the picker tree', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example',
      parentPath: '/Users',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [
        { name: 'README.md', path: '/Users/example/README.md', type: 'file', isGitRepo: false },
        { name: 'gitlocal', path: '/Users/example/gitlocal', type: 'dir', isGitRepo: true },
      ],
      error: '',
      isGitRepo: false,
      canOpen: true,
      canCreateChild: true,
      canInitGit: true,
      canCloneIntoChild: true,
    })

    render(<PickerPage />)

    const tree = await screen.findByRole('tree', { name: /folder contents navigation/i })
    expect(within(tree).queryByText(/^local$/i)).not.toBeInTheDocument()
    expect(within(tree).getByText(/^git$/i)).toBeInTheDocument()
  })

  it('collapses and restores navigation with the same rail pattern as the viewer', async () => {
    render(<PickerPage />)

    fireEvent.click(await screen.findByRole('button', { name: /collapse navigation/i }))

    expect(await screen.findByLabelText(/collapsed navigation/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand navigation/i }))

    expect(await screen.findByRole('button', { name: /collapse navigation/i })).toBeInTheDocument()
  })

  it('opens the typed path from the single open action', async () => {
    vi.mocked(api.openRepository).mockResolvedValue({ ok: true, error: '' })
    render(<PickerPage />)

    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '/tmp/workspace' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/tmp/workspace')
    })
  })

  it('shows an empty-state message when no files or folders are available', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/empty',
      parentPath: null,
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
      isGitRepo: false,
      canOpen: true,
      canCreateChild: false,
      canInitGit: false,
      canCloneIntoChild: false,
    })

    render(<PickerPage />)

    expect((await screen.findAllByText(/this folder is empty/i)).length).toBeGreaterThan(0)
  })

  it('shows inline error without API call when path is empty', async () => {
    render(<PickerPage />)

    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/choose or enter a folder path/i)
    })
    expect(vi.mocked(api.openRepository)).not.toHaveBeenCalled()
  })

  it('shows inline error when API returns ok:false', async () => {
    vi.mocked(api.openRepository).mockResolvedValue({ ok: false, error: 'path does not exist' })

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '/bad/path' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('path does not exist')
    })
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('calls window.location.reload on ok:true', async () => {
    vi.mocked(api.openRepository).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '/valid/path' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  it('creates a subfolder from the folder actions menu', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('notes')
    vi.mocked(api.createChildFolder).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /create subfolder/i }))

    await waitFor(() => {
      expect(vi.mocked(api.createChildFolder)).toHaveBeenCalledWith({
        parentPath: '/Users/example',
        name: 'notes',
      })
    })
    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledTimes(2)
    })
  })

  it('shows create-subfolder errors from the folder actions menu', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('notes')
    vi.mocked(api.createChildFolder).mockResolvedValue({ ok: false, error: 'folder already exists' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /create subfolder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/folder already exists/i)
  })

  it('shows a connection error when creating a subfolder throws', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('notes')
    vi.mocked(api.createChildFolder).mockRejectedValue(new Error('network error'))

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /create subfolder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to create the folder/i)
  })

  it('does nothing when create-subfolder prompt is canceled', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null)

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /create subfolder/i }))

    expect(vi.mocked(api.createChildFolder)).not.toHaveBeenCalled()
  })

  it('opens the current folder from the folder actions menu when allowed', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example/gitlocal',
      parentPath: '/Users/example',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
      isGitRepo: true,
      canOpen: true,
      canCreateChild: true,
      canInitGit: false,
      canCloneIntoChild: false,
    })
    vi.mocked(api.openRepository).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /open this folder/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/gitlocal')
    })
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('shows folder action open errors without reloading', async () => {
    vi.mocked(api.openRepository).mockResolvedValue({ ok: false, error: 'cannot open folder' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /open this folder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot open folder/i)
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('shows a connection error when opening from folder actions throws', async () => {
    vi.mocked(api.openRepository).mockRejectedValue(new Error('network error'))

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /open this folder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to connect to gitlocal server/i)
  })

  it('hides the folder actions trigger when no setup actions are available', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example/locked',
      parentPath: '/Users/example',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
      isGitRepo: false,
      canOpen: false,
      canCreateChild: false,
      canInitGit: false,
      canCloneIntoChild: false,
    })

    render(<PickerPage />)

    await screen.findByText('/Users/example/locked')
    expect(screen.queryByRole('button', { name: /folder actions/i })).not.toBeInTheDocument()
  })

  it('runs git init from the folder actions menu and opens the initialized repository', async () => {
    vi.mocked(api.initFolderRepository).mockResolvedValue({ ok: true, error: '', path: '/Users/example/projects/new-repo' })
    vi.mocked(api.openRepository).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /run git init/i }))

    await waitFor(() => {
      expect(vi.mocked(api.initFolderRepository)).toHaveBeenCalledWith({ path: '/Users/example' })
    })
    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/projects/new-repo')
    })
  })

  it('shows git-init errors from the folder actions menu', async () => {
    vi.mocked(api.initFolderRepository).mockResolvedValue({ ok: false, error: 'cannot initialize here', path: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /run git init/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot initialize here/i)
  })

  it('shows a connection error when git init throws', async () => {
    vi.mocked(api.initFolderRepository).mockRejectedValue(new Error('network error'))

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /run git init/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to initialize git/i)
  })

  it('clones into a subfolder from the folder actions menu', async () => {
    const promptSpy = vi.spyOn(window, 'prompt')
    promptSpy.mockReturnValueOnce('git@github.com:example/team-repo.git').mockReturnValueOnce('team-repo')
    vi.mocked(api.cloneRepositoryIntoFolder).mockResolvedValue({ ok: true, error: '', path: '/Users/example/team-repo' })
    vi.mocked(api.openRepository).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /clone into subfolder/i }))

    await waitFor(() => {
      expect(promptSpy).toHaveBeenNthCalledWith(2, 'Clone into subfolder', 'team-repo')
    })
    await waitFor(() => {
      expect(vi.mocked(api.cloneRepositoryIntoFolder)).toHaveBeenCalledWith({
        parentPath: '/Users/example',
        name: 'team-repo',
        repositoryUrl: 'git@github.com:example/team-repo.git',
      })
    })
    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/team-repo')
    })
  })

  it('shows clone errors from the folder actions menu', async () => {
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('https://github.com/example/project.git')
      .mockReturnValueOnce('project')
    vi.mocked(api.cloneRepositoryIntoFolder).mockResolvedValue({ ok: false, error: 'clone failed', path: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /clone into subfolder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/clone failed/i)
  })

  it('shows a connection error when clone throws', async () => {
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('https://github.com/example/project.git')
      .mockReturnValueOnce('project')
    vi.mocked(api.cloneRepositoryIntoFolder).mockRejectedValue(new Error('network error'))

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /clone into subfolder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to clone the repository/i)
  })

  it('shows a fallback error when the submit API returns ok:false without a message', async () => {
    vi.mocked(api.openRepository).mockResolvedValue({ ok: false, error: '' })

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '/valid/path' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/an error occurred\. please try again\./i)
    })
  })

  it('shows a connection error when submit fails unexpectedly', async () => {
    vi.mocked(api.openRepository).mockRejectedValue(new Error('network error'))

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '/valid/path' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to connect to gitlocal server/i)
    })
  })

  it('shows error when browse API call throws', async () => {
    vi.mocked(api.getFolderBrowse).mockRejectedValueOnce(new Error('network error'))

    render(<PickerPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load this folder/i)
    })
  })
})
