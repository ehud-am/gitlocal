import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import PickerPage from './PickerPage'

vi.mock('../../services/api', () => ({
  api: {
    getStartupFolder: vi.fn(),
    getStartupOpenTarget: vi.fn(),
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

  vi.mocked(api.getStartupFolder).mockResolvedValue({
    path: '/Users/example',
    source: 'last-used',
    exists: true,
    readable: true,
    lastUsedPath: '/Users/example',
    fallbackReason: '',
  })
  vi.mocked(api.getStartupOpenTarget).mockResolvedValue({ target: null })
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

  it('surfaces a failed startup-open-target message (invalid explicit path) instead of silently browsing an unrelated folder (US3)', async () => {
    vi.mocked(api.getStartupOpenTarget).mockResolvedValueOnce({
      target: {
        source: 'explicit-launch',
        inputPath: '/tmp/gitlocal-definitely-missing',
        rootPath: '',
        selectedPath: '',
        selectedPathType: 'none',
        status: 'failed',
        message: 'Path does not exist: /tmp/gitlocal-definitely-missing',
        receivedAt: '2026-07-24T00:00:00.000Z',
      },
    })

    render(<PickerPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Path does not exist: /tmp/gitlocal-definitely-missing')
  })

  it('does not show an open-target message when the startup target was accepted or none was requested', async () => {
    render(<PickerPage />)

    await waitFor(() => {
      expect(vi.mocked(api.getStartupOpenTarget)).toHaveBeenCalled()
    })
    expect(screen.queryByText(/does not exist/i)).not.toBeInTheDocument()
  })

  it('loads folders on mount', async () => {
    render(<PickerPage />)

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalled()
    })

    expect(screen.getAllByText('projects').length).toBeGreaterThan(0)
    expect(screen.getAllByText('gitlocal').length).toBeGreaterThan(0)
  })

  it('shows a generic default-location startup message when no fallback reason is given', async () => {
    vi.mocked(api.getStartupFolder).mockResolvedValueOnce({
      path: '/Users/example',
      source: 'os-default',
      exists: true,
      readable: true,
      lastUsedPath: '',
      fallbackReason: '',
    })

    render(<PickerPage />)

    expect(await screen.findByText(/opened a default location/i)).toBeInTheDocument()
  })

  it('surfaces why the remembered folder was skipped when falling back to the OS default', async () => {
    vi.mocked(api.getStartupFolder).mockResolvedValueOnce({
      path: '/Users/example',
      source: 'os-default',
      exists: true,
      readable: true,
      lastUsedPath: '/Users/example/gone',
      fallbackReason: 'Last used folder no longer exists. Opened a default location instead.',
    })

    render(<PickerPage />)

    // Regression guard: an os-default source with a non-empty fallbackReason must show that
    // specific reason, not a generic message that silently discards it.
    expect(await screen.findByText(/last used folder no longer exists/i)).toBeInTheDocument()
  })

  it('recovers a previously-unavailable remembered folder by reopening the same path once it is reachable again (FR-008)', async () => {
    vi.mocked(api.getStartupFolder).mockResolvedValueOnce({
      path: '/Users/example',
      source: 'os-default',
      exists: true,
      readable: true,
      lastUsedPath: '/Volumes/external-drive/project',
      fallbackReason: 'Last used folder is currently unreachable — it may be on a disconnected drive. Opened a default location instead.',
    })
    vi.mocked(api.openRepository).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    expect(await screen.findByText(/currently unreachable/i)).toBeInTheDocument()

    // The drive reconnects; the user reopens the same remembered path from the still-open
    // picker — no full app relaunch required, matching FR-008's recovery requirement.
    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '/Volumes/external-drive/project' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Volumes/external-drive/project')
    })
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('shows the os-default startup message and tolerates startup lookup failures', async () => {
    vi.mocked(api.getStartupFolder).mockResolvedValueOnce({
      path: '/Users/example',
      source: 'os-default',
      exists: true,
      readable: true,
      lastUsedPath: '/Users/example/missing',
      fallbackReason: 'Last used folder is unavailable. Opened a default location instead.',
    })

    const { unmount } = render(<PickerPage />)
    expect(await screen.findByText(/last used folder is unavailable/i)).toBeInTheDocument()
    unmount()

    vi.mocked(api.getStartupFolder).mockRejectedValueOnce(new Error('startup failed'))
    render(<PickerPage />)

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalled()
    })
    expect(screen.queryByText(/last used folder is unavailable/i)).not.toBeInTheDocument()
  })

  it('shows the os-default startup message when the previously open folder became unavailable', async () => {
    vi.mocked(api.getStartupFolder).mockResolvedValueOnce({
      path: '/Users/example',
      source: 'os-default',
      exists: true,
      readable: true,
      lastUsedPath: '/Users/example/missing',
      fallbackReason: 'The folder you had open no longer exists — opened a default location instead.',
    })

    render(<PickerPage />)
    expect(await screen.findByText(/no longer exists — opened a default location/i)).toBeInTheDocument()
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

  it('double-clicking the parent row in the folder table browses to the parent path', async () => {
    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^Open parent folder$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users')
    })
    expect(vi.mocked(api.openRepository)).not.toHaveBeenCalled()
  })

  it('double-clicking a repository folder opens it as a repository', async () => {
    vi.mocked(api.openRepository).mockResolvedValue({
      ok: true,
      error: '',
      path: '/Users/example/gitlocal',
      rootPath: '/Users/example/gitlocal',
      selectedPath: '',
      selectedPathType: 'none',
      openMode: 'repository',
      gitState: 'repository-root',
    })
    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^gitlocal git repository$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/gitlocal')
    })
    expect(vi.mocked(api.getFolderBrowse)).not.toHaveBeenCalledWith('/Users/example/gitlocal')
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('labels and opens a repository child from a plain parent', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example/projects',
      parentPath: '/Users/example',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [
        {
          name: 'app-repo',
          path: '/Users/example/projects/app-repo',
          type: 'dir',
          isGitRepo: true,
          gitState: 'repository-root',
          openMode: 'repository',
          repositoryRootPath: '/Users/example/projects/app-repo',
        },
        {
          name: 'notes',
          path: '/Users/example/projects/notes',
          type: 'dir',
          isGitRepo: false,
          gitState: 'outside-repository',
          openMode: 'folder',
        },
      ],
      error: '',
      isGitRepo: false,
      gitState: 'outside-repository',
      openMode: 'folder',
      canOpen: true,
      canCreateChild: true,
      canInitGit: true,
      canCloneIntoChild: true,
    })
    vi.mocked(api.openRepository).mockResolvedValue({
      ok: true,
      error: '',
      path: '/Users/example/projects/app-repo',
      rootPath: '/Users/example/projects/app-repo',
      selectedPath: '',
      selectedPathType: 'none',
      openMode: 'repository',
      gitState: 'repository-root',
      repositoryRootPath: '/Users/example/projects/app-repo',
    })

    render(<PickerPage />)

    expect(await screen.findByRole('button', { name: /^app-repo git repository$/i })).toBeInTheDocument()
    expect(screen.getByText('Git repository')).toBeInTheDocument()

    fireEvent.doubleClick(screen.getByRole('button', { name: /^app-repo git repository$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/projects/app-repo')
    })
    expect(vi.mocked(api.getFolderBrowse)).not.toHaveBeenCalledWith('/Users/example/projects/app-repo')
    expect(vi.mocked(writeViewerState)).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/Users/example/projects/app-repo',
      path: '',
      pathType: 'none',
    }))
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('browses into a regular child folder on double click', async () => {
    vi.mocked(api.getFolderBrowse)
      .mockResolvedValueOnce({
        currentPath: '/Users/example/projects',
        parentPath: '/Users/example',
        homePath: '/Users/example',
        roots: [{ name: '/', path: '/' }],
        entries: [
          {
            name: 'notes',
            path: '/Users/example/projects/notes',
            type: 'dir',
            isGitRepo: false,
            gitState: 'outside-repository',
            openMode: 'folder',
          },
        ],
        error: '',
        isGitRepo: false,
        gitState: 'outside-repository',
        openMode: 'folder',
        canOpen: true,
        canCreateChild: true,
        canInitGit: true,
        canCloneIntoChild: true,
      })
      .mockResolvedValueOnce({
        currentPath: '/Users/example/projects/notes',
        parentPath: '/Users/example/projects',
        homePath: '/Users/example',
        roots: [{ name: '/', path: '/' }],
        entries: [],
        error: '',
        isGitRepo: false,
        gitState: 'outside-repository',
        openMode: 'folder',
        canOpen: true,
        canCreateChild: true,
        canInitGit: true,
        canCloneIntoChild: true,
      })

    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^notes folder$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users/example/projects/notes')
    })
    expect(await screen.findByText('/Users/example/projects/notes')).toBeInTheDocument()
  })

  it('keeps a regular sibling beside a repository child as a browsable folder', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example/projects',
      parentPath: '/Users/example',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [
        {
          name: 'app-repo',
          path: '/Users/example/projects/app-repo',
          type: 'dir',
          isGitRepo: true,
          gitState: 'repository-root',
          openMode: 'repository',
        },
        {
          name: 'notes',
          path: '/Users/example/projects/notes',
          type: 'dir',
          isGitRepo: false,
          gitState: 'outside-repository',
          openMode: 'folder',
        },
      ],
      error: '',
      isGitRepo: false,
      gitState: 'outside-repository',
      openMode: 'folder',
      canOpen: true,
      canCreateChild: true,
      canInitGit: true,
      canCloneIntoChild: true,
    })

    render(<PickerPage />)

    expect(await screen.findByRole('button', { name: /^notes folder$/i })).toBeInTheDocument()

    fireEvent.doubleClick(screen.getByRole('button', { name: /^notes folder$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users/example/projects/notes')
    })
    expect(vi.mocked(api.openRepository)).not.toHaveBeenCalledWith('/Users/example/projects/notes')
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

    const tree = await screen.findByRole('group', { name: /folder contents navigation/i })
    const projectsItem = within(tree).getByText('projects').closest('button')
    expect(projectsItem).not.toBeNull()
    fireEvent.click(projectsItem as HTMLElement)

    expect(screen.getByRole('textbox', { name: /folder path/i })).toHaveValue('/Users/example/projects')

    fireEvent.doubleClick(projectsItem as HTMLElement)
    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users/example/projects')
    })

    const parentItem = within(tree).getByText('..').closest('button')
    expect(parentItem).not.toBeNull()
    fireEvent.doubleClick(parentItem as HTMLElement)

    await waitFor(() => {
      expect(vi.mocked(api.getFolderBrowse)).toHaveBeenCalledWith('/Users')
    })
  })

  it('does not render a stale aria-expanded on sidebar directory rows (PickerPage has no in-place expand/collapse state)', async () => {
    render(<PickerPage />)

    const tree = await screen.findByRole('group', { name: /folder contents navigation/i })
    const projectsItem = within(tree).getByText('projects').closest('button')
    expect(projectsItem).not.toBeNull()
    expect(projectsItem as HTMLElement).not.toHaveAttribute('aria-expanded')

    const gitlocalItem = within(tree).getByText('gitlocal').closest('button')
    expect(gitlocalItem).not.toBeNull()
    expect(gitlocalItem as HTMLElement).not.toHaveAttribute('aria-expanded')
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

    const tree = await screen.findByRole('group', { name: /folder contents navigation/i })
    expect(within(tree).queryByText(/^local$/i)).not.toBeInTheDocument()
    expect(within(tree).getByText(/^git$/i)).toBeInTheDocument()
  })

  it('does not show repository badges for nested folders inside a repository', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example/gitlocal',
      parentPath: '/Users/example',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [
        {
          name: 'docs',
          path: '/Users/example/gitlocal/docs',
          type: 'dir',
          isGitRepo: false,
          gitState: 'inside-repository',
          openMode: 'folder',
          repositoryRootPath: '/Users/example/gitlocal',
        },
      ],
      error: '',
      isGitRepo: true,
      gitState: 'repository-root',
      openMode: 'repository',
      canOpen: true,
      canCreateChild: true,
      canInitGit: false,
      canCloneIntoChild: true,
    })

    render(<PickerPage />)

    const tree = await screen.findByRole('group', { name: /folder contents navigation/i })
    expect(within(tree).queryByText(/^git$/i)).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^docs folder$/i })).toBeInTheDocument()
  })

  it('collapses and restores navigation with the same rail pattern as the viewer', async () => {
    render(<PickerPage />)

    const layout = document.querySelector('.picker-layout')
    expect(layout).not.toHaveClass('picker-layout-collapsed')

    fireEvent.click(await screen.findByRole('button', { name: /collapse navigation/i }))

    const collapsedRail = await screen.findByLabelText(/collapsed navigation/i)
    expect(collapsedRail).toBeInTheDocument()
    expect(within(collapsedRail).getAllByRole('button')).toHaveLength(1)
    expect(within(collapsedRail).getByRole('button', { name: /expand navigation/i })).toBeInTheDocument()
    expect(layout).toHaveClass('picker-layout-collapsed')

    fireEvent.click(screen.getByRole('button', { name: /expand navigation/i }))

    expect(await screen.findByRole('button', { name: /collapse navigation/i })).toBeInTheDocument()
    expect(layout).not.toHaveClass('picker-layout-collapsed')
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

  it('opens a typed repository child path using the returned repository root', async () => {
    vi.mocked(api.openRepository).mockResolvedValue({
      ok: true,
      error: '',
      path: '/Users/example/projects/app-repo',
      rootPath: '/Users/example/projects/app-repo',
      selectedPath: '',
      selectedPathType: 'none',
      openMode: 'repository',
      gitState: 'repository-root',
      repositoryRootPath: '/Users/example/projects/app-repo',
    })
    render(<PickerPage />)

    const input = await screen.findByRole('textbox', { name: /folder path/i })
    fireEvent.change(input, { target: { value: '/Users/example/projects/app-repo' } })
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/projects/app-repo')
    })
    expect(vi.mocked(writeViewerState)).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/Users/example/projects/app-repo',
      path: '',
      pathType: 'none',
    }))
    expect(window.location.reload).toHaveBeenCalled()
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

  it('opens the current repository browse root from the folder actions menu as a repository', async () => {
    vi.mocked(api.getFolderBrowse).mockResolvedValueOnce({
      currentPath: '/Users/example/projects/app-repo',
      parentPath: '/Users/example/projects',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [
        { name: 'README.md', path: '/Users/example/projects/app-repo/README.md', type: 'file', isGitRepo: false, openMode: 'file' },
      ],
      error: '',
      isGitRepo: true,
      gitState: 'repository-root',
      openMode: 'repository',
      repositoryRootPath: '/Users/example/projects/app-repo',
      canOpen: true,
      canCreateChild: true,
      canInitGit: false,
      canCloneIntoChild: true,
    })
    vi.mocked(api.openRepository).mockResolvedValue({
      ok: true,
      error: '',
      path: '/Users/example/projects/app-repo',
      rootPath: '/Users/example/projects/app-repo',
      selectedPath: '',
      selectedPathType: 'none',
      openMode: 'repository',
      gitState: 'repository-root',
      repositoryRootPath: '/Users/example/projects/app-repo',
    })

    render(<PickerPage />)

    await openFolderActionsMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /open this folder/i }))

    await waitFor(() => {
      expect(vi.mocked(api.openRepository)).toHaveBeenCalledWith('/Users/example/projects/app-repo')
    })
    expect(vi.mocked(writeViewerState)).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/Users/example/projects/app-repo',
      path: '',
      pathType: 'none',
    }))
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
