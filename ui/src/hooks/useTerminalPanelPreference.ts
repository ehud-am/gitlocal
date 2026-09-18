import { useCallback, useEffect, useState } from 'react'
import { terminalPanelPreferenceApi } from '../services/terminalPanelPreference'
import type { DockPosition } from '../types'

const DEFAULT_DOCK_POSITION: DockPosition = 'right'

export interface UseTerminalPanelPreferenceResult {
  dockPosition: DockPosition
  setDockPosition: (position: DockPosition) => void
}

// Fetches the persisted dock-position preference once on mount (FR-005), defaulting to 'right'
// (FR-004) until that resolves or if it fails. Persists any change immediately; the UI updates
// optimistically rather than waiting for the write to complete.
export function useTerminalPanelPreference(): UseTerminalPanelPreferenceResult {
  const [dockPosition, setDockPositionState] = useState<DockPosition>(DEFAULT_DOCK_POSITION)

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

  const setDockPosition = useCallback((position: DockPosition) => {
    setDockPositionState(position)
    terminalPanelPreferenceApi.set(position).catch(() => {})
  }, [])

  return { dockPosition, setDockPosition }
}
