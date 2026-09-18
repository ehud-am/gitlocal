import { renderHook, waitFor, act, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTerminalPanelPreference } from './useTerminalPanelPreference'

const ORIGINAL_INNER_WIDTH = window.innerWidth

function setInnerWidth(value: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value })
}

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

  afterEach(() => {
    setInnerWidth(ORIGINAL_INNER_WIDTH)
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

  describe('effectiveDockPosition (auto-reroute on a narrow window)', () => {
    it('matches dockPosition on a wide window', async () => {
      setInnerWidth(1200)
      mockGet.mockResolvedValue('left')
      const { result } = renderHook(() => useTerminalPanelPreference())
      await waitFor(() => expect(result.current.dockPosition).toBe('left'))

      expect(result.current.effectiveDockPosition).toBe('left')
    })

    it('falls back to "bottom" when the window is too narrow for a side dock', async () => {
      setInnerWidth(500)
      mockGet.mockResolvedValue('right')
      const { result } = renderHook(() => useTerminalPanelPreference())
      await waitFor(() => expect(result.current.dockPosition).toBe('right'))

      expect(result.current.effectiveDockPosition).toBe('bottom')
    })

    it('never overrides an actual "bottom" preference regardless of window width', async () => {
      setInnerWidth(500)
      mockGet.mockResolvedValue('bottom')
      const { result } = renderHook(() => useTerminalPanelPreference())
      await waitFor(() => expect(result.current.dockPosition).toBe('bottom'))

      expect(result.current.effectiveDockPosition).toBe('bottom')
    })

    it('reverts to the stored side-dock preference once the window widens again', async () => {
      setInnerWidth(500)
      mockGet.mockResolvedValue('right')
      const { result } = renderHook(() => useTerminalPanelPreference())
      await waitFor(() => expect(result.current.effectiveDockPosition).toBe('bottom'))

      act(() => {
        setInnerWidth(1200)
        fireEvent(window, new Event('resize'))
      })

      expect(result.current.dockPosition).toBe('right')
      expect(result.current.effectiveDockPosition).toBe('right')
    })
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
