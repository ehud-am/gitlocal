import { useCallback, useState } from 'react'
import type { TerminalKind, TerminalPanelState, TerminalSessionStatus, TerminalTabRef } from '../types'

function labelFor(kind: TerminalKind, regularOrdinal: number): string {
  if (kind === 'claude') return 'Claude'
  if (kind === 'codex') return 'Codex'
  return `Terminal ${regularOrdinal}`
}

export interface NewTerminalTab {
  id: string
  kind: TerminalKind
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

  const show = useCallback(() => setState((prev) => ({ ...prev, visible: true })), [])
  const hide = useCallback(() => setState((prev) => ({ ...prev, visible: false })), [])
  const toggleVisible = useCallback(() => setState((prev) => ({ ...prev, visible: !prev.visible })), [])

  const addTab = useCallback((session: NewTerminalTab) => {
    setState((prev) => {
      const regularOrdinal = prev.tabs.filter((tab) => tab.kind === 'regular').length + 1
      const tab: TerminalTabRef = {
        id: session.id,
        kind: session.kind,
        cwd: session.cwd,
        status: session.status,
        label: labelFor(session.kind, regularOrdinal),
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
