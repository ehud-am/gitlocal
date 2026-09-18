import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { terminalApi } from '../../services/terminalApi'
import { useTerminalPanel } from '../../hooks/useTerminalPanel'
import { TerminalView, type TerminalViewHandle } from './TerminalView'
import { TerminalTabStrip } from './TerminalTabStrip'
import { NewTerminalButton } from './NewTerminalButton'
import { DockPositionControl } from './DockPositionControl'
import { CloseIcon } from '../ui/icons'
import type { DockPosition, TerminalContextType, TerminalUnavailableResponse } from '../../types'

interface TerminalPanelProps {
  contextPath?: string
  contextType?: TerminalContextType
  // The user's stored preference — drives which DockPositionControl button shows as selected,
  // and is what onDockPositionChange persists. May differ from effectiveDockPosition.
  dockPosition: DockPosition
  // The position actually used for layout right now (see useTerminalPanelPreference) — 'bottom'
  // whenever the window is too narrow for a side dock to be usable, regardless of dockPosition.
  effectiveDockPosition: DockPosition
  onDockPositionChange: (position: DockPosition) => void
}

export interface TerminalPanelHandle {
  toggleTerminal: () => void
}

const MIN_PANEL_HEIGHT = 120
const DEFAULT_PANEL_HEIGHT = 320
const MAX_PANEL_HEIGHT_RATIO = 0.9

const MIN_PANEL_WIDTH = 240
const MAX_PANEL_WIDTH_RATIO = 0.7
// The default side-dock width is a third of the window, not a fixed pixel value, so it starts
// out proportionate on both a small laptop screen and a large monitor.
const DEFAULT_PANEL_WIDTH_RATIO = 1 / 3

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

function defaultPanelWidth(): number {
  return clampPanelWidth(Math.round(window.innerWidth * DEFAULT_PANEL_WIDTH_RATIO))
}

// Mounted once at the App.tsx root layout level, outside the page-specific content area, so
// it persists across every page/content type (FR-001, FR-013) and its state survives unrelated
// App-level re-renders (US1 T019). Owns its own state via useTerminalPanel() rather than lifted
// App state, so switching selectedPath/viewerRepoPath etc. never remounts it. Exposes
// toggleTerminal() via ref so App.tsx's header button can drive it without lifting that state up.
//
// `dockPosition`/`effectiveDockPosition` are controlled by the parent (App.tsx) rather than
// owned here, because App.tsx must also know the effective one to lay out the sibling app-body
// region — see App.tsx's wrapping flex container. This component is always rendered at the same
// place in the tree regardless of position (only its own className/style change), so changing
// position never remounts it and never loses open tabs/sessions (FR-006).
export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel(
  { contextPath, contextType, dockPosition, effectiveDockPosition, onDockPositionChange }: TerminalPanelProps,
  ref,
) {
  const panel = useTerminalPanel()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [height, setHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const [width, setWidth] = useState(defaultPanelWidth)
  const viewHandlesRef = useRef(new Map<string, TerminalViewHandle>())

  const isSideDock = effectiveDockPosition !== 'bottom'
  // A collapsed side-docked panel has nothing useful to show at a "slim strip" size (its toolbar
  // needs real width to lay out, unlike a bottom dock's naturally slim horizontal bar) — so it
  // shows no chrome at all while collapsed, matching "hide the panel" rather than presenting an
  // oddly-sized sliver. A collapsed bottom dock keeps its existing slim-bar behavior.
  const showChrome = panel.state.visible || !isSideDock

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
        const sign = effectiveDockPosition === 'left' ? 1 : -1
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
    [isSideDock, effectiveDockPosition, height, width],
  )

  const handleResizeKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isSideDock) {
        const sign = effectiveDockPosition === 'left' ? 1 : -1
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
    [isSideDock, effectiveDockPosition],
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
      effectiveDockPosition === 'bottom' ? 'border-t' : effectiveDockPosition === 'left' ? 'border-r' : 'border-l'
    return (
      <div
        className={`flex items-center gap-2 border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm ${emptyStateBorder} ${effectiveDockPosition === 'left' ? 'order-first' : ''}`}
        data-testid="terminal-panel-empty"
      >
        {error && (
          <span className="text-[var(--danger)]" role="alert">
            {error}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NewTerminalButton onClick={() => void openTerminal()} creating={creating} />
          {dockPositionControl}
        </div>
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
      title={panel.state.visible ? 'Drag to resize' : undefined}
      aria-valuenow={panel.state.visible ? (isSideDock ? width : height) : undefined}
      aria-valuemin={panel.state.visible ? (isSideDock ? MIN_PANEL_WIDTH : MIN_PANEL_HEIGHT) : undefined}
      aria-valuemax={panel.state.visible ? (isSideDock ? maxPanelWidth() : maxPanelHeight()) : undefined}
      tabIndex={panel.state.visible ? 0 : undefined}
      onMouseDown={panel.state.visible ? handleResizeStart : undefined}
      onKeyDown={panel.state.visible ? handleResizeKeyDown : undefined}
      className={`group flex shrink-0 items-center justify-center border-[var(--border)] outline-none focus-visible:bg-[var(--ring)] ${
        isSideDock
          ? `h-full w-2 ${effectiveDockPosition === 'left' ? 'border-r' : 'border-l'} ${panel.state.visible ? 'cursor-col-resize hover:bg-[var(--ring)]/40' : ''}`
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
      {showChrome && (
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1">
          <TerminalTabStrip
            tabs={panel.state.tabs}
            activeTabId={panel.state.activeTabId}
            onSelectTab={panel.setActiveTab}
            onCloseTab={closeTab}
          />
          <div className="flex shrink-0 items-center gap-1">
            <NewTerminalButton onClick={() => void openTerminal()} creating={creating} />
            {dockPositionControl}
            <button
              type="button"
              onClick={panel.hide}
              aria-label="Collapse terminal"
              title="Collapse terminal panel"
              className="flex shrink-0 items-center justify-center rounded-md p-1 text-[var(--muted-foreground)] outline-none transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
      {error && showChrome && (
        <div className="border-b border-[var(--border)] px-3 py-1 text-sm text-[var(--danger)]" role="alert">
          {error}
        </div>
      )}
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ display: panel.state.visible ? 'block' : 'none' }}
        data-testid="terminal-panel-content"
      >
        {panel.state.tabs.map((tab) => (
          // Absolute-positioned to fill the content area exactly, rather than relying on nested
          // flex-stretch percentages to reach TerminalView's container — xterm's FitAddon needs
          // a guaranteed, unambiguous box to measure, which matters most in the side-dock case
          // where the container's size comes from a width (not height) chain.
          <div key={tab.id} className="absolute inset-0" style={{ display: tab.id === activeTab.id ? 'block' : 'none' }}>
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
      className={`flex shrink-0 overflow-hidden bg-[var(--background)] ${isSideDock ? `h-full flex-row ${effectiveDockPosition === 'left' ? 'order-first' : ''}` : 'flex-col'}`}
      style={
        isSideDock
          ? { width: showChrome ? `${width}px` : '0px' }
          : { height: panel.state.visible ? `${height}px` : 'auto' }
      }
      data-testid="terminal-panel"
    >
      {showChrome && (effectiveDockPosition === 'bottom' || effectiveDockPosition === 'right') && resizeHandle}
      {panelBody}
      {showChrome && effectiveDockPosition === 'left' && resizeHandle}
    </div>
  )
})
