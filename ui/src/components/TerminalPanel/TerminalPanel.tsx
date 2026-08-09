import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
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

export interface TerminalPanelHandle {
  toggleTerminal: () => void
}

const MIN_PANEL_HEIGHT = 120
const DEFAULT_PANEL_HEIGHT = 260
const MAX_PANEL_HEIGHT_RATIO = 0.85
const RESIZE_KEY_STEP = 24

function maxPanelHeight(): number {
  return Math.max(MIN_PANEL_HEIGHT, Math.round(window.innerHeight * MAX_PANEL_HEIGHT_RATIO))
}

function clampPanelHeight(value: number): number {
  return Math.min(maxPanelHeight(), Math.max(MIN_PANEL_HEIGHT, value))
}

// Mounted once at the App.tsx root layout level, outside the page-specific content area, so
// it persists across every page/content type (FR-001, FR-013) and its state survives unrelated
// App-level re-renders (US1 T019). Owns its own state via useTerminalPanel() rather than lifted
// App state, so switching selectedPath/viewerRepoPath etc. never remounts it. Exposes
// toggleTerminal() via ref so App.tsx's header button can drive it without lifting that state up.
export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel(
  { contextPath, contextType }: TerminalPanelProps = {},
  ref,
) {
  const panel = useTerminalPanel()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [pendingKind, setPendingKind] = useState<TerminalKind>('regular')
  const [height, setHeight] = useState(DEFAULT_PANEL_HEIGHT)

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

  // Shared by the header button (via ref), the global Ctrl+` shortcut, and the same shortcut
  // fired from inside a focused terminal (via TerminalView's onToggleShortcut) — one first-open
  // fallback so all three entry points behave identically when no tab exists yet.
  const toggleOrOpenTerminal = useCallback(() => {
    if (panel.state.tabs.length === 0) {
      void openTerminal(pendingKind)
      return
    }
    panel.toggleVisible()
  }, [panel, openTerminal, pendingKind])

  useImperativeHandle(ref, () => ({ toggleTerminal: toggleOrOpenTerminal }), [toggleOrOpenTerminal])

  // Matches VS Code's default "Toggle Integrated Terminal" binding, which is Ctrl+` on every
  // platform (not Cmd, even on macOS).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '`' || !event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
      event.preventDefault()
      toggleOrOpenTerminal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleOrOpenTerminal])

  // Reclamp on viewport shrink so the panel can never grow past the window after a resize.
  useEffect(() => {
    const handleWindowResize = () => setHeight((current) => clampPanelHeight(current))
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const startY = event.clientY
      const startHeight = height
      const handleMouseMove = (moveEvent: MouseEvent) => {
        setHeight(clampPanelHeight(startHeight + (startY - moveEvent.clientY)))
      }
      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [height],
  )

  const handleResizeKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHeight((current) => clampPanelHeight(current + RESIZE_KEY_STEP))
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHeight((current) => clampPanelHeight(current - RESIZE_KEY_STEP))
    }
  }, [])

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
      className="flex flex-col bg-[var(--background)]"
      style={{ height: panel.state.visible ? `${height}px` : '32px' }}
      data-testid="terminal-panel"
    >
      <div
        role={panel.state.visible ? 'separator' : undefined}
        aria-orientation={panel.state.visible ? 'horizontal' : undefined}
        aria-label={panel.state.visible ? 'Resize terminal panel' : undefined}
        aria-valuenow={panel.state.visible ? height : undefined}
        aria-valuemin={panel.state.visible ? MIN_PANEL_HEIGHT : undefined}
        aria-valuemax={panel.state.visible ? maxPanelHeight() : undefined}
        tabIndex={panel.state.visible ? 0 : undefined}
        onMouseDown={panel.state.visible ? handleResizeStart : undefined}
        onKeyDown={panel.state.visible ? handleResizeKeyDown : undefined}
        className={`h-1 shrink-0 border-t border-[var(--border)] outline-none focus-visible:bg-[var(--ring)] ${
          panel.state.visible ? 'cursor-row-resize hover:bg-[var(--ring)]' : ''
        }`}
        data-testid="terminal-panel-resize-handle"
      />
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
                onToggleShortcut={toggleOrOpenTerminal}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
})
