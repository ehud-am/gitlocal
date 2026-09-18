import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useTerminalPanelPreference } from './useTerminalPanelPreference'

vi.mock('../services/terminalPanelPreference', () => ({
  terminalPanelPreferenceApi: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { terminalPanelPreferenceApi } from '../services/terminalPanelPreference'

const mockGet = terminalPanelPreferenceApi.get as unknown as ReturnType<typeof vi.fn>
const mockSet = terminalPanelPreferenceApi.set as unknown as ReturnType<typeof vi.fn>

describe('useTerminalPanelPreference', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockSet.mockReset()
    mockSet.mockResolvedValue(undefined)
  })

  it('defaults to "right" before the fetch resolves', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useTerminalPanelPreference())
    expect(result.current.dockPosition).toBe('right')
  })

  it('applies the fetched position once it resolves', async () => {
    mockGet.mockResolvedValue('left')
    const { result } = renderHook(() => useTerminalPanelPreference())

    await waitFor(() => expect(result.current.dockPosition).toBe('left'))
  })

  it('updates state immediately and persists via the API when setDockPosition is called', async () => {
    mockGet.mockResolvedValue('right')
    const { result } = renderHook(() => useTerminalPanelPreference())
    await waitFor(() => expect(result.current.dockPosition).toBe('right'))

    act(() => result.current.setDockPosition('bottom'))

    expect(result.current.dockPosition).toBe('bottom')
    expect(mockSet).toHaveBeenCalledWith('bottom')
  })

  it('keeps the default position and does not throw when the initial fetch rejects', async () => {
    mockGet.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useTerminalPanelPreference())

    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    expect(result.current.dockPosition).toBe('right')
  })

  it('does not throw when persisting a change fails', async () => {
    mockGet.mockResolvedValue('right')
    mockSet.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useTerminalPanelPreference())
    await waitFor(() => expect(result.current.dockPosition).toBe('right'))

    act(() => result.current.setDockPosition('left'))

    expect(result.current.dockPosition).toBe('left')
    await waitFor(() => expect(mockSet).toHaveBeenCalledWith('left'))
  })

  it('ignores a fetch that resolves after unmount', async () => {
    let resolveGet: (value: string) => void = () => {}
    mockGet.mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve
      }),
    )
    const { unmount } = renderHook(() => useTerminalPanelPreference())
    unmount()

    expect(() => resolveGet('left')).not.toThrow()
  })
})
