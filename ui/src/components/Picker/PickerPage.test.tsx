import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import PickerPage from './PickerPage'

vi.mock('../../services/api', () => ({
  api: {
    getPickBrowse: vi.fn(),
    submitPick: vi.fn(),
  },
}))

import { api } from '../../services/api'

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
  })
})

describe('PickerPage', () => {
  it('renders explanatory heading and folder browser', async () => {
    const { container } = render(<PickerPage />)

    expect(await screen.findByText(/Choose the folder GitLocal should open/i)).toBeInTheDocument()
    expect(screen.getByText(/started without a repository location/i)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /folders/i })).toBeInTheDocument()
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

  it('browsing a normal folder uses the explicit browse button', async () => {
    render(<PickerPage />)

    fireEvent.click(await screen.findByRole('button', { name: /^browse projects$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledWith('/Users/example/projects')
    })
  })

  it('double-clicking a normal folder browses into it', async () => {
    render(<PickerPage />)

    fireEvent.doubleClick(await screen.findByRole('button', { name: /^projects folder$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledWith('/Users/example/projects')
    })
  })

  it('opening a git repository uses the explicit open button', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)

    fireEvent.click(await screen.findByRole('button', { name: /^open gitlocal$/i }))

    await waitFor(() => {
      expect(vi.mocked(api.submitPick)).toHaveBeenCalledWith('/Users/example/gitlocal')
    })
    expect(vi.mocked(api.getPickBrowse)).toHaveBeenCalledTimes(1)
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

    fireEvent.click(screen.getByRole('button', { name: /up one level/i }))

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
      parentPath: '/Users',
      homePath: '/Users/example',
      roots: [{ name: '/', path: '/' }],
      entries: [],
      error: '',
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
