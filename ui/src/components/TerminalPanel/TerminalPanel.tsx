import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { terminalApi } from '../../services/terminalApi'
import { useTerminalPanel } from '../../hooks/useTerminalPanel'
import { TerminalView, type TerminalViewHandle } from './TerminalView'
import { TerminalTabStrip } from './TerminalTabStrip'
import { NewTerminalButton } from './NewTerminalButton'
import { DockPositionControl } from './DockPositionControl'
import type { DockPosition, TerminalContextType, TerminalUnavailableResponse } from '../../types'

interface TerminalPanelProps {
  contextPath?: string
  contextType?: TerminalContextType
  dockPosition: DockPosition
  onDockPositionChange: (position: DockPosition) => void
}

export interface TerminalPanelHandle {
  toggleTerminal: () => void
}

const MIN_PANEL_HEIGHT = 120
const DEFAULT_PANEL_HEIGHT = 320
const MAX_PANEL_HEIGHT_RATIO = 0.9

const MIN_PANEL_WIDTH = 240
const DEFAULT_PANEL_WIDTH = 420
const MAX_PANEL_WIDTH_RATIO = 0.7

const RESIZE_KEY_STEP = 24

function maxPanelHeight(): number {
  return Math.max(MIN_PANEL_HEIGHT, Math.round(window.innerHeight * MAX_PANEL_HEIGHT_RATIO))
}

function clampPanelHeight(value: number): number {
  return Math.min(maxPanelHeight(), Math.max(MIN_PANEL_HEIGHT, value))
}

function maxPanelWidth(): number {
  return Math.max(MIN_PANEL_WIDTH, Math.round(window.innerWidth * MAX_PANEL_WIDTH_RATIO))
}

function clampPanelWidth(value: number): number {
  return Math.min(maxPanelWidth(), Math.max(MIN_PANEL_WIDTH, value))
}

