import { useCallback, useState } from 'react'
import { terminalApi } from '../../services/terminalApi'
import { useTerminalPanel } from '../../hooks/useTerminalPanel'
import { TerminalView } from './TerminalView'
import type { TerminalUnavailableResponse } from '../../types'

// Mounted once at the App.tsx root layout level, outside the page-specific content area, so
// it persists across every page/content type (FR-001, FR-013) and its state survives unrelated
// App-level re-renders (US1 T019). Owns its own state via useTerminalPanel() rather than lifted
// App state, so switching selectedPath/viewerRepoPath etc. never remounts it.
export function TerminalPanel() {
  const panel = useTerminalPanel()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const openTerminal = useCallback(async () => {
    setCreating(true)
    setError('')
    try {
      const session = await terminalApi.createSession({ kind: 'regular' })
      panel.addTab(session)
      panel.show()
    } catch (err) {
      const message = (err as Partial<TerminalUnavailableResponse>)?.message ?? 'Failed to start a terminal session.'
      setError(message)
    } finally {
      setCreating(false)
    }
  }, [panel])

  const closeTab = useCallback(
    (id: string) => {
      panel.removeTab(id)
      void terminalApi.closeSession(id).catch(() => {})
    },
    [panel],
  )

  const handleExit = useCallback(
    (id: string) => {
      panel.updateTabStatus(id, 'exited')
    },
    [panel],
  )

  if (panel.state.tabs.length === 0) {
    return (
      <div
        className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        data-testid="terminal-panel-empty"
      >
        <button
          type="button"
          onClick={() => void openTerminal()}
          disabled={creating}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          aria-label="Open terminal"
        >
          {creating ? 'Starting terminal…' : '▸ Terminal'}
        </button>
        {error && (
          <span className="text-[var(--danger)]" role="alert">
            {error}
          </span>
        )}
      </div>
    )
  }

  const activeTab = panel.state.tabs.find((tab) => tab.id === panel.state.activeTabId) ?? panel.state.tabs[0]

  return (
    <div
      className="flex flex-col border-t border-[var(--border)] bg-[var(--background)]"
      style={{ height: panel.state.visible ? '260px' : '32px' }}
      data-testid="terminal-panel"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1">
        <span className="text-sm font-medium text-[var(--foreground)]">{activeTab.label}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={panel.toggleVisible}
            aria-label={panel.state.visible ? 'Hide terminal' : 'Show terminal'}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {panel.state.visible ? '▾' : '▸'}
          </button>
          <button
            type="button"
            onClick={() => closeTab(activeTab.id)}
            aria-label="Close terminal"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden" style={{ display: panel.state.visible ? 'block' : 'none' }}>
        {panel.state.tabs.map((tab) => (
          <div key={tab.id} className="h-full" style={{ display: tab.id === activeTab.id ? 'block' : 'none' }}>
            <TerminalView
              session={{ id: tab.id, kind: tab.kind, cwd: tab.cwd, status: tab.status, createdAt: '', exitInfo: null }}
              onExit={() => handleExit(tab.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
