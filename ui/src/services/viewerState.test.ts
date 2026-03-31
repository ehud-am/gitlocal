import { beforeEach, describe, expect, it } from 'vitest'
import { clearViewerPath, readViewerState, resetViewerState, writeViewerState } from './viewerState'

describe('viewerState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('reads empty defaults from the URL', () => {
    expect(readViewerState()).toEqual({
      branch: '',
      path: '',
      raw: false,
      sidebarCollapsed: false,
      searchMode: 'name',
      searchQuery: '',
      caseSensitive: false,
    })
  })

  it('writes and reads viewer state from query params', () => {
    writeViewerState({
      branch: 'main',
      path: 'src/index.ts',
      raw: true,
      sidebarCollapsed: true,
      searchMode: 'content',
      searchQuery: 'hello',
      caseSensitive: true,
    })

    expect(readViewerState()).toEqual({
      branch: 'main',
      path: 'src/index.ts',
      raw: true,
      sidebarCollapsed: true,
      searchMode: 'content',
      searchQuery: 'hello',
      caseSensitive: true,
    })
  })

  it('clears the current path and raw mode without resetting other state', () => {
    writeViewerState({ branch: 'main', path: 'README.md', raw: true })
    const next = clearViewerPath()
    expect(next.branch).toBe('main')
    expect(next.path).toBe('')
    expect(next.raw).toBe(false)
  })

  it('resets all state', () => {
    writeViewerState({ branch: 'main', path: 'README.md' })
    resetViewerState()
    expect(window.location.search).toBe('')
  })
})