// Mounted once at the App.tsx root layout level, outside the page-specific content area, so
// it persists across every page/content type (FR-001, FR-013) and its state survives unrelated
// App-level re-renders (US1 T019). Owns its own state via useTerminalPanel() rather than lifted
// App state, so switching selectedPath/viewerRepoPath etc. never remounts it. Exposes
// toggleTerminal() via ref so App.tsx's header button can drive it without lifting that state up.
//
// `dockPosition` is controlled by the parent (App.tsx) rather than owned here, because App.tsx
// must also know it to lay out the sibling app-body region — see App.tsx's wrapping flex
// container. This component is always rendered at the same place in the tree regardless of
// dockPosition (only its own className/style change), so changing position never remounts it
// and never loses open tabs/sessions (FR-006).
export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel(
  { contextPath, contextType, dockPosition, onDockPositionChange }: TerminalPanelProps,
  ref,
) {
  const panel = useTerminalPanel()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [height, setHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH)
  const viewHandlesRef = useRef(new Map<string, TerminalViewHandle>())

  const isSideDock = dockPosition !== 'bottom'

  const openTerminal = useCallback(async () => {
    setCreating(true)
    setError('')
    try {
      const session = await terminalApi.createSession({ contextPath, contextType })
      panel.addTab(session)
      panel.show()
    } catch (err) {
      const response = err as Partial<TerminalUnavailableResponse>
      setError(response?.message ?? 'Failed to start a terminal session.')
    } finally {
      setCreating(false)
    }
  }, [panel, contextPath, contextType])

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
      void openTerminal()
      return
    }
    panel.toggleVisible()
  }, [panel, openTerminal])

  useImperativeHandle(ref, () => ({ toggleTerminal: toggleOrOpenTerminal }), [toggleOrOpenTerminal])

  // Matches VS Code's default "Toggle Integrated Terminal" binding, which is Ctrl+` on every
  // platform (not Cmd, even on macOS). Works the same regardless of dock position.
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
    const handleWindowResize = () => {
      setHeight((current) => clampPanelHeight(current))
      setWidth((current) => clampPanelWidth(current))
    }
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      if (isSideDock) {
        const startX = event.clientX
        const startWidth = width
        // Left dock: handle sits on the panel's right edge, so dragging right (away from the
        // panel) grows it. Right dock: handle sits on the panel's left edge, so dragging left
        // (away from the panel) grows it.
        const sign = dockPosition === 'left' ? 1 : -1
        const handleMouseMove = (moveEvent: MouseEvent) => {
          setWidth(clampPanelWidth(startWidth + sign * (moveEvent.clientX - startX)))
        }
        const handleMouseUp = () => {
          window.removeEventListener('mousemove', handleMouseMove)
          window.removeEventListener('mouseup', handleMouseUp)
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return
      }

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
    [isSideDock, dockPosition, height, width],
  )

  const handleResizeKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isSideDock) {
        const sign = dockPosition === 'left' ? 1 : -1
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          setWidth((current) => clampPanelWidth(current + sign * RESIZE_KEY_STEP))
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault()
          setWidth((current) => clampPanelWidth(current - sign * RESIZE_KEY_STEP))
        }
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHeight((current) => clampPanelHeight(current + RESIZE_KEY_STEP))
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHeight((current) => clampPanelHeight(current - RESIZE_KEY_STEP))
      }
    },
    [isSideDock, dockPosition],
  )

  // A keyboard/screen-reader user who opens the panel (header button, Ctrl+`, or a new tab)
  // otherwise has no indication it appeared and must Tab through the rest of the page to reach
  // it. Move focus into the active tab's terminal whenever it becomes the visible one.
  useEffect(() => {
    if (!panel.state.visible || !panel.state.activeTabId) return
    viewHandlesRef.current.get(panel.state.activeTabId)?.focus()
  }, [panel.state.visible, panel.state.activeTabId])

  const dockPositionControl = <DockPositionControl value={dockPosition} onChange={onDockPositionChange} />

  if (panel.state.tabs.length === 0) {
    const emptyStateBorder =
      dockPosition === 'bottom' ? 'border-t' : dockPosition === 'left' ? 'border-r' : 'border-l'
    return (
      <div
        className={`flex items-center gap-2 border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm ${emptyStateBorder} ${dockPosition === 'left' ? 'order-first' : ''}`}
        data-testid="terminal-panel-empty"
      >
        <NewTerminalButton onClick={() => void openTerminal()} creating={creating} />
        {dockPositionControl}
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

  const resizeHandle = (
    <div
      role={panel.state.visible ? 'separator' : undefined}
      aria-orientation={panel.state.visible ? (isSideDock ? 'vertical' : 'horizontal') : undefined}
      aria-label={panel.state.visible ? 'Resize terminal panel' : undefined}
      aria-valuenow={panel.state.visible ? (isSideDock ? width : height) : undefined}
      aria-valuemin={panel.state.visible ? (isSideDock ? MIN_PANEL_WIDTH : MIN_PANEL_HEIGHT) : undefined}
      aria-valuemax={panel.state.visible ? (isSideDock ? maxPanelWidth() : maxPanelHeight()) : undefined}
      tabIndex={panel.state.visible ? 0 : undefined}
      onMouseDown={panel.state.visible ? handleResizeStart : undefined}
      onKeyDown={panel.state.visible ? handleResizeKeyDown : undefined}
      className={`group flex shrink-0 items-center justify-center border-[var(--border)] outline-none focus-visible:bg-[var(--ring)] ${
        isSideDock
          ? `h-full w-2 ${dockPosition === 'left' ? 'border-r' : 'border-l'} ${panel.state.visible ? 'cursor-col-resize hover:bg-[var(--ring)]/40' : ''}`
          : `h-2 w-full border-t ${panel.state.visible ? 'cursor-row-resize hover:bg-[var(--ring)]/40' : ''}`
      }`}
      data-testid="terminal-panel-resize-handle"
    >
      {panel.state.visible && (
        <span
          aria-hidden="true"
          className={
            isSideDock
              ? 'h-10 w-0.5 rounded-full bg-[var(--border)] transition-colors group-hover:bg-[var(--ring)] group-focus-visible:bg-[var(--ring)]'
              : 'h-0.5 w-10 rounded-full bg-[var(--border)] transition-colors group-hover:bg-[var(--ring)] group-focus-visible:bg-[var(--ring)]'
          }
        />
      )}
    </div>
  )

  const panelBody = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1">
        <TerminalTabStrip
          tabs={panel.state.tabs}
          activeTabId={panel.state.activeTabId}
          onSelectTab={panel.setActiveTab}
          onCloseTab={closeTab}
          onNewTab={() => void openTerminal()}
          creatingNewTab={creating}
        />
        <div className="flex shrink-0 items-center gap-2">
          {dockPositionControl}
          <button
            type="button"
            onClick={panel.toggleVisible}
            aria-label={panel.state.visible ? 'Hide terminal' : 'Show terminal'}
            title={panel.state.visible ? 'Collapse terminal panel' : 'Expand terminal panel'}
            className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] outline-none transition-colors hover:border-[var(--ring)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${panel.state.visible ? (isSideDock ? 'rotate-90' : 'rotate-180') : ''}`}
            >
              <path d="M4 10l4-4 4 4" />
            </svg>
            <span>{panel.state.visible ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
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
                ref={(handle) => {
                  if (handle) viewHandlesRef.current.set(tab.id, handle)
                  else viewHandlesRef.current.delete(tab.id)
                }}
                sessionId={tab.id}
                onExit={() => handleExit(tab.id)}
                onToggleShortcut={toggleOrOpenTerminal}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div
      className={`flex shrink-0 bg-[var(--background)] ${isSideDock ? `h-full flex-row ${dockPosition === 'left' ? 'order-first' : ''}` : 'flex-col'}`}
      style={
        panel.state.visible
          ? isSideDock
            ? { width: `${width}px` }
            : { height: `${height}px` }
          : isSideDock
            ? { width: 'auto' }
            : { height: 'auto' }
      }
      data-testid="terminal-panel"
    >
      {(dockPosition === 'bottom' || dockPosition === 'right') && resizeHandle}
      {panelBody}
      {dockPosition === 'left' && resizeHandle}
    </div>
  )
})
