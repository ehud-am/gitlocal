import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearRecentItems,
  clearViewerPath,
  readRecentItems,
  rememberRecentChangedItems,
  readViewerState,
  rememberRecentItem,
  resetViewerState,
  writeViewerState,
} from './viewerState'

describe('viewerState', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    const storage = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      writable: true,
    })
    clearRecentItems()
  })

  it('reads empty defaults from the URL', () => {
    expect(readViewerState()).toEqual({
      repoPath: '',
      branch: '',
      path: '',
      pathType: 'none',
      raw: false,
      sidebarCollapsed: false,
      generatedLocalVisibility: 'hide',
      searchRootPath: '',
      searchContentKind: 'all',
      searchTrackedMode: 'tracked-only',
      searchLimit: 50,
      searchPresentation: 'collapsed',
      searchQuery: '',
      searchMode: 'both',
      searchCaseSensitive: false,
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
      generatedLocalVisibility: 'show',
      searchRootPath: 'docs/specs',
      searchContentKind: 'markdown',
      searchTrackedMode: 'include-generated-local',
      searchLimit: 25,
      searchPresentation: 'expanded',
      searchQuery: 'hello',
      searchMode: 'content',
      searchCaseSensitive: true,
    })

    expect(readViewerState()).toEqual({
      repoPath: '/tmp/repo',
      branch: 'main',
      path: 'src/index.ts',
      pathType: 'file',
      raw: true,
      sidebarCollapsed: true,
      generatedLocalVisibility: 'show',
      searchRootPath: 'docs/specs',
      searchContentKind: 'markdown',
      searchTrackedMode: 'include-generated-local',
      searchLimit: 25,
      searchPresentation: 'expanded',
      searchQuery: 'hello',
      searchMode: 'content',
      searchCaseSensitive: true,
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
      generatedLocalVisibility: 'hide',
      searchRootPath: '',
      searchContentKind: 'all',
      searchTrackedMode: 'tracked-only',
      searchLimit: 50,
      searchPresentation: 'collapsed',
      searchQuery: '',
      searchMode: 'both',
      searchCaseSensitive: false,
    })
  })

  it('persists expanded search presentation separately from query text', () => {
    writeViewerState({ searchPresentation: 'expanded' })
    expect(readViewerState().searchPresentation).toBe('expanded')
  })

  it('persists search mode and case sensitivity flags', () => {
    writeViewerState({ searchMode: 'name', searchCaseSensitive: true })
    expect(readViewerState().searchMode).toBe('name')
    expect(readViewerState().searchCaseSensitive).toBe(true)
  })

  it('persists generated/local visibility and search scope preferences', () => {
    writeViewerState({
      generatedLocalVisibility: 'only',
      searchRootPath: 'ui/src',
      searchContentKind: 'markdown',
      searchTrackedMode: 'generated-local-only',
      searchLimit: 10,
    })

    expect(readViewerState()).toMatchObject({
      generatedLocalVisibility: 'only',
      searchRootPath: 'ui/src',
      searchContentKind: 'markdown',
      searchTrackedMode: 'generated-local-only',
      searchLimit: 10,
    })
  })

  it('falls back to safe defaults for invalid preference query params', () => {
    window.history.replaceState(
      null,
      '',
      '/?generatedLocalVisibility=everything&searchContentKind=binary&searchTrackedMode=all&searchLimit=-1',
    )

    expect(readViewerState()).toMatchObject({
      generatedLocalVisibility: 'hide',
      searchContentKind: 'all',
      searchTrackedMode: 'tracked-only',
      searchLimit: 50,
    })
  })

  it('persists and de-duplicates recent items in local storage', () => {
    rememberRecentItem({ path: 'README.md', type: 'file', label: 'README.md', available: true })
    rememberRecentItem({ path: 'docs', type: 'folder', label: 'docs', available: true })
    rememberRecentItem({ path: 'README.md', type: 'file', label: 'README', available: true })

    const items = readRecentItems()
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ path: 'README.md', label: 'README', type: 'file' })
    expect(items[1]).toMatchObject({ path: 'docs', type: 'folder' })
    expect(items[0].lastViewedAt).toBeTruthy()
  })

  it('prunes recent items to the latest 12 entries and can clear them', () => {
    for (let index = 0; index < 14; index += 1) {
      rememberRecentItem({ path: `docs/${index}.md`, type: 'file', label: `${index}.md`, available: true })
    }

    expect(readRecentItems()).toHaveLength(12)
    expect(readRecentItems()[0].path).toBe('docs/13.md')

    clearRecentItems()
    expect(readRecentItems()).toEqual([])
  })

  it('persists recently changed items without losing viewed item metadata', () => {
    rememberRecentItem({ path: 'README.md', type: 'file', label: 'README', available: true })
    const items = rememberRecentChangedItems([
      { path: 'docs/guide.md', type: 'file', label: 'guide.md', available: true, lastChangedAt: '2026-06-11T12:00:00.000Z' },
      { path: 'README.md', type: 'file', label: 'README.md', available: true, lastChangedAt: '2026-06-11T12:01:00.000Z' },
    ])

    expect(items[0]).toMatchObject({ path: 'README.md', lastChangedAt: '2026-06-11T12:01:00.000Z' })
    expect(items[1]).toMatchObject({ path: 'docs/guide.md', lastChangedAt: '2026-06-11T12:00:00.000Z' })
    expect(readRecentItems()).toHaveLength(2)
  })
})
