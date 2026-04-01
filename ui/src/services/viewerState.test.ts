import { beforeEach, describe, expect, it } from 'vitest'
import { clearViewerPath, readViewerState, resetViewerState, writeViewerState } from './viewerState'

describe('viewerState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('reads empty defaults from the URL', () => {
    expect(readViewerState()).toEqual({
      repoPath: '',
      branch: '',
      path: '',
      pathType: 'none',
      raw: false,
      sidebarCollapsed: false,
      searchPresentation: 'collapsed',
      searchQuery: '',
    })
  })

  it('writes and reads viewer state from query params', () => {
    writeViewerState({
      repoPath: '/tmp/repo',
      branch: 'main',
      path: 'src/index.ts',
      pathType: 'file',
      raw: true,
      sidebarCollapsed: true,
      searchPresentation: 'expanded',
      searchQuery: 'hello',
    })

    expect(readViewerState()).toEqual({
      repoPath: '/tmp/repo',
      branch: 'main',
      path: 'src/index.ts',
      pathType: 'file',
      raw: true,
      sidebarCollapsed: true,
      searchPresentation: 'expanded',
      searchQuery: 'hello',
    })
  })

  it('clears the current path and raw mode without resetting other state', () => {
    writeViewerState({ branch: 'main', path: 'README.md', pathType: 'file', raw: true })
    const next = clearViewerPath()
    expect(next.branch).toBe('main')
    expect(next.path).toBe('')
    expect(next.pathType).toBe('none')
    expect(next.raw).toBe(false)
  })

  it('resets all state', () => {
    writeViewerState({ branch: 'main', path: 'README.md', pathType: 'file' })
    resetViewerState()
    expect(window.location.search).toBe('')
  })

  it('persists directory selections', () => {
    writeViewerState({ repoPath: '/tmp/repo', branch: 'main', path: 'docs', pathType: 'dir' })
    expect(readViewerState()).toEqual({
      repoPath: '/tmp/repo',
      branch: 'main',
      path: 'docs',
      pathType: 'dir',
      raw: false,
      sidebarCollapsed: false,
      searchPresentation: 'collapsed',
      searchQuery: '',
    })
  })

  it('persists expanded search presentation separately from query text', () => {
    writeViewerState({ searchPresentation: 'expanded' })
    expect(readViewerState().searchPresentation).toBe('expanded')
  })
})
