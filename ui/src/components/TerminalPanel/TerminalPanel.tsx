import { useCallback, useState } from 'react'
import { terminalApi } from '../../services/terminalApi'
import { useTerminalPanel } from '../../hooks/useTerminalPanel'
import { TerminalView } from './TerminalView'
import { TerminalTabStrip } from './TerminalTabStrip'
import { TerminalKindSelect } from './TerminalKindSelect'
import type { TerminalContextType, TerminalKind, TerminalUnavailableResponse } from '../../types'

interface TerminalPanelProps {
  contextPath?: string
  contextType?: TerminalContextType
}

// Mounted once at the App.tsx root layout level, outside the page-specific content area, so
// it persists across every page/content type (FR-001, FR-013) and its state survives unrelated
// App-level re-renders (US1 T019). Owns its own state via useTerminalPanel() rather than lifted
// App state, so switching selectedPath/viewerRepoPath etc. never remounts it.
export function TerminalPanel({ contextPath, contextType }: TerminalPanelProps = {}) {
  const panel = useTerminalPanel()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [pendingKind, setPendingKind] = useState<TerminalKind>('regular')

  const openTerminal = useCallback(
    async (kind: TerminalKind) => {
      setCreating(true)
      setError('')
      try {
        const session = await terminalApi.createSession({ kind, contextPath, contextType })
        panel.addTab(session)
        panel.show()
      } catch (err) {
        const response = err as Partial<TerminalUnavailableResponse>
        if (response?.error === 'cli_not_found') {
          // FR-010: the server never created a session for a missing CLI, so synthesize a
          // local-only tab here purely to satisfy "the tab MUST display a message" — there's
          // no real server-side session behind it.
          panel.addTab({
            id: crypto.randomUUID(),
            kind,
            cwd: '',
            status: 'unavailable',
            unavailableMessage: response.message ?? 'This CLI was not found.',
          })
          panel.show()
        } else {
          setError(response?.message ?? 'Failed to start a terminal session.')
        }
      } finally {
        setCreating(false)
      }
    },
    [panel, contextPath, contextType],
  )

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
          onClick={() => void openTerminal(pendingKind)}
          disabled={creating}
          className="rounded-sm text-[var(--muted-foreground)] outline-none transition-colors hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50"
          aria-label="Open terminal"
        >
          {creating ? 'Starting terminal…' : '▸ Terminal'}
        </button>
        <TerminalKindSelect value={pendingKind} onChange={setPendingKind} disabled={creating} />
        {error && (
          <span className="text-[var(--danger)]" role="alert">
            {error}
          </span>
        )}
      </div>
    )
  }

  // addTab/removeTab/setActiveTab in useTerminalPanel.ts always keep activeTabId pointed at an
  // existing tab whenever tabs.length > 0 (guaranteed by the early return above), so this always finds a match.
  const activeTab = panel.state.tabs.find((tab) => tab.id === panel.state.activeTabId)!

  return (
    <div
      className="flex flex-col border-t border-[var(--border)] bg-[var(--background)]"
      style={{ height: panel.state.visible ? '260px' : '32px' }}
      data-testid="terminal-panel"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1">
        <TerminalTabStrip
          tabs={panel.state.tabs}
          activeTabId={panel.state.activeTabId}
          onSelectTab={panel.setActiveTab}
          onCloseTab={closeTab}
          onNewTab={() => void openTerminal(pendingKind)}
          creatingNewTab={creating}
          pendingKind={pendingKind}
          onPendingKindChange={setPendingKind}
        />
        <button
          type="button"
          onClick={panel.toggleVisible}
          aria-label={panel.state.visible ? 'Hide terminal' : 'Show terminal'}
          className="shrink-0 rounded-sm text-[var(--muted-foreground)] outline-none transition-colors hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {panel.state.visible ? '▾' : '▸'}
        </button>
      </div>
      {error && (
        <div className="border-b border-[var(--border)] px-3 py-1 text-sm text-[var(--danger)]" role="alert">
          {error}
        </div>
      )}
      <div
        className="flex-1 overflow-hidden"
        style={{ display: panel.state.visible ? 'block' : 'none' }}
        data-testid="terminal-panel-content"
      >
        {panel.state.tabs.map((tab) => (
          <div key={tab.id} className="h-full" style={{ display: tab.id === activeTab.id ? 'block' : 'none' }}>
            {tab.status === 'unavailable' ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--muted-foreground)]">
                {tab.unavailableMessage}
              </div>
            ) : (
              <TerminalView
                session={{ id: tab.id, kind: tab.kind, cwd: tab.cwd, status: tab.status, createdAt: '', exitInfo: null }}
                onExit={() => handleExit(tab.id)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
