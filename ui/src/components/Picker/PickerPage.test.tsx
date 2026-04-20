import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import PickerPage from './PickerPage'

vi.mock('../../services/api', () => ({
  api: {
    getPickBrowse: vi.fn(),
    submitPick: vi.fn(),
    createPickFolder: vi.fn(),
    initPickGit: vi.fn(),
    clonePickRepo: vi.fn(),
  },
}))

import { api } from '../../services/api'

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
    value: { reload: vi.fn() },
    writable: true,
  })

  vi.mocked(api.getPickBrowse).mockResolvedValue({
    currentPath: '/Users/example',
    parentPath: '/Users',
    homePath: '/Users/example',
    roots: [{ name: '/', path: '/' }],
    entries: [
      { name: 'projects', path: '/Users/example/projects', isGitRepo: false },
      { name: 'gitlocal', path: '/Users/example/gitlocal', isGitRepo: true },
    ],
    error: '',
    canOpen: false,
    canCreateChild: true,
    canInitGit: true,
    canCloneIntoChild: true,
  })
})

describe('PickerPage', () => {
  it('renders explanatory heading and folder browser', async () => {
    const { container } = render(<PickerPage />)

    expect(await screen.findByText(/Choose the folder GitLocal should open/i)).toBeInTheDocument()
    expect(screen.getByText(/started without a repository location/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /folders/i })).toBeInTheDocument()
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('loads folders on mount', async () => {
    render(<PickerPage />)

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalled()
    })

    expect(screen.getByText('projects')).toBeInTheDocument()
    expect(screen.getByText('gitlocal')).toBeInTheDocument()
  })

  it('selects a folder when clicked', async () => {
    render(<PickerPage />)

    fireEvent.click(await screen.findByRole('button', { name: /^projects folder$/i }))

    expect(screen.getByRole('textbox', { name: /repository path/i })).toHaveValue('/Users/example/projects')
  })

  it('double-clicking a normal folder browses into it', async () => {
    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^projects folder$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledWith('/Users/example/projects')
    })
  })

  it('double-clicking a repository opens it directly', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^gitlocal git repository$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.submitPick)).toHaveBeenCalledWith('/Users/example/gitlocal')
    })
  })

  it('shows an inline error when double-click repository open returns ok:false', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: false, error: 'cannot open repo' })

    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^gitlocal git repository$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('cannot open repo')
    })
  })

  it('shows a connection error when double-click repository open throws', async () => {
    vi.mocked(api.submitPick).mockRejectedValue(new Error('boom'))

    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^gitlocal git repository$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to connect to gitlocal server/i)
    })
  })

  it('uses quick-access navigation buttons', async () => {
    render(<PickerPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Home' }))

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledWith('/Users/example')
    })

    fireEvent.click(screen.getByRole('button', { name: '/' }))

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledWith('/')
    })

    fireEvent.doubleClick(screen.getByRole('button', { name: /open parent folder/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledWith('/Users')
    })
  })

  it('collapses and restores quick access with the same rail pattern as the viewer', async () => {
    render(<PickerPage />)

    fireEvent.click(await screen.findByRole('button', { name: /collapse quick access/i }))

    expect(await screen.findByLabelText(/collapsed quick access/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand quick access/i }))

    expect(await screen.findByRole('button', { name: /collapse quick access/i })).toBeInTheDocument()
  })

  it('browses the typed path from the selected-folder action', async () => {
    render(<PickerPage />)

    const input = await screen.findByRole('textbox', { name: /repository path/i })
    fireEvent.change(input, { target: { value: '/tmp/workspace' } })
    fireEvent.click(screen.getByRole('button', { name: /browse selected folder/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledWith('/tmp/workspace')
    })
  })

  it('shows an empty-state message when no folders are available', async () => {
    vi.mocked(api.getPickBrowse).mockResolvedValueOnce({
      currentPath: '/empty',
      parentPath: null,
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
      canOpen: false,
      canCreateChild: false,
      canInitGit: false,
      canCloneIntoChild: false,
    })

    render(<PickerPage />)

    expect(await screen.findByText(/no folders are available here/i)).toBeInTheDocument()
  })

  it('shows inline error without API call when path is empty', async () => {
    render(<PickerPage />)

    const input = await screen.findByRole('textbox', { name: /repository path/i })
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /open repository/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/choose or enter a repository path/i)
    })
    expect(vi.mocked(api.submitPick)).not.toHaveBeenCalled()
  })

  it('shows inline error when API returns ok:false', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: false, error: 'path does not exist' })

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /repository path/i })
    fireEvent.change(input, { target: { value: '/bad/path' } })
    fireEvent.click(screen.getByRole('button', { name: /open repository/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('path does not exist')
    })
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('calls window.location.reload on ok:true', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /repository path/i })
    fireEvent.change(input, { target: { value: '/valid/path' } })
    fireEvent.click(screen.getByRole('button', { name: /open repository/i }))

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  it('creates a subfolder from the folder actions menu', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('notes')
    vi.mocked(api.createPickFolder).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /create subfolder/i }))

    await waitFor(() => {
      expect(vi.mocked(api.createPickFolder)).toHaveBeenCalledWith({
        parentPath: '/Users/example',
        name: 'notes',
      })
    })
    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledTimes(2)
    })
  })

  it('shows create-subfolder errors from the folder actions menu', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('notes')
    vi.mocked(api.createPickFolder).mockResolvedValue({ ok: false, error: 'folder already exists' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /create subfolder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/folder already exists/i)
  })

  it('does nothing when create-subfolder prompt is canceled', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null)

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /create subfolder/i }))

    expect(vi.mocked(api.createPickFolder)).not.toHaveBeenCalled()
  })

  it('opens the current repository from the folder actions menu when allowed', async () => {
    vi.mocked(api.getPickBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example/gitlocal',
      parentPath: '/Users/example',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
      canOpen: true,
      canCreateChild: true,
      canInitGit: false,
      canCloneIntoChild: false,
    })
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /open this repository/i }))

    await waitFor(() => {
      expect(vi.mocked(api.submitPick)).toHaveBeenCalledWith('/Users/example/gitlocal')
    })
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('runs git init from the folder actions menu and opens the initialized repository', async () => {
    vi.mocked(api.initPickGit).mockResolvedValue({ ok: true, error: '', path: '/Users/example/projects/new-repo' })
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /run git init/i }))

    await waitFor(() => {
      expect(vi.mocked(api.initPickGit)).toHaveBeenCalledWith({ path: '/Users/example' })
    })
    await waitFor(() => {
      expect(vi.mocked(api.submitPick)).toHaveBeenCalledWith('/Users/example/projects/new-repo')
    })
  })

  it('shows git-init errors from the folder actions menu', async () => {
    vi.mocked(api.initPickGit).mockResolvedValue({ ok: false, error: 'cannot initialize here', path: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /run git init/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot initialize here/i)
  })

  it('clones into a subfolder from the folder actions menu', async () => {
    const promptSpy = vi.spyOn(window, 'prompt')
    promptSpy.mockReturnValueOnce('git@github.com:example/team-repo.git').mockReturnValueOnce('team-repo')
    vi.mocked(api.clonePickRepo).mockResolvedValue({ ok: true, error: '', path: '/Users/example/team-repo' })
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /clone into subfolder/i }))

    await waitFor(() => {
      expect(promptSpy).toHaveBeenNthCalledWith(2, 'Clone into subfolder', 'team-repo')
    })
    await waitFor(() => {
      expect(vi.mocked(api.clonePickRepo)).toHaveBeenCalledWith({
        parentPath: '/Users/example',
        name: 'team-repo',
        repositoryUrl: 'git@github.com:example/team-repo.git',
      })
    })
    await waitFor(() => {
      expect(vi.mocked(api.submitPick)).toHaveBeenCalledWith('/Users/example/team-repo')
    })
  })

  it('shows clone errors from the folder actions menu', async () => {
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('https://github.com/example/project.git')
      .mockReturnValueOnce('project')
    vi.mocked(api.clonePickRepo).mockResolvedValue({ ok: false, error: 'clone failed', path: '' })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /clone into subfolder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/clone failed/i)
  })

  it('shows a fallback error when the submit API returns ok:false without a message', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: false, error: '' })

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /repository path/i })
    fireEvent.change(input, { target: { value: '/valid/path' } })
    fireEvent.click(screen.getByRole('button', { name: /open repository/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/an error occurred\. please try again\./i)
    })
  })

  it('shows a connection error when submit fails unexpectedly', async () => {
    vi.mocked(api.submitPick).mockRejectedValue(new Error('network error'))

    render(<PickerPage />)
    const input = await screen.findByRole('textbox', { name: /repository path/i })
    fireEvent.change(input, { target: { value: '/valid/path' } })
    fireEvent.click(screen.getByRole('button', { name: /open repository/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to connect to gitlocal server/i)
    })
  })

  it('shows error when browse API call throws', async () => {
    vi.mocked(api.getPickBrowse).mockRejectedValueOnce(new Error('network error'))

    render(<PickerPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load folders/i)
    })
  })
})
