import { act, renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useTerminalPanel } from './useTerminalPanel'

describe('useTerminalPanel', () => {
  it('starts hidden with no tabs', () => {
    const { result } = renderHook(() => useTerminalPanel())
    expect(result.current.state).toEqual({ visible: false, tabs: [], activeTabId: null })
  })

  it('show/hide/toggleVisible control visibility', () => {
    const { result } = renderHook(() => useTerminalPanel())

    act(() => result.current.show())
    expect(result.current.state.visible).toBe(true)

    act(() => result.current.hide())
    expect(result.current.state.visible).toBe(false)

    act(() => result.current.toggleVisible())
    expect(result.current.state.visible).toBe(true)
    act(() => result.current.toggleVisible())
    expect(result.current.state.visible).toBe(false)
  })

  it('addTab labels regular tabs by ordinal and claude/codex tabs by kind, and activates the new tab', () => {
    const { result } = renderHook(() => useTerminalPanel())

    act(() => result.current.addTab({ id: 'a', kind: 'regular', cwd: '/repo', status: 'running' }))
    act(() => result.current.addTab({ id: 'b', kind: 'claude', cwd: '/repo', status: 'running' }))
    act(() => result.current.addTab({ id: 'c', kind: 'codex', cwd: '/repo', status: 'running' }))
    act(() => result.current.addTab({ id: 'd', kind: 'regular', cwd: '/repo', status: 'running' }))

    expect(result.current.state.tabs.map((t) => t.label)).toEqual(['Terminal 1', 'Claude', 'Codex', 'Terminal 2'])
    expect(result.current.state.activeTabId).toBe('d')
  })

  it('removeTab drops the tab and, when it was active, activates the last remaining tab', () => {
    const { result } = renderHook(() => useTerminalPanel())
    act(() => result.current.addTab({ id: 'a', kind: 'regular', cwd: '/repo', status: 'running' }))
    act(() => result.current.addTab({ id: 'b', kind: 'regular', cwd: '/repo', status: 'running' }))

    act(() => result.current.removeTab('b'))
    expect(result.current.state.tabs.map((t) => t.id)).toEqual(['a'])
    expect(result.current.state.activeTabId).toBe('a')

    act(() => result.current.removeTab('a'))
    expect(result.current.state.tabs).toEqual([])
    expect(result.current.state.activeTabId).toBeNull()
  })

  it('removeTab leaves activeTabId untouched when removing a non-active tab', () => {
    const { result } = renderHook(() => useTerminalPanel())
    act(() => result.current.addTab({ id: 'a', kind: 'regular', cwd: '/repo', status: 'running' }))
    act(() => result.current.addTab({ id: 'b', kind: 'regular', cwd: '/repo', status: 'running' }))
    act(() => result.current.setActiveTab('a'))

    act(() => result.current.removeTab('b'))
    expect(result.current.state.activeTabId).toBe('a')
  })

  it('setActiveTab only switches when the id refers to an existing tab', () => {
    const { result } = renderHook(() => useTerminalPanel())
    act(() => result.current.addTab({ id: 'a', kind: 'regular', cwd: '/repo', status: 'running' }))
    act(() => result.current.addTab({ id: 'b', kind: 'regular', cwd: '/repo', status: 'running' }))

    act(() => result.current.setActiveTab('a'))
    expect(result.current.state.activeTabId).toBe('a')

    act(() => result.current.setActiveTab('does-not-exist'))
    expect(result.current.state.activeTabId).toBe('a')
  })

  it('updateTabStatus updates only the matching tab', () => {
    const { result } = renderHook(() => useTerminalPanel())
    act(() => result.current.addTab({ id: 'a', kind: 'regular', cwd: '/repo', status: 'running' }))
    act(() => result.current.addTab({ id: 'b', kind: 'regular', cwd: '/repo', status: 'running' }))

    act(() => result.current.updateTabStatus('a', 'exited'))
    expect(result.current.state.tabs.find((t) => t.id === 'a')?.status).toBe('exited')
    expect(result.current.state.tabs.find((t) => t.id === 'b')?.status).toBe('running')
  })
})
