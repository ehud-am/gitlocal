import { useCallback, useMemo, useRef, useState } from 'react'
import type { Pane, PaneKind, WorkspaceLayoutMode, WorkspaceState } from '../types'
import { WORKSPACE_LAYOUT_TILE_CAPACITY } from '../types'

let paneIdCounter = 0

function generatePaneId(): string {
  paneIdCounter += 1
  return `pane-${Date.now().toString(36)}-${paneIdCounter}`
}

function basenameOf(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const boundary = trimmed.lastIndexOf('/')
  return boundary >= 0 ? trimmed.slice(boundary + 1) : trimmed
}

function tileCapacity(layoutMode: WorkspaceLayoutMode): number {
  return WORKSPACE_LAYOUT_TILE_CAPACITY[layoutMode]
}

function recomputeTilePaneIds(panes: Pane[], layoutMode: WorkspaceLayoutMode, preferredIds: string[] = []): string[] {
  const capacity = tileCapacity(layoutMode)
  if (layoutMode === 'tabbed' || capacity <= 0) return []
  const openIds = new Set(panes.map((pane) => pane.id))
  const ordered: string[] = []
  const seen = new Set<string>()

  for (const id of preferredIds) {
    if (ordered.length >= capacity) break
    if (!openIds.has(id) || seen.has(id)) continue
    ordered.push(id)
    seen.add(id)
  }

  for (const pane of panes) {
    if (ordered.length >= capacity) break
    if (seen.has(pane.id)) continue
    ordered.push(pane.id)
    seen.add(pane.id)
  }

  return ordered
}

function pickNextActivePaneId(panes: Pane[], closedIndex: number): string | null {
  if (panes.length === 0) return null
  const nextIndex = Math.min(closedIndex, panes.length - 1)
  return panes[nextIndex].id
}

export interface UsePaneWorkspaceResult extends WorkspaceState {
  openContentPane: (contentPath: string) => string
  openTerminalPane: () => string
  closePane: (paneId: string) => void
  selectPane: (paneId: string) => void
  setLayoutMode: (layoutMode: WorkspaceLayoutMode) => void
  setTerminalSessionId: (paneId: string, terminalSessionId: string) => void
  overflowPaneIds: string[]
}

/**
 * Owns the ordered pane list, active pane, layout mode, and tile assignment for the
 * multi-pane workspace. Not persisted across reload (FR-014) — plain in-memory React state.
 */
export function usePaneWorkspace(): UsePaneWorkspaceResult {
  const [panes, setPanes] = useState<Pane[]>([])
  const [activePaneId, setActivePaneId] = useState<string | null>(null)
  const [layoutMode, setLayoutModeState] = useState<WorkspaceLayoutMode>('tabbed')
  const [tilePaneIds, setTilePaneIds] = useState<string[]>([])
  const terminalCounterRef = useRef(0)

  const openPane = useCallback((kind: PaneKind, contentPath?: string): string => {
    const id = generatePaneId()
    let title: string
    if (kind === 'content') {
      title = basenameOf(contentPath ?? '')
    } else {
      terminalCounterRef.current += 1
      title = `Terminal ${terminalCounterRef.current}`
    }

    const newPane: Pane = kind === 'content'
      ? { id, kind, contentPath, title }
      : { id, kind, title }

    setPanes((previous) => {
      const nextPanes = [...previous, newPane]
      setTilePaneIds((previousTiles) => {
        const capacity = tileCapacity(layoutMode)
        if (layoutMode === 'tabbed' || previousTiles.length >= capacity) return previousTiles
        return recomputeTilePaneIds(nextPanes, layoutMode, [...previousTiles, id])
      })
      return nextPanes
    })
    setActivePaneId(id)
    return id
  }, [layoutMode])

  const openContentPane = useCallback((contentPath: string): string => openPane('content', contentPath), [openPane])
  const openTerminalPane = useCallback((): string => openPane('terminal'), [openPane])

  const closePane = useCallback((paneId: string): void => {
    setPanes((previous) => {
      const closedIndex = previous.findIndex((pane) => pane.id === paneId)
      if (closedIndex === -1) return previous
      const nextPanes = previous.filter((pane) => pane.id !== paneId)

      setActivePaneId((previousActiveId) => {
        if (previousActiveId !== paneId) return previousActiveId
        return pickNextActivePaneId(nextPanes, closedIndex)
      })

      setTilePaneIds((previousTiles) => {
        if (!previousTiles.includes(paneId)) return previousTiles.filter((id) => nextPanes.some((pane) => pane.id === id))
        return recomputeTilePaneIds(nextPanes, layoutMode, previousTiles.filter((id) => id !== paneId))
      })

      if (nextPanes.length === 0) {
        setLayoutModeState('tabbed')
      }

      return nextPanes
    })
  }, [layoutMode])

  const selectPane = useCallback((paneId: string): void => {
    setActivePaneId((previous) => {
      // Keep this a no-op guard rather than relying on React's bail-out semantics —
      // callers may pass an id that no longer exists (e.g. a stale event handler after close).
      return paneId === previous ? previous : paneId
    })
  }, [])

  const setLayoutMode = useCallback((nextLayoutMode: WorkspaceLayoutMode): void => {
    setLayoutModeState(nextLayoutMode)
    setPanes((currentPanes) => {
      setTilePaneIds((previousTiles) => recomputeTilePaneIds(currentPanes, nextLayoutMode, previousTiles))
      return currentPanes
    })
  }, [])

  const setTerminalSessionId = useCallback((paneId: string, terminalSessionId: string): void => {
    setPanes((previous) => previous.map((pane) => (
      pane.id === paneId ? { ...pane, terminalSessionId } : pane
    )))
  }, [])

  const overflowPaneIds = useMemo(() => {
    if (layoutMode === 'tabbed') return []
    const tiled = new Set(tilePaneIds)
    return panes.filter((pane) => !tiled.has(pane.id)).map((pane) => pane.id)
  }, [layoutMode, panes, tilePaneIds])

  return {
    panes,
    activePaneId,
    layoutMode,
    tilePaneIds,
    overflowPaneIds,
    openContentPane,
    openTerminalPane,
    closePane,
    selectPane,
    setLayoutMode,
    setTerminalSessionId,
  }
}
