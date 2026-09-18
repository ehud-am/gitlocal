import { useCallback, useRef, useState } from 'react'
import type { TerminalPanelState, TerminalSessionStatus, TerminalTabRef } from '../types'

function labelFor(ordinal: number): string {
  return `Terminal ${ordinal}`
}

interface NewTerminalTab {
  id: string
  cwd: string
  status: TerminalSessionStatus
  unavailableMessage?: string
}

export interface UseTerminalPanelResult {
  state: TerminalPanelState
  show: () => void
  hide: () => void
  toggleVisible: () => void
  addTab: (session: NewTerminalTab) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabStatus: (id: string, status: TerminalSessionStatus) => void
}

// Plain useState, matching App.tsx's convention (no external state library) — panel/tab
// state per data-model.md's TerminalPanel/TerminalTabRef. Never reads from localStorage or
// URL params: the panel always starts empty and hidden on mount (FR scope for US1).
export function useTerminalPanel(): UseTerminalPanelResult {
  const [state, setState] = useState<TerminalPanelState>({ visible: false, tabs: [], activeTabId: null })
  // A monotonic counter rather than tabs.length: closing "Terminal 2" and then opening a new
  // tab must not reuse the number 2 for a different session while it's still ambiguous which
  // one a user meant — this was the "something not right" a plain length-based ordinal caused.
  const nextOrdinalRef = useRef(1)

  const show = useCallback(() => setState((prev) => ({ ...prev, visible: true })), [])
  const hide = useCallback(() => setState((prev) => ({ ...prev, visible: false })), [])
  const toggleVisible = useCallback(() => setState((prev) => ({ ...prev, visible: !prev.visible })), [])

  const addTab = useCallback((session: NewTerminalTab) => {
    const ordinal = nextOrdinalRef.current
    nextOrdinalRef.current += 1
    setState((prev) => {
      const tab: TerminalTabRef = {
        id: session.id,
        cwd: session.cwd,
        status: session.status,
        label: labelFor(ordinal),
        ...(session.unavailableMessage !== undefined ? { unavailableMessage: session.unavailableMessage } : {}),
      }
      return { ...prev, tabs: [...prev.tabs, tab], activeTabId: tab.id }
    })
  }, [])

  const removeTab = useCallback((id: string) => {
    setState((prev) => {
      const tabs = prev.tabs.filter((tab) => tab.id !== id)
      const activeTabId =
        prev.activeTabId === id ? (tabs.length > 0 ? tabs[tabs.length - 1].id : null) : prev.activeTabId
      return { ...prev, tabs, activeTabId }
    })
  }, [])

  const setActiveTab = useCallback((id: string) => {
    setState((prev) => (prev.tabs.some((tab) => tab.id === id) ? { ...prev, activeTabId: id } : prev))
  }, [])

  const updateTabStatus = useCallback((id: string, status: TerminalSessionStatus) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, status } : tab)),
    }))
  }, [])

  return { state, show, hide, toggleVisible, addTab, removeTab, setActiveTab, updateTabStatus }
}
