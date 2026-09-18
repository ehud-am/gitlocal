import { useCallback, useEffect, useState } from 'react'
import { terminalPanelPreferenceApi } from '../services/terminalPanelPreference'
import type { DockPosition } from '../types'

const DEFAULT_DOCK_POSITION: DockPosition = 'right'

// Below this viewport width, docking to the side would leave too little room for the main
// content area to be usable, so the panel is auto-rerouted to the bottom instead — without
// changing the user's stored preference, so it reverts automatically once the window widens
// again.
const MIN_WINDOW_WIDTH_FOR_SIDE_DOCK = 700

export interface UseTerminalPanelPreferenceResult {
  dockPosition: DockPosition
  setDockPosition: (position: DockPosition) => void
  // The position actually used for layout right now — same as dockPosition except it's forced
  // to 'bottom' on a too-narrow window. Use this for anything that lays the panel out; use
  // dockPosition for anything that reflects the user's stored choice (e.g. which button is
  // shown as selected).
  effectiveDockPosition: DockPosition
}

// Fetches the persisted dock-position preference once on mount (FR-005), defaulting to 'right'
// (FR-004) until that resolves or if it fails. Persists any change immediately; the UI updates
// optimistically rather than waiting for the write to complete.
export function useTerminalPanelPreference(): UseTerminalPanelPreferenceResult {
  const [dockPosition, setDockPositionState] = useState<DockPosition>(DEFAULT_DOCK_POSITION)
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    let cancelled = false
    terminalPanelPreferenceApi
      .get()
      .then((position) => {
        if (!cancelled) setDockPositionState(position)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const setDockPosition = useCallback((position: DockPosition) => {
    setDockPositionState(position)
    terminalPanelPreferenceApi.set(position).catch(() => {})
  }, [])

  const effectiveDockPosition: DockPosition =
    dockPosition !== 'bottom' && windowWidth < MIN_WINDOW_WIDTH_FOR_SIDE_DOCK ? 'bottom' : dockPosition

  return { dockPosition, setDockPosition, effectiveDockPosition }
}
