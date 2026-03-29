import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PickerPage from './PickerPage'

vi.mock('../../services/api', () => ({
  api: {
    submitPick: vi.fn(),
  },
}))

import { api } from '../../services/api'

beforeEach(() => {
  vi.clearAllMocks()
  // Mock window.location.reload
  Object.defineProperty(window, 'location', {
    value: { reload: vi.fn() },
    writable: true,
  })
})

describe('PickerPage', () => {
  it('renders path input and Open button', () => {
    render(<PickerPage />)
    expect(screen.getByRole('textbox', { name: /repository path/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument()
  })

  it('shows inline error without API call when path is empty', async () => {
    render(<PickerPage />)
    fireEvent.click(screen.getByRole('button', { name: /open/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/enter a repository path/i)
    expect(vi.mocked(api.submitPick)).not.toHaveBeenCalled()
  })

  it('shows inline error when API returns ok:false', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: false, error: 'path does not exist' })

    render(<PickerPage />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '/bad/path' } })
    fireEvent.click(screen.getByRole('button', { name: /open/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('path does not exist')
    })
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('calls window.location.reload on ok:true', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '/valid/path' } })
    fireEvent.click(screen.getByRole('button', { name: /open/i }))

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  it('sends trimmed path to submitPick', async () => {
    vi.mocked(api.submitPick).mockResolvedValue({ ok: true, error: '' })

    render(<PickerPage />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  /some/path  ' } })
    fireEvent.click(screen.getByRole('button', { name: /open/i }))

    await waitFor(() => {
      expect(vi.mocked(api.submitPick)).toHaveBeenCalledWith('/some/path')
    })
  })

  it('shows error when API call throws', async () => {
    vi.mocked(api.submitPick).mockRejectedValue(new Error('network error'))

    render(<PickerPage />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '/some/path' } })
    fireEvent.click(screen.getByRole('button', { name: /open/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to connect/i)
    })
  })
})
