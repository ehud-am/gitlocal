import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePaneWorkspace } from './usePaneWorkspace'

describe('usePaneWorkspace', () => {
  it('starts empty with tabbed layout and no active pane', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    expect(result.current.panes).toEqual([])
    expect(result.current.activePaneId).toBeNull()
    expect(result.current.layoutMode).toBe('tabbed')
    expect(result.current.tilePaneIds).toEqual([])
  })

  it('opens a content pane, appends it, and makes it active', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let id = ''
    act(() => {
      id = result.current.openContentPane('src/index.ts')
    })
    expect(result.current.panes).toHaveLength(1)
    expect(result.current.panes[0]).toMatchObject({ id, kind: 'content', contentPath: 'src/index.ts', title: 'index.ts' })
    expect(result.current.activePaneId).toBe(id)
  })

  it('opens a second file as a new tab, keeping both panes open (US1 AS1)', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let firstId = ''
    let secondId = ''
    act(() => { firstId = result.current.openContentPane('README.md') })
    act(() => { secondId = result.current.openContentPane('src/app.ts') })

    expect(result.current.panes.map((pane) => pane.id)).toEqual([firstId, secondId])
    expect(result.current.activePaneId).toBe(secondId)
  })

  it('derives a title from the file basename, including nested paths', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    act(() => { result.current.openContentPane('src/components/Foo/Foo.tsx') })
    expect(result.current.panes[0].title).toBe('Foo.tsx')
  })

  it('opens terminal panes with sequential generated titles', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    act(() => { result.current.openTerminalPane() })
    act(() => { result.current.openTerminalPane() })
    expect(result.current.panes[0]).toMatchObject({ kind: 'terminal', title: 'Terminal 1' })
    expect(result.current.panes[1]).toMatchObject({ kind: 'terminal', title: 'Terminal 2' })
  })

  it('assigns a unique id to every pane, even with duplicate content paths', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let firstId = ''
    let secondId = ''
    act(() => { firstId = result.current.openContentPane('README.md') })
    act(() => { secondId = result.current.openContentPane('README.md') })
    expect(firstId).not.toBe(secondId)
    expect(result.current.panes).toHaveLength(2)
    expect(result.current.panes[0].contentPath).toBe('README.md')
    expect(result.current.panes[1].contentPath).toBe('README.md')
  })

  it('switches the active pane on selectPane without touching the pane list', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let firstId = ''
    act(() => { firstId = result.current.openContentPane('a.md') })
    act(() => { result.current.openContentPane('b.md') })
    act(() => { result.current.selectPane(firstId) })
    expect(result.current.activePaneId).toBe(firstId)
    expect(result.current.panes).toHaveLength(2)
  })

  it('selectPane is a no-op when given the already-active pane id', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let id = ''
    act(() => { id = result.current.openContentPane('a.md') })
    act(() => { result.current.selectPane(id) })
    expect(result.current.activePaneId).toBe(id)
  })

  it('closes a tab, leaving the remaining tab open and activating an adjacent one (US1 AS3)', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let firstId = ''
    let secondId = ''
    act(() => { firstId = result.current.openContentPane('a.md') })
    act(() => { secondId = result.current.openContentPane('b.md') })
    act(() => { result.current.closePane(firstId) })

    expect(result.current.panes).toHaveLength(1)
    expect(result.current.panes[0].id).toBe(secondId)
    expect(result.current.activePaneId).toBe(secondId)
  })

  it('closing a pane that is not active leaves the active pane untouched', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let firstId = ''
    let secondId = ''
    act(() => { firstId = result.current.openContentPane('a.md') })
    act(() => { secondId = result.current.openContentPane('b.md') })
    act(() => { result.current.selectPane(firstId) })
    act(() => { result.current.closePane(secondId) })

    expect(result.current.activePaneId).toBe(firstId)
    expect(result.current.panes).toHaveLength(1)
  })

  it('closing an unknown pane id is a no-op', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    act(() => { result.current.openContentPane('a.md') })
    act(() => { result.current.closePane('does-not-exist') })
    expect(result.current.panes).toHaveLength(1)
  })

  it('closing the last remaining pane returns to the empty state and resets layout to tabbed (Edge Case)', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let id = ''
    act(() => { id = result.current.openContentPane('a.md') })
    act(() => { result.current.setLayoutMode('2-column') })
    act(() => { result.current.closePane(id) })

    expect(result.current.panes).toEqual([])
    expect(result.current.activePaneId).toBeNull()
    expect(result.current.layoutMode).toBe('tabbed')
    expect(result.current.tilePaneIds).toEqual([])
  })

  it('closing the active middle pane activates the pane that shifted into its slot', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let secondId = ''
    let thirdId = ''
    act(() => { result.current.openContentPane('a.md') })
    act(() => { secondId = result.current.openContentPane('b.md') })
    act(() => { thirdId = result.current.openContentPane('c.md') })
    act(() => { result.current.selectPane(secondId) })
    act(() => { result.current.closePane(secondId) })

    expect(result.current.activePaneId).toBe(thirdId)
  })

  it('closing the last-index active pane falls back to the new last pane', () => {
    const { result } = renderHook(() => usePaneWorkspace())
    let firstId = ''
    let thirdId = ''
    act(() => { firstId = result.current.openContentPane('a.md') })
    act(() => { result.current.openContentPane('b.md') })
    act(() => { thirdId = result.current.openContentPane('c.md') })
    act(() => { result.current.selectPane(thirdId) })
    act(() => { result.current.closePane(thirdId) })

    expect(result.current.activePaneId).not.toBe(thirdId)
    expect(result.current.panes.map((p) => p.id)).toEqual([firstId, expect.any(String)])
  })

  describe('layout mode transitions (US2)', () => {
    it('changing layout mode never removes panes (FR-006)', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      act(() => { result.current.openContentPane('a.md') })
      act(() => { result.current.openContentPane('b.md') })
      act(() => { result.current.openContentPane('c.md') })
      act(() => { result.current.setLayoutMode('2-column') })
      expect(result.current.panes).toHaveLength(3)
      act(() => { result.current.setLayoutMode('6-tile') })
      expect(result.current.panes).toHaveLength(3)
      act(() => { result.current.setLayoutMode('tabbed') })
      expect(result.current.panes).toHaveLength(3)
    })

    it('assigns tilePaneIds up to the 2-column capacity of 2', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      act(() => { result.current.openContentPane('a.md') })
      act(() => { result.current.openContentPane('b.md') })
      act(() => { result.current.openContentPane('c.md') })
      act(() => { result.current.setLayoutMode('2-column') })
      expect(result.current.tilePaneIds).toHaveLength(2)
    })

    it('assigns tilePaneIds up to the 4-tile capacity of 4', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      for (const path of ['a.md', 'b.md', 'c.md', 'd.md', 'e.md']) {
        act(() => { result.current.openContentPane(path) })
      }
      act(() => { result.current.setLayoutMode('4-tile') })
      expect(result.current.tilePaneIds).toHaveLength(4)
    })

    it('assigns tilePaneIds up to the 6-tile capacity of 6', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      for (const path of ['a.md', 'b.md', 'c.md', 'd.md', 'e.md', 'f.md', 'g.md']) {
        act(() => { result.current.openContentPane(path) })
      }
      act(() => { result.current.setLayoutMode('6-tile') })
      expect(result.current.tilePaneIds).toHaveLength(6)
      expect(result.current.overflowPaneIds).toHaveLength(1)
    })

    it('fills unused tiles with fewer panes than capacity (FR-011)', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      act(() => { result.current.openContentPane('a.md') })
      act(() => { result.current.setLayoutMode('4-tile') })
      expect(result.current.tilePaneIds).toHaveLength(1)
    })

    it('keeps excess panes reachable via overflowPaneIds when over capacity (FR-012)', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      const ids: string[] = []
      for (const path of ['a.md', 'b.md', 'c.md', 'd.md', 'e.md']) {
        act(() => { ids.push(result.current.openContentPane(path)) })
      }
      act(() => { result.current.setLayoutMode('4-tile') })
      expect(result.current.tilePaneIds).toHaveLength(4)
      expect(result.current.overflowPaneIds).toHaveLength(1)
      expect(result.current.overflowPaneIds[0]).toBe(ids[4])
    })

    it('has no overflow panes while in tabbed mode', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      for (const path of ['a.md', 'b.md', 'c.md']) {
        act(() => { result.current.openContentPane(path) })
      }
      expect(result.current.overflowPaneIds).toEqual([])
    })

    it('switching back to tabbed mode preserves all previously open panes (US2 test)', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      for (const path of ['a.md', 'b.md', 'c.md']) {
        act(() => { result.current.openContentPane(path) })
      }
      act(() => { result.current.setLayoutMode('2-column') })
      act(() => { result.current.setLayoutMode('tabbed') })
      expect(result.current.panes).toHaveLength(3)
      expect(result.current.tilePaneIds).toEqual([])
    })

    it('growing tile capacity keeps existing tiled panes and adds more from the pane list', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      const ids: string[] = []
      for (const path of ['a.md', 'b.md', 'c.md', 'd.md']) {
        act(() => { ids.push(result.current.openContentPane(path)) })
      }
      act(() => { result.current.setLayoutMode('2-column') })
      const firstTwoTiles = result.current.tilePaneIds
      act(() => { result.current.setLayoutMode('4-tile') })
      expect(result.current.tilePaneIds.slice(0, 2)).toEqual(firstTwoTiles)
      expect(result.current.tilePaneIds).toHaveLength(4)
    })

    it('shrinking tile capacity drops the tail of the previous tile assignment into overflow', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      for (const path of ['a.md', 'b.md', 'c.md', 'd.md']) {
        act(() => { result.current.openContentPane(path) })
      }
      act(() => { result.current.setLayoutMode('4-tile') })
      act(() => { result.current.setLayoutMode('2-column') })
      expect(result.current.tilePaneIds).toHaveLength(2)
      expect(result.current.overflowPaneIds).toHaveLength(2)
    })

    it('newly opened panes fill an existing free tile slot immediately', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      act(() => { result.current.openContentPane('a.md') })
      act(() => { result.current.setLayoutMode('2-column') })
      expect(result.current.tilePaneIds).toHaveLength(1)
      let secondId = ''
      act(() => { secondId = result.current.openContentPane('b.md') })
      expect(result.current.tilePaneIds).toHaveLength(2)
      expect(result.current.tilePaneIds).toContain(secondId)
    })

    it('newly opened panes go to overflow once tiles are already full', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      act(() => { result.current.openContentPane('a.md') })
      act(() => { result.current.openContentPane('b.md') })
      act(() => { result.current.setLayoutMode('2-column') })
      let thirdId = ''
      act(() => { thirdId = result.current.openContentPane('c.md') })
      expect(result.current.tilePaneIds).toHaveLength(2)
      expect(result.current.overflowPaneIds).toContain(thirdId)
    })

    it('closing an overflow pane (not currently tiled) leaves the tile assignment untouched', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      let firstId = ''
      let secondId = ''
      let thirdId = ''
      act(() => { firstId = result.current.openContentPane('a.md') })
      act(() => { secondId = result.current.openContentPane('b.md') })
      act(() => { result.current.setLayoutMode('2-column') })
      act(() => { thirdId = result.current.openContentPane('c.md') })
      expect(result.current.overflowPaneIds).toEqual([thirdId])

      act(() => { result.current.closePane(thirdId) })

      expect(result.current.panes.map((pane) => pane.id)).toEqual([firstId, secondId])
      expect(result.current.tilePaneIds).toEqual([firstId, secondId])
      expect(result.current.overflowPaneIds).toEqual([])
    })
  })

  describe('terminal pane lifecycle (US3)', () => {
    it('attaches a terminalSessionId to the matching pane without affecting others', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      let terminalId = ''
      act(() => { result.current.openContentPane('a.md') })
      act(() => { terminalId = result.current.openTerminalPane() })
      act(() => { result.current.setTerminalSessionId(terminalId, 'session-123') })

      const terminalPane = result.current.panes.find((pane) => pane.id === terminalId)
      expect(terminalPane?.terminalSessionId).toBe('session-123')
      expect(result.current.panes.find((pane) => pane.kind === 'content')?.terminalSessionId).toBeUndefined()
    })

    it('closing a terminal pane removes it from the pane list like any other pane (FR-009 client side)', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      let terminalId = ''
      act(() => { terminalId = result.current.openTerminalPane() })
      act(() => { result.current.closePane(terminalId) })
      expect(result.current.panes).toEqual([])
    })

    it('mixes terminal and content panes freely in the same tile layout', () => {
      const { result } = renderHook(() => usePaneWorkspace())
      act(() => { result.current.openContentPane('a.md') })
      act(() => { result.current.openTerminalPane() })
      act(() => { result.current.setLayoutMode('2-column') })
      expect(result.current.tilePaneIds).toHaveLength(2)
      const kinds = result.current.tilePaneIds.map((id) => result.current.panes.find((pane) => pane.id === id)?.kind)
      expect(kinds.sort()).toEqual(['content', 'terminal'])
    })
  })
})
